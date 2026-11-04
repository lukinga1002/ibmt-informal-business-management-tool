import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { displayGrade, fail, findBusiness, json, monthRange } from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';

const GRADE_LABELS = {
  strong: { en: 'Strong evidence', sw: 'Ushahidi imara' },
  moderate: { en: 'Moderate evidence', sw: 'Ushahidi wa kati' },
  weak: { en: 'Weak evidence', sw: 'Ushahidi hafifu' },
};

/**
 * Financial summary for one business. Turnover is what receipts record, permit
 * fees are kept separate from TRA tax, and no tax is calculated or collected:
 * the summary never claims to be an assessment.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'expenses_module');
    if (blocked) return blocked;

    const payload = await req.json().catch(() => ({}));
    const period = monthRange(payload.from, payload.to);
    const business = await findBusiness(base44, user, { provision: false });

    const empty = {
      period,
      turnover: 0,
      turnover_note: 'policy.turnoverVsTax',
      tax: { amount: 0, label: { en: 'No tax is calculated or collected in this module', sw: 'Hakuna kodi inayohesabiwa au kukusanywa kwenye moduli hii' } },
      permit_fees: { amount: 0, label: { en: 'Council permit fees, separate from TRA tax', sw: 'Ada za vibali za halmashauri, tofauti na kodi ya TRA' }, note: 'policy.permitVsTax' },
      expense_totals_by_grade: [
        { grade: 'strong', label: GRADE_LABELS.strong, amount: 0 },
        { grade: 'moderate', label: GRADE_LABELS.moderate, amount: 0 },
        { grade: 'weak', label: GRADE_LABELS.weak, amount: 0 },
      ],
      evidence_note: 'policy.expenseEvidence',
      policy_version: null,
    };

    if (!business) return json(empty);

    const issuedStatuses = ['issued', 'awaiting_confirmation', 'confirmed'];
    const dateRange = { $gte: period.from, $lte: period.to };

    const [receiptSums, expenseSums, permitSums] = await Promise.all([
      base44.entities.Receipt.aggregate({
        query: { business_id: business.id, status: { $in: issuedStatuses }, issued_on: dateRange },
        sum: ['total'],
      }),
      base44.entities.Expense.aggregate({
        query: { business_id: business.id, issued_on: dateRange },
        groupBy: 'evidence_grade',
        sum: ['amount'],
      }),
      base44.entities.Permit.aggregate({
        query: { business_id: business.id, status: 'approved', start_date: dateRange },
        sum: ['fee_amount'],
      }),
    ]);

    const turnoverRow = (receiptSums.rows || [])[0];
    const permitRow = (permitSums.rows || [])[0];

    const byGrade = { strong: 0, moderate: 0, weak: 0 };
    for (const row of expenseSums.rows || []) {
      const grade = displayGrade(row.evidence_grade);
      byGrade[grade] += Math.round(Number(row.sum_amount) || 0);
    }

    return json({
      ...empty,
      turnover: Math.round(Number(turnoverRow && turnoverRow.sum_total) || 0),
      permit_fees: { ...empty.permit_fees, amount: Math.round(Number(permitRow && permitRow.sum_fee_amount) || 0) },
      expense_totals_by_grade: [
        { grade: 'strong', label: GRADE_LABELS.strong, amount: byGrade.strong },
        { grade: 'moderate', label: GRADE_LABELS.moderate, amount: byGrade.moderate },
        { grade: 'weak', label: GRADE_LABELS.weak, amount: byGrade.weak },
      ],
      policy_version: null,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}