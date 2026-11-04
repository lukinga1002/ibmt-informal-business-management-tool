# PARKED FEATURES — IBMT Rent pilot

Everything below is switched off by a flag in **ModuleSettings** (one row, `key: module-settings`).
Every flag is `false` for the rental pilot.

Parking is a switch, never a deletion: entity schemas, backend functions and records stay exactly as
they are. Turning a flag back to `true` restores both the route and the backend call.

Two-sided enforcement:
1. **Route** — `ModuleGate` renders the notice page ("Huduma hii haipatikani kwa sasa." / "This service
   is not available right now.") instead of the screen, so a direct URL cannot open a parked feature.
2. **Backend** — the function calls `requireModule(base44, flag)` from `base44/shared/moduleGate.ts`
   before it reads or writes anything, and refuses with `403 MODULE_OFF`.

A parked flag is missing or not exactly `true` → treated as off (fail closed).

| Flag | Pages | Backend functions | Entities kept but inactive |
|---|---|---|---|
| `operator_module` | `/operator`, `/operator/onboarding`, `/operator/receipts`, `/operator/money`, `/operator/operations`, `/operator/settings` | `operatorOverview`, `createReceipt`, `issueReceipt`, `confirmReceipt` | BusinessProfile, Receipt |
| `expenses_module` | `/operator/money` | `createExpense`, `financialSummary` | Expense |
| `consumer_module` | `/consumer`, `/consumer/cases`, `/consumer/contributions`, `/consumer/settings` | — | Contribution |
| `events_module` | `/council`, `/council/complaints` | `councilOverview` | Complaint (rent complaints stay active through the optional `module` field) |
| `permits_module` | `/council/permits` | `createPermit`, `decidePermit` | Permit, VendorDeposit, Booking |
| `tra_module` | `/tra`, `/tra/access`, `/rent/tra` | — | TaxEstimate (TRA views) |
| `ward_reports_module` | — | `decideWardReport` | WardReport |
| `ratings_module` | — | — | Rating |
| `contributions_module` | `/consumer/contributions` | — | Contribution |
| `property_manager_module` | `/rent/manager` | — | — |
| `tax_estimates_module` | — | — | TaxEstimate |

## Not parked (rent pilot, live)

`/rent`, `/rent/landlord*`, `/rent/tenant*`, `/rent/agent`, `/rent/ward`, `/rent/council`,
`/verify`, `/documents`, `/ussd`, `/data-rights`, landing page.

Backend functions kept live: `createUnit`, `submitOwnershipEvidence`, `decideOwnership`,
`landlordOverview`, `rentPayment`.

## Restoring a parked module

1. Set its flag to `true` in the ModuleSettings row (admin only).
2. Nothing else: the route gate reads the same row, and the backend gate reads it before each call.

## Data rule

No record was deleted, renamed or reshaped by parking. Parked records remain readable to the platform
admin for audit, which is how the parked data is verified.