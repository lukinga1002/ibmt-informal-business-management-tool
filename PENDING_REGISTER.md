# PENDING REGISTER — IBMT Rent

Consolidated 4 November 2026. Review round **F1 closed 7 November 2026**. **Ruling R-33 (joint owners) recorded and the broker register built, 7 November 2026.**
Tags: **BLOCKER** real use impossible · **BUILD** decided, not yet built · **OFF** deliberately switched off ·
**PLACEHOLDER** needs a real value · **MOCK** needs a real provider · **LIMIT** platform ceiling ·
**DEBT** model tidy-up · **UNTESTED** not yet exercised · **HOLD** your ruling outstanding.

---

## Rulings received 7 November 2026 — now in force

9. Both disclaimers appear on a certificate: "registration does not prove ownership" **and** the ownership-transfer notice.
10. Sales are anchored on a **Property**. Units registered one by one are grouped into a Property by the owner's confirmation; units under different owners are separate Properties. The agent cap is one month's rent per new tenancy.
11. One licence per broker **per council**.
12. The seller's OTP goes to the number on the **registration record**. If it differs from the account number, the seller attends the Mtaa office in person.
13. A new certificate number at each level; an issued document is never rewritten.
14. Public broker check shows **council name and status only**.
15. Audit log stays **admin-only**.
16. Commission accrued before a sale stays the seller's liability; an unpaid commission never blocks a sale.
17. First review is the **mtaa_officer**, final approval the **council_official**. A DC never decides.
18. Pre-date rent records are never re-attributed to the buyer.
19. Deposit holder stays "landlord" plus the party's name.
20. The entity reuse map is approved.
21. The old consent field is retired.
22. Rent receipts keep `receipt_reference`; no new receipt entity.
23. `property_type` retires later; `PolicyVersion` is dormant now (see F1 item 3).
24. On a suspected duplicate the landlord sees **"sent for review"** only.
25. `pending-otp:<phone>` as tenant id is accepted **for the demo only**; revisit before real use.
26. Tenant-initiated registration stays **OFF**.
27. Amnesty notice stays **OFF**.
28. One reason rule: 10 characters for approve, query and reject alike.
29. "Verified" means the documents were checked. Label it **"Nyaraka zimekaguliwa" / "Documents checked"**.
30. A code visible only in the owner's own session is accepted **for the demo only**.
31. Buyers reuse the four consent purposes; no fifth purpose.
32. No partial sale in A1.
34. Objections: owner of record, a tenant of the property, or a person filing a claim with evidence. No anonymous objections.
35. Objection window: 14 days from both signatures.
36. Effective date is the council approval time.
37. A deposit stays flagged until **both** parties confirm. No automatic outcome.
38. Compulsory broker registration reuses the council's enforcement mode and by-law.
39. **Build the broker register first.**
40. Transfer reminders are in-app only until SMS exists.
41. `asset_type` plus a `plots_register` flag off; no plot screens; legacy plot rows excluded.
69. Registration cases (`VerificationCase`) and ownership changes stay separate records.

### Ruling R-33 — joint owners (7 November 2026), now in force

1. A Property may hold one or more owners of record, and **every owner must sign a sale by OTP on their own verified number**. One owner can never sell alone.
2. Joint buyers: every buyer signs too.
3. Any joint owner may object during the objection window.
4. Lost phone: that owner attends the Mtaa office in person. A dead joint owner, or a signature that cannot be obtained, moves the case to the council office route. **A signature is never skipped.**
5. Adding or removing an owner is itself an ownership change: every existing owner's OTP, Mtaa review and council approval. It is refused while a sale is pending, so nobody removes a spouse and then sells alone.
6. All owners appear on the certificate and in the ownership history. The public check stays status-only, with **no names**.
7. One owner is marked **primary** for day-to-day leases, rent records and notices. That grants **no** power to sell alone.
8. Companies and estates **cannot** use the self-service sale route until further ruling; they go to the council office.

**On hold:** section K (NIDA) only. Nothing is built for it, and no NIDA number is stored anywhere, real or sample.

---

## A. Hard blockers before real use (8)

