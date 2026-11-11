# Local Stage 2 Chrome checks

Keep `base44 dev` running in the first PowerShell window. Use the `stage2-sim` checkout, not main: the runner exercises modules still under Stage 2 verification. In a second PowerShell window, from the repository root:

```powershell
.\scripts\Run-Stage2BrowserChecks.ps1
```

The launcher installs Playwright into the Windows temporary directory if necessary; it does not change package.json, package-lock.json or application dependencies. Google Chrome must already be installed. An alternative installed Microsoft Edge can be selected with `-Channel msedge`. Do not disable browser security if Google refuses sign-in in an automated browser; that check is blocked rather than bypassed.

The runner opens a separate browser session. Sign in in Chrome, then return to the second PowerShell window and press Enter. Do not type passwords or OTPs into PowerShell. Each additional role uses a separate, independent account and isolated browser context. Answer N if an account is unavailable; this creates a blocked check, not a pass.

Only a loopback page and loopback configured backend are accepted. The administrator setup creates or reuses the fictional SIM-TEST council and an initial placeholder policy when absent. No real council terms are approved, no OTPs sent, no payments initiated, and no commercial fees activated. The runner performs read-permission checks and permission-denial attempts with invalid payloads that cannot form a valid bill or proposal. No real provider is connected.

The available roles are admin, second-admin, landlord, joint-owner, unrelated-user, council-official and other-council-official. Council staff must have the appropriate real test-user role metadata and jurisdiction. Admins cannot substitute for owner or council accounts. All sessions must use different account IDs.

Screenshots at widths 375 and 1440 cover council terms and fees, and-when the corresponding synthetic records exist-landlord payout, joint-owner approval, succeeded Stage 2 receipt and issued invoice panels. An empty invoice or nomination is never counted as evidence of that workflow. Screenshot capture and overflow checks do not substitute for human visual/accessibility review.

The runner deliberately does not mark the complete approval/payment lifecycle as passed. Two-admin approvals, OTP ownership and replay, cooling-off, held-wallet release, full settlement/reversal lifecycle and hosted entity RLS require their own end-to-end checks. Existing Node tests cover several of these using mocked storage; that is different evidence.

Results are saved under a new `%TEMP%\ibmt-stage2-qa-*` folder. It contains REPORT.md, report.json and screenshots. Browser contexts stay in memory and are closed after the run; no storageState, cookie files, traces or network logs are exported. Use synthetic data only and review screenshots for personal details before sharing them. Exit code 0 means no failed/blocked checks, 1 means a failure and 2 means outstanding blocked checks. Given the unimplemented lifecycle checks, a normal run currently exits 2.

Share REPORT.md, report.json and the relevant screenshots in ChatGPT. No live deployment or main-branch release is performed by the runner.
