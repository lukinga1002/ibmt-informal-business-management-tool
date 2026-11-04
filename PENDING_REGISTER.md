# PENDING REGISTER — IBMT Rent
Consolidated 4 November 2026. Every open item across R2–R7 and Amendment A1, in one list.
Tags: **BLOCKER** real use impossible · **RULING** your decision needed · **QUESTION** needs an answer ·
**OFF** deliberately switched off · **PLACEHOLDER** needs a real value · **MOCK** needs a real provider ·
**LIMIT** platform ceiling · **DEBT** model tidy-up · **UNTESTED** not yet exercised.

## A. Hard blockers before real use (8)

1. **BLOCKER** No transactions across records — a multi-record write that fails halfway leaves the earlier writes in place.
2. **BLOCKER** No unique index — "one payment per provider reference" cannot be enforced by the database, only by an explicit check.
3. **BLOCKER** No row locks — substituted by a conditional single-record claim (`updateMany` on `{id, state}`); narrows the window, does not close it.
4. **BLOCKER** Only one admin account exists — the two-person rule for money actions cannot actually be satisfied until a second admin is invited.
5. **BLOCKER** The lease template is `draft_pending_legal_review` — it must not be used for really signing leases until reviewed.
6. **BLOCKER** App is unpublished — the certificate QR and public check links point at a local origin, not a permanent public address.
7. **BLOCKER** The nine demo accounts are not invited — no role view (landlord, tenant, agent, mtaa, council, DC, RC, TRA) has been tested as itself.
8. **BLOCKER** No SMS gateway — every OTP (registration, lease, mandate, payout change, and A1 sale signatures) is displayed on screen instead.

## B. Conflicts needing your ruling (11)

9. **RULING** Certificate wording: A1's ownership-transfer disclaimer sits *beside* the existing "usajili si uthibitisho wa umiliki", or replaces it? I assume both appear.
10. **RULING** Ownership anchor: sales at building (`Property`) level, or per unit? A building registered unit-by-unit has no property row, and one building may hold units under different owners.
11. **RULING** `AgentLicence.apply` currently permits exactly **one** open licence per broker — multi-council broker registration is impossible until that becomes one per council. This changes R5.
12. **RULING** Which number is "the phone already verified on the record" for a seller's OTP: the registration record's number, or the account profile's number (which R7 payout changes use)? They can differ.
13. **RULING** At `sale_recorded`: a **new** certificate number with the old one superseded and another on `transfer_confirmed`, or one certificate whose level changes? I prefer new numbers — an issued document is never rewritten.
14. **RULING** The public broker check returns district today; it must answer "registered in *this* council". Council name replaces district, status only.
15. **RULING** `AuditLog` rows are readable only by their actor or an admin — so a council official cannot see the document-view log. Open it per council, or leave admin-only?
16. **RULING** Agent mandate ends at `sale_recorded`. Confirm the seller stays liable for commission accrued before that date, and that an unpaid commission never blocks a sale.
17. **RULING** "Two different people": the Mtaa review and the final approval must differ. Confirm both must be `council_official`, or whether a DC may give the second approval.
18. **RULING** Rent split: each rent record stores its own landlord, so pre-date records stay with the seller with no rewriting. Confirm those receipts are never re-attributed to the buyer afterwards.
19. **RULING** `SecurityDeposit.held_by` is landlord / agent / tenant / other. It cannot say "seller" or "buyer" — add values, or keep "landlord" and record the party name?

## C. Questions carried forward from R2 and R3 (12)

