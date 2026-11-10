import { getPolicyRules } from "./moneyOps.ts";
import { allRows, payoutFor, walletState } from "./stage2Payout.ts";
import { incomeForSettlement } from "./r7.ts";

export async function recordSettlement(app, payment) {
  if (payment.stage !== "stage2_partner") return;
  const db = app.asServiceRole.entities;
  if (!payment.tenancy_id) throw new Error("Stage 2 requires a signed tenancy");
  const existing = await allRows(db.SimSettlement, { payment_id: payment.id });
  if (existing.length > 1)
    throw new Error("Duplicate partner settlement; reconciliation required");
  if (existing.length) return existing[0];
  const tenancy = await db.Tenancy.get(payment.tenancy_id);
  const unit = await db.RentalUnit.get(tenancy.unit_id);
  const payout = await payoutFor(db, unit.property_id);
  if (!payout.account)
    throw new Error("Payout approval or payment consent is missing");
  const policy = await getPolicyRules(app);
  if (!policy) throw new Error("Configure the active payment policy");
  const terms = await db.CouncilSettlementTerms.get(payment.fee_revision_id);
  const income = incomeForSettlement(
    {
      runs: true,
      rent_total: payment.rent_total,
      council_fee: payment.council_fee,
      partner_charge: payment.partner_charge,
    },
    {
      ibmt_fee_basis: terms.ibmt_fee_basis,
      ibmt_fee_rate: terms.ibmt_fee_rate,
      partner_rebate_rate: payment.rates_snapshot?.partner_rebate_rate ?? policy.partner_rebate_rate,
    },
  );
  return db.SimSettlement.create({
    payment_id: payment.id,
    fee_status: payment.fee_status,
    council_id: payment.council_id,
    property_id: unit.property_id,
    council_amount: payment.council_fee,
    partner_amount: payment.partner_charge,
    landlord_amount: payment.landlord_remainder + (payment.deposit_amount || 0),
    landlord_state: walletState(
      payout.account,
      payment.landlord_remainder + (payment.deposit_amount || 0),
      policy.mobile_wallet_limit,
    ),
    settled_at: payment.succeeded_at,
    fee_revision_id: terms.id,
    income: {
      ...income,
      contract_status: terms.ibmt_contract_status,
      contract_reference: terms.ibmt_contract_reference,
    },
  });
}

export function reconciliation(settlements, ledger, bills) {
  const partner = settlements.reduce((s, r) => s + r.council_amount, 0);
  const book = ledger
    .filter((r) => r.account === "council_fee_payable")
    .reduce((s, r) => s + (r.side === "credit" ? r.amount : -r.amount), 0);
  const gepg = bills
    .filter((b) => b.state === "settled")
    .reduce((s, b) => s + b.amount, 0);
  return {
    partner,
    ledger: book,
    gepg,
    balanced: partner === book && book === gepg,
  };
}

export function invoiceLines(
  bills,
  settlements,
  adjustments,
  month,
  invoices = [],
) {
  const used = new Set(
    invoices
      .filter((i) => i.state === "issued")
      .flatMap((i) => (i.lines || []).map((l) => l.source_id)),
  );
  const ids = new Set(
    bills
      .filter((b) => b.state === "settled" && b.day.slice(0, 7) <= month)
      .flatMap((b) => (b.lines || []).map((l) => l.source_id)),
  );
  return [
    ...settlements
      .filter((s) => !used.has(s.id) && ids.has(s.id))
      .map((s) => ({
        source_id: s.id,
        basis: "settled_bill",
        amount: s.income.system_fee,
        contract_status: s.income.contract_status,
      })),
    ...adjustments
      .filter((a) => !used.has(a.id) && ids.has(a.id))
      .map((a) => ({
        source_id: a.id,
        basis: "reversal_credit",
        amount: a.system_fee,
        contract_status: "signed",
      })),
  ];
}

export async function reverseSettlement(app, paymentId) {
  const db = app.asServiceRole.entities;
  const originals = await allRows(db.SimSettlement, { payment_id: paymentId });
  const old = await allRows(db.SimSettlementAdjustment, {
    payment_id: paymentId,
  });
  for (const row of originals) {
    if (old.some((a) => a.source_id === row.id)) continue;
    await db.SimSettlementAdjustment.create({
      payment_id: paymentId,
      council_id: row.council_id,
      source_id: row.id,
      council_amount: -row.council_amount,
      system_fee: -row.income.system_fee,
      partner_rebate: -row.income.partner_rebate,
      created_at: new Date().toISOString(),
    });
  }
}
