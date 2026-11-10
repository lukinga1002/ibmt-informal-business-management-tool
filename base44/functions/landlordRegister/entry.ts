import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json, nextSerial } from '../../shared/moneyOps.ts';

/**
 * Landlord self-registration: one submit carries the landlord, the street and
 * house, and every unit they own. Each unit gets its own serial reference and
 * keeps the name the landlord gave it, so renting it out later is a pick from a
 * list rather than retyping the house.
 *
 * Registration is not ownership: the units land as registered, never verified.
 */
const MAX_UNITS = 20;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const landlordName = cleanText(payload.landlord_name) || user.full_name;
    const region = cleanText(payload.region);
    const district = cleanText(payload.district);
    const ward = cleanText(payload.ward);
    const councilId = cleanText(payload.council_id);
    const street = cleanText(payload.street);
    const houseNo = cleanText(payload.house_no);
    const rawUnits = Array.isArray(payload.units) ? payload.units : [];

    if (landlordName.length < 3) return fail(422, 'VALIDATION', 'Your name is required', { landlord_name: 'Enter your name.' });
    if (!district || !ward || !councilId) return fail(422, 'VALIDATION', 'District and ward are required', { ward: 'Choose the district and ward.' });
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
      rows.push({ name, rent, occupied: Boolean(raw && raw.occupied) });
    }

    const year = new Date().getFullYear();
    const address = [houseNo, street, ward, district].filter(Boolean).join(', ');
    const created = [];

    for (const row of rows) {
      const unitRef = await nextSerial(base44, 'RentalUnit', `IBMT-UNIT-${year}-`, 'unit_ref');
      // A unit that already has a tenant gets a link the landlord can share, so
      // the tenant records themselves. The long random code is the only key.
      const tenantLinkCode = row.occupied ? crypto.randomUUID() : null;
      const unit = await base44.entities.RentalUnit.create({
        unit_ref: unitRef,
        unit_name: row.name,
        tenant_link_code: tenantLinkCode,
        house_no: houseNo,
        landlord_id: user.id,
        landlord_name: landlordName,
        region: region || null,
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
      created.push({
        unit_id: unit.id,
        unit_name: unit.unit_name,
        unit_ref: unit.unit_ref,
        rent_amount: unit.rent_amount,
        occupancy: unit.occupancy,
        tenant_link_code: unit.tenant_link_code || null,
      });
    }

    // A landlord who registers here is a landlord: set the workspace role only
    // when nothing else has been assigned, and never overwrite an existing role.
    const current = user.data || {};
    if (!current.ibmt_role || !current.district || !current.council_id) {
      await base44.asServiceRole.entities.User.update(user.id, {
        data: {
          ...current,
          ibmt_role: current.ibmt_role || 'landlord',
          region: current.region || region || null,
          district: current.district || district,
          council_id: current.council_id || councilId,
        },
      });
    }

    return json({
      landlord: { name: landlordName, region: region || null, district, ward, street, house_no: houseNo },
      units: created,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}