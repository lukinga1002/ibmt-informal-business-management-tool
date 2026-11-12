# Stage 2 runtime update — 11 November 2026

## Confirmed evidence

The founder supplied screenshots of localhost:5173/rent/sim showing the administrator identity, 13/13 existing built-in checks passed, and the council fees/bills/invoices panel with its council selector. No council was selected in that screenshot. This establishes access and visible rendering for those views only.

35 automated tests pass, including SDK auth error shapes, service outages, unrelated ownership and council access boundaries. These tests use mocked SDK storage and do not prove hosted entity RLS.

After repairing the Deno SDK cache and fetching the session-error correction, anonymous HTTP requests with the SDK-required Base44-App-Id header returned 401 SESSION_EXPIRED / Sign in required for all three functions: stage2Payout, stage2Council and councilSettlementTerms. Signed-out runtime denial is verified locally.

## Correction to earlier probe interpretation

Earlier raw HTTP requests omitted the required Base44-App-Id header. SDK client construction therefore could fail before authentication, producing generic 500 responses. Those requests were not valid equivalents of normal SDK calls and do not establish a signed-in application failure. The SDK auth_required logs are consistent with anonymous probes; they do not demonstrate rejection of the founder's signed-in account.

The helper correction remains useful: SDK me() rejects with 401 or 403/auth_required instead of returning null, and those now produce 401 SESSION_EXPIRED. Genuine SDK outages retain generic server errors.

## Still outstanding

Select a synthetic council and verify successful authenticated data loading. Complete payout nomination, joint-owner approval, receipt and invoice workflows with independent test accounts. Check same-council versus foreign-council sessions and direct entity RLS in a hosted test deployment. Capture the five required views at 375px and 1440px. PR #3 remains draft until release verification is complete.
