/** Verify approvals against the complete revision, never the public status flag alone. */
export function feeIsApproved(council, terms, approvals) {
  if (!terms || terms.id !== council.fee_revision_id || terms.council_id !== council.id) return false;
  for (const field of ['council_fee_type', 'council_fee_rate', 'council_fee_fixed_amount', 'bylaw_reference']) {
    if (terms[field] !== council[field]) return false;
  }
  if (!terms.bylaw_reference?.trim() || !terms.legal_opinion_reference?.trim()) return false;
  const admins = approvals.filter(row => row.revision_id === terms.id && row.council_id === council.id)
    .map(row => row.admin_id).filter(Boolean);
  return new Set(admins).size >= 2;
}

export async function feeEvidence(db, council) {
  if (!council.fee_revision_id) return { terms: null, approvals: [], approved: false };
  const terms = await db.CouncilSettlementTerms.get(council.fee_revision_id);
  if (terms.council_id !== council.id) throw new Error('Council revision mismatch');
  const page = await db.CouncilFeeApproval.filter({ council_id: council.id, revision_id: terms.id }, '-created_date', 100);
  const approvals = Array.isArray(page) ? page : page.items || [];
  return { terms, approvals, approved: feeIsApproved(council, terms, approvals) };
}
