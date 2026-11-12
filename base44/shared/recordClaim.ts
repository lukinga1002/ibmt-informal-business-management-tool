/**
 * A short exclusive claim on one record, for work Base44 cannot make atomic.
 *
 * Base44 has no multi-record transaction and no unique constraint. Hosted
 * `updateMany` is atomic per record and `field: null` matches a missing field
 * (measured on the test app, 2026-11-12), so `lock: null -> token` succeeds for
 * exactly one caller. The caller does its read-decide-write work while the
 * claim is held and re-reads its inputs inside it.
 *
 * A claim older than `ttlMs` is treated as abandoned (a crashed run) and can be
 * taken over with the same compare-and-set on its old token. Only the holder's
 * own token is ever released.
 */
export const RECORD_CLAIM = { ttlMs: 60000, attempts: 6, waitMs: 250 };

export class ClaimBusyError extends Error {
  constructor(message = "Another request is working on this record. Try again.", code = "CLAIM_BUSY") {
    super(message);
    this.code = code;
  }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function claim(entity, id, fields, token, now, ttlMs) {
  const { lock, at } = fields;
  const stamp = new Date(now).toISOString();
  const fresh = await entity.updateMany({ id, [lock]: null }, { $set: { [lock]: token, [at]: stamp } });
  if (fresh && fresh.updated) return true;
  const row = await entity.get(id);
  const heldSince = Date.parse(row[at] || "");
  if (row[lock] && Number.isFinite(heldSince) && now - heldSince > ttlMs) {
    const takeover = await entity.updateMany({ id, [lock]: row[lock] }, { $set: { [lock]: token, [at]: stamp } });
    return Boolean(takeover && takeover.updated);
  }
  return false;
}

/**
 * Runs `run` while holding `fields.lock` on record `id` of `entity`. Throws the
 * error from `busy()` (a ClaimBusyError by default) when the claim stays taken.
 */
export async function withRecordClaim(entity, id, fields, run, options = {}) {
  const { ttlMs, attempts, waitMs, busy } = { ...RECORD_CLAIM, ...options };
  const token = crypto.randomUUID();
  let held = false;
  for (let attempt = 0; attempt < attempts && !held; attempt++) {
    if (attempt) await pause(waitMs);
    held = await claim(entity, id, fields, token, Date.now(), ttlMs);
  }
  if (!held) throw busy ? busy() : new ClaimBusyError();
  try {
    return await run();
  } finally {
    await entity.updateMany({ id, [fields.lock]: token }, { $set: { [fields.lock]: null } });
  }
}
