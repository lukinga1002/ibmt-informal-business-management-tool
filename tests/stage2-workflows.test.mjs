import test from "node:test";
import assert from "node:assert/strict";
import {
  accountReady,
  walletState,
  payoutFor,
} from "../base44/shared/stage2Payout.ts";
import {
  invoiceLines,
  reconciliation,
  reverseSettlement,
} from "../base44/shared/stage2Settlement.ts";
const roster = { id: "r", owners: [{ owner_id: "A" }, { owner_id: "B" }] };
const account = {
  id: "n",
  status: "cooling_off",
  cooling_off_ends_at: "2020-01-01T00:00:00Z",
  roster_id: "r",
  consent: true,
  name_check: "matched",
  approvals: [{ owner_id: "A" }, { owner_id: "B" }],
  account_type: "mobile_money",
};
test("Every verified owner must approve the current account after cooling-off", () => {
  assert.ok(accountReady(account, roster));
  for (const change of [
    { approvals: [{ owner_id: "A" }] },
    { roster_id: "old" },
    { name_check: "mismatch" },
    { consent: false },
    { status: "requested" },
    { cooling_off_ends_at: null },
    { cooling_off_ends_at: new Date(Date.now() + 10000).toISOString() },
  ])
    assert.equal(accountReady({ ...account, ...change }, roster), false);
});
test("Unknown and exceeded mobile limits hold the landlord share", () => {
  assert.equal(walletState(account, 100, undefined), "held_limit");
  assert.equal(walletState(account, 101, 100), "held_limit");
  assert.equal(walletState(account, 100, 100), "settled");
  assert.equal(
    walletState({ ...account, account_type: "bank" }, 101, null),
    "settled",
  );
});
test("The old approved account remains effective while a replacement cools off", async () => {
  const rows = [
    {
      ...account,
      id: "new",
      record_kind: "nomination",
      cooling_off_ends_at: new Date(Date.now() + 10000).toISOString(),
    },
    { ...account, id: "old", record_kind: "nomination" },
    { ...roster, record_kind: "verified_roster" },
    ...["new", "old"].flatMap((id) =>
      ["A", "B"].map((owner_id) => ({
        record_kind: "owner_approval",
        old_account_id: id,
        owner_id,
      })),
    ),
  ];
  const db = { PayoutAccountChange: { filter: async () => rows } };
  assert.equal((await payoutFor(db, "p")).account.id, "old");
  rows.unshift({ record_kind: "consent_withdrawal", created_date: "9999" });
  assert.equal((await payoutFor(db, "p")).account, null);
});
test("Only settled bills reach invoices; issued sources cannot be billed twice", () => {
  const settlements = [
    { id: "s", income: { system_fee: 45000, contract_status: "signed" } },
  ];
  const bills = [
    { state: "settled", day: "2026-11-10", lines: [{ source_id: "s" }] },
  ];
  assert.equal(
    invoiceLines(bills, settlements, [], "2026-11")[0].amount,
    45000,
  );
  assert.equal(
    invoiceLines(
      [{ ...bills[0], state: "pending" }],
      settlements,
      [],
      "2026-11",
    ).length,
    0,
  );
  assert.equal(
    invoiceLines(bills, settlements, [], "2026-12", [
      { state: "issued", lines: [{ source_id: "s" }] },
    ]).length,
    0,
  );
});
test("Reconciliation detects a missing partner, ledger or GePG amount", () => {
  const s = [{ council_amount: 90000 }],
    l = [{ account: "council_fee_payable", side: "credit", amount: 90000 }],
    b = [{ state: "settled", amount: 90000 }];
  assert.ok(reconciliation(s, l, b).balanced);
  assert.equal(reconciliation(s, [], b).balanced, false);
  assert.equal(reconciliation(s, l, []).balanced, false);
});
test("Reversal retains original documents and creates a linked adjustment once", async () => {
  const old = {
      id: "s",
      council_id: "c",
      council_amount: 90000,
      income: { system_fee: 45000, partner_rebate: 22500 },
    },
    rows = [];
  const db = {
    SimSettlement: { filter: async () => [old] },
    SimSettlementAdjustment: {
      filter: async () => rows,
      create: async (row) => rows.push(row),
    },
  };
  await reverseSettlement({ asServiceRole: { entities: db } }, "p");
  await reverseSettlement({ asServiceRole: { entities: db } }, "p");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].council_amount, -90000);
  assert.equal(rows[0].system_fee, -45000);
  assert.equal(rows[0].partner_rebate, -22500);
  assert.equal(old.council_amount, 90000);
});
