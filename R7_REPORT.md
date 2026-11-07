# R7 — Money engine (simulated), security and demo

Built 4 November 2026. Stages 2 and 3 are **simulation only**. No payment provider is connected, no money moves, and every screen that touches a simulated figure says so.

---

## 1. What is now real, and what is not

| Piece | State | What makes it real |
| --- | --- | --- |
| Split engine (tax → agent commission → service fee → landlord) | **Real logic**, server only, whole TZS, rounding to the landlord | Nothing. This is arithmetic and it is finished. |
| Rates used by the split | Read from the active **PolicyRule** row (`2026.1-stage1`): agent commission **one month's rent** per new tenancy, landlord service fee 1%, deposit cap 1 month, **no withholding at all**. `PolicyVersion` is dormant and no rent path reads it. | Confirm the rates. There is no percentage commission and no shilling cap anywhere in the code. |
| Payment states and transitions | **Real**, one table in `shared/r7.ts`, every move validated there | Nothing. |
| Double-entry ledger | **Real logic**, append-only by design, one balanced group per settled payment | It is append-only because only the functions write it and RLS denies everyone else. There is no database-level immutability — see §3. |
| Partner callbacks (signature, separate status check, duplicate reference, alert queue) | **Mock partner.** The demo can sign its own callbacks with a key held in the code | A real provider account, its webhook signing secret in app secrets, its status endpoint, and a public webhook URL. The rules are already the ones a real provider would have to follow. |
| OTP — payout change, registration and migration | **Real rules** (5 minutes, 5 attempts, 15-minute lockout, 3 codes per phone and 3 per person per hour), codes from the CSPRNG, a random 16-byte salt per code, and only `salt` + `code_hash` stored on the admin-only `OtpChallenge` row. Registration cases carry no code data at all. | An SMS gateway. The payout demo still stores the plain code because it is played on screen; the code must go to the old number only and never be returned to the browser. |
| Cooling-off on a payout change | **Real** (24 hours, configurable in `shared/r7.ts`) | Nothing, but for a meeting you cannot wait 24 hours — show the state and say so. |
| Two-person approval for money actions | **Real rule**, but only one admin account exists today, so a second person must be invited before a refund can actually be approved | Invite a second admin (App Users). |
| Ledger alerts | **Real**, four open items from today's tests are visible in the queue | A person still has to work the queue; nothing auto-corrects. |
| Data export, consents, access history, anonymisation | **Real**, server-side, each action written to the access or audit log | Nothing for the pilot. The export is a JSON file, not a signed PDF. |
| Retention purge | **Runs**, but every period is a placeholder | Legal sign-off on the periods, then set them on the `RetentionPolicy` row. |
| MFA for council, DC, RC and admin | **Not available per role.** MFA is one switch for the whole app (Settings → Authentication → Require MFA for app users) | Either turn it on for everyone, or keep role separation and accept that MFA is not role-specific. |

---

## 2. Every remaining mock and placeholder

1. **Mock partner** — `provider: mock_partner`. A callback is signed with a key in `shared/r7.ts`, and the demo may play the partner. Real: provider secret in app secrets, signature verified against that secret, provider status endpoint called, real provider reference.
2. **Placeholder rates in the worked examples** — a stage-3 test set (10% tax, 1% service fee, one month of commission), used by the demo switch and the arithmetic tests only. A normal run reads the active `PolicyRule` row: one month's rent commission, 1% service fee, no withholding.
3. **Codes shown on screen** — because no SMS is sent. Registration and migration codes are already hashed with a per-code salt and stored on the admin-only challenge row; only the payout demo still stores its plain code so the simulation can be played. Real: SMS gateway, nothing returned to the browser.
4. **Payout numbers are recorded, never used** — no rails.
5. **Retention periods** — 730 / 365 / 180 days, marked `placeholder: true`, and the purge refuses to run unless an admin ticks "this is a test run".
6. **Anonymisation** — replaces names it is allowed to write (`RentalUnit.landlord_name`, `Viewing.tenant_name`) and withdraws consents. It does not close the login: that is the platform's, not this screen's.
7. **Demo data** — every landlord, tenant, unit, lease, payment and dispute in the app is synthesised. No real personal data is used anywhere.
8. **Access log coverage** — an entry is written when a person exports their records and when officials open records. It is not yet written on every single read; that would need each function to log, and is listed as a gap.

---

## 3. Base44 limits and known gaps — the honest answer on money

**Transactions: no.** Base44 does not run transactions across several records. A multi-record write that fails halfway leaves the earlier records written.

**Unique constraints: no.** Base44 entities have no unique index. "One payment per provider reference" cannot be enforced by the database.

