import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, getActivePolicy, isoNow, json } from '../../shared/moneyOps.ts';

/**
 * Issues a receipt draft so the buyer can confirm it. The confirmation window
 * comes from the active policy version. Issuing an already-issued receipt is a
 * no-op (the same action cannot move it twice), and a confirmed receipt is a
 * conflict, never a silent re-issue.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const id = cleanText(payload.id);
    if (!id) return fail(422, 'VALIDATION', 'A receipt id is required');

    const receipt = await base44.entities.Receipt.get(id);
    if (!receipt) return fail(404, 'NOT_FOUND', 'No such receipt for this account');

    if (receipt.status === 'awaiting_confirmation') return json(receipt);
    if (receipt.status === 'confirmed') return fail(409, 'CONFLICT', 'A confirmed receipt cannot be re-issued');
    if (receipt.status !== 'draft') return fail(409, 'CONFLICT', `A ${receipt.status} receipt cannot be issued`);

    const policy = await getActivePolicy(base44);
    const hours = Number(policy && policy.values && policy.values.receipt_confirmation_hours) || 48;
    const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();

    const updated = await base44.entities.Receipt.update(id, {
      status: 'awaiting_confirmation',
      buyer_confirmation: 'awaiting_confirmation',
      confirmation_expires_at: expiresAt,
      version: Number(receipt.version || 1) + 1,
      policy_version: (policy && policy.version) || receipt.policy_version,
    });

    return json(updated);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}