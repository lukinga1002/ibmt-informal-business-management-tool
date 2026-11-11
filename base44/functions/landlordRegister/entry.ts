import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asRows, cleanText, fail, json, reserveSerials } from '../../shared/moneyOps.ts';

/**
 * Landlord self-registration: one submit carries the landlord, the street and
 * house, and every unit they own. Each unit gets its own serial reference and
 * keeps the name the landlord gave it, so renting it out later is a pick from a
 * list rather than retyping the house.
 *
 * Registration is not ownership: the units land as registered, never verified.
 *
 * Base44 has no multi-record transaction. Instead of claiming one, the handler
 * (1) validates everything and does every read it needs before the first
 * write, (2) writes the property, then each unit, in order, and (3) keys the
 * property on a client registration key, so a retry with the same key resumes
 * where a failed attempt stopped and never duplicates the property or a unit.
 * A failure part-way returns REGISTRATION_INCOMPLETE with `retryable: true`.
 */
const MAX_UNITS = 20;
const REGISTRATION_KEY = /^reg-[A-Za-z0-9-]{16,64}$/;
const SIM_COUNCIL_CODE = 'SIM-TEST';
const SIM_WARD = 'SIMULATION - Test Ward';

export default async function (req) {
  let stage = 'validate';
  let progress = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (statusOf(e) === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    // A platform administrator is never also the landlord of record: that would
    // merge the approver and owner roles and stamp landlord metadata on the
    // admin profile. Landlords register from their own account.
    if (user.role === 'admin') {
      return fail(
        403,
        'ADMIN_NOT_LANDLORD',
        'Akaunti ya msimamizi haiwezi kusajili nyumba. Ingia kwa akaunti tofauti ya mwenye nyumba. / An administrator account cannot register property. Sign in with a separate landlord account.',
      );
    }

    const payload = await req.json().catch(() => ({}));
    const registrationKey = cleanText(payload.registration_key);
    const landlordName = cleanText(payload.landlord_name) || user.full_name;
    const region = cleanText(payload.region);
    const phone = cleanText(payload.phone).replace(/[^0-9]/g, '');
    const email = cleanText(payload.email);
    const district = cleanText(payload.district);
    const ward = cleanText(payload.ward);
    const councilId = cleanText(payload.council_id);
    const street = cleanText(payload.street);
    const houseNo = cleanText(payload.house_no);
    const rawUnits = Array.isArray(payload.units) ? payload.units : [];

    if (!REGISTRATION_KEY.test(registrationKey)) {
      return fail(422, 'VALIDATION', 'Reload the page and submit the form again', { registration_key: 'Missing or invalid registration key.' });
    }
    if (landlordName.length < 3) return fail(422, 'VALIDATION', 'Your name is required', { landlord_name: 'Enter your name.' });
    if (!/^(0\d{9}|255\d{9})$/.test(phone)) {
      return fail(422, 'VALIDATION', 'A phone number is required', { phone: 'Enter the phone number, for example 0712345678.' });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(422, 'VALIDATION', 'That email address is not valid', { email: 'Check the email address, or leave it empty.' });
    }
    if (!region || !district || !ward || !councilId) {
      return fail(422, 'VALIDATION', 'Region, district and ward are required', { ward: 'Choose the region, district and ward.' });
    }
    if (street.length < 2) return fail(422, 'VALIDATION', 'The street name is required', { street: 'Enter the street name.' });
    if (!houseNo) return fail(422, 'VALIDATION', 'The house number is required', { house_no: 'Enter the house number.' });
    if (!rawUnits.length) return fail(422, 'VALIDATION', 'At least one unit is required', { units: 'Add at least one unit.' });
    if (rawUnits.length > MAX_UNITS) return fail(422, 'VALIDATION', `One registration can carry up to ${MAX_UNITS} units`, { units: `Register up to ${MAX_UNITS} units at a time.` });

    const seen = new Set();
    const rows = [];
    for (const raw of rawUnits) {
      const name = cleanText(raw && raw.name);
      const rent = Math.round(Number(raw && raw.rent_amount) || 0);
      if (name.length < 2) return fail(422, 'VALIDATION', 'Every unit needs the name you gave it', { units: 'Write a name for every unit.' });
      const key = name.toLowerCase();
      if (seen.has(key)) return fail(422, 'VALIDATION', `Two units cannot share the name ${name}`, { units: 'Give each unit a different name.' });
      seen.add(key);
      if (rent <= 0) return fail(422, 'VALIDATION', `Enter the monthly rent for ${name}`, { units: `Enter the rent for ${name}.` });
      rows.push({ key, name, rent, occupied: Boolean(raw && raw.occupied) });
    }

    // --- Preflight reads: nothing below writes until every check has passed.
    stage = 'preflight';

    // The council must exist and the submitted region, district and ward must
    // belong to it, so a record can never carry one council's ID with another
    // place's address. Council records are public reads; no privilege needed.
    const council = await base44.entities.Council.get(councilId).catch((e) => (isNotFound(e) ? null : Promise.reject(e)));
    if (!council) return fail(422, 'COUNCIL_UNKNOWN', 'Choose a council from the list', { council_id: 'Unknown council.' });
    if ((council.region && council.region !== region) || (council.district && council.district !== district)) {
      return fail(422, 'JURISDICTION_MISMATCH', 'The region and district do not match the chosen council', { council_id: 'Choose the district again.' });
    }
    if (council.code === SIM_COUNCIL_CODE && ward !== SIM_WARD) {
      return fail(422, 'JURISDICTION_MISMATCH', 'The simulation council only has the synthetic test ward', { ward: `Choose ${SIM_WARD}.` });
    }

    const year = new Date().getFullYear();
    const address = [houseNo, street, ward, district].filter(Boolean).join(', ');
    const propertyRef = `SIM-PROP-${registrationKey}`;

    // A retry carries the same key. The service role looks across owners so a
    // key can never be reused against someone else's property.
    const prior = asRows(await base44.asServiceRole.entities.Property.filter({ property_ref: propertyRef }, '-created_date', 2));
    let property = prior[0] || null;
    if (property) {
      if (property.landlord_id !== user.id) return fail(409, 'KEY_CONFLICT', 'Reload the page and submit the form again');
      if (property.council_id !== councilId || property.address !== address) {
        return fail(409, 'KEY_CONFLICT', 'This retry does not match the first attempt. Reload the page and start again.');
      }
    }

    const existingUnits = property
      ? asRows(await base44.entities.RentalUnit.filter({ property_id: property.id }, 'created_date', MAX_UNITS + 5))
      : [];
    const existingByName = new Map(existingUnits.map((unit) => [cleanText(unit.unit_name).toLowerCase(), unit]));
    for (const name of existingByName.keys()) {
      if (!seen.has(name)) return fail(409, 'KEY_CONFLICT', 'This retry does not match the first attempt. Reload the page and start again.');
    }
    const missing = rows.filter((row) => !existingByName.has(row.key));
    const references = missing.length ? await reserveSerials(base44, 'RentalUnit', `IBMT-UNIT-${year}-`, 'unit_ref', missing.length) : [];

    // --- Writes, in order. Each completed step is found again on retry.
    progress = { property_ref: propertyRef, expected_units: rows.length, created_units: existingUnits.length };
    if (!property) {
      stage = 'property';
      property = await base44.asServiceRole.entities.Property.create({
        property_ref: propertyRef, landlord_id: user.id, landlord_name: landlordName,
        name: address, address, council_id: councilId, region, district, ward, mtaa: street,
        unit_count: rows.length, verification_status: 'pending',
      });
    }

    stage = 'units';
    const created = new Map(existingUnits.map((unit) => [cleanText(unit.unit_name).toLowerCase(), unit]));
    for (const [index, row] of missing.entries()) {
      // A unit that already has a tenant gets a link the landlord can share, so
      // the tenant records themselves. The long random code is the only key.
      const unit = await base44.entities.RentalUnit.create({
        property_id: property.id,
        unit_ref: references[index],
        unit_name: row.name,
        tenant_link_code: row.occupied ? crypto.randomUUID() : null,
        house_no: houseNo,
        landlord_id: user.id,
        landlord_name: landlordName,
        region,
        district,
        ward,
        council_id: councilId,
        street,
        mtaa: street,
        address,
        unit_type: 'room',
        rent_amount: row.rent,
        occupancy: row.occupied ? 'occupied' : 'vacant',
        status: 'registered',
        version: 1,
      });
      created.set(row.key, unit);
      progress.created_units = created.size;
    }

    // A landlord who registers here is a landlord: set the workspace role only
    // when nothing else has been assigned, and never overwrite an existing value.
    stage = 'profile';
    const current = user.data || {};
    if (!current.ibmt_role || !current.district || !current.council_id || !current.phone) {
      await base44.asServiceRole.entities.User.update(user.id, {
        data: {
          ...current,
          ibmt_role: current.ibmt_role || 'landlord',
          region: current.region || region,
          phone: current.phone || phone,
          email: current.email || email || user.email || null,
          district: current.district || district,
          council_id: current.council_id || councilId,
        },
      });
    }

    return json({
      landlord: { name: landlordName, phone, email: email || user.email || null, region, district, ward, street, house_no: houseNo },
      property_ref: property.property_ref,
      resumed: Boolean(prior.length),
      units: rows.map((row) => {
        const unit = created.get(row.key);
        return {
          unit_id: unit.id,
          unit_name: unit.unit_name,
          unit_ref: unit.unit_ref,
          rent_amount: unit.rent_amount,
          occupancy: unit.occupancy,
          tenant_link_code: unit.tenant_link_code || null,
        };
      }),
    });
  } catch (error) {
    // Upstream messages can carry platform internals; log a sanitized line and
    // tell the user only what happened and what to do.
    console.error('landlordRegister failed', { stage, status: statusOf(error) });
    if (progress) {
      return Response.json(
        {
          code: 'REGISTRATION_INCOMPLETE',
          message:
            'Usajili haukukamilika. Bonyeza "Tuma" tena; hatua zilizokamilika hazitarudiwa. / Registration did not finish. Submit again; completed steps will not be repeated.',
          retryable: true,
          stage,
          ...progress,
        },
        { status: 503 },
      );
    }
    return fail(500, 'SERVER', 'Usajili haukufanikiwa. Hakuna kilichohifadhiwa; jaribu tena. / Registration failed before anything was saved. Try again.');
  }
}

function statusOf(error) {
  return (error && (error.status || (error.response && error.response.status))) || null;
}

/** An unknown or malformed council ID: the hosted API may answer 400 or 404. */
function isNotFound(error) {
  return [400, 404].includes(statusOf(error));
}
