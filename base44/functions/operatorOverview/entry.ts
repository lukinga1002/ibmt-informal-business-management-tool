import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { displayGrade, fail, findBusiness, formatTZS, getActivePolicy, json, monthRange } from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

const B = (en, sw) => ({ en, sw });

const COUNTER_LABELS = {
  turnover: B('Turnover recorded this month', 'Mauzo yaliyorekodiwa mwezi huu'),
  receipts_awaiting: B('Receipts awaiting buyer confirmation', 'Risiti zinasubiri uthibitisho wa mteja'),
  bookings_open: B('Bookings with a balance outstanding', 'Oda zenye salio'),
  expenses_weak: B('Expenses with weak evidence', 'Matumizi yenye ushahidi hafifu'),
};

const STATUS_DISPLAY = { verified: 'active', submitted: 'pending', draft: 'pending', suspended: 'inactive' };

/**
 * Operator dashboard counters. Every number is computed from the signed-in
 * operator's own records; nothing is estimated or projected.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44);
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'operator_module');
    if (blocked) return blocked;

    const business = await findBusiness(base44, user, { provision: false });
    const policy = await getActivePolicy(base44);
    const period = monthRange();

    if (!business) {
      return json({
        business: null,
        counters: [],
        next_actions: [
          { id: 'setup', label: B('Complete your business profile to start recording', 'Kamilisha wasifu wa biashara yako kuanza kurekodi'), to: '/operator/onboarding' },
        ],
        policy_version: policy ? policy.version : null,
      });
    }

    const dateRange = { $gte: period.from, $lte: period.to };
    const [receiptSums, awaiting, bookingsOpen, expensesWeak] = await Promise.all([
      base44.entities.Receipt.aggregate({
        query: { business_id: business.id, status: { $in: ['issued', 'awaiting_confirmation', 'confirmed'] }, issued_on: dateRange },
        sum: ['total'],
      }),
      base44.entities.Receipt.count({ business_id: business.id, status: 'awaiting_confirmation' }),
      base44.entities.Booking.count({ business_id: business.id, status: { $in: ['requested', 'confirmed'] } }),
      base44.entities.Expense.count({ business_id: business.id, evidence_grade: 'none' }),
    ]);

    const turnoverRow = (receiptSums.rows || [])[0];
    const turnover = Math.round(Number(turnoverRow && turnoverRow.sum_total) || 0);
    const awaitingCount = Number(awaiting) || 0;
    const weakCount = Number(expensesWeak) || 0;

    const counters = [
      { key: 'turnover', label: COUNTER_LABELS.turnover, value: formatTZS(turnover), noteKey: 'policy.turnoverVsTax' },
      { key: 'receipts_awaiting', label: COUNTER_LABELS.receipts_awaiting, value: String(awaitingCount) },
      { key: 'bookings_open', label: COUNTER_LABELS.bookings_open, value: String(Number(bookingsOpen) || 0) },
      { key: 'expenses_weak', label: COUNTER_LABELS.expenses_weak, value: String(weakCount), noteKey: 'policy.expenseEvidence' },
    ];

    const next_actions = [];
    if (awaitingCount > 0) {
      next_actions.push({ id: 'confirm', label: B('Follow up receipts awaiting buyer confirmation', 'Fuatilia risiti zinazosubiri uthibitisho wa mteja'), to: '/operator/receipts' });
    }
    if (weakCount > 0) {
      next_actions.push({ id: 'evidence', label: B('Attach supplier evidence to expenses', 'Ambatisha ushahidi wa muuzaji kwa matumizi'), to: '/operator/money' });
    }
    next_actions.push({ id: 'new_receipt', label: B('Record a new sale with a receipt', 'Rekodi mauzo mapya kwa risiti'), to: '/operator/receipts' });

    return json({
      business: {
        name: B(business.business_name, business.business_name),
        ward_id: business.ward,
        registration_status: STATUS_DISPLAY[business.status] || 'pending',
      },
      counters,
      next_actions,
      policy_version: policy ? policy.version : null,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}