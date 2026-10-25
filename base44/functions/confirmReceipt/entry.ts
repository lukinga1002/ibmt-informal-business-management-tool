import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';

/**
 * Records buyer confirmation. Optimistic concurrency: a stale version is a
 * conflict and the caller must reload before deciding anything.
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

    if (payload.version !== undefined && payload.version !== null && Number(payload.version) !== Number(receipt.version)) {
      return fail(409, 'CONFLICT', 'This receipt changed after you opened it');
    }

    if (receipt.status === 'confirmed') return json(receipt);
    if (receipt.status !== 'awaiting_confirmation' && receipt.status !== 'issued') {
      return fail(409, 'CONFLICT', `A ${receipt.status} receipt cannot be confirmed`);
    }

    const updated = await base44.entities.Receipt.update(id, {
      status: 'confirmed',
      buyer_confirmation: 'confirmed',
      confirmed_at: isoNow(),
      version: Number(receipt.version || 1) + 1,
    });

    return json(updated);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}