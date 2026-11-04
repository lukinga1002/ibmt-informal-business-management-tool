import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bilingual,
  cleanText,
  fail,
  findExistingByKey,
  getActivePolicy,
  json,
  nextSerial,
} from '../../shared/moneyOps.ts';

/**
 * Rent payment flow. The allocation is computed here from the active policy
 * version: TRA withholding at source, agent commission (landlord side only,
 * capped, only for a new tenancy) and the landlord settlement. A deposit is
 * capped at the policy maximum. IBMT never holds funds and never charges the
 * tenant more than rent plus deposit. A retried action key can never record
 * the payment twice.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const mode = cleanText(payload.mode) || 'quote';

    const policy = await getActivePolicy(base44);
    const values = (policy && policy.values) || {};
    const withholdingRate = Number(values.rent_withholding_rate) || 0;
    const commissionShare = Number(values.agent_commission_share) || 0;
    const commissionCap = Number(values.agent_commission_cap) || 0;
    const depositMaxMonths = Number(values.deposit_max_months) || 3;
    const platformFeeRate = Number(values.platform_fee) || 0;

    const months = Math.max(1, Math.round(Number(payload.period_months) || 1));
    const newTenancy = payload.new_tenancy !== false;

    // Quote receives the monthly rent; pay receives the quoted total for the period.
    const submittedRent = Number(payload.rent_amount);
    if (!Number.isFinite(submittedRent) || submittedRent <= 0) {
      return fail(422, 'VALIDATION', 'The rent must be a positive amount', { rent_amount: 'Enter the rent.' });
    }
    const monthlyRent = mode === 'pay' ? submittedRent / months : submittedRent;
    const rentTotal = mode === 'pay' ? Math.round(submittedRent) : Math.round(monthlyRent * months);
    const tax = Math.round(rentTotal * withholdingRate);
    const commission = newTenancy ? Math.min(Math.round(monthlyRent * commissionShare), commissionCap) : 0;
    const settlement = rentTotal - tax - commission;
    const depositRequested = Number(payload.deposit_amount);
    const deposit = newTenancy
      ? Math.min(
          Number.isFinite(depositRequested) && depositRequested > 0 ? Math.round(depositRequested) : Math.round(monthlyRent),
          Math.round(depositMaxMonths * monthlyRent),
        )
      : 0;
    const tenantTotal = rentTotal + deposit;

    const allocation = {
      tax,
      commission,
      landlord_settlement: settlement,
    };

    if (mode === 'quote') {
      return json({
        rent_amount: rentTotal,
        monthly_rent: monthlyRent,
        period_months: months,
        new_tenancy: newTenancy,
        deposit_amount: deposit,
        tenant_total: tenantTotal,
        allocation,
        allocation_note: 'policy.allocationTitle',
        policy_version: policy ? policy.version : null,
      });
    }

    if (mode === 'status') {
      const paymentId = cleanText(payload.id);
      if (!paymentId) return fail(422, 'VALIDATION', 'The payment is required');
      const payment = await base44.entities.RentPayment.get(paymentId).catch(() => null);
      if (!payment) return fail(404, 'NOT_FOUND', 'That payment is not visible to you');
      return json(paymentShape(payment, allocation));
    }

    if (mode !== 'pay') {
      return fail(422, 'VALIDATION', 'Unknown rent payment mode');
    }

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'RentPayment', idempotencyKey);
      if (existing) return json({ ...paymentShape(existing, allocation), duplicate: true });
    }

    const unitRef = cleanText(payload.unit_ref);
    if (!unitRef) return fail(422, 'VALIDATION', 'The unit reference is required', { unit_ref: 'Enter the unit reference.' });

    const unitQuery = await base44.entities.RentalUnit.filter({ unit_ref: unitRef }, { limit: 1 });
    const unitRows = unitQuery.items || unitQuery;
    const unit = unitRows[0];
    if (!unit) return fail(404, 'NOT_FOUND', 'No unit with that reference is visible to you');

    const tenancyQuery = await base44.entities.Tenancy.filter({ unit_id: unit.id, status: 'active' }, { sort: '-created_date', limit: 5 });
    const tenancies = tenancyQuery.items || tenancyQuery;
    const tenancy = tenancies.find((row) => row.tenant_id === user.id) || tenancies[0];
    if (!tenancy) {
      return fail(404, 'NOT_FOUND', 'There is no active tenancy for this unit yet. A tenancy is opened before paying rent.');
    }

    const reference = await nextSerial(base44, 'RentPayment', `IBMT-RPT-${new Date().getFullYear()}-`);

    const created = await base44.entities.RentPayment.create({
      reference,
      tenancy_id: tenancy.id,
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: tenancy.landlord_id,
      tenant_id: tenancy.tenant_id || user.id,
      period_months: months,
      amount: rentTotal,
      deposit_amount: deposit,
      tenant_total: tenantTotal,
      new_tenancy: newTenancy,
      withholding_amount: tax,
      platform_fee: Math.round(rentTotal * platformFeeRate),
      agent_commission: commission,
      net_to_landlord: settlement,
      status: 'pending',
      paid_at: null,
      idempotency_key: idempotencyKey || null,
      policy_version: policy ? policy.version : null,
    });

    return json(paymentShape(created, allocation));
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

/** The shape the payment screens expect, statuses kept honestly disconnected. */
function paymentShape(payment, allocation) {
  const status = payment.status || 'pending';
  const settled = status === 'settled';
  return {
    id: payment.id,
    reference: payment.reference,
    unit_ref: payment.unit_ref,
    tenancy_id: payment.tenancy_id,
    period_months: payment.period_months,
    rent_amount: payment.amount,
    deposit_amount: payment.deposit_amount || 0,
    tenant_total: payment.tenant_total || (payment.amount || 0) + (payment.deposit_amount || 0),
    new_tenancy: Boolean(payment.new_tenancy),
    allocation,
    allocation_note: 'policy.allocationTitle',
    partner: bilingual('Payment partner (not used in this stage)', 'Mshirika wa malipo (hautumiki katika hatua hii)'),
    statuses: {
      payment_confirmation: settled ? 'settled' : 'pending',
      tax_remittance: 'not_connected',
      landlord_settlement: settled ? 'settled' : 'pending',
      deposit_custody: (payment.deposit_amount || 0) > 0 ? 'pending' : 'not_connected',
    },
    state: settled ? 'settled' : status,
    paid_at: payment.paid_at || null,
    version: 1,
  };
}