import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { bilingual, cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { DISCLAIMER, certificateNumber, servesWard } from '../../shared/registration.ts';

/**
 * The mtaa verification decision.
 *
 * Only an officer for that ward may act. Every decision carries a reason, and
 * that reason is what the landlord sees. Approval issues the certificate, which
 * states plainly that registration is not proof of ownership.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const caseId = cleanText(payload.case_id);
    const decision = cleanText(payload.decision);
    const reason = cleanText(payload.reason);

    if (!caseId) return fail(422, 'VALIDATION', 'The registration case is required');
    if (!['approved', 'queried', 'rejected'].includes(decision)) {
      return fail(422, 'VALIDATION', 'The decision must be approved, queried or rejected');
    }
    if (reason.length < 10) {
      return fail(422, 'VALIDATION', 'A reason of at least 10 characters is required', {
        reason: 'Write the reason the landlord will read (at least 10 characters).',
      });
    }

    const record = await base44.asServiceRole.entities.VerificationCase.get(caseId).catch(() => null);
    if (!record) return fail(404, 'NOT_FOUND', 'That registration case does not exist');
    if (!servesWard(user, record.ward)) {
      return fail(403, 'JURISDICTION', 'Only the mtaa officer for this ward can decide this registration');
    }
    if (record.status === 'awaiting_otp') {
      return fail(409, 'OTP_PENDING', 'The landlord has not confirmed this registration by OTP yet');
    }
    if (record.status === 'approved' || record.status === 'rejected') {
      return fail(409, 'ALREADY_DECIDED', 'This registration already has a final decision');
    }

    const note = bilingual(reason, reason);

    if (decision === 'approved') {
      const approvedSoFar = await base44.asServiceRole.entities.VerificationCase.count({ status: 'approved' }).catch(() => 0);
      const certificate = certificateNumber(Number(approvedSoFar) + 1);
      const decidedAt = isoNow();

      await base44.entities.RentalUnit.update(record.unit_id, {
        status: 'verified',
        verification_status: 'verified',
        version: 2,
      });

      const updated = await base44.entities.VerificationCase.update(caseId, {
        status: 'approved',
        decision_reason: note,
        decided_by_id: user.id,
        decided_by_name: user.full_name,
        decided_at: decidedAt,
        certificate_no: certificate,
        certificate_issued_at: decidedAt,
        disclaimer: DISCLAIMER,
      });

      return json({
        case_id: updated.id,
        case_ref: updated.case_ref,
        status: 'approved',
        certificate_no: certificate,
        issued_at: decidedAt,
        decision_reason: note,
        disclaimer: DISCLAIMER,
      });
    }

    const nextStatus = decision === 'queried' ? 'queried' : 'rejected';
    await base44.entities.RentalUnit.update(record.unit_id, {
      status: nextStatus === 'queried' ? 'evidence_pending' : 'registered',
      verification_status: nextStatus === 'queried' ? 'pending' : 'rejected',
      version: 2,
    });

    const updated = await base44.entities.VerificationCase.update(caseId, {
      status: nextStatus,
      decision_reason: note,
      decided_by_id: user.id,
      decided_by_name: user.full_name,
      decided_at: isoNow(),
    });

    return json({
      case_id: updated.id,
      case_ref: updated.case_ref,
      status: nextStatus,
      decision_reason: note,
      certificate_no: null,
      disclaimer: DISCLAIMER,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}