# Founder-assisted manual checks — 11 November 2026

Observed in localhost screenshots or explicitly reported by the founder:

- Administrator opens the simulation workspace; 13/13 existing built-in tests displayed as passed.
- Fictional SIM-TEST council created and selectable; council terms load as Proposed.
- Founder reports second approval by the same account rejected; screenshot shows 1/2 approvals.
- Founder reports revised contract reference and new proposal reset approvals to 0/2.
- Reconcile displays Ledger 0, Partner 0, SIM-GePG 0, Matched. This verifies empty-state behavior only, not reconciled settlements.
- Payout page opens, but no property fixture exists yet.

A second administrator account is unavailable; independent approval remains pending. Automated Chrome sign-in was rejected by Google; browser checks continue manually without evasion.

## Local onboarding correction

The older /rent/landlord/register wizard calls registerUnit and uses fixed pilot wards. The property-and-unit onboarding flow is /rent/join and calls landlordRegister. This flow now includes the existing SIM-TEST council only in Vite development with a loopback page and loopback configured API. Its actual council ID, region and district are carried together and its ward is explicitly synthetic. Production choices remain the fixed pilot list. No council or property is auto-created by opening onboarding.

39 Node tests pass, including local-only choice gating and jurisdiction mapping. Complete property registration, owner nomination/OTP, second independent admin, non-empty receipts/bills/invoices, role separation, hosted entity RLS and responsive screenshots remain pending. These manual observations are not a full Stage 2 sign-off.
