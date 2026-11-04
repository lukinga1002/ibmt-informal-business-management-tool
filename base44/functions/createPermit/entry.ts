import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  cleanText,
  fail,
  findBusiness,
  findExistingByKey,
  getActivePolicy,
  json,
  nextSerial,
} from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';

/**
 * Submits an event permit application. The serial reference and the fee
 * (district event fee plus per-vendor fee from the active policy version)
 * are computed here; the interface only sends the event facts.
 * A retried action key returns the permit that was already created.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'permits_module');
    if (blocked) return blocked;

    const payload = await req.json().catch(() => ({}));

    const venue = cleanText(payload.venue);
    const startDate = cleanText(payload.event_date) || cleanText(payload.start_date);
    if (venue.length < 3) {
      return fail(422, 'VALIDATION', 'The venue is required', { venue: 'Enter the venue (at least 3 characters).' });
    }
    if (!startDate) {
      return fail(422, 'VALIDATION', 'The event date is required', { event_date: 'Choose the event date.' });
    }

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'Permit', idempotencyKey);
      if (existing) return json({ ...existing, duplicate: true });
    }

    const business = await findBusiness(base44, user);
    const policy = await getActivePolicy(base44);
    const values = (policy && policy.values) || {};
    const vendorCount = Math.max(0, Math.round(Number(payload.vendor_count) || 0));
    const fee = Math.round(
      (Number(values.permit_fee_district_event) || 0) +
        (Number(values.permit_fee_per_vendor) || 0) * vendorCount,
    );

    const eventName = cleanText(payload.event_name);
    const reference = await nextSerial(base44, 'Permit', `IBMT-PRM-${new Date().getFullYear()}-`);

    const permit = await base44.entities.Permit.create({
      reference,
      business_id: business.id,
      event_name: eventName.length >= 3 ? eventName : cleanText(payload.event_title) || 'Community event',
      district: cleanText(payload.district) || business.district,
      ward: cleanText(payload.ward_id) || business.ward,
      venue,
      start_date: startDate,
      end_date: cleanText(payload.end_date) || startDate,
      vendor_count: vendorCount,
      fee_amount: fee,
      status: 'submitted',
      version: 1,
      idempotency_key: idempotencyKey || null,
      policy_version: policy ? policy.version : null,
    });

    return json(permit);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}