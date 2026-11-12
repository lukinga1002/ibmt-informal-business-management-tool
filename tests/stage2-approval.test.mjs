import test from 'node:test';
import assert from 'node:assert/strict';
import { feeIsApproved, feeEvidence } from '../base44/shared/councilFee.ts';
const council = { id:'c1', fee_revision_id:'v1', council_fee_type:'percent', council_fee_rate:.03, council_fee_fixed_amount:0, bylaw_reference:'SIM-BYLAW' };
const terms = { ...council, id:'v1', council_id:'c1', legal_opinion_reference:'SIM-OPINION' };
const first = { council_id:'c1', revision_id:'v1', admin_id:'a1' };
const second = { ...first, admin_id:'a2' };
test('Distinct admins must approve the same council revision',()=>{
  assert.ok(feeIsApproved(council,terms,[first,second]));
  for (const row of [first,{...second,revision_id:'old'},{...second,council_id:'other'}])
    assert.equal(feeIsApproved(council,terms,[first,row]),false);
});
test('Changing public terms invalidates approvals',()=>{
  for (const change of [{council_fee_rate:.04},{fee_revision_id:'v2'},{bylaw_reference:''}])
    assert.equal(feeIsApproved({...council,...change},terms,[first,second]),false);
  assert.equal(feeIsApproved(council,{...terms,legal_opinion_reference:''},[first,second]),false);
});
test('Foreign revision cannot be returned',async()=>{
  await assert.rejects(()=>feeEvidence({CouncilSettlementTerms:{get:async()=>({...terms,council_id:'other'})}},council));
});