1. **BLOCKER** No transactions across records — a multi-record write that fails halfway leaves the earlier writes in place.
2. **BLOCKER** No unique index — "one payment per provider reference" is checked, not enforced by the database.
3. **BLOCKER** No row locks — narrowed to a conditional single-record claim, never eliminated.
4. **BLOCKER** Only one admin account exists, so two-person approval for money cannot actually be satisfied.
5. **BLOCKER** The lease template is `draft_pending_legal_review`.
6. **BLOCKER** App is unpublished, so certificate QR and public check links are not permanent.
7. **BLOCKER** The nine demo accounts are not invited.
8. **BLOCKER** No SMS gateway — every code is shown on screen. Registration codes are now hashed and salted, but they still cannot leave the system.

## B. Decided and still to build (6)

9. **BUILD** The Property anchor for sales (ruling 10), including the owner's grouping confirmation, and **joint owners on that anchor** (R-33: one or more owners of record, one marked primary).
10. **BUILD** Every-owner signing (R-33): an owners table per Property, an OTP challenge per owner, the sale refused until all of them have signed, and the Mtaa-in-person / council-office routes for a lost phone, a death or an unobtainable signature.
11. **BUILD** Owner changes as an ownership change (R-33.5): add or remove an owner needs every existing owner's OTP, Mtaa review and council approval, and is refused while a sale is pending.
12. **BUILD** Companies and estates routed to the council office for sales, never self-service (R-33.8).
13. **BUILD** Seller OTP to the registration-record number, with the in-person fallback when it differs from the account number (ruling 12).
14. **BUILD** "Sent for review" instead of the other unit's reference on a suspected duplicate (ruling 24), and the "Documents checked" label (ruling 29).

**Built:** one licence per broker per council, with a declared scope (rulings 11, 14, 38) — see J2.

## C. Amendment A1 — sequence

1. ~~Broker register (ruling 39)~~ **built 7 November 2026**, see J2. **Stop here for your nine-role test.**
2. A1.1 identity and Property anchor → A1.2 sale record → A1.3 signatures and objections → A1.4 certificates → A1.5 rent and deposits after a sale → A1.6 oversight.
3. Reminders ride a scheduled workflow, in-app only until SMS exists (ruling 40).

## D. Deliberately not built (5)

1. **OFF** No sale price field anywhere.
2. **OFF** No capital gains tax and no stamp duty calculation; stamp duty stays a placeholder object on the lease.
3. **OFF** No connection to e-Ardhi and no claim of one; the adapter is a labelled mock with no network call.
4. **OFF** No plot screens. Data model only, once item 41's flag exists.
5. **OFF** Eleven parked modules (operator, expenses, consumer, events, permits, TRA, ward reports, ratings, contributions, property manager, tax estimates).
6. **OFF** The public tax-compliance document: the `/documents` tab is gone, nothing calls `getTaxCompliance`, and no text suggests TRA has certified anyone.

## E. Values now in force (from `PolicyRule`, version `2026.1-stage1`)

`PolicyRule` is the single source for every rent rate. `PolicyVersion` is dormant for rent money.

| Rate | Value | State |
| --- | --- | --- |
| Agent commission | **1 month's rent** per new tenancy, landlord side, zero on renewal | placeholder, ruling 10 |
| Landlord service fee | 1% of rent | placeholder |
| Deposit cap | 1 month | placeholder |
| Rent withholding | **none** — no tax line exists in Stage 1 | dormant until Stage 3 |
| Display rounding | TZS 100,000 | placeholder |
| Suppression | 5 units, 3 landlords, 50% single share | placeholder |
| Advance-rent limit | stated, not enforced | placeholder |

Still needing real values: objection window 14 days (A1), ownership-change fee 0, broker registration fee 0 (ask before charging),
retention 730 / 365 / 180 days, unverified ward lists, stock estimates without a named source, the lease template review, and every figure in the demo data.

## F. Mocks to become real providers (6)

1. **MOCK** Payment partner `mock_partner` with a key in code. Real: provider account, signing secret in app secrets, status endpoint, public webhook URL.
2. **MOCK** SMS gateway — no code leaves the system.
3. **MOCK** Notifications are in-app only.
4. **MOCK** Payout numbers are recorded but never used; no rails.
5. **MOCK** Data export is a JSON file, not a signed PDF.
6. **MOCK** e-Ardhi adapter.

