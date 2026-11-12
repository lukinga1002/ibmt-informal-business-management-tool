import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSplit,
  incomeForSettlement,
  buildSettlementLedger,
  reversalAdjustments,
  runWorkedExamples,
} from "../base44/shared/r7.ts";

const rates = {
  council_fee_type: "percent",
  council_fee_rate: 0.03,
  partner_charge_rate: 0.02,
  commission_share: 1,
  service_fee_rate: 0,
};
const rent = {
  stage: "stage2",
  rent_total: 3000000,
  monthly_rent: 500000,
  months: 6,
  rates,
};
for (const [name, options, amounts] of [
  [
    "New tenancy with deposit",
    { deposit_amount: 500000 },
    [90000, 500000, 60000, 2350000],
  ],
  ["Renewal", { new_tenancy: false }, [90000, 0, 60000, 2850000]],
  [
    "Fixed fee",
    {
      rates: {
        ...rates,
        council_fee_type: "fixed",
        council_fee_fixed_amount: 20000,
      },
    },
    [20000, 500000, 60000, 2420000],
  ],
  [
    "Whole shilling rounding",
    { new_tenancy: false, months: 1, rent_total: 333333, monthly_rent: 333333 },
    [9999, 0, 6666, 316668],
  ],
])
  test(name, () => {
    const s = computeSplit({ ...rent, ...options });
    assert.deepEqual(
      [
        s.council_fee,
        s.agent_commission,
        s.partner_charge,
        s.landlord_remainder,
      ],
      amounts,
    );
    assert.equal(s.tenant_pays, s.rent_total + s.deposit);
    assert.ok(!s.lines.some((line) => line.key === "service_fee"));
    const ledger = buildSettlementLedger(s);
    assert.equal(ledger.debits, ledger.credits);
    assert.ok(ledger.lines.every((line) => line.account));
  });

test("Stage 1 bypass and one-month shortfall", () => {
  assert.equal(computeSplit({ ...rent, stage: "stage1" }).runs, false);
  assert.throws(
    () => computeSplit({ ...rent, rent_total: 500000, months: 1 }),
    /25000/,
  );
});
test("Income is external to the rent split", () => {
  const s = computeSplit(rent);
  for (const [basis, rate, expected] of [
    ["share_of_rent", 0.015, 45000],
    ["share_of_council_fee", 0.3, 27000],
  ]) {
    assert.deepEqual(
      incomeForSettlement(s, {
        ibmt_fee_basis: basis,
        ibmt_fee_rate: rate,
        partner_rebate_rate: 0.0075,
      }),
      { system_fee: expected, partner_rebate: 22500 },
    );
  }
});
test("Existing R7 worked examples", () =>
  assert.equal(runWorkedExamples().failed, 0));

test("A full reversal credits the original settled amounts", () => {
  assert.deepEqual(
    reversalAdjustments({
      council_fee: 90000,
      system_fee: 45000,
      partner_rebate: 22500,
    }),
    { council_fee: -90000, system_fee: -45000, partner_rebate: -22500 },
  );
  assert.throws(() => reversalAdjustments({ council_fee: 90000 }));
});

test("Fractional, unsafe and negative payment inputs are refused", () => {
  for (const [key, value] of [
    ["rent_total", 1.1],
    ["monthly_rent", -1],
    ["months", 1.5],
    ["deposit_amount", -1],
    ["rent_total", Number.MAX_SAFE_INTEGER + 1],
  ])
    assert.throws(() => computeSplit({ ...rent, [key]: value }));
});
