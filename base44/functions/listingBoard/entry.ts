import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { ZERO_FEE, isAdmin, notify } from '../../shared/r5.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * Listings and viewings.
 *
 * A listing only exists for a verified unit, and the public sees the area: ward
 * and mtaa. The exact address, street and meter stay locked until that tenant
 * books a viewing. There is no viewing fee: the tenant fee is always zero.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'public';

    if (action === 'public') return await publicBoard(base44);

    const user = await trustedMe(base44).catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    if (action === 'detail') return await detail(base44, user, payload);
    if (action === 'publish') return await publish(base44, user, payload);
    if (action === 'status') return await setStatus(base44, user, payload);
    if (action === 'book_viewing') return await bookViewing(base44, user, payload);
    if (action === 'viewings') return await viewings(base44, user);
    if (action === 'mine') return await mine(base44, user);

    return fail(422, 'VALIDATION', 'Unknown listing action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function unitsById(base44, ids) {
  // Older listings can carry a reference that is not a record id; one of those
  // would fail the whole lookup, so only real record ids are queried.
  const clean = Array.from(new Set((ids || []).filter((id) => typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id))));
  if (!clean.length) return new Map();
  const page = await base44.asServiceRole.entities.RentalUnit
    .filter({ id: { $in: clean } }, { limit: 100 })
    .catch(() => ({ items: [] }));
  return new Map((page.items || []).map((row) => [row.id, row]));
}

/** Area only: no street, house number, plot, meter or exact address. */
function publicRow(listing, unit, extras = {}) {
  return {
    listing_id: listing.id,
    unit_ref: listing.unit_ref,
    headline: listing.headline || null,
    rent_amount: Math.round(Number(listing.rent_amount) || 0),
    currency: listing.currency || 'TZS',
    unit_type: unit ? unit.unit_type : null,
    bedrooms: unit ? unit.bedrooms || null : null,
    ward: listing.ward,
    mtaa: listing.mtaa || null,
    district: listing.district,
    verified: Boolean(listing.verified),
    address_locked: true,
    ...extras,
  };
}

function addressOf(unit) {
  return {
    address: unit.address || null,
    street: unit.street || null,
    mtaa: unit.mtaa || null,
    tanesco_meter: unit.tanesco_meter || null,
  };
}

async function publicBoard(base44) {
  const page = await base44.asServiceRole.entities.Listing
    .filter({ status: 'listed', verified: true }, { sort: '-created_date', limit: 60 });
  const listings = page.items || [];
  const units = await unitsById(base44, listings.map((row) => row.unit_id));
  return json({
    rows: listings.map((row) => publicRow(row, units.get(row.unit_id))),
    address_rule: {
      sw: 'Eneo pekee: kata na mtaa. Anwani kamili inafunguka tu baada ya kuweka miadi ya kuona nyumba.',
      en: 'Area only: ward and mtaa. The exact address unlocks only after a viewing is booked.',
    },
    zero_fee: ZERO_FEE,
    checked_at: isoNow(),
  });
}

async function detail(base44, user, payload) {
  const listingId = cleanText(payload.listing_id);
  if (!listingId) return fail(422, 'VALIDATION', 'The listing is required');
  const listing = await base44.asServiceRole.entities.Listing.get(listingId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!listing) return fail(404, 'NOT_FOUND', 'That listing does not exist');
  const units = await unitsById(base44, [listing.unit_id]);
  const unit = units.get(listing.unit_id) || null;

  // The tenant-facing detail is gated on a booked viewing; owners review their
  // own listing through `mine`, so an admin role alone does not unlock an address here.
  const owner = listing.landlord_id === user.id || listing.agent_id === user.id;
  const mine = await base44.asServiceRole.entities.Viewing
    .filter({ listing_id: listing.id, tenant_id: user.id }, { limit: 5 });
  const booking = (mine.items || []).find((row) => ['booked', 'completed'].includes(row.status)) || null;
  const unlocked = owner || Boolean(booking);

  return json({
    ...publicRow(listing, unit, {
      address_locked: !unlocked,
      has_viewing: Boolean(booking),
      viewing_id: booking ? booking.id : null,
    }),
    ...(unlocked && unit ? addressOf(unit) : {}),
    zero_fee: ZERO_FEE,
  });
}

