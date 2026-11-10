# MAKAZI Stage 2 simulation

This branch models synthetic payments only. No bank, wallet, GePG or SMS gateway is connected.

## Walkthrough

1. In the simulation workspace, select a council, set the placeholder partner rates and cooling-off policy, and choose Stage 1 or simulated Stage 2. Changing into Stage 2 creates in-app reminders for its landlords.
2. Propose the council fee and commercial terms. A second independent admin must approve the same revision with both by-law and legal-opinion references. Changing any fee terms invalidates the previous approval.
3. Register a property and units. Payout details are optional in Stage 1. In the landlord payout screen, the platform reviewer records verified owner IDs and verified phone numbers. Shared owners can access the nomination through their own account.
4. Nominate a bank or mobile-money account and separately consent to payments through IBMT. Enter the synthetic partner's account name. A name mismatch waits for a recorded human review.
5. Each owner requests and confirms their own simulated OTP. No SMS leaves the app. Codes expire after five minutes, lock after five failed attempts, and issuance is limited to three per user and phone per hour. Existing payout contact numbers come from the reviewer-verified roster, never the replacement account input.
6. All owners must approve before the account is effective. Replacements cool off for the policy's configured hours, at least 24 in the demonstration. The previous approved account continues during cooling-off. A first account has no previous destination to protect and becomes eligible after all approvals and the name check.
7. Activate the lease and quote a simulated payment against the registered active tenancy. The council determines the stage. The server checks the registered monthly rent against the payment's whole months. Withdrawing payment consent returns subsequent records to Stage 1.
8. Use the existing signed mock callback. The ledger and partner settlement are recorded. An unknown or exceeded mobile-wallet limit holds only the landlord's share. Approve a bank account, then use Release held simulated payouts.
9. Create one synthetic daily council bill, with a SIM- control number. Only partner settlement records and linked reversal adjustments enter it. Repeating the same day returns the original bill.
10. Reconcile ledger, partner council fees and settled simulated bills. A difference creates an alert and blocks invoicing. Monthly council invoices contain settled bill lines, including carried-forward unbilled items. Draft council contracts produce non-payable previews. Signed contract snapshots produce issued invoices.
11. A full reversal retains the original documents and posts negative council, system-fee and partner-rebate adjustments. The next batch and invoice pick up those adjustments once. Partial refunds go to manual reconciliation alerts under P-15.

## Placeholder inventory

- Council fee type and rate (3% sample) or fixed whole-TZS amount, always a placeholder.
- By-law, legal-opinion, synthetic SP code, council contract reference and draft/signed status.
- Council invoice basis (share of rent or council fees), 1.5% sample rent basis.
- Partner charge 2%, partner rebate 0.75%, zero landlord service fee.
- Unknown mobile wallet limit, to get from the partner. No unknown limit is treated as unlimited.
- Cooling-off 24 hours in the demo, 72 recommended live.
- Synthetic partner account names, verified fictional owner accounts and phones, in-app-only OTPs, SIM- controls and SIM-INVOICE references.

## Access and failure limits

Commercial terms and fee approval evidence are visible only to platform admins and authorised staff of the same council. Account numbers are returned in full only to a verified owner; other review responses mask all but the last four digits. Council billing responses never include account details. Existing payout-change records are retained; the old unscoped payout route directs callers to the property-based flow.

Base44 provides no transaction or uniqueness guarantee. Repeat-safe application checks prevent ordinary retries from billing a source twice, but concurrent writes still require reconciliation. Duplicate settlement rows or batch bills require human review; a simulated settlement failure after callback creates an alert and permits retrying the signed callback. This implementation must stay on synthetic data.

## Verification

Run `node --test tests/*.test.mjs`, `npm run lint`, and `npm run build`.

Automated tests exercise arithmetic, distinct-admin approval revisions, ownership and jurisdiction denial, all-owner approval, OTP ownership, account masking, cooling-off, wallet limits, settled-only invoices, draft contracts, reconciliation differences, linked reversal credits and repeat settlement handling.

Hosted Base44 role/RLS enforcement and the complete live app sequence require verification with actual test accounts. Responsive screenshot capture was attempted with synthetic fixtures at 375px and 1440px. Local Chromium failed before rendering with `socket() failed: Operation not permitted`; the separate cloud browser could not reach the local preview. No responsive screenshots are claimed.