20. **QUESTION** Approve the entity reuse map before more code rests on it: Unit = `RentalUnit`, AgentMandate = `Mandate`, RentRecord = `RentPayment`, DepositRecord = `SecurityDeposit`, Property = `Property`.
21. **QUESTION** Consent shape changed to one row per purpose — confirm the old four-boolean field is retired.
22. **QUESTION** Rent receipts use `RentPayment.receipt_reference`. The `Receipt` entity is still the parked operator receipt. Do you want a separate rent receipt entity?
23. **QUESTION** Two dormant duplicates: `property_type` (superseded by `unit_type`) and `PolicyVersion` (superseded by `TaxRule` + `PolicyRule`). Retire or keep?
24. **QUESTION** On a suspected duplicate, the landlord currently sees the other unit's reference. Show "sent for review" only instead?
25. **QUESTION** A migrated tenancy with no tenant account stores `pending-otp:<phone>` as the tenant id. Accept, or require an account first?
26. **OFF** Tenant-initiated registration is off in config and refused on the server for non-landlords. Confirm it stays off until a council moves to compulsory mode.
27. **OFF** Amnesty notice exists but is never mounted. Only TRA can grant an amnesty — written approval needed before it is ever shown.
28. **QUESTION** Reason minimum is 10 characters for approve, query and reject alike. Keep one rule, or relax it for approval?
29. **QUESTION** "Verified" means the Mtaa officer checked the documents, not that ownership is proven. Confirm the wording wherever the status is shown.
30. **QUESTION** Acceptable for the pilot that an OTP is visible only in the landlord's own session and never to a helper?
31. **QUESTION** Do A1 buyer consents reuse the four existing purposes, or does a sale need a fifth?

## D. Amendment A1 — the answers I need before writing it (10)

32. **QUESTION** Partial sale: none in A1, and a later split transfers unit records rather than splitting a title. Confirm.
33. **QUESTION** Co-owners: A1 assumes a single owner of record — or must joint owners (spouses, estates, companies) each sign? This changes the data model.
34. **QUESTION** Who may object: only the owner of record, or also a tenant of the property and anyone filing a claim with evidence? I propose all three.
35. **QUESTION** Objection window of 14 calendar days starting when **both** signatures are complete — confirmed?
36. **QUESTION** Effective date is the council approval time, not a date the parties type — confirm.
37. **QUESTION** Deposit holder: if only one of seller and buyer confirms, does the tenancy stay flagged, or become "unconfirmed" after a period?
38. **QUESTION** Compulsory broker registration reuses the council's existing enforcement mode and by-law rather than a new switch — correct?
39. **QUESTION** Sequence: A1.1 data model → A1.6 oversight as listed, or the broker register first because it is small and unblocks the R5 council test?
40. **QUESTION** The 30 and 90 day transfer reminders need a scheduled workflow (no scheduler in the app), in-app only until SMS exists. Acceptable?
41. **QUESTION** Plots: `asset_type` and a `plots_register` flag off, no screens — and existing legacy rows with `property_type: "plot"` excluded from all screens while the flag is off. Confirm.

## E. Deliberately not built (5)

42. **OFF** No sale price field anywhere, by decision.
43. **OFF** No capital gains tax and no stamp duty calculation, by decision — stamp duty stays a placeholder object on the lease.
44. **OFF** No connection to e-Ardhi and no claim of one — title number and reference are manual fields, adapter is a labelled mock with no network call.
45. **OFF** No plot screens at all; data model only.
46. **OFF** Eleven parked modules (operator, expenses, consumer, events, permits, TRA, ward reports, ratings, contributions, property manager, tax estimates) — all flags false, routes and backend both gated.

## F. Placeholders needing real values (8)

47. **PLACEHOLDER** Policy rates: tax 0% (deliberate until stage 3), service fee 1%, agent commission 8% capped at 150,000.
48. **PLACEHOLDER** Objection window 14 days (A1).
49. **PLACEHOLDER** Ownership change fee 0 (fixed by decision) and broker registration fee 0 — ask before charging any amount.
50. **PLACEHOLDER** Retention periods 730 / 365 / 180 days, marked placeholder; purge refuses without an admin's test-run tick.
51. **PLACEHOLDER** Advance rent limit, deposit cap, commission cap, suppression thresholds (5 units, 3 landlords, 50% single share), display rounding 100,000.
52. **PLACEHOLDER** Council ward lists are marked unverified, and stock estimates are only allowed to show with a named source.
53. **PLACEHOLDER** Lease template version label and its legal review.
54. **PLACEHOLDER** Every landlord, tenant, unit, lease, payment and dispute is synthesised demo data.

## G. Mocks to become real providers (6)

55. **MOCK** Payment partner: `mock_partner`, signature key in code. Real needs a provider account, a signing secret in app secrets, a status endpoint and a public webhook URL.
56. **MOCK** SMS: no gateway, so codes are shown on screen and not hashed at rest.
57. **MOCK** Notifications are in-app only.
58. **MOCK** Payout numbers are recorded but never used — no rails.
59. **MOCK** Data export is a JSON file, not a signed PDF.
60. **MOCK** e-Ardhi adapter.

