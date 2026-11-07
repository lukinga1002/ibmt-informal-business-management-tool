import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { fail, isoNow, json } from '../../shared/moneyOps.ts';
import { cleanText } from '../../shared/moneyOps.ts';
import { checkHashedOtp } from '../../shared/registration.ts';

/**
 * The landlord (assisted or proxy registration) or the tenant (migrated
 * tenancy) confirms with the code sent to their own phone. The code is the
 * only check: this endpoint is reachable before that person has an account, so
 * every write here runs on the service role — a caller with no session cannot
 * write a case record under their own token.
 *
 * The code and its salted hash live only on the admin-only OtpChallenge row.
 * Five minutes, five attempts, fifteen-minute lockout, all applied server-side.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const caseId = cleanText(payload.case_id);
    const caseRef = cleanText(payload.case_ref);
    const code = cleanText(payload.code);

    if (!caseId && !caseRef) return fail(422, 'VALIDATION', 'The registration reference is required');
    if (!/^[0-9]{6}$/.test(code)) return fail(422, 'VALIDATION', 'Enter the six digit code', { code: 'Six digits.' });

    const found = caseId
      ? await base44.asServiceRole.entities.VerificationCase.get(caseId).catch(() => null)
      : await base44.asServiceRole.entities.VerificationCase
          .filter({ case_ref: caseRef }, { limit: 1 })
          .then((page) => (page.items || [])[0] || null);

    if (!found) return fail(404, 'NOT_FOUND', 'That registration was not found');
    if (found.otp_confirmed_at) return json({ confirmed: true, status: found.status, already: true });
    if (found.channel === 'self') return fail(409, 'NOT_REQUIRED', 'This registration does not need a code');

    const challengePage = await base44.asServiceRole.entities.OtpChallenge
      .filter({ subject_ref: found.case_ref }, { sort: '-created_date', limit: 1 });
    const challenge = (challengePage.items || challengePage)[0];
    if (!challenge) {
      return fail(409, 'CODE_EXPIRED', 'The code for this registration has expired. Request a new one.');
    }

    const now = isoNow();
    const result = await checkHashedOtp({ challenge, code, now });

    await base44.asServiceRole.entities.OtpChallenge.update(challenge.id, {
      attempts: result.attempts,
      locked_until: result.locked_until,
      consumed_at: result.ok ? now : challenge.consumed_at || null,
    });

    if (!result.ok) {
      const detail = String(result.reason).replace(/_/g, ' ');
      const message =
        result.reason === 'locked'
          ? 'Too many wrong codes. Try again after the lockout.'
          : result.reason === 'expired'
            ? 'That code has expired. Request a new one.'
            : `The code was refused: ${detail}`;
      return fail(401, 'OTP_REFUSED', message, { code: message });
    }

    // Service role: the confirming party may have no account at all, so a
    // user-token write would be refused by the access rules.
    const updated = await base44.asServiceRole.entities.VerificationCase.update(found.id, {
      otp_confirmed_at: now,
      status: 'submitted',
    });

    if (found.channel === 'migrated' && found.migration && found.migration.tenancy_id) {
      await base44.asServiceRole.entities.Tenancy.update(found.migration.tenancy_id, {
        status: 'active',
        start_date: found.migration.started_on,
      });
    }

    return json({
      confirmed: true,
      case_ref: updated.case_ref,
      status: updated.status,
      channel: updated.channel,
      confirmed_at: now,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}