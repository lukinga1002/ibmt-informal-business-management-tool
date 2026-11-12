import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import { applyRegistrationDecision } from '../../shared/verification.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * The mtaa verification decision.
 *
 * Only the officer for that ward may act, and the rules themselves live in
 * shared/verification.ts so this is the single decision engine. Every decision
 * carries a reason, and that reason is what the landlord sees. Approval issues
 * the certificate, which states plainly that registration is not proof of
 * ownership.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44).catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const result = await applyRegistrationDecision(base44, user, {
      caseId: cleanText(payload.case_id),
      decision: cleanText(payload.decision),
      reason: cleanText(payload.reason),
    });

    if (!result.ok) return fail(result.status, result.code, result.message, result.fields || null);
    return json(result.data);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}