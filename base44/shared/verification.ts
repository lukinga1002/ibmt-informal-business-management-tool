/**
 * The one registration decision path.
 *
 * decideRegistration is the only way a registration case is approved, queried
 * or rejected. The retired decideOwnership endpoint routes here too, so there is
 * exactly one engine that issues a certificate.
 */

import { bilingual, cleanText, isoNow } from './moneyOps.ts';
import { DISCLAIMER, certificateNumber, servesWard } from './registration.ts';

const DECISIONS = ['approved', 'queried', 'rejected'];

/** Marks any ownership-evidence rows for the unit decided, so the ward queue clears. */
async function markEvidence(base44, unitId, decision, user, reason) {
  const page = await base44.asServiceRole.entities.OwnershipEvidence
    .filter({ unit_id: unitId }, { sort: '-created_date', limit: 10 })
    .catch(() => ({ items: [] }));
  const rows = page.items || page;
  const status = decision === 'approved' ? 'approved' : decision === 'queried' ? 'under_review' : 'rejected';
  for (const row of rows) {
    await base44.asServiceRole.entities.OwnershipEvidence
      .update(row.id, {
        status,
        decided_by_name: cleanText(user.full_name),
        decided_at: isoNow(),
        decision_note: bilingual(reason, reason),
      })
      .catch(() => null);
  }
  return rows.length;
}

export async function applyRegistrationDecision(base44, user, { caseId, decision, reason }) {
  const id = cleanText(caseId);
  const verdict = cleanText(decision);
  const noteText = cleanText(reason);

  if (!id) return { ok: false, status: 422, code: 'VALIDATION', message: 'The registration case is required' };
  if (!DECISIONS.includes(verdict)) {
    return { ok: false, status: 422, code: 'VALIDATION', message: 'The decision must be approved, queried or rejected' };
  }
  if (noteText.length < 10) {
    return {
      ok: false,
      status: 422,
      code: 'VALIDATION',
      message: 'A reason of at least 10 characters is required',
      fields: { reason: 'Write the reason the landlord will read (at least 10 characters).' },
    };
  }

  const record = await base44.asServiceRole.entities.VerificationCase.get(id).catch(() => null);
  if (!record) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'That registration case does not exist' };
  if (!servesWard(user, record.ward)) {
    return {
      ok: false,
      status: 403,
      code: 'JURISDICTION',
      message: 'Only the mtaa officer for this ward can decide this registration',
    };
  }
  if (record.status === 'awaiting_otp') {
    return { ok: false, status: 409, code: 'OTP_PENDING', message: 'The landlord has not confirmed this registration by OTP yet' };
  }
  if (record.status === 'approved' || record.status === 'rejected') {
    return { ok: false, status: 409, code: 'ALREADY_DECIDED', message: 'This registration already has a final decision' };
  }

  const note = bilingual(noteText, noteText);
  await markEvidence(base44, record.unit_id, verdict, user, noteText);

  if (verdict === 'approved') {
    const approvedSoFar = await base44.asServiceRole.entities.VerificationCase.count({ status: 'approved' }).catch(() => 0);
    const certificate = certificateNumber(Number(approvedSoFar) + 1);
    const decidedAt = isoNow();

    await base44.asServiceRole.entities.RentalUnit.update(record.unit_id, {
      status: 'verified',
      verification_status: 'verified',
      version: 2,
    });

    const updated = await base44.asServiceRole.entities.VerificationCase.update(id, {
      status: 'approved',
      decision_reason: note,
      decided_by_id: user.id,
      decided_by_name: cleanText(user.full_name),
      decided_at: decidedAt,
      certificate_no: certificate,
      certificate_issued_at: decidedAt,
      disclaimer: DISCLAIMER,
    });

    return {
      ok: true,
      data: {
        case_id: updated.id,
        case_ref: updated.case_ref,
        status: 'approved',
        certificate_no: certificate,
        issued_at: decidedAt,
        decision_reason: note,
        disclaimer: DISCLAIMER,
      },
    };
  }

  const nextStatus = verdict === 'queried' ? 'queried' : 'rejected';
  await base44.asServiceRole.entities.RentalUnit.update(record.unit_id, {
    status: nextStatus === 'queried' ? 'evidence_pending' : 'registered',
    verification_status: nextStatus === 'queried' ? 'pending' : 'rejected',
    version: 2,
  });

  const updated = await base44.asServiceRole.entities.VerificationCase.update(id, {
    status: nextStatus,
    decision_reason: note,
    decided_by_id: user.id,
    decided_by_name: cleanText(user.full_name),
    decided_at: isoNow(),
  });

  return {
    ok: true,
    data: {
      case_id: updated.id,
      case_ref: updated.case_ref,
      status: nextStatus,
      decision_reason: note,
      certificate_no: null,
      disclaimer: DISCLAIMER,
    },
  };
}