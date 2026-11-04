import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bilingual,
  fail,
  getActivePolicy,
  json,
  todayISO,
} from '../../shared/moneyOps.ts';

/**
 * Read-only portfolio summary for a landlord: units, occupancy, rent due
 * this month from recorded tenancies, and what has actually been collected.
 * The arrears figure is a recorded difference only; no automatic penalty.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const today = todayISO();
    const monthStart = `${today.slice(0, 7)}-01`;

    const [unitsPage, tenanciesPage, paymentsAggregate] = await Promise.all([
      base44.entities.RentalUnit.filter({ landlord_id: user.id }, { sort: '-created_date', limit: 100 }),
      base44.entities.Tenancy.filter({ landlord_id: user.id, status: 'active' }, { sort: '-created_date', limit: 100 }),
      base44.entities.RentPayment.aggregate({
        query: { landlord_id: user.id, paid_at: { $gte: monthStart } },
        sum: ['amount', 'withholding_amount'],
      }),
    ]);

    const units = unitsPage.items || unitsPage;
    const tenancies = tenanciesPage.items || tenanciesPage;
    const aggregateRows = (paymentsAggregate && paymentsAggregate.rows) || [];
    const paymentTotals = aggregateRows[0] || {};

    const rentDue = tenancies.reduce((sum, tenancy) => sum + (Number(tenancy.rent_amount) || 0), 0);
    const collected = Number(paymentTotals.sum_amount) || 0;
    const taxWithheld = Number(paymentTotals.sum_withholding_amount) || 0;
    const arrears = Math.max(0, rentDue - collected);

    const occupiedUnitIds = new Set(tenancies.map((tenancy) => tenancy.unit_id));
    const wards = [];
    const mtaas = [];
    for (const unit of units) {
      if (unit.ward && !wards.includes(unit.ward)) wards.push(unit.ward);
      if (unit.street && !mtaas.includes(unit.street)) mtaas.push(unit.street);
    }

    const tzs = (amount) => `TZS ${Number(amount || 0).toLocaleString('en-US')}`;
    const policy = await getActivePolicy(base44);

    return json({
      jurisdiction: {
        district: cleanDistrict(user, units),
        wards,
        mtaa: mtaas,
      },
      counters: [
        { key: 'units', label: bilingual('Units registered', 'Vitego vilivyosajiliwa'), value: String(units.length) },
        { key: 'occupancy', label: bilingual('Occupancy', 'Ukaaji'), value: `${tenancies.length} of ${units.length}` },
        { key: 'rent_due', label: bilingual('Rent due this month', 'Kodi inayotakiwa mwezi huu'), value: tzs(rentDue) },
        { key: 'collected', label: bilingual('Recorded as paid by the tenant', 'Iliyorekodiwa kama imelipwa na mpangaji'), value: tzs(collected) },
        { key: 'tax_withheld', label: bilingual('Tax deducted (none in this stage)', 'Kodi iliyozuiliwa (hakuna katika hatua hii)'), value: tzs(taxWithheld) },
        { key: 'arrears', label: bilingual('Arrears', 'Malimbikizo'), value: tzs(arrears) },
      ],
      arrears_note: bilingual(
        'Arrears are a recorded difference between rent due and rent collected. No automatic penalty is applied.',
        'Malimbikizo ni tofauti iliyorekodiwa kati ya kodi inayotakiwa na kodi iliyokusanywa. Hakuna adhabu ya kiotomatiki inayotumika.',
      ),
      policy_version: policy ? policy.version : null,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

function cleanDistrict(user, units) {
  if (user.data && user.data.district) return user.data.district;
  const fromUnits = units.find((unit) => unit.district);
  return fromUnits ? fromUnits.district : '';
}