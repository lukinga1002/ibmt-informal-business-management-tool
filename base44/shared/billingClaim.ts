import { RECORD_CLAIM, withRecordClaim } from "./recordClaim.ts";

/**
 * One council billing run at a time.
 *
 * Found on the hosted test app (2026-11-12): three simultaneous batch requests
 * for one day each read "no bill yet" and each created a bill. The run is
 * serialised with a claim on the council record (see recordClaim.ts).
 * Everything that decides what to bill or invoice runs while the claim is held,
 * and re-reads its inputs inside it.
 */
export const BILLING_CLAIM = { ...RECORD_CLAIM };

export class BillingBusyError extends Error {
  constructor() {
    super("Another billing run for this council is in progress. Try again.");
    this.code = "BILLING_BUSY";
  }
}

export async function withCouncilBillingClaim(db, councilId, run, options = {}) {
  return withRecordClaim(
    db.Council,
    councilId,
    { lock: "billing_lock", at: "billing_lock_at" },
    run,
    { ...BILLING_CLAIM, ...options, busy: () => new BillingBusyError() },
  );
}
