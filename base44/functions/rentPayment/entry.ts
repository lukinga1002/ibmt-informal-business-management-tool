import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bilingual,
  cleanText,
  fail,
  findExistingByKey,
  getPolicyRules,
  json,
  nextSerial,
  rentRates,
} from '../../shared/moneyOps.ts';

/**
 * Rent payment flow.
 *
 * Every rate comes from the active PolicyRule row — PolicyRule is the single
 * source, and PolicyVersion is never read here. Under the Stage 1 ruling the
 * agent commission is one month's rent on a new tenancy, there is no percentage
 * share and no shilling cap, and no tax is withheld at all: TaxRule stays
 * dormant until Stage 3 is agreed. IBMT never holds funds, and a retried action
 * key can never record the payment twice.
 *
 * While a council is in Stage 1 (record only) this endpoint refuses to create a
 * payment: rent is recorded through the rent record, not collected here.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const mode = cleanText(payload.mode) || 'quote';

    const rule = await getPolicyRules(base44);
    const rates = rentRates(rule);
    const commissionMonths = rates.commission_months;
    const depositMaxMonths = rates.deposit_cap_months;
    const platformFeeRate = rates.landlord_service_fee_rate;

    const months = Math.max(1, Math.round(Number(payload.period_months) || 1));
    const newTenancy = payload.new_tenancy !== false;

    // Quote receives the monthly rent; pay receives the quoted total for the period.
    const submittedRent = Number(payload.rent_amount);
    if (!Number.isFinite(submittedRent) || submittedRent <= 0) {
      return fail(422, 'VALIDATION', 'The rent must be a positive amount', { rent_amount: 'Enter the rent.' });
    }
    const monthlyRent = mode === 'pay' ? submittedRent / months : submittedRent;
    const rentTotal = mode === 'pay' ? Math.round(submittedRent) : Math.round(monthlyRent * months);

    // Stage 1: no withholding anywhere, so this is not read from any rate.
    const tax = 0;
    const commission = newTenancy ? Math.round(monthlyRent * commissionMonths) : 0;
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
        policy_version: rule ? rule.version : null,
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

    // A payment attaches only to the caller's own tenancy. There is no fallback
    // to another tenant's tenancy on the same unit.
    const tenancyQuery = await base44.entities.Tenancy.filter({ unit_id: unit.id, status: 'active' }, { sort: '-created_date', limit: 5 });
    const tenancies = tenancyQuery.items || tenancyQuery;
    const tenancy = tenancies.find((row) => row.tenant_id === user.id);
    if (!tenancy) {
      return fail(404, 'NOT_FOUND', 'You have no active tenancy for this unit. A tenancy is opened before paying rent.');
    }

    // Stage 1 has no money movement: refuse before anything is written.
    const council = unit.council_id
      ? await base44.asServiceRole.entities.Council.get(unit.council_id).catch(() => null)
      : null;
    const rentStage = (council && council.rent_stage) || 'record';
    if (rentStage === 'record') {
      return fail(
        409,
        'STAGE1_RECORD_ONLY',
        'This council is in Stage 1 (record only): IBMT records rent and takes no payment. Nothing was created.',
      );
    }

    const reference = await nextSerial(base44, 'RentPayment', `IBMT-RPT-${new Date().getFullYear()}-`);

    const created = await base44.entities.RentPayment.create({
      reference,
      tenancy_id: tenancy.id,
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: tenancy.landlord_id,
      tenant_id: tenancy.tenant_id || user.id,
      council_id: unit.council_id || null,
      district: unit.district || null,
      ward: unit.ward || null,
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
      policy_version: rule ? rule.version : null,
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