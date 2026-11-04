# Open questions — to settle together

Running list. Nothing here blocks the build; each one needs your decision before
the affected behaviour is treated as final.

## R2 — rental data model

1. **Role binding is blocked on accounts.** The nine demo accounts cannot be
   created here; they need invites. Paste the addresses (or invite them from
   App Users) and the roles, council and wards get bound, then the three R2
   tests can be run as real users.
2. **Entity reuse mapping** — approve before more code depends on it:
   Unit = `RentalUnit` (not renamed), AgentMandate = `Mandate`,
   RentRecord = `RentPayment`, DepositRecord = `SecurityDeposit`,
   Property = new `Property`.
3. **Consent shape** — the four booleans were replaced by one row per purpose.
   Confirm the old field names are retired.
4. **Rent receipts** — a confirmed record carries `receipt_reference`. The
   `Receipt` entity is still the parked operator-module receipt. Do you want a
   separate rent receipt entity?
5. **Duplicates left dormant** — `property_type` (superseded by `unit_type`)
   and `PolicyVersion` (superseded by `TaxRule` + `PolicyRule`). Retire or keep?

## R3 — registration and verification

6. **OTP delivery in the demo build.** The code is shown only to the landlord
   (or admin) in their own session; a helper never sees it. Real SMS waits for
   the notification adapter. Confirm this is acceptable for the pilot
   walkthrough.
7. **Duplicate review visibility.** The officer sees the other unit's
   reference so they can compare the two records. The landlord also sees that
   reference on their own case. Should the landlord see only "sent for review"
   without the other reference?
8. **Migrated tenancy without an account.** The tenant confirms by code and
   has no user account yet, so `Tenancy.tenant_id` holds
   `pending-otp:<phone>` until they register. Accept, or require a tenant
   account first?
9. **Tenant-initiated registration stays OFF**
   (`src/config/r3.js` → `TENANT_INITIATED_REGISTRATION`). It is also closed on
   the server: self-registration is refused for anyone whose role is not
   landlord. Confirm it stays off until the council moves to compulsory mode.
10. **Amnesty notice stays OFF** (`AMNESTY_NOTICE_ENABLED`). The screen exists
    and is never mounted. Only TRA can grant an amnesty; say the word in
    writing before it is ever shown.
11. **Certificate QR host.** The QR points at `<current origin>/cert/<number>`.
    It becomes a permanent public link only after the app is published on its
    real domain. Publish before printing certificates for real use.
12. **Verification is ownership-free.** The certificate says registration does
    not prove ownership, but approval still sets the unit to `verified`, which
    is what unlocks a lease. Confirm that "verified" means "documents checked
    by the Mtaa officer", not "ownership proven".
13. **Reason minimum length** is 10 characters for approve, query and reject
    alike. Keep one rule, or relax it for approval?