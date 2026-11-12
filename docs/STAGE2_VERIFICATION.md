# Stage 2 verification — 11 November 2026

## Verified

- 33 Node tests pass (including five new permission tests against real function handlers with mocked SDK storage).
- Signed-out callers are rejected; unrelated owners cannot discover or operate another property's payout.
- Landlords cannot verify owner rosters or nominate before review.
- Same-council staff may read fee summaries but cannot create bills/invoices or edit terms; responses omit account numbers, landlord payout amounts and partner rebate data.
- Tenants and foreign-council officials cannot read commercial terms or council fee records.
- The running local frontend at http://localhost:5173/ responded HTTP 200. This is availability evidence, not a browser layout check.

## Runtime blocker

Anonymous read-only HTTP POST requests were sent to the running local Stage 2 functions with nonexistent fixture IDs. stage2Payout and stage2Council timed out after 10 seconds. councilSettlementTerms returned HTTP 500 because the Base44 function bundler could not resolve partysocket, axios, uuid and socket.io-client from its cached npm:@base44/sdk@0.8.54 installation under the user's .base44/function-bundler directory. No successful runtime authorization check is claimed.

Repair the local Deno dependency cache before repeating runtime tests. No real accounts, tokens or production data were used by these requests.

## Outstanding release checks

- Actual authenticated owner, unrelated owner, platform admin, same-council and foreign-council test sessions against the running backend.
- Direct entity RLS enforcement in a hosted test deployment (mocked handler tests do not prove hosted RLS).
- Browser workflow through payout nomination, all-owner OTP approval, receipt, council fees and invoice.
- Responsive screenshots of those five views at 375px and 1440px.

PR #3 remains draft until runtime and browser verification are complete. Local server startup listings alone do not demonstrate that functions bundle or execute.
