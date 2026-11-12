import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  cleanText,
  fail,
  findExistingByKey,
  json,
} from '../../shared/moneyOps.ts';

/**
 * A landlord files ownership evidence for one of their units. The evidence
 * file is an uploaded private file reference; the unit moves to
 * evidence_pending and stays there until a mtaa officer decides it.
 * A retried action key can never file the same evidence twice.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const unitId = cleanText(payload.unit_id) || cleanText(payload.id);
    const evidenceUri = cleanText(payload.evidence_uri);

    if (!unitId) return fail(422, 'VALIDATION', 'The unit is required');
    if (evidenceUri.length < 3) {
      return fail(422, 'VALIDATION', 'The evidence file is required', { evidence_uri: 'Upload the evidence file first.' });
    }

    const unit = await base44.entities.RentalUnit.get(unitId).catch(() => null);
    if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');

    const owns = unit.landlord_id === user.id || unit.created_by_id === user.id || user.role === 'admin';
    if (!owns) {
      return fail(403, 'FORBIDDEN', 'Only the landlord of this unit can file ownership evidence for it');
    }

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'OwnershipEvidence', idempotencyKey);
      if (existing) return json({ unit_id: existing.unit_id, verification_status: 'in_review', duplicate: true });
    }

    const kind = cleanText(payload.kind) || 'title_deed';
    const allowedKinds = ['title_deed', 'lease_agreement', 'utility_bill', 'tax_receipt', 'other'];
    const evidenceKind = allowedKinds.includes(kind) ? kind : 'other';

    const evidence = await base44.entities.OwnershipEvidence.create({
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      submitted_by_name: user.full_name,
      evidence_uri: evidenceUri,
      evidence_kind: evidenceKind,
      status: 'submitted',
      district: unit.district,
      ward: unit.ward,
      idempotency_key: idempotencyKey || null,
    });

    await base44.asServiceRole.entities.RentalUnit.update(unit.id, {
      status: 'evidence_pending',
      version: (Number(unit.version) || 1) + 1,
    });

    return json({
      id: evidence.id,
      unit_id: unit.id,
      verification_status: 'in_review',
      submitted_at: evidence.created_date,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}