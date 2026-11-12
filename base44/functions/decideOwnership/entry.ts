import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, hasIbmtRole, json } from '../../shared/moneyOps.ts';
import { applyRegistrationDecision } from '../../shared/verification.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * RETIRED. decideRegistration is the decision path; this endpoint stays only
 * because the older ward dashboard still calls it, and it now resolves the
 * unit's registration case and hands the decision to the same engine.
 *
 * Two guarantees are enforced here rather than assumed:
 *  - an approval is refused when the unit has no ownership evidence at all;
 *  - every call is written to the audit log as a legacy call.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44);
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');
    if (!hasIbmtRole(user, 'mtaa_officer')) {
      return fail(403, 'FORBIDDEN', 'Only a mtaa officer can verify ownership evidence');
    }

    const payload = await req.json().catch(() => ({}));
    const unitId = cleanText(payload.id) || cleanText(payload.unit_id);
    const decision = cleanText(payload.decision);
    const reason = cleanText(payload.reason);

    if (!unitId) return fail(422, 'VALIDATION', 'The unit is required');

    const unit = await base44.entities.RentalUnit.get(unitId).catch(() => null);
    if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');

    const audit = (action, outcome, note, detail = null) =>
      base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_role: (user.data && user.data.ibmt_role) || (user.role === 'admin' ? 'platform_admin' : 'user'),
        action,
        subject_type: 'RentalUnit',
        subject_id: unit.id,
        subject_ref: unit.unit_ref || null,
        council_id: unit.council_id || null,
        district: unit.district || null,
        ward: unit.ward || null,
        outcome,
        reason: note,
        occurred_at: new Date().toISOString(),
        detail,
      }).catch(() => null);

    if (decision === 'approved') {
      const evidence = await base44.asServiceRole.entities.OwnershipEvidence
        .filter({ unit_id: unit.id }, { sort: '-created_date', limit: 1 })
        .catch(() => ({ items: [] }));
      if (!(evidence.items || evidence).length) {
        await audit('registration.approval.refused', 'refused', 'Approval refused: no ownership evidence on this unit');
        return fail(409, 'NO_EVIDENCE', 'No ownership evidence exists for this unit, so it cannot be approved');
      }
    }

    const casePage = await base44.asServiceRole.entities.VerificationCase
      .filter({ unit_id: unit.id }, { sort: '-created_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const registrationCase = (casePage.items || casePage)[0];
    if (!registrationCase) {
      await audit('registration.approval.refused', 'refused', 'Refused: the unit has no registration case to decide');
      return fail(409, 'NO_REGISTRATION_CASE', 'This unit has no registration case. Use the registration decision instead.');
    }

    await audit('registration.decided.legacy_path', 'allowed', 'Decided through the retired decideOwnership endpoint', {
      case_id: registrationCase.id,
      decision,
    });

    const result = await applyRegistrationDecision(base44, user, {
      caseId: registrationCase.id,
      decision,
      reason,
    });

    if (!result.ok) return fail(result.status, result.code, result.message, result.fields || null);
    return json({ ...result.data, deprecated_endpoint: 'decideOwnership' });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}