**Row locks: no.** Base44 does not lock records.

What this build does instead, in one place per risk:

- **Duplicate protection** is an explicit check plus an idempotency key (`SimPayment.idempotency_key`, `LedgerEntry` written only once per payment). It narrows the window; it does not close it.
- **Concurrent callbacks** use a conditional single-record claim: `updateMany({ id, state: <the state just read> }, { $set: … })`, and the code refuses to credit unless `updated` comes back. Two callbacks arriving together cannot both win. This is the documented Base44 substitute for a row lock, and it is what is used here.
- **The ledger is never edited** — a correction writes the opposite lines with a reason and an actor, and both stay. But immutability is enforced by access rules and by the functions, not by the storage engine.
- **Alert queue** catches what slips: a signature that fails, a reference that repeats, a status or amount that disagrees, a state move that is not allowed.

**Other gaps**

- **No per-role MFA.** One app-wide switch (Settings → Authentication). Turning it on protects every role at once, including tenants on feature phones.
- **No scheduler inside the app.** The retention purge is a button an admin presses. To make it automatic it needs a workflow on a schedule calling `privacyDesk`.
- **The audit log's immutability** relies on an access rule naming a role that does not exist. That blocks updates and deletes through the API, but it is not cryptographic.
- **Rate limits** apply per caller: per signed-in user, per anonymous IP, and one shared budget for a service-role function. Current ceilings for this app (builder plan, 2× multiplier): filter/list/count 140 per minute per caller, create 160, update 140, bulkCreate and updateMany 50, deleteMany 60 per 30 seconds, and about 400 MB read / 25 MB written per minute for the whole app. A service-role function serving everyone is one caller, so a loop over users inside a function is the fastest way to a 429.
- **A list call returns at most 5,000 records with no sign it was cut.** Exports and registers must therefore page, not assume completeness.
- **No signed PDF** for the data export; it is JSON. Add a PDF builder if a commissioner wants a printed copy.

**Until transactions and uniqueness exist, do not take real money on this app.** The honest position: the arithmetic, the states and the ledger are ready; the storage engine cannot yet guarantee the atomicity a payment needs. That must be resolved and independently tested before a real provider is connected.

---

## 4. Test results by phase

All runs were made against the live backend today, on this app.

**Phase 1 — split engine (`simPayment selfTest`): 10 / 10 passed**

| Check | Expected | Result |
| --- | --- | --- |
| New tenancy, 500,000 × 6 | tax 300,000 · agent 500,000 · fee 30,000 · landlord 2,170,000 | passed |
| Renewal | tax 300,000 · agent 0 · fee 30,000 · landlord 2,670,000 | passed |
| Stage 3 off | tax 0, no tax line, fee 30,000 | passed |
| Stage 1 | no split, no service fee | passed |
| Rounding on an odd amount (100,003) | lines sum to the rent, landlord remainder whole | passed |
| Deposit | added on the first payment only (1,000,000 vs 500,000) | passed |
| Ledger balance | debits = credits (6,000,000 = 6,000,000) | passed |
| State machine | pending→succeeded yes, succeeded→pending no, reversed terminal | passed |
| Refund guard | 100,001 on 100,000 refused, 40,000 accepted | passed |
| Masking | phone and ID not recoverable from the masked form | passed |

**Phase 2 — callback signature: 3 / 3 passed.** Valid signature accepted; tampered amount refused; another key refused. Total self-test 13/13.

**Phase 3 — end-to-end simulated payment**

| Check | Result |
| --- | --- |
| Initiate 3,000,000 for 6 months at placeholder rates | split 300,000 / 500,000 / 30,000 / 2,170,000, state `initiated` |
| Callback with a bad signature | refused, `BAD_SIGNATURE`, alert raised |
| Callback with a good signature | state `succeeded`, 7 ledger lines written, balanced |
| Replay with a different claimed status | refused, `STATUS_MISMATCH`, nothing credited |
| Reuse of a provider reference on another payment, correctly signed | refused, `DUPLICATE_REFERENCE`, alert raised |
| State history | `start→initiated`, `initiated→pending`, `pending→succeeded` |
| Ledger after two settled payments | debits 7,000,000 = credits 7,000,000 |

**Phase 4 — controls**

| Check | Result |
| --- | --- |
| Payout change asks for a code on the **old** number | yes; both numbers masked in storage (`255*******78`) |
| Code lifetime | 5 minutes |
| Wrong code | refused, `OTP_REFUSED`, attempt counted |
| Correct code | state `cooling_off`, ends 24 hours later |
| Activating before cooling-off ends | refused, `COOLING_OFF` |
| Refund larger than the amount paid | refused, `REFUND_TOO_LARGE` |
| Requester approving their own money action | refused, `SECOND_PERSON_REQUIRED` |
| Alert queue after the failures above | 4 open items: 1 duplicate, 1 status mismatch, 2 signature |