async function publish(base44, user, payload) {
  const unitId = cleanText(payload.unit_id);
  if (!unitId) return fail(422, 'VALIDATION', 'The unit is required', { unit_id: 'Choose the unit.' });
  const unit = await base44.entities.RentalUnit.get(unitId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');

  const owner = unit.landlord_id === user.id;
  const agentForUnit = unit.agent_id === user.id;
  if (!owner && !agentForUnit && !isAdmin(user)) return fail(403, 'FORBIDDEN', 'Only the landlord or the mandated agent can list this unit');
  if (unit.verification_status !== 'verified') {
    return fail(403, 'UNIT_NOT_VERIFIED', 'Only a verified unit can be listed', {
      unit_id: 'The ownership evidence must be approved first.',
    });
  }

  let mandateId = null;
  if (agentForUnit && !owner) {
    const mandates = await base44.asServiceRole.entities.Mandate
      .filter({ unit_id: unit.id, agent_id: user.id, status: 'active' }, { limit: 1 });
    const mandate = (mandates.items || [])[0];
    if (!mandate) return fail(403, 'NO_MANDATE', 'You need a signed mandate for this unit before listing it');
    mandateId = mandate.id;
  }

  const existing = await base44.asServiceRole.entities.Listing
    .filter({ unit_id: unit.id, status: 'listed' }, { limit: 1 });
  const already = (existing.items || [])[0];
  if (already) return json({ ...publicRow(already, unit), duplicate: true, zero_fee: ZERO_FEE });

  // The owner (landlord or mandated agent) writes under their own access rules;
  // the platform admin acts through the service role when reviewing a unit.
  const writer = !owner && !agentForUnit && isAdmin(user) ? base44.asServiceRole : base44;
  const row = await writer.entities.Listing.create({
    unit_id: unit.id,
    unit_ref: unit.unit_ref,
    mandate_id: mandateId,
    agent_id: unit.agent_id || null,
    agent_name: null,
    landlord_id: unit.landlord_id,
    status: 'listed',
    verified: true,
    headline: {
      sw: cleanText(payload.headline_sw) || `Chumba ${unit.unit_type} - ${unit.mtaa || unit.ward}`,
      en: cleanText(payload.headline_en) || `${unit.unit_type} in ${unit.mtaa || unit.ward}`,
    },
    rent_amount: Math.round(Number(unit.rent_amount) || 0),
    currency: 'TZS',
    council_id: unit.council_id || null,
    region: unit.region || null,
    district: unit.district,
    ward: unit.ward,
    mtaa: unit.mtaa || null,
  });

  return json({ ...publicRow(row, unit), duplicate: false, zero_fee: ZERO_FEE });
}

async function setStatus(base44, user, payload) {
  const listingId = cleanText(payload.listing_id);
  const next = cleanText(payload.status);
  if (!['paused', 'let', 'listed'].includes(next)) return fail(422, 'VALIDATION', 'Unknown listing status');
  const listing = await base44.asServiceRole.entities.Listing.get(listingId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!listing) return fail(404, 'NOT_FOUND', 'That listing does not exist');
  if (listing.landlord_id !== user.id && listing.agent_id !== user.id && !isAdmin(user)) {
    return fail(403, 'FORBIDDEN', 'Only the landlord or the agent can change this listing');
  }
  const updated = await base44.entities.Listing.update(listing.id, { status: next });
  return json({ listing_id: updated.id, status: updated.status, zero_fee: ZERO_FEE });
}

async function bookViewing(base44, user, payload) {
  const listingId = cleanText(payload.listing_id);
  const slot = cleanText(payload.slot);
  if (!listingId || !slot) return fail(422, 'VALIDATION', 'The listing and the slot are required');
  const when = new Date(slot);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
    return fail(422, 'VALIDATION', 'Choose a future date and time', { slot: 'The viewing must be in the future.' });
  }

  const listing = await base44.asServiceRole.entities.Listing.get(listingId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!listing) return fail(404, 'NOT_FOUND', 'That listing does not exist');
  if (listing.status !== 'listed') return fail(409, 'NOT_LISTED', 'This home is not open for viewings');

  const units = await unitsById(base44, [listing.unit_id]);
  const unit = units.get(listing.unit_id) || null;

  const row = await base44.entities.Viewing.create({
    listing_id: listing.id,
    unit_id: listing.unit_id,
    unit_ref: listing.unit_ref,
    landlord_id: listing.landlord_id,
    agent_id: listing.agent_id || listing.landlord_id,
    tenant_id: user.id,
    tenant_name: user.full_name || user.email || null,
    slot: when.toISOString(),
    status: 'booked',
    district: listing.district,
    ward: listing.ward,
  });

  const recipients = [listing.landlord_id, listing.agent_id].filter((id) => id && id !== user.id);
  for (const subjectId of recipients) {
    await notify(base44, {
      subjectId,
      kind: 'viewing_booked',
      title: { sw: 'Miadi ya kuona nyumba', en: 'Viewing booked' },
      body: {
        sw: `Mpangaji ameweka miadi ya kuona ${listing.unit_ref} (${listing.ward}). Hakuna ada ya kuona: TZS 0.`,
        en: `A tenant booked a viewing for ${listing.unit_ref} (${listing.ward}). No viewing fee: TZS 0.`,
      },
      data: { viewing_id: row.id, listing_id: listing.id, unit_ref: listing.unit_ref },
      dedupeKey: `viewing_booked:${row.id}:${subjectId}`,
    });
  }

  return json({
    viewing_id: row.id,
    slot: row.slot,
    status: row.status,
    ...(unit ? addressOf(unit) : {}),
    address_unlocked: true,
    zero_fee: ZERO_FEE,
  });
}

async function viewings(base44, user) {
  const page = await base44.entities.Viewing.filter({}, { sort: '-created_date', limit: 50 });
  const rows = page.items || [];
  const units = await unitsById(base44, rows.map((row) => row.unit_id));
  return json({
    rows: rows.map((row) => ({
      viewing_id: row.id,
      listing_id: row.listing_id,
      unit_ref: row.unit_ref,
      slot: row.slot,
      status: row.status,
      tenant_name: row.tenant_id === user.id ? null : row.tenant_name,
      is_mine: row.tenant_id === user.id,
      address: row.tenant_id === user.id && units.get(row.unit_id) ? addressOf(units.get(row.unit_id)) : null,
    })),
    zero_fee: ZERO_FEE,
  });
}

async function mine(base44, user) {
  const page = await base44.entities.Listing.filter({}, { sort: '-created_date', limit: 50 });
  const rows = page.items || [];
  const units = await unitsById(base44, rows.map((row) => row.unit_id));
  return json({
    rows: rows.map((row) => {
      const unit = units.get(row.unit_id) || null;
      const owned = row.landlord_id === user.id || row.agent_id === user.id || isAdmin(user);
      return {
        ...publicRow(row, unit, { address_locked: !owned }),
        status: row.status,
        ...(owned && unit ? addressOf(unit) : {}),
      };
    }),
    zero_fee: ZERO_FEE,
  });
}