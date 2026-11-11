import { rentalDetails } from '../../shared/pangisha.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { rateLimit, requesterKey } from '../../shared/r5.ts';

const digits = (value) => cleanText(value).replace(/[^0-9]/g, '');

/**
 * The tenant's own side of a landlord who was already renting. The landlord
 * shares a link carrying one long random code; the code is the only key, so no
 * sign-in is needed and no other unit can be guessed from it.
 *
 * Nothing is asserted on the tenant's behalf: what they write is recorded as
 * their declaration. The broker answer is recorded either way, including "no
 * broker fee was paid", which is what the register needs to see.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'open';
    const code = cleanText(payload.code);

    if (!code || code.length < 12) return fail(422, 'VALIDATION', 'This link is incomplete');

    const gate = await rateLimit(base44, `tenantjoin:${requesterKey(req)}`, 20, 300);
    if (!gate.allowed) {
      return fail(429, 'RATE_LIMITED', 'Too many attempts from this connection. Try again in a few minutes.');
    }

    const found = await base44.asServiceRole.entities.RentalUnit.filter({ tenant_link_code: code }, '-created_date', 1);
    const unit = (Array.isArray(found) ? found : found.items || [])[0];
    if (!unit) return fail(404, 'NOT_FOUND', 'This link is not active. Ask the landlord for a new one.');

    if (action === 'open') {
      return json({
        unit: {
          unit_id: unit.id,
          unit_ref: unit.unit_ref,
          unit_name: unit.unit_name || unit.unit_ref,
          house_no: unit.house_no || '',
          street: unit.street || unit.mtaa || '',
          ward: unit.ward || '',
          district: unit.district || '',
        },
        landlord_name: unit.landlord_name || '',
        rent_amount: unit.rent_amount || 0,
      });
    }

    const fullName = cleanText(payload.full_name);
    const nida = digits(payload.nida_number);
    const details = rentalDetails(payload);
    if (Object.keys(details.errors).length) return fail(422, 'VALIDATION', Object.values(details.errors)[0], details.errors);
    const paidBroker = payload.paid_broker === true;
    const brokerAmount = paidBroker ? Math.round(Number(payload.broker_amount) || 0) : 0;

    if (fullName.length < 3) return fail(422, 'VALIDATION', 'Your full name is required', { full_name: 'Write your full name.' });
    if (nida.length !== 20) return fail(422, 'VALIDATION', 'The NIDA number has twenty digits', { nida_number: 'Write all twenty digits.' });
    if (paidBroker && brokerAmount <= 0) {
      return fail(422, 'VALIDATION', 'Write how much you paid the broker', { broker_amount: 'Write the amount you paid.' });
    }

    const record = await base44.asServiceRole.entities.TenantSelfRegistration.create({
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      unit_name: unit.unit_name || unit.unit_ref,
      landlord_id: unit.landlord_id,
      council_id: unit.council_id || '',
      region: unit.region || '',
      district: unit.district || '',
      ward: unit.ward || '',
      full_name: fullName,
      nida_number: nida,
      nida_masked: `${'*'.repeat(16)}${nida.slice(-4)}`,
      ...details.values,
      paid_broker: paidBroker,
      broker_amount: brokerAmount,
      source: 'tenant_link',
      status: 'submitted',
      submitted_at: isoNow(),
    });

    return json({
      ok: true,
      record_id: record.id,
      unit_name: record.unit_name,
      unit_ref: record.unit_ref,
      paid_broker: paidBroker,
      broker_amount: brokerAmount,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}