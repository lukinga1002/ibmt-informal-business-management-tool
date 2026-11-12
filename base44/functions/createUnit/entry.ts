import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  cleanText,
  fail,
  findExistingByKey,
  getActivePolicy,
  json,
  nextSerial,
} from '../../shared/moneyOps.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * Registers a rental unit. The serial reference and the district/ward
 * jurisdiction are decided here; ownership evidence is filed separately
 * and verification is done by a mtaa officer, never by the landlord.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44);
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));

    const ward = cleanText(payload.ward_id);
    const mtaa = cleanText(payload.mtaa);
    const rent = Number(payload.rent_amount);

    if (ward.length < 2) {
      return fail(422, 'VALIDATION', 'The ward is required', { ward_id: 'Choose the ward.' });
    }
    if (mtaa.length < 2) {
      return fail(422, 'VALIDATION', 'The mtaa or street is required', { mtaa: 'Enter the mtaa or street.' });
    }
    if (!Number.isFinite(rent) || rent <= 0) {
      return fail(422, 'VALIDATION', 'The monthly rent must be a positive amount', { rent_amount: 'Enter the monthly rent.' });
    }

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'RentalUnit', idempotencyKey);
      if (existing) return json({ ...existing, duplicate: true });
    }

    const policy = await getActivePolicy(base44);
    const district = cleanText(payload.district) || cleanText(user.data && user.data.district) || 'Kinondoni';
    const reference = await nextSerial(base44, 'RentalUnit', `IBMT-UNIT-${new Date().getFullYear()}-`, 'unit_ref');

    const unit = await base44.entities.RentalUnit.create({
      unit_ref: reference,
      landlord_id: user.id,
      landlord_name: user.full_name,
      district,
      ward,
      street: mtaa,
      property_type: cleanText(payload.property_type) || 'room',
      bedrooms: Number(payload.bedrooms) || null,
      rent_amount: Math.round(rent),
      status: 'registered',
      version: 1,
      idempotency_key: idempotencyKey || null,
      policy_version: policy ? policy.version : null,
    });

    return json(unit);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}