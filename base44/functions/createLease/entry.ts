import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import { reference } from '../../shared/registration.ts';

/**
 * A lease may only be created on a unit the mtaa officer has verified.
 * An existing tenancy brought over by migration is not a new lease and never
 * passes through here.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const unitId = cleanText(payload.unit_id);
    const tenantId = cleanText(payload.tenant_id);
    const startDate = cleanText(payload.start_date);
    const endDate = cleanText(payload.end_date);
    const rent = Math.round(Number(payload.rent_amount) || 0);

    if (!unitId) return fail(422, 'VALIDATION', 'Choose the unit');
    if (!tenantId) return fail(422, 'VALIDATION', 'Choose the tenant');
    if (!startDate || !endDate) return fail(422, 'VALIDATION', 'Start and end dates are required');
    if (rent <= 0) return fail(422, 'VALIDATION', 'The agreed monthly rent is required');

    const unit = await base44.entities.RentalUnit.get(unitId).catch(() => null);
    if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');
    if (unit.landlord_id !== user.id && user.role !== 'admin') {
      return fail(403, 'FORBIDDEN', 'Only the landlord of this unit can start a lease');
    }
    if (unit.verification_status !== 'verified') {
      return fail(409, 'UNIT_NOT_VERIFIED', 'This unit is not verified, so it cannot carry a lease yet', {
        unit_id: 'Wait for the mtaa officer to verify the unit.',
      });
    }

    const active = await base44.entities.Lease
      .filter({ unit_id: unitId, status: { $in: ['draft', 'awaiting_signature', 'signed'] } }, { limit: 1 })
      .then((page) => (page.items || []).length)
      .catch(() => 0);
    if (active > 0) return fail(409, 'LEASE_EXISTS', 'This unit already carries an active lease');

    const lease = await base44.entities.Lease.create({
      lease_ref: reference('LSE'),
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: unit.landlord_id,
      tenant_id: tenantId,
      agent_id: unit.agent_id,
      council_id: unit.council_id,
      region: unit.region,
      district: unit.district,
      ward: unit.ward,
      start_date: startDate,
      end_date: endDate,
      rent_amount: rent,
      currency: 'TZS',
      status: 'awaiting_signature',
      lease_version: 1,
      terms: { interval: 'monthly', notice_days: 30, deposit_months: 1 },
      policy_version: '2026.1-stage1',
    });

    return json({ lease_id: lease.id, lease_ref: lease.lease_ref, status: lease.status });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}