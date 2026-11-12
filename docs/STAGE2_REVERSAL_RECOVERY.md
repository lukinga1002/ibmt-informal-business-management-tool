# Stage 2 reversals: the landlord-payout gap and a proposed recovery workflow

**Status:** proposal for the founder. Nothing in this document is implemented. It does **not** decide any clawback, set-off or deduction policy; those need the founder, the licensed partner and a Tanzanian lawyer.

## What happens today

A Stage 2 reversal (`moneyControl`) goes through two-admin approval. When it executes:

- **Ledger:** a mirrored posting group cancels the original settlement group. Originals stay unchanged. The payment's ledger nets to zero, including `landlord_payable`.
- **Council fee:** `reverseSettlement` writes a linked `SimSettlementAdjustment` (council amount, system fee and partner rebate, all negative). The next daily bill carries it, so the council-fee three-way reconciliation stays balanced.
- **Payment:** the state becomes `reversed`.

## The gap

1. **Payouts to the landlord are not in the ledger.** Releasing a landlord's share only sets `SimSettlement.landlord_state` to `settled`; no posting moves `landlord_payable` to "paid out".
2. **After a payout, a reversal leaves no record of what the landlord now owes.** The mirrored group cancels a `landlord_payable` that, in reality, was already paid. The books then say nobody owes anything, while the partner has returned the tenant's money and the landlord still holds the payout.
   - **Hosted example:** `IBMT-SIM-2026-000004` (`…5d6f`): landlord 475,000 `settled`; reversed; nothing recoverable recorded.
3. **The settlement row is not adjusted for the landlord part.** The adjustment covers council, system fee and rebate only. `landlord_state` stays `settled`, and no record links the reversal to the landlord amount at stake.
4. **A reversal of a payment whose share is still held** has the opposite problem: the held amount must not be released afterwards. **Fixed on `stage2-sim`:** `releaseHeld` now skips any settlement whose payment is `reversed`, so the hold stays in place. Marking it `cancelled_by_reversal` is still part of the proposal below.

| Case | Landlord share at reversal | Today | Correct outcome |
|---|---|---|---|
| A | `held_limit` or `held_account` | Stays held, and `releaseHeld` now refuses to release it | Hold is cancelled; nothing to recover |
| B | `settled` (paid out) | Nothing recorded | An open recovery item for the amount paid, decided by people |

## Proposed workflow (explicit, human-decided)

1. **Record the payout in the ledger.** When a hold is released, or a share is settled directly, post `landlord_payable` debit / `landlord_paid_out` credit (or the partner's equivalent clearing account). The payout then becomes a fact in the books.
2. **On reversal, branch on the landlord state:**
   - **Held:** mark the hold `cancelled_by_reversal`. `releaseHeld` must skip it. No recovery item.
   - **Paid out:** open a `LandlordRecoveryCase` (new entity, admin-only read and write, service-role writes):
     - fields: payment, settlement, property, landlord, amount, the reversal approval request, `state: open`
     - post `landlord_recoverable` debit / `landlord_paid_out` credit, so the amount owed is visible in the books
     - no money moves, and nothing is deducted from anything
3. **Notify the owners** in-app (bilingual): the payment was reversed, the amount, why, and that a person will contact them. No automatic action.
4. **Resolve by maker-checker.** One admin proposes a resolution and a second admin approves. Each needs a written reason, and both are logged in the audit trail. The available resolutions must be set by the founder after legal and partner advice. Candidates for that decision, not adopted here:
   - (a) the landlord repays the partner voluntarily, confirmed by the partner's reference
   - (b) set-off against a specific future payout, only with that landlord's explicit, recorded, case-specific consent
   - (c) the partner absorbs it under its contract
   - (d) write-off, with reason and approval
   - (e) referral to a formal dispute process

   Each closes the case with a ledger group that clears `landlord_recoverable`.
5. **Reconcile.** Add a fourth reconciliation line: open recovery cases = `landlord_recoverable` balance. Any case open past a set number of days raises an alert.
6. **Report.** The admin dashboard lists open cases with their age. Councils see none of it (a landlord-and-partner matter, P-12).

## Tests to write when this is built

- A reversal with the share held: the hold is cancelled, `releaseHeld` releases 0, no case.
- A reversal after payout: one case; ledger balanced; `landlord_recoverable` equals the case amount; a repeat execution creates no second case.
- Resolution needs two different admins; the proposer cannot approve.
- Nothing is deducted from any later payout without a recorded consent for that case.

## PDPA notes

- **Personal data:** the case holds the landlord's identity and a financial obligation (sensitive financial data). Admin-only access; councils excluded.
- **Lawful basis:** the existing payment relationship (contract and legal obligation), not marketing.
- **Notification:** the landlord must be told (transparency).
- **Retention:** keep the case for the financial-records period the lawyer confirms, then dispose securely.
- **Need legal confirmation:** whether any set-off is lawful, and whether it needs the partner's licence terms.
