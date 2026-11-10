import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import { feeEvidence } from '../../shared/councilFee.ts';

export default async function (req) {
  try {
    const app = createClientFromRequest(req);
    const user = await app.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');
    const input = await req.json();
    const id = cleanText(input.council_id);
    const admin = user.role === 'admin';
    if (!admin && (user.data?.ibmt_role !== 'council_official' || !id || user.data?.council_id !== id))
      return fail(403, 'JURISDICTION', 'Council access required');
    const db = app.asServiceRole.entities;
    const council = await db.Council.get(id);
    const evidence = await feeEvidence(db, council);
    if (input.action === 'read') return json({ ...evidence, simulation:true });
    if (!admin) return fail(403, 'FORBIDDEN', 'Admin required');
    if (input.action === 'propose') {
      const t = input.terms || {};
      const rate = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
      if (!['percent','fixed'].includes(t.council_fee_type) || !rate(t.council_fee_rate) ||
          !Number.isSafeInteger(t.council_fee_fixed_amount) || t.council_fee_fixed_amount < 0 ||
          !rate(t.ibmt_fee_rate) || !['share_of_rent','share_of_council_fee'].includes(t.ibmt_fee_basis) ||
          !['draft','signed'].includes(t.ibmt_contract_status) ||
          (t.ibmt_contract_status === 'signed' && !cleanText(t.ibmt_contract_reference)))
        return fail(422, 'VALIDATION', 'Invalid simulation terms');
      const publicTerms = { council_fee_type:t.council_fee_type, council_fee_rate:t.council_fee_rate,
        council_fee_fixed_amount:t.council_fee_fixed_amount, bylaw_reference:cleanText(t.bylaw_reference) };
      const revision = await db.CouncilSettlementTerms.create({ ...publicTerms, council_id:id,
        legal_opinion_reference:cleanText(t.legal_opinion_reference), gepg_sp_code:cleanText(t.gepg_sp_code),
        ibmt_fee_basis:t.ibmt_fee_basis, ibmt_fee_rate:t.ibmt_fee_rate,
        ibmt_contract_reference:cleanText(t.ibmt_contract_reference), ibmt_contract_status:t.ibmt_contract_status,
        placeholder_status:'placeholder' });
      await db.Council.update(id,{...publicTerms,fee_revision_id:revision.id,council_fee_status:'proposed'});
      return json({revision_id:revision.id,simulation:true});
    }
    if (input.action !== 'approve') return fail(422,'VALIDATION','Unknown action');
    if (evidence.terms?.id !== input.revision_id || !evidence.terms?.bylaw_reference?.trim() ||
        !evidence.terms?.legal_opinion_reference?.trim()) return fail(409,'TERMS_CHANGED','Review current terms and both references');
    if (!evidence.approvals.some(row=>row.admin_id===user.id))
      await db.CouncilFeeApproval.create({council_id:id,revision_id:input.revision_id,admin_id:user.id});
    const fresh = await db.Council.get(id);
    const proof = await feeEvidence(db,fresh);
    if (fresh.fee_revision_id !== input.revision_id) return fail(409,'TERMS_CHANGED','Review current terms');
    if (proof.approved) await db.Council.updateMany({id,fee_revision_id:input.revision_id},{$set:{council_fee_status:'in_force'}});
    return json({approved:proof.approved,simulation:true});
  } catch {
    return fail(500,'SERVER','Could not process simulated council terms');
  }
}