## H. Platform limits the design works around (6)

61. **LIMIT** No scheduler inside the app — the retention purge is an admin button; reminders need workflows.
62. **LIMIT** MFA is one app-wide switch, not per role, so council, DC, RC and admin cannot be protected separately from tenants.
63. **LIMIT** A list call returns at most 5,000 records with no sign it was cut — every export and register must page.
64. **LIMIT** Rate limits are per caller, and a service-role function is one caller for everyone.
65. **LIMIT** Audit immutability rests on an access rule naming a non-existent role — it blocks API edits, it is not cryptographic.
66. **LIMIT** The access log is written on exports and official record openings, not on every read.

## I. Model debt and housekeeping (4)

67. **DEBT** Buildings whose units were registered individually have no `Property` row to anchor a sale.
68. **DEBT** Ward assignments for Kinondoni and Ubungo (Sinza) still need correcting.
69. **DEBT** Keep `VerificationCase` (registration) and the new `OwnershipChange` (sale, inheritance, gift, court order) as separate cases — approve, so registration history is never overwritten.
70. **DEBT** The nine demo accounts need their addresses and roles from you before they can be invited.

## J. Tests not yet run (7)

71. **UNTESTED** Every role viewing its own workspace with its own login.
72. **UNTESTED** Cross-council isolation with two councils signed in.
73. **UNTESTED** Two different admins approving the same money action.
74. **UNTESTED** A real SMS code reaching a real phone.
75. **UNTESTED** A cooling-off period allowed to elapse in real time.
76. **UNTESTED** A1's nine tests: free at every step, seller OTP never to a new number, objection freezes, one person cannot do both reviews, old rent stays with the seller and the lease continues, ownership history preserved, a broker registered only in Ubungo cannot take a Kinondoni mandate, the public check reveals nothing, no plot screen reachable.
77. **UNTESTED** The plot route being unreachable (it does not exist yet — this becomes a test only once the data model lands).

---

## K. NIDA identity number — raised 4 November 2026 (9)

Capture the NIDA number for landowners, agents, tenants and buyers, to make the register easier. Nothing is built. No NIDA field exists anywhere today; masking helpers for phones and ID numbers are already in place.

78. **QUESTION** Who must give a number: owners and brokers only, or every adult (tenants, buyers, sellers too)?
79. **QUESTION** Mandatory or optional per role? A missing number either blocks registration or marks the record "identity not confirmed". I propose mandatory for owners and brokers, optional for tenants in Stage 1.
80. **QUESTION** Is there a NIDA verification agreement, or do you intend to obtain one? There is no API here and no way for this app to verify a number itself, so until an agreement exists the number is typed by hand and marked **"not verified by NIDA"**, with a mock adapter and no claim of any link — the same rule already applied to e-Ardhi.
81. **RULING** Storage shape: the full number is never shown again after entry. Keep a hash for matching, the last four digits for the human, and a masked display. Who may ever see the full value, and under what circumstance?
82. **RULING** Legal basis: a statutory function under the council's by-law, or consent for a stated purpose? A national ID number is sensitive personal data under the Personal Data Protection Act, so before the first number is stored the data controller must be named and the retention and breach duties written down.
83. **QUESTION** Duplicates: the same NIDA number on two accounts is flagged for review and never merged automatically — a merge would rewrite ownership history. Confirm.
84. **QUESTION** Where it must never appear: certificates, the public check, aggregates, council exports and the DC/RC dashboards. Confirm, so those show masked counts only.
85. **DEBT** Estates and companies have no NIDA number of their own, so the sale and inheritance routes need a second identifier (registration or estate number) — this ties into the co-owner question at 33.
86. **DEBT** Every view of a NIDA number goes to the `AuditLog`, and the number is stripped from all logs, exports and error messages — the masking rule exists and must be applied to this field the day it is added.

---

### The five that gate the next build

9 (certificate wording), 10 (ownership anchor), 11 (broker multi-council rule), 12 (verified phone source), 40 (reminder schedule).
Answer those five and A1.1 and A1.2 can be written without further assumptions.