**Phase 5 — privacy**

| Check | Result |
| --- | --- |
| Summary returns four separate purposes | core on, the other three off, each with its own version |
| Contacts masked on screen | `lu*********@gmail.com` |
| Export | 6 units, 29 leases, 4 rent records, 2 simulated payments, downloaded as JSON |
| Export writes an access entry | yes, 1 row appeared in "who accessed my records" |
| Retention policy | `placeholder: true`, three classes, run confirmed and logged |
| Purge run | 0 removed (nothing older than the periods) — correct |

**Not tested:** two different admins approving the same action (only one admin account exists), a real SMS code, waiting out a real cooling-off period, and every role view with its own login (the demo accounts are still not invited).

---

## 5. The 7-minute demo

Full bilingual script: `DEMO_SCRIPT.md`.

| Time | Beat | Screen |
| --- | --- | --- |
| 0:00 | The problem | Land / Rent hub |
| 0:45 | A landlord registers a unit | `/rent/landlord/register` |
| 1:45 | The Mtaa officer verifies it | `/rent/ward/verification` |
| 2:30 | The lease is signed | `/rent/landlord/lease/new` → `/rent/lease/:id` |
| 3:15 | Rent recorded, receipt issued | `/rent/tenant/pay` → `/rent/landlord/money` |
| 4:15 | A tenant checks an agent | `/verify` |
| 4:45 | The council's building register | `/rent/council` |
| 5:30 | The DC dashboard | `/rent/district` |
| 6:15 | Stages 2 and 3, as simulation | `/rent/sim` |

What to say aloud at the end: *"The arithmetic, the ledger and the controls are ready. What is not ready is the part a bank insists on: Base44 cannot yet run transactions across records or enforce uniqueness, so no real money is taken on this app until that is fixed and independently tested. Everything you have just seen in stages 2 and 3 is a simulation."*

---

## 6. Review round F1 — 7 November 2026

Nine fixes from the independent review of commit `9c3d01c`, each verified on the server.

| # | Fix | How it was tested |
| --- | --- | --- |
| 1 | Public tax-compliance document withdrawn: the `/documents` tab holds only the lease and the rent receipt, nothing calls `getTaxCompliance`, and the specimen and endpoint stay dormant | grep: no caller, no screen, no text suggesting TRA has certified anyone |
| 2 | "Mandatory withholding processing" and "confirmed legal mandate" replaced in both languages and in the demo consent rows; the registration consent reads "Inahitajika kwa huduma:" | grep for the old phrases returns only the honest "designed but switched off" policy line |
| 3 | Agent cap is one month's rent; `PolicyRule` is the single source; `rentPayment` and `simPayment` no longer read `PolicyVersion`; no 8%, no TZS 150,000 | quote of 500,000 for one month returns commission 500,000, tax 0, `policy_version 2026.1-stage1` |
| 4 | Registration OTP: 5 minutes, 5 attempts, 15-minute lockout, hourly limits, random salt per code, hash only, on the admin-only `OtpChallenge`; every write on the service role | wrong code refused; five wrong codes locked it; the correct code was then refused as locked; an expired challenge was refused; the correct code confirmed the case **with no session at all** |
| 5 | `rentPayment` refuses while the council is in Stage 1 and has no `tenancies[0]` fallback | 409 `STAGE1_RECORD_ONLY` with nothing written; 404 for a caller with no tenancy on the unit |
| 6 | `decideOwnership` retired behind `shared/verification.ts`; approval refused without evidence; audit entry either way | approval issued a certificate carrying both disclaimers; a no-evidence approval returned 409 `NO_EVIDENCE` plus an `AuditLog` row with outcome `refused` |
| 7 | `Listing` public database read removed; public browsing goes through `listingBoard` only | the public row carries area and listing detail, never `landlord_id`, `agent_id`, `consent_id` or `unit_id` |
| 8 | `User` reads restricted to self and admin — before, there was no read rule and any signed-in user could read every other user's name, email, role, jurisdiction and ward list | rule in `User.jsonc`; the backend functions that legitimately need another user's row already run on the service role |
| 9 | Ward verification lint error, the Inter and Space Grotesk font links, and the old orange palette comment | ESLint clean on every touched file; production build passes |

Test fixtures created by these checks (safe to delete): units `IBMT-UNIT-2026-00955635`, `IBMT-UNIT-2026-02409032`, `IBMT-UNIT-2026-02418542`, their registration cases and OTP challenges, and certificate `IBMT-CERT-2026-01002`.