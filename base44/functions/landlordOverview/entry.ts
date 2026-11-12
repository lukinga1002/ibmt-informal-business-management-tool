import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  asRows,
  bilingual,
  fail,
  getActivePolicy,
  json,
  todayISO,
} from '../../shared/moneyOps.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * Read-only portfolio summary for a landlord: units, occupancy, rent due
 * this month from recorded tenancies, and what has actually been collected.
 * The arrears figure is a recorded difference only; no automatic penalty.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // A missing or expired session is a 401 from the platform, not a server fault.
    const user = await trustedMe(base44).catch((error) => (isUnauthenticated(error) ? null : Promise.reject(error)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const today = todayISO();
    const monthStart = `${today.slice(0, 7)}-01`;

    // Positional reads and an in-code sum: the cursor-page and aggregate routes
    // are not implemented by the local `base44 dev` store, which forwards them
    // to the hosted app instead of answering from local data.
    const [unitsPage, tenanciesPage, paymentsPage] = await Promise.all([
      base44.entities.RentalUnit.filter({ landlord_id: user.id }, '-created_date', 100),
      base44.entities.Tenancy.filter({ landlord_id: user.id, status: 'active' }, '-created_date', 100),
      base44.entities.RentPayment.filter({ landlord_id: user.id, paid_at: { $gte: monthStart } }, '-paid_at', MONTH_PAYMENT_LIMIT),
    ]);

    const units = asRows(unitsPage);
    const tenancies = asRows(tenanciesPage);
    const payments = asRows(paymentsPage);

    const rentDue = tenancies.reduce((sum, tenancy) => sum + (Number(tenancy.rent_amount) || 0), 0);
    const collected = payments.reduce((sum, row) => sum + (Math.round(Number(row.amount)) || 0), 0);
    const taxWithheld = payments.reduce((sum, row) => sum + (Math.round(Number(row.withholding_amount)) || 0), 0);
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
    // Internal and upstream messages stay in the server log, never in the response.
    console.error('landlordOverview failed', { status: error && error.status ? error.status : null });
    return fail(500, 'SERVER', 'The overview could not be loaded. Try again.');
  }
}

const MONTH_PAYMENT_LIMIT = 500;

function isUnauthenticated(error) {
  const status = error && (error.status || (error.response && error.response.status));
  return status === 401;
}

function cleanDistrict(user, units) {
  if (user.data && user.data.district) return user.data.district;
  const fromUnits = units.find((unit) => unit.district);
  return fromUnits ? fromUnits.district : '';
}