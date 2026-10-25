import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bilingual,
  cleanText,
  fail,
  hasIbmtRole,
  isoNow,
  json,
} from '../../shared/moneyOps.ts';

/**
 * A mtaa officer verifies or rejects the latest ownership evidence filed for
 * a unit. Verification is the only path to a verified unit; the reason is
 * mandatory and stored bilingually on the evidence record.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');
    if (!hasIbmtRole(user, 'mtaa_officer')) {
      return fail(403, 'FORBIDDEN', 'Only a mtaa officer can verify ownership evidence');
    }

    const payload = await req.json().catch(() => ({}));
    const unitId = cleanText(payload.id) || cleanText(payload.unit_id);
    const decision = cleanText(payload.decision);
    const reason = cleanText(payload.reason);

    if (!unitId) return fail(422, 'VALIDATION', 'The unit is required');
    if (!['approved', 'queried', 'rejected'].includes(decision)) {
      return fail(422, 'VALIDATION', 'The decision must be approved, queried or rejected');
    }
    if (reason.length < 10) {
      return fail(422, 'VALIDATION', 'A decision reason of at least 10 characters is required', { reason: 'Write the reason for the record (at least 10 characters).' });
    }

    const unit = await base44.entities.RentalUnit.get(unitId).catch(() => null);
    if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');

    const wardIds = (user.data && user.data.ward_ids) || [];
    const inWard = Array.isArray(wardIds) && wardIds.includes(unit.ward);
    if (!inWard && user.role !== 'admin') {
      return fail(403, 'JURISDICTION', 'The unit is outside your assigned wards');
    }

    const evidenceQuery = await base44.entities.OwnershipEvidence.filter({ unit_id: unitId }, { sort: '-created_date', limit: 1 });
    const evidenceRows = evidenceQuery.items || evidenceQuery;
    const evidence = evidenceRows[0];

    const evidenceStatus = decision === 'approved' ? 'approved' : decision === 'queried' ? 'under_review' : 'rejected';
    const unitStatus = decision === 'approved' ? 'verified' : decision === 'queried' ? 'evidence_pending' : 'registered';

    if (evidence) {
      await base44.entities.OwnershipEvidence.update(evidence.id, {
        status: evidenceStatus,
        decided_by_name: user.full_name,
        decided_at: isoNow(),
        decision_note: bilingual(reason, reason),
      });
    }

    const updatedUnit = await base44.entities.RentalUnit.update(unitId, {
      status: unitStatus,
      version: (Number(unit.version) || 1) + 1,
    });

    const ownershipStatus = decision === 'approved' ? 'verified' : decision === 'rejected' ? 'queried' : 'in_review';
    return json({
      unit_id: updatedUnit.id,
      unit_ref: updatedUnit.unit_ref,
      ownership_status: ownershipStatus,
      decided_by: user.full_name,
      decided_at: isoNow(),
      reason: bilingual(reason, reason),
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}