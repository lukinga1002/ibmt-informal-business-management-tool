import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { sha256 } from '../../shared/registration.ts';

const SALT = 'ibmt-otp-v1';

/**
 * The landlord (assisted or proxy registration) or the tenant (migrated
 * tenancy) confirms with the code sent to their own phone. The code is the
 * only check: this endpoint is reachable before that person has an account.
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
    if (!found.otp_code_hash) return fail(409, 'NOT_REQUIRED', 'This registration does not need a code');

    const matches = (await sha256(`${SALT}${code}`)) === found.otp_code_hash;
    if (!matches) return fail(422, 'CODE_MISMATCH', 'That code does not match', { code: 'Check the code and try again.' });

    const now = isoNow();
    const update = {
      otp_confirmed_at: now,
      status: found.channel === 'migrated' ? 'submitted' : 'submitted',
      otp_code_hash: '',
    };
    const updated = await base44.entities.VerificationCase.update(found.id, update);

    if (found.channel === 'migrated' && found.migration && found.migration.tenancy_id) {
      await base44.entities.Tenancy.update(found.migration.tenancy_id, {
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