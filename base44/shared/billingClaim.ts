/**
 * One council billing run at a time.
 *
 * Found on the hosted test app (2026-11-12): three simultaneous batch requests
 * for one day each read "no bill yet" and each created a bill. Base44 has no
 * unique constraint, so the run is serialised with a conditional write on the
 * council: `billing_lock: null -> token` succeeds for exactly one caller (hosted
 * updateMany matches a missing or null field and applies atomically per
 * record). Everything that decides what to bill or invoice runs while the
 * claim is held, and re-reads its inputs inside it.
 *
 * A claim older than `ttlMs` is treated as abandoned (a crashed run) and can be
 * taken over with the same compare-and-set on its old token.
 */
export const BILLING_CLAIM = { ttlMs: 60000, attempts: 6, waitMs: 250 };

export class BillingBusyError extends Error {
  constructor() {
    super("Another billing run for this council is in progress. Try again.");
    this.code = "BILLING_BUSY";
  }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function claim(db, councilId, token, now, ttlMs) {
  const fresh = await db.Council.updateMany(
    { id: councilId, billing_lock: null },
    { $set: { billing_lock: token, billing_lock_at: new Date(now).toISOString() } },
  );
  if (fresh && fresh.updated) return true;
  const council = await db.Council.get(councilId);
  const heldSince = Date.parse(council.billing_lock_at || "");
  if (council.billing_lock && Number.isFinite(heldSince) && now - heldSince > ttlMs) {
    const takeover = await db.Council.updateMany(
      { id: councilId, billing_lock: council.billing_lock },
      { $set: { billing_lock: token, billing_lock_at: new Date(now).toISOString() } },
    );
    return Boolean(takeover && takeover.updated);
  }
  return false;
}

export async function withCouncilBillingClaim(db, councilId, run, options = {}) {
  const { ttlMs, attempts, waitMs } = { ...BILLING_CLAIM, ...options };
  const token = crypto.randomUUID();
  let held = false;
  for (let attempt = 0; attempt < attempts && !held; attempt++) {
    if (attempt) await pause(waitMs);
    held = await claim(db, councilId, token, Date.now(), ttlMs);
  }
  if (!held) throw new BillingBusyError();
  try {
    return await run();
  } finally {
    // Release only our own claim; a takeover by someone else is left alone.
    await db.Council.updateMany({ id: councilId, billing_lock: token }, { $set: { billing_lock: null } });
  }
}
