import { payoutFor } from "./stage2Payout.ts";
import { STAGE } from "./r7.ts";
import { feeEvidence } from "./councilFee.ts";

/** Resolve the council from the registered tenancy, never a browser-supplied stage. */
export async function settlementRules(app, user, input, policy) {
  let councilId = String(input.council_id || "");
  if (input.tenancy_id) {
    const tenancy = await app.entities.Tenancy.get(input.tenancy_id);
    if (
      user.role !== "admin" &&
      tenancy.landlord_id !== user.id &&
      tenancy.tenant_id !== user.id
    )
      throw new Error("That tenancy is not yours");
    if(input.action==='initiate' && tenancy.status!=='active')throw new Error('Activate the signed tenancy first');
    if(Number(input.monthly_rent)!==tenancy.rent_amount || Number(input.rent_total)!==tenancy.rent_amount*Number(input.months))
      throw new Error('Simulated rent must equal the registered monthly rent multiplied by whole months');
    const unit = await app.entities.RentalUnit.get(tenancy.unit_id);
    if (!unit.council_id || (councilId && councilId !== unit.council_id))
      throw new Error("Council mismatch");
    councilId = unit.council_id;
    if (
      unit.property_id &&
      !(await payoutFor(app.asServiceRole.entities, unit.property_id)).consent
    )
      return {
        stage: STAGE.stage1,
        council: null,
        terms: null,
        approved: false,
      };
  }
  if (!councilId)
    return { stage: STAGE.stage1, council: null, terms: null, approved: false };
  const council = await app.entities.Council.get(councilId);
  if (council.rent_stage !== "partner")
    return { stage: STAGE.stage1, council, terms: null, approved: false };
  const proof = await feeEvidence(app.asServiceRole.entities, council);
  if (council.council_fee_status === "in_force" && !proof.approved)
    throw new Error("Two approvals of the current fee are required");
  const partnerRate = policy?.partner_charge_rate;
  if (!Number.isFinite(partnerRate) || partnerRate < 0 || partnerRate > 1)
    throw new Error("Configure the placeholder partner rate");
  return {
    stage: STAGE.stage2,
    council,
    terms: proof.terms,
    approved: proof.approved,
    rates: {
      council_fee_type: council.council_fee_type,
      council_fee_rate: council.council_fee_rate,
      council_fee_fixed_amount: council.council_fee_fixed_amount,
      partner_charge_rate: partnerRate,
      service_fee_rate: 0,
    },
  };
}
