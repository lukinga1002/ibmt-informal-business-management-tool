import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { bilingual, cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import {
  DISCLAIMER,
  EVIDENCE_KINDS,
  UNIT_TYPES,
  newOtp,
  normaliseAddress,
  normaliseMeter,
  reference,
  sha256,
} from '../../shared/registration.ts';

/**
 * Landlord registration, self or through an authorised helper.
 *
 * Always creates a claim, never an approval: the unit stays unverified until a
 * mtaa officer for that ward decides. A duplicate address or meter is flagged
 * for review and never blocks or rejects the claim.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));

    const channel = ['self', 'assisted', 'proxy'].includes(cleanText(payload.channel)) ? cleanText(payload.channel) : 'self';
    const ward = cleanText(payload.ward);
    const mtaa = cleanText(payload.mtaa);
    const district = cleanText(payload.district);
    const councilId = cleanText(payload.council_id);
    const address = cleanText(payload.address);
    const meter = cleanText(payload.tanesco_meter);
    const unitType = UNIT_TYPES.includes(cleanText(payload.unit_type)) ? cleanText(payload.unit_type) : 'house';
    const rent = Math.round(Number(payload.rent_amount) || 0);
    const landlordName = cleanText(payload.landlord_name) || user.full_name;
    const landlordPhone = cleanText(payload.landlord_phone);
    const landlordId = cleanText(payload.landlord_id) || (channel === 'self' ? user.id : '');
    const evidence = Array.isArray(payload.evidence)
      ? payload.evidence.filter((item) => item && item.uri && EVIDENCE_KINDS.includes(item.kind))
      : [];
    const consent = payload.consent || {};

    if (!ward || !mtaa || !district) return fail(422, 'VALIDATION', 'Ward, mtaa and district are required');
    if (address.length < 10) return fail(422, 'VALIDATION', 'The residential address is required', { address: 'Write the full address (at least 10 characters).' });
    if (rent <= 0) return fail(422, 'VALIDATION', 'Monthly rent must be a whole number of shillings', { rent_amount: 'Enter the monthly rent.' });
    if (consent.core !== true) return fail(422, 'VALIDATION', 'The core service consent is required to register', { consent: 'Core consent is required.' });
    if (evidence.length === 0) return fail(422, 'VALIDATION', 'At least one ownership document is required', { evidence: 'Attach at least one document.' });
    if (channel !== 'self' && !landlordId) {
      return fail(422, 'VALIDATION', 'Assisted registration needs the landlord the claim is for', { landlord_id: 'Choose the landlord.' });
    }

    // The tenant-initiated route stays closed until the council is in
    // compulsory mode: only a landlord registers their own unit.
    const ibmtRole = (user.data && user.data.ibmt_role) || '';
    if (channel === 'self' && ibmtRole !== 'landlord' && user.role !== 'admin') {
      return fail(403, 'SELF_REGISTRATION_CLOSED', 'Only a landlord can register their own unit. Tenant-initiated registration is off until the council is in compulsory mode.');
    }

    if (channel !== 'self') {
      const landlordAccount = await base44.asServiceRole.entities.User.get(landlordId).catch(() => null);
      if (!landlordAccount) {
        return fail(422, 'VALIDATION', 'That landlord account was not found', { landlord_id: 'Choose an existing landlord.' });
      }
    }

    // Duplicate check across every landlord: a service-role read, so only the
    // comparison result leaves this function — never another landlord's record.
    const wardUnits = await base44.asServiceRole.entities.RentalUnit
      .filter({ ward }, { limit: 200 })
      .then((page) => page.items || [])
      .catch(() => []);

    const addressKey = normaliseAddress(address);
    const meterKey = normaliseMeter(meter);
    const sameAddress = addressKey ? wardUnits.find((unit) => normaliseAddress(unit.address) === addressKey) : null;
    const sameMeter = meterKey ? wardUnits.find((unit) => normaliseMeter(unit.tanesco_meter) === meterKey) : null;

    const duplicateKinds = [];
    if (sameMeter) duplicateKinds.push('meter');
    if (sameAddress) duplicateKinds.push('address');
    const duplicateKind = duplicateKinds.length === 2 ? 'meter_and_address' : duplicateKinds[0] || null;
    const duplicateOf = (sameMeter || sameAddress || {}).unit_ref || null;

    // A helper files the claim for the landlord. The unit belongs to the
    // landlord, so the ownership anchor cannot be set under the helper's own
    // token; the elevation is limited to this one validated create.
    const unitClient = channel === 'self' ? base44.entities.RentalUnit : base44.asServiceRole.entities.RentalUnit;
    const unit = await unitClient.create({
      unit_ref: reference('UNIT'),
      landlord_id: landlordId,
      landlord_name: landlordName,
      council_id: councilId,
      region: cleanText(payload.region) || 'Dar es Salaam',
      district,
      ward,
      mtaa,
      street: cleanText(payload.street),
      address,
      tanesco_meter: meter,
      unit_type: unitType,
      property_type: unitType === 'flat' ? 'apartment' : unitType,
      bedrooms: Math.round(Number(payload.bedrooms) || 0),
      rent_amount: rent,
      currency: 'TZS',
      occupancy: cleanText(payload.occupancy) === 'occupied' ? 'occupied' : 'vacant',
      status: 'registered',
      verification_status: 'pending',
      version: 1,
      policy_version: '2026.1-stage1',
    });

    const otp = channel === 'self' ? null : newOtp();

    const verificationCase = await base44.entities.VerificationCase.create({
      case_ref: reference('REG'),
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: landlordId,
      landlord_name: landlordName,
      landlord_phone: landlordPhone,
      channel,
      helper_name: channel === 'self' ? '' : user.full_name,
      helper_role: channel === 'self' ? '' : cleanText((user.data && user.data.ibmt_role) || user.role),
      helper_licence: cleanText(payload.helper_licence),
      helper_relation: cleanText(payload.helper_relation),
      evidence: evidence.map((item) => ({ kind: item.kind, uri: cleanText(item.uri), label: cleanText(item.label) })),
      status: otp ? 'awaiting_otp' : 'submitted',
      duplicate_flag: Boolean(duplicateKind),
      duplicate_kind: duplicateKind || undefined,
      duplicate_of_unit_ref: duplicateOf || undefined,
      duplicate_note: duplicateKind
        ? 'Another unit in this ward already carries this address or meter. Review the two records; this is not a rejection.'
        : '',
      otp_code_hash: otp ? await sha256(`${verificationCase_salt()}${otp}`) : undefined,
      otp_sent_at: otp ? isoNow() : undefined,
      otp_channel: otp ? 'in-app (demo)' : undefined,
      consent: {
        core: true,
        council_sharing: consent.council_sharing === true,
        granted_at: isoNow(),
        policy_version: '2026.1-stage1',
      },
      council_id: councilId,
      region: cleanText(payload.region) || 'Dar es Salaam',
      district,
      ward,
      mtaa,
      disclaimer: DISCLAIMER,
      idempotency_key: cleanText(payload.idempotencyKey),
      policy_version: '2026.1-stage1',
    });

    return json({
      case_id: verificationCase.id,
      case_ref: verificationCase.case_ref,
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      status: verificationCase.status,
      duplicate: duplicateKind
        ? { flagged: true, kind: duplicateKind, note: verificationCase.duplicate_note }
        : { flagged: false },
      otp: otp
        ? {
            required: true,
            sent_at: verificationCase.otp_sent_at,
            channel: verificationCase.otp_channel,
            // A helper never receives the landlord's code. The landlord sees it
            // in their own session; in this demo build nobody else can.
            code: landlordId === user.id || user.role === 'admin' ? otp : undefined,
          }
        : { required: false },
      certificate: null,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

function verificationCase_salt() {
  return 'ibmt-otp-v1';
}