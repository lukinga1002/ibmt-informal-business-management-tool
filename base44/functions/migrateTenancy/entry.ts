import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { DISCLAIMER, issuanceAllowed, issueChallenge, reference } from '../../shared/registration.ts';

/**
 * An existing tenancy is brought onto the register as it already stands.
 *
 * The landlord reports the current tenant and rent, the tenant confirms with a
 * code, and nothing is renegotiated: no new lease is created here at all. The
 * standard lease applies only when this tenancy is renewed.
 *
 * The tenant's code follows the R7 rules: five minutes, five attempts,
 * fifteen-minute lockout, hourly send limits, a random salt per code, and only
 * the salted hash stored — on the admin-only OtpChallenge row, never on the case.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const unitId = cleanText(payload.unit_id);
    const tenantName = cleanText(payload.tenant_name);
    const tenantPhone = cleanText(payload.tenant_phone);
    const rent = Math.round(Number(payload.rent_amount) || 0);
    const startedOn = cleanText(payload.started_on);

    if (!unitId) return fail(422, 'VALIDATION', 'Choose the unit being rented out');
    if (!tenantName) return fail(422, 'VALIDATION', 'The current tenant name is required', { tenant_name: 'Write the tenant name.' });
    if (!/^[0-9+ ]{9,}$/.test(tenantPhone)) return fail(422, 'VALIDATION', 'A phone number is needed to send the confirmation code', { tenant_phone: 'Enter the phone number.' });
    if (rent <= 0) return fail(422, 'VALIDATION', 'The current monthly rent is required', { rent_amount: 'Enter the rent.' });
    if (!startedOn) return fail(422, 'VALIDATION', 'When did this tenancy start?', { started_on: 'Choose the date.' });

    const unit = await base44.entities.RentalUnit.get(unitId).catch(() => null);
    if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');
    if (unit.landlord_id !== user.id && user.role !== 'admin') {
      return fail(403, 'FORBIDDEN', 'Only the landlord of this unit can register an existing tenancy');
    }

    const openCase = await base44.entities.VerificationCase
      .filter({ unit_id: unitId, channel: 'migrated' }, { limit: 5 })
      .then((page) => (page.items || []))
      .catch(() => []);
    if (openCase.some((row) => !row.otp_confirmed_at)) {
      return fail(409, 'ALREADY_OPEN', 'This tenancy is already waiting for the tenant to confirm');
    }

    const gate = await issuanceAllowed(base44, { subjectId: `migration:${unit.id}`, phone: tenantPhone });
    if (!gate.allowed) return fail(429, 'RATE_LIMITED', 'Too many codes requested. Try again in an hour.');

    const tenancy = await base44.asServiceRole.entities.Tenancy.create({
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: unit.landlord_id,
      tenant_id: `pending-otp:${tenantPhone.replace(/\s/g, '')}`,
      start_date: startedOn,
      rent_amount: rent,
      status: 'pending',
      district: unit.district,
      ward: unit.ward,
    });

    const caseRef = reference('REG');
    const record = await base44.entities.VerificationCase.create({
      case_ref: caseRef,
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: unit.landlord_id,
      landlord_name: unit.landlord_name,
      landlord_phone: cleanText(payload.landlord_phone),
      channel: 'migrated',
      status: 'awaiting_otp',
      evidence: Array.isArray(payload.evidence)
        ? payload.evidence.filter((item) => item && item.uri).map((item) => ({ kind: item.kind || 'other', uri: cleanText(item.uri) }))
        : [],
      duplicate_flag: false,
      duplicate_note: '',
      migration: {
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        rent_amount: rent,
        started_on: startedOn,
        terms_unchanged: true,
        tenancy_id: tenancy.id,
      },
      consent: { core: true, council_sharing: payload.council_sharing === true, granted_at: isoNow(), policy_version: '2026.1-stage1' },
      council_id: unit.council_id,
      region: unit.region,
      district: unit.district,
      ward: unit.ward,
      mtaa: unit.mtaa,
      disclaimer: DISCLAIMER,
      idempotency_key: cleanText(payload.idempotencyKey),
      policy_version: '2026.1-stage1',
    });

    const issued = await issueChallenge(base44, {
      subjectId: `migration:${unit.id}`,
      subjectRef: caseRef,
      purpose: 'migration_otp',
      phone: tenantPhone,
    });
    await base44.asServiceRole.entities.VerificationCase.update(record.id, {
      otp_sent_at: issued.challenge.issued_at,
      otp_channel: 'in-app (demo)',
    });

    return json({
      case_id: record.id,
      case_ref: record.case_ref,
      tenancy_id: tenancy.id,
      status: record.status,
      terms_unchanged: true,
      lease_created: false,
      otp: {
        required: true,
        channel: 'in-app (demo)',
        expires_at: issued.expires_at,
        ttl_minutes: issued.ttl_minutes,
        max_attempts: issued.max_attempts,
        // The landlord entered this tenancy: the code is shown to them in this
        // demo build. A tenant confirming from their own link gets it by SMS,
        // and no other screen can read the challenge row at all.
        code: user.role === 'admin' || unit.landlord_id === user.id ? issued.code : undefined,
      },
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}