# Payment consent withdrawal: simulation behaviour and open policy question

**Status:** the simulation release keeps the conservative behaviour below. The open question must be decided, with a Tanzanian data-protection lawyer and the licensed payment partner, before any real-money operation.

## What the simulation does (implemented and tested)

1. **Withdrawing consent:**
   - It is never a single click. The owner first sees a versioned disclosure (`stage2-withdrawal-1`) and confirms it.
   - The withdrawal record stores the disclosure version, who withdrew, and the language the disclosure was shown in.
2. **New payments** for the property are recorded as **Stage 1**: no payment partner, and no council fee collected through IBMT.
3. **Payments already started** under consent are completed. If the tenant's money arrives after the withdrawal, the settlement is recorded and the landlord's share is **held** (`held_account`, reason `payment_consent_withdrawn`). An alert is raised. Nothing is dropped.
4. **Outstanding holds** (`held_limit`, `held_account`) **stay held** while consent is withdrawn: `releaseHeld` refuses with `ACCOUNT_REQUIRED`.
5. **Consent is restored only through the recorded flow:** the owner nominates an account with the consent box ticked, which writes a new `Consent` record and a nomination.
   - A held share is released only to an account that is then eligible: approved by every verified owner, name check matched or reviewed, and past cooling-off.
   - Each held share is released **once** (conditional update on its held state).
6. **A reversed payment's held share is never released;** the hold is cancelled.

## The open policy question (for real money)

After an owner withdraws consent to *future* payment processing, what should happen to money **already collected under the earlier consent** and still held?

- **Option A, current simulation behaviour:** keep holding until the owner consents again.
  - Most protective of the consent choice.
  - But the landlord's own rent stays with the partner, possibly indefinitely.
- **Option B:** release to the account that was approved and eligible at the time of withdrawal, without new consent. This rests on the argument that withdrawal does not undo processing that was lawful before it (PDPA, Cap. 44) and that paying out collected rent completes the original transaction.
  - Needs: confirmation that the lawful basis for completing the transaction is contract, not consent; and the partner's agreement on holding periods.
- **Option C:** release only to a newly confirmed destination chosen by the owner after withdrawal, via a narrow "release my held money" consent that covers only that act.

**Also to decide:**
- the maximum holding period
- what the owner is told, and how often, while money is held
- what happens to held money if the owner never responds (unclaimed-funds rules)

**Not decided in code.** Option A stays until the founder records a decision.