## G. Platform limits the design works around (6)

1. **LIMIT** No scheduler — the retention purge is an admin button; reminders need workflows.
2. **LIMIT** MFA is one app-wide switch, not per role.
3. **LIMIT** A list call returns at most 5,000 records with no sign it was cut.
4. **LIMIT** Rate limits are per caller; a service-role function is one caller for everyone.
5. **LIMIT** Audit immutability rests on an access rule, not on cryptography.
6. **LIMIT** The access log is written on exports and official openings, not on every read.

## H. Model debt (3)

1. **DEBT** Buildings whose units were registered individually have no `Property` row — the A1.1 grouping confirmation fixes this.
2. **DEBT** Ward assignments for Kinondoni and Ubungo (Sinza) still need correcting.
3. **DEBT** The nine demo accounts need their addresses and roles before they can be invited.

## I. Tests not yet run (6)

1. **UNTESTED** Every role viewing its own workspace with its own login.
2. **UNTESTED** Cross-council isolation with two councils signed in.
3. **UNTESTED** Two different admins approving the same money action.
4. **UNTESTED** A real SMS code reaching a real phone.
5. **UNTESTED** A cooling-off period allowed to elapse in real time.
6. **UNTESTED** A1's tests (nine carried from the brief plus the three added by R-33 in section M), and the broker **positive** path: naming a rental-scope broker on a mandate needs a second account, and only one admin account exists.

## J. Review round F1 — what changed and how it was checked (7 November 2026)

1. **Tax compliance document removed from public view.** The `/documents` tab list now holds only the lease and the rent receipt; `getTaxCompliance` has no caller; the specimen and the endpoint stay dormant; the delivery inventory and the API contract mark it dormant. *Checked:* grep shows the only remaining mention is the comment that explains why it is gone.
2. **Withholding and mandate wording replaced** in English and Swahili (`policy.consentSeparate`, `privacy.purposeMandatory`), in the demo consent rows and in the demo withdrawal error. The registration consent now reads "Inahitajika kwa huduma:". The four consents are described as they work: one required to run the service, three optional. *Checked:* grep for "withholding", "legal mandate" and "Lazima" returns only the honest "designed but switched off" policy line.
3. **Agent cap is one month's rent.** `PolicyRule.commission_cap = 1` (months of rent); `rentPayment` and `simPayment` read `PolicyRule` only, and `PolicyVersion` is no longer read by any rent path. No 8% and no TZS 150,000 remain anywhere in the code or the live rows. *Checked:* a quote of TZS 500,000 for one month returns `commission 500000`, `tax 0`, `policy_version 2026.1-stage1`.
4. **Registration OTP hardened.** Five minutes, five attempts, fifteen-minute lockout, three codes per phone per hour and three per person per hour, all from the R7 rules. Codes are six CSPRNG digits with a 16-byte random salt per code; only `salt` and `code_hash` are stored, on the admin-only `OtpChallenge` row; `VerificationCase` no longer has the field at all. Every write now runs on the service role. *Checked:* wrong code refused, five wrong codes set a 15-minute lockout, the correct code was then refused as locked, an expired challenge was refused, the correct code confirmed and the case moved to `submitted` — and that confirmation was run with **no session at all**, proving the no-account write path.
5. **`rentPayment` refuses while a council is in Stage 1** and no longer falls back to another tenant's tenancy. *Checked:* a payment for a unit whose council is `record` returned 409 `STAGE1_RECORD_ONLY` with no record written; a payment attempt as a tenant with no tenancy on the unit returned 404 instead of attaching to `tenancies[0]`.
6. **`decideOwnership` retired.** One decision engine in `shared/verification.ts`; `decideRegistration` is the path; the old endpoint resolves the unit's registration case, refuses an approval with no ownership evidence and writes an audit entry either way. *Checked:* approval on a real case issued a certificate with both disclaimers; approval on a unit with no evidence returned 409 `NO_EVIDENCE` and an `AuditLog` row with outcome `refused`.
7. **`Listing` public read removed.** Only owner, agent, landlord, ward, council and admin can read the table; public browsing goes through `listingBoard`, which returns area and listing detail only. *Checked:* the public row builder carries `listing_id`, `unit_ref`, headline, rent, type, bedrooms, ward, mtaa, district and `verified` — never `landlord_id`, `agent_id`, `consent_id` or `unit_id`.
8. **`User` reads restricted to self and admin.** Before this change there was **no read rule at all**, so any signed-in user could read every other user's record: `full_name`, `email`, `role`, `ibmt_role`, `district`, `region`, `council_id` and `ward_ids`. Now a user sees only their own row; admins see all. Backend functions that legitimately need another user's row already run on the service role, so nothing else breaks.
9. **Housekeeping.** The lint error in the ward verification screen (an unused import plus a dead eslint directive) is fixed and ESLint is clean on every file touched. The Inter and Space Grotesk font links are gone from `index.html`, and the old orange palette comment is gone from `index.css`. The production build passes.

