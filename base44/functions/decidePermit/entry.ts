import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bilingual,
  cleanText,
  fail,
  hasIbmtRole,
  isoNow,
  json,
} from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';

/**
 * A district official records a permit decision. The reason is mandatory
 * and is stored bilingually (same text in both languages, as submitted).
 * The decision-state version is incremented here, never by the interface.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'permits_module');
    if (blocked) return blocked;
    if (!hasIbmtRole(user, 'district_official')) {
      return fail(403, 'FORBIDDEN', 'Only a district official can decide permits');
    }

    const payload = await req.json().catch(() => ({}));
    const permitId = cleanText(payload.id);
    const decision = cleanText(payload.decision);
    const reason = cleanText(payload.reason);

    if (!permitId) return fail(422, 'VALIDATION', 'The permit is required');
    if (!['approved', 'queried', 'rejected'].includes(decision)) {
      return fail(422, 'VALIDATION', 'The decision must be approved, queried or rejected');
    }
    if (reason.length < 10) {
      return fail(422, 'VALIDATION', 'A decision reason of at least 10 characters is required', { reason: 'Write the reason for the record (at least 10 characters).' });
    }

    const permit = await base44.entities.Permit.get(permitId).catch(() => null);
    if (!permit) return fail(404, 'NOT_FOUND', 'That permit is not visible to you');

    const userDistrict = (user.data && user.data.district) || null;
    if (user.role !== 'admin' && userDistrict && permit.district && permit.district !== userDistrict) {
      return fail(403, 'JURISDICTION', 'The permit is outside your assigned district');
    }

    const updated = await base44.entities.Permit.update(permitId, {
      status: decision,
      decided_by: user.full_name,
      decided_at: isoNow(),
      decision_note: bilingual(reason, reason),
      version: (Number(permit.version) || 1) + 1,
    });

    return json(updated);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}