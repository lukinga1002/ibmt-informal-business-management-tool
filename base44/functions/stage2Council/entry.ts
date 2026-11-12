import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { requestUser } from "../../shared/requestUser.ts";
import { cleanText, fail, json } from "../../shared/moneyOps.ts";
import { allRows } from "../../shared/stage2Payout.ts";
import { reconciliation, invoiceLines } from "../../shared/stage2Settlement.ts";
import { BillingBusyError, withCouncilBillingClaim } from "../../shared/billingClaim.ts";

export default async function (req) {
  try {
    const app = createClientFromRequest(req),
      user = await requestUser(app);
    if (!user) return fail(401, "SESSION_EXPIRED", "Sign in required");
    const input = await req.json(),
      id = cleanText(input.council_id),
      admin = user.role === "admin";
    if (
      !admin &&
      (user.data?.ibmt_role !== "council_official" ||
        user.data?.council_id !== id)
    )
      return fail(403, "JURISDICTION", "Council access required");
    const db = app.asServiceRole.entities;
    await db.Council.get(id);
    const load = async () => ({
      settlements: await allRows(db.SimSettlement, { council_id: id }),
      bills: await allRows(db.SimCouncilBill, { council_id: id }),
      invoices: await allRows(db.SimCouncilInvoice, { council_id: id }),
      adjustments: await allRows(db.SimSettlementAdjustment, { council_id: id }),
    });
    const { settlements, bills, invoices, adjustments } = await load();
    if (input.action === "read")
      return json({
        simulation: true,
        ...(admin
          ? {
              partner_rebate_report:
                settlements.reduce(
                  (v, s) => v + (s.income.partner_rebate || 0),
                  0,
                ) +
                adjustments.reduce((v, a) => v + (a.partner_rebate || 0), 0),
            }
          : {}),
        settlements: settlements.map((s) => ({
          id: s.id,
          property_id: s.property_id,
          council_amount: s.council_amount,
          fee_status: s.fee_status,
          day: s.settled_at.slice(0, 10),
        })),
        bills,
        invoices,
      });
    if (!admin)
      return fail(
        403,
        "FORBIDDEN",
        "Only the simulation admin creates bills and invoices",
      );
    if (input.action === "batch") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day))
        return fail(422, "VALIDATION", "Settlement date required");
      // Decide and create under the council's billing claim, from a fresh read,
      // so a concurrent run can neither add a second bill for the day nor bill
      // a settlement or adjustment another bill already carries.
      return await withCouncilBillingClaim(db, id, async () => {
      const { settlements, bills, adjustments } = await load();
      const old = bills.filter((b) => b.day === input.day);
      if (old.length > 1)
        return fail(
          409,
          "DUPLICATE_BATCH",
          "Review duplicate batches in the alert queue",
        );
      if (old.length) return json({ bill: old[0], simulation: true });
      const used = new Set(
        bills.flatMap((b) => (b.lines || []).map((l) => l.source_id)),
      );
      const lines = [
        ...settlements
          .filter(
            (s) => s.settled_at.slice(0, 10) <= input.day && !used.has(s.id),
          )
          .map((s) => ({
            source_id: s.id,
            payment_id: s.payment_id,
            amount: s.council_amount,
          })),
        ...adjustments
          .filter(
            (a) => a.created_at.slice(0, 10) <= input.day && !used.has(a.id),
          )
          .map((a) => ({
            source_id: a.id,
            payment_id: a.payment_id,
            amount: a.council_amount,
          })),
      ];
      const bill = await db.SimCouncilBill.create({
        council_id: id,
        day: input.day,
        control_number: "SIM-" + id + "-" + input.day,
        lines,
        amount: lines.reduce((s, l) => s + l.amount, 0),
        state: "settled",
        settled_at: new Date().toISOString(),
      });
      return json({ bill, simulation: true });
      });
    }
    if (input.action === "invoice") {
      if (!/^\d{4}-\d{2}$/.test(input.month))
        return fail(422, "VALIDATION", "Invoice month required");
      return await withCouncilBillingClaim(db, id, async () => {
      const { settlements, bills, invoices, adjustments } = await load();
      const old = invoices.find(
        (i) => i.month === input.month && i.state === "issued",
      );
      if (old) return json({ invoice: old, simulation: true });
      const ledger = [];
      for (const paymentId of new Set(settlements.map((s) => s.payment_id)))
        ledger.push(
          ...(await allRows(db.LedgerEntry, { payment_id: paymentId })),
        );
      const check = reconciliation(
        settlements.concat(
          adjustments.map((a) => ({ council_amount: a.council_amount })),
        ),
        ledger,
        bills,
      );
      if (!check.balanced) {
        await db.PaymentAlert.create({
          kind: "amount_mismatch",
          detail: "Simulation: invoice blocked by reconciliation",
          state: "open",
          observed: check,
        });
        return fail(
          409,
          "RECONCILIATION_REQUIRED",
          "Reconcile partner, ledger and SIM-GePG before invoicing",
        );
      }
      const lines = invoiceLines(
        bills,
        settlements,
        adjustments,
        input.month,
        invoices,
      );
      const eligible =
        lines.length && lines.every((l) => l.contract_status === "signed");
      const invoice = {
        council_id: id,
        month: input.month,
        reference: "SIM-INVOICE-" + id + "-" + input.month,
        lines,
        amount: lines.reduce((s, l) => s + l.amount, 0),
        state: eligible ? "issued" : "non_payable_preview",
        bill_ids: bills
          .filter((b) => b.day.startsWith(input.month))
          .map((b) => b.id),
      };
      if (eligible) await db.SimCouncilInvoice.create(invoice);
      return json({ invoice, simulation: true });
      });
    }
    if (input.action === "reconcile") {
      const ledger = [];
      for (const paymentId of new Set(settlements.map((s) => s.payment_id)))
        ledger.push(
          ...(await allRows(db.LedgerEntry, { payment_id: paymentId })),
        );
      const adjusted = settlements.concat(
        adjustments.map((a) => ({ council_amount: a.council_amount })),
      );
      const result = reconciliation(adjusted, ledger, bills);
      if (!result.balanced)
        await db.PaymentAlert.create({
          kind: "amount_mismatch",
          detail: "Simulation: council three-way reconciliation difference",
          state: "open",
          observed: result,
        });
      return json({ result, simulation: true });
    }
    return fail(422, "VALIDATION", "Unknown action");
  } catch (error) {
    if (error instanceof BillingBusyError)
      return fail(409, "BILLING_BUSY", error.message);
    return fail(
      500,
      "SERVER",
      "Could not process simulated council settlement",
    );
  }
}