**Test fixtures created by F1** (safe to delete, they are demo noise): units `IBMT-UNIT-2026-00955635`, `IBMT-UNIT-2026-02409032`, `IBMT-UNIT-2026-02418542`, with their registration cases and challenges, and certificate `IBMT-CERT-2026-01002` issued to the first of them.

---

## J2. Broker register — built 7 November 2026

Ruling 39 said brokers first, then stop. Built and tested on the server:

1. **One licence per broker per council (ruling 11).** `AgentLicence` now carries `council_id`, `council_name` and `scope`. The application resolves the council first and refuses a second open licence in the *same* council, while allowing a registration in another one.
   *Tested:* applied in Kinondoni (created); applied again in Kinondoni → returned the existing licence with `duplicate: true` and did **not** alter its scope; applied in Ubungo → a separate licence created.
2. **A declared scope: rental, sale or both.** A sale-only broker can never be named on a rental mandate, at creation or at signing.
   *Tested:* an approved sale-only licence named on a rental mandate → 403 `AGENT_SCOPE_SALE_ONLY`. The same licence switched to rental scope then passed the guard and the flow moved to the next check (422 "You cannot name yourself as the agent", because only one account exists).
3. **The public check answers with the council and the status only (ruling 14).**
   *Tested:* `IBMT-AGL-2026-0014` returned `status: approved` and `council: "Kinondoni Municipal Council"` — no name, no district, no ward, no phone number, and a disclaimer saying so.
4. **Both screens follow.** The council desk shows each broker's council and scope and filters by scope; the broker workspace lists every licence held, one per council, with its scope, and stops a second application in the same district before the server has to.
5. **Compulsory registration reuses the council's own setting (ruling 38).** Where a council's enforcement mode is not voluntary, the application screen says registration is required and cites the by-law when one is recorded. No new switch was added.
6. **Legacy rows repaired.** The two licences already in the table had no council; each was bound to the council of its district (Kinondoni, Ilala) with scope rental, so they display correctly and reach the right queue.

**Fixtures created and removed:** two test licences for the admin account (Kinondoni sale, Ubungo rental) and the number `IBMT-AGL-2026-000015`; both rows deleted, and no mandate was created.

---

## M. A1 tests added by R-33 (7 November 2026)

These three join the nine tests already agreed for A1:

10. A sale with one of two owners signed **cannot** move forward.
11. A joint owner's objection **freezes** the case.
12. An owner **cannot be removed** while a sale is pending.

From R-33.6 and R-33.7, the same round also checks: the certificate names every owner, the public check names none, and the primary owner still cannot sell alone.

---

## K. ON HOLD BY OWNER, 7 NOVEMBER 2026 — no build

Item 33 (joint owners) is **no longer on hold**: it is ruled as R-33 above and sequenced in section B and C.

**NIDA — ON HOLD BY OWNER, 7 November 2026.** No NIDA field, no screen, no number, real or sample, is built or stored anywhere in this app. The open questions from the previous register stay recorded so nothing is lost: who gives a number, mandatory or optional, storage shape, legal basis, duplicates, where it must never appear, estates and companies, audit. **This will not be raised again until the owner does.**