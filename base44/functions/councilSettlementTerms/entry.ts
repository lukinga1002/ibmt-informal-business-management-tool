import { allRows, payoutFor } from "../../shared/stage2Payout.ts";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { requestUser } from "../../shared/requestUser.ts";
import { cleanText, fail, json } from "../../shared/moneyOps.ts";
import { feeEvidence } from "../../shared/councilFee.ts";

export default async function (req) {
  try {
    const app = createClientFromRequest(req);
    const user = await requestUser(app);
    if (!user) return fail(401, "SESSION_EXPIRED", "Sign in required");
    const input = await req.json();
    const id = cleanText(input.council_id);
    const admin = user.role === "admin";
    if (
      !admin &&
      (user.data?.ibmt_role !== "council_official" ||
        !id ||
        user.data?.council_id !== id)
    )
      return fail(403, "JURISDICTION", "Council access required");
    const db = app.asServiceRole.entities;
    const council = await db.Council.get(id);
    const evidence = await feeEvidence(db, council);
    if (input.action === "read") return json({ ...evidence, simulation: true });
    if (!admin) return fail(403, "FORBIDDEN", "Admin required");
    if (input.action === "configureSimulation") {
      if (!["record", "partner"].includes(input.rent_stage))
        return fail(422, "VALIDATION", "Choose Stage 1 or simulated Stage 2");
      const rate = (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1;
      if (
        !rate(input.partner_charge_rate) ||
        !rate(input.partner_rebate_rate) ||
        input.partner_rebate_rate > input.partner_charge_rate ||
        !Number.isFinite(input.payout_cooling_off_hours) ||
        input.payout_cooling_off_hours < 24 ||
        (input.mobile_wallet_limit != null &&
          (!Number.isSafeInteger(input.mobile_wallet_limit) ||
            input.mobile_wallet_limit <= 0))
      )
        return fail(
          422,
          "VALIDATION",
          "Set the placeholder rates and cooling-off. Wallet limit must come from the simulated partner.",
        );
      const rows = await db.PolicyRule.filter({}, "-effective_from", 100);
      const active = (Array.isArray(rows) ? rows : rows.items || []).find(
        (r) => !r.effective_to,
      );
      if (!active)
        return fail(
          409,
          "POLICY_REQUIRED",
          "Create the initial policy rule first",
        );
      await db.PolicyRule.update(active.id, {
        partner_charge_rate: input.partner_charge_rate,
        partner_rebate_rate: input.partner_rebate_rate,
        landlord_service_fee_rate: 0,
        payment_parameters_status: "placeholder",
        mobile_wallet_limit: input.mobile_wallet_limit,
        payout_cooling_off_hours: input.payout_cooling_off_hours,
      });
      await db.Council.update(id, { rent_stage: input.rent_stage });
      if (input.rent_stage === "partner" && council.rent_stage !== "partner") {
        const units = await allRows(db.RentalUnit, { council_id: id });
        for (const landlord of new Set(
          (Array.isArray(units) ? units : units.items || []).map(
            (u) => u.landlord_id,
          ),
        )) {
          const properties = [
            ...new Set(
              units
                .filter((u) => u.landlord_id === landlord)
                .map((u) => u.property_id),
            ),
          ];
          const ready = await Promise.all(
            properties.map(async (propertyId) =>
              propertyId
                ? Boolean((await payoutFor(db, propertyId)).account)
                : false,
            ),
          );
          if (ready.length && ready.every(Boolean)) continue;
          await db.Notification.create({
            subject_id: landlord,
            kind: "stage2_payout_required",
            channel: "in_app",
            sent_via: "in_app (simulation)",
            body: {
              sw: "Majaribio: halmashauri imeingia Hatua 2. Thibitisha akaunti na idhini kabla ya mkataba mpya.",
              en: "Simulation: council moved to Stage 2. Verify payout account and consent before activating a new lease.",
            },
          });
        }
      }
      return json({ simulation: true });
    }
    if (input.action === "propose") {
      const t = input.terms || {};
      const rate = (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1;
      if (
        !["percent", "fixed"].includes(t.council_fee_type) ||
        !rate(t.council_fee_rate) ||
        !Number.isSafeInteger(t.council_fee_fixed_amount) ||
        t.council_fee_fixed_amount < 0 ||
        !rate(t.ibmt_fee_rate) ||
        !["share_of_rent", "share_of_council_fee"].includes(t.ibmt_fee_basis) ||
        !["draft", "signed"].includes(t.ibmt_contract_status) ||
        (t.ibmt_contract_status === "signed" &&
          !cleanText(t.ibmt_contract_reference))
      )
        return fail(422, "VALIDATION", "Invalid simulation terms");
      const publicTerms = {
        council_fee_type: t.council_fee_type,
        council_fee_rate: t.council_fee_rate,
        council_fee_fixed_amount: t.council_fee_fixed_amount,
        bylaw_reference: cleanText(t.bylaw_reference),
      };
      const revision = await db.CouncilSettlementTerms.create({
        ...publicTerms,
        council_id: id,
        legal_opinion_reference: cleanText(t.legal_opinion_reference),
        gepg_sp_code: cleanText(t.gepg_sp_code),
        ibmt_fee_basis: t.ibmt_fee_basis,
        ibmt_fee_rate: t.ibmt_fee_rate,
        ibmt_contract_reference: cleanText(t.ibmt_contract_reference),
        ibmt_contract_status: t.ibmt_contract_status,
        placeholder_status: "placeholder",
      });
      await db.Council.update(id, {
        ...publicTerms,
        fee_revision_id: revision.id,
        council_fee_status: "proposed",
      });
      return json({ revision_id: revision.id, simulation: true });
    }
    if (input.action !== "approve")
      return fail(422, "VALIDATION", "Unknown action");
    if (
      evidence.terms?.id !== input.revision_id ||
      !evidence.terms?.bylaw_reference?.trim() ||
      !evidence.terms?.legal_opinion_reference?.trim()
    )
      return fail(
        409,
        "TERMS_CHANGED",
        "Review current terms and both references",
      );
    if (!evidence.approvals.some((row) => row.admin_id === user.id))
      await db.CouncilFeeApproval.create({
        council_id: id,
        revision_id: input.revision_id,
        admin_id: user.id,
      });
    const fresh = await db.Council.get(id);
    const proof = await feeEvidence(db, fresh);
    if (fresh.fee_revision_id !== input.revision_id)
      return fail(409, "TERMS_CHANGED", "Review current terms");
    if (proof.approved)
      await db.Council.updateMany(
        { id, fee_revision_id: input.revision_id },
        { $set: { council_fee_status: "in_force" } },
      );
    return json({ approved: proof.approved, simulation: true });
  } catch {
    return fail(500, "SERVER", "Could not process simulated council terms");
  }
}

