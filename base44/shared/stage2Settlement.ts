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
  // A Stage 2 payment can only start with consent and an approved account
  // (settlementRules, leasePayoutGuard). If consent was withdrawn, or the
  // account lapsed, before the tenant's money arrived, the money is still
  // collected. It used to throw here after the ledger was written, leaving no
  // settlement, a broken council reconciliation and the landlord's share held
  // nowhere (found 2026-11-12). The settlement is now recorded with the
  // landlord's share held ('held_account') until an eligible account exists,
  // and the case goes to the alert queue for review.
  const heldForAccount = !payout.account;
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
  const settlement = await db.SimSettlement.create({
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
    held_reason: heldForAccount
      ? (payout.consent ? "no_eligible_payout_account" : "payment_consent_withdrawn")
      : null,
    fee_revision_id: terms.id,
    income: {
      ...income,
      contract_status: terms.ibmt_contract_status,
      contract_reference: terms.ibmt_contract_reference,
    },
  });
  if (heldForAccount)
    await db.PaymentAlert.create({
      payment_id: payment.id,
      kind: "state_violation",
      state: "open",
      detail:
        "Simulation: landlord share held because the property has no eligible payout account or consent was withdrawn after the payment started",
      observed: { settlement_id: settlement.id, consent: payout.consent },
    });
  return settlement;
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

/**
 * The IBMT system-fee lines a council invoice may consider for a month: every
 * settled-bill line not yet carried by an issued invoice, either as a billed
 * line or as an excluded one.
 *
 * Eligibility is per line. A line is invoiceable only when the IBMT-council
 * contract was signed when its settlement happened (`contract_status`). A
 * reversal credit inherits the status of the settlement it reverses: crediting
 * a fee that was never invoiceable would understate the invoice (found
 * 2026-11-12: credits were hard-coded as signed).
 */
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
      .flatMap((i) => [...(i.lines || []), ...(i.excluded_lines || [])].map((l) => l.source_id)),
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
      .map((a) => {
        const original = settlements.find((s) => s.id === a.source_id);
        return {
          source_id: a.id,
          reverses: a.source_id,
          basis: "reversal_credit",
          amount: a.system_fee,
          contract_status: original?.income?.contract_status || "unknown",
        };
      }),
  ];
}

/** Splits invoice lines into the payable part and the part that may never be invoiced. */
export function invoiceEligibility(lines) {
  const payable = lines.filter((l) => l.contract_status === "signed");
  const excluded = lines.filter((l) => l.contract_status !== "signed");
  const sum = (rows) => rows.reduce((s, l) => s + l.amount, 0);
  return { payable, excluded, amount: sum(payable), excluded_amount: sum(excluded) };
}

/**
 * What a reversal means for the landlord's share (docs/STAGE2_REVERSAL_RECOVERY.md).
 *
 * - Share still held: the hold is cancelled, so it can never be released.
 * - Share already paid out: the money is not recovered, and nothing here
 *   pretends it is. An open SimRecoveryException records it, with a ledger group
 *   that makes it visible in the books: landlord_recovery_receivable (debit)
 *   against partner_clearing (credit). No deduction, set-off or clawback.
 *
 * Idempotent: a repeat finds the exception and its ledger group by settlement.
 */
export async function recordReversalLandlordState(app, paymentId) {
  const db = app.asServiceRole.entities;
  const out = { cancelled: 0, exceptions: 0 };
  for (const row of await allRows(db.SimSettlement, { payment_id: paymentId })) {
    if (row.landlord_state === "held_limit" || row.landlord_state === "held_account") {
      const moved = await db.SimSettlement.updateMany(
        { id: row.id, landlord_state: row.landlord_state },
        { $set: { landlord_state: "cancelled_by_reversal" } },
      );
      if (moved && moved.updated) out.cancelled++;
      continue;
    }
    if (row.landlord_state !== "settled") continue;
    if ((await allRows(db.SimRecoveryException, { settlement_id: row.id })).length) continue;
    const groupId = `${row.id}-unrecovered-payout`;
    const now = new Date().toISOString();
    if (!(await allRows(db.LedgerEntry, { group_id: groupId })).length) {
      await db.LedgerEntry.bulkCreate(
        [
          { account: "landlord_recovery_receivable", side: "debit" },
          { account: "partner_clearing", side: "credit" },
        ].map((line) => ({
          ...line,
          payment_id: paymentId,
          group_id: groupId,
          posting: 90,
          amount: row.landlord_amount,
          currency: "TZS",
          actor_role: "payment_engine",
          simulation: true,
          recorded_at: now,
        })),
      );
    }
    await db.SimRecoveryException.create({
      payment_id: paymentId,
      settlement_id: row.id,
      council_id: row.council_id,
      property_id: row.property_id,
      amount: row.landlord_amount,
      state: "open",
      ledger_group_id: groupId,
      reason: "Payment reversed after the landlord share was paid out; not recovered",
      recorded_at: now,
      simulation: true,
    });
    out.exceptions++;
  }
  return out;
}

/** Open recovery exceptions against the ledger's receivable, for reconciliation. */
export function recoverySummary(exceptions, ledger) {
  const open = exceptions.filter((e) => e.state === "open");
  const amount = open.reduce((s, e) => s + e.amount, 0);
  const receivable = ledger
    .filter((r) => r.account === "landlord_recovery_receivable")
    .reduce((s, r) => s + (r.side === "debit" ? r.amount : -r.amount), 0);
  return { open: open.length, amount, ledger_receivable: receivable, matched: amount === receivable };
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
  return recordReversalLandlordState(app, paymentId);
}
