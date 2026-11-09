import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { hasAnyRole, isAdmin } from '../../shared/r5.ts';

/**
 * Pangisha: a landlord, or a licensed agent under an active mandate, records the
 * tenant moving into one unit. The tenant is issued a notice naming the council,
 * the house and its owner, and is told in the same message that the signed
 * contract with the landlord is theirs alone: the government does not enforce it.
 *
 * The NIDA number is the tenant's national identity number: twenty digits, and
 * it is required before anything is recorded.
 */
const NIDA = /^\d{20}$/;
const PHONE = /^(?:\+?255|0)([67]\d{8})$/;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const role = String((user.data && user.data.ibmt_role) || '');
    if (!hasAnyRole(user, ['landlord', 'agent']) && !isAdmin(user)) {
      return fail(403, 'FORBIDDEN', 'Only a landlord or a licensed agent can record a tenant');
    }

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'create';
    if (action === 'create') return await createIntake(base44, user, role, payload);

    return fail(422, 'VALIDATION', 'Unknown intake action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function createIntake(base44, user, role, payload) {
  const tenantName = cleanText(payload.tenant_name);
  if (tenantName.length < 3) {
    return fail(422, 'VALIDATION', 'The tenant name is required', { tenant_name: 'Andika jina kamili la mpangaji.' });
  }

  const rawPhone = cleanText(payload.tenant_phone).replace(/[\s-]/g, '');
  const phoneMatch = rawPhone.match(PHONE);
  if (!phoneMatch) {
    return fail(422, 'VALIDATION', 'A Tanzanian mobile number is required', {
      tenant_phone: 'Namba ya simu ya Tanzania, mfano 0712 345 678.',
    });
  }
  const phone = `0${phoneMatch[1]}`;

  const nida = cleanText(payload.nida_number).replace(/[\s-]/g, '');
  if (!NIDA.test(nida)) {
    return fail(422, 'VALIDATION', 'The NIDA number must be twenty digits', {
      nida_number: 'Namba ya NIDA ina tarakimu 20.',
    });
  }

  const unitId = cleanText(payload.unit_id);
  if (!unitId) return fail(422, 'VALIDATION', 'The unit is required', { unit_id: 'Chagua uniti.' });

  const unit = await base44.entities.RentalUnit.get(unitId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');

  // Who is recording: the landlord of this unit, or an agent holding an active mandate for it.
  let agentId = null;
  const isOwner = unit.landlord_id === user.id;
  if (!isOwner && !isAdmin(user)) {
    if (role !== 'agent') {
      return fail(403, 'FORBIDDEN', 'Only the landlord of this unit, or their agent, can record a tenant');
    }
    const mandate = await base44.asServiceRole.entities.Mandate
      .filter({ unit_id: unit.id, agent_id: user.id, status: 'active' }, { limit: 1 })
      .catch(() => ({ items: [] }));
    if (!(mandate.items || []).length) {
      return fail(403, 'NO_MANDATE', 'You do not hold an active mandate for this unit');
    }
    agentId = user.id;
  }

  const ownerName = await ownerOf(base44, unit, user, role);
  const councilName = await councilOf(base44, unit);

  const duplicatePage = await base44.entities.TenantIntake
    .filter({ unit_id: unit.id, nida_number: nida }, { sort: '-created_date', limit: 1 })
    .catch(() => ({ items: [] }));
  const existing = (duplicatePage.items || [])[0];
  if (existing && existing.status === 'recorded') {
    return json({
      duplicate: true,
      intake: intakeShape(existing),
      notice: noticeOf(existing),
    });
  }

  const notice = buildNotice({
    tenantName,
    councilName,
    unitRef: unit.unit_ref || unit.id,
    ownerName,
  });

  const row = await base44.entities.TenantIntake.create({
    unit_id: unit.id,
    unit_ref: unit.unit_ref || null,
    landlord_id: unit.landlord_id,
    agent_id: agentId,
    entered_by_role: agentId ? 'agent' : 'landlord',
    tenant_name: tenantName,
    tenant_phone: phone,
    nida_number: nida,
    rent_amount: Math.round(Number(payload.rent_amount) || 0) || null,
    start_date: cleanText(payload.start_date) || null,
    notes: cleanText(payload.notes) || null,
    status: 'recorded',
    council_id: unit.council_id || null,
    council_name: councilName,
    owner_name: ownerName,
    district: unit.district || null,
    ward: unit.ward || null,
    notice_channel: 'sms',
    // No SMS gateway is connected yet: the notice is written and queued, and
    // the record says plainly that nothing left the system.
    notice_state: 'queued_gateway_off',
    notice_text: notice.sw,
    notice_text_en: notice.en,
    notice_to_masked: maskPhone(phone),
    notice_at: isoNow(),
  });

  return json({ duplicate: false, intake: intakeShape(row), notice: noticeOf(row) });
}

async function ownerOf(base44, unit, user, role) {
  if (unit.landlord_name) return unit.landlord_name;
  if (role === 'landlord' && unit.landlord_id === user.id) return user.full_name || 'mmiliki aliyesajiliwa';
  const owner = await base44.asServiceRole.entities.User.get(unit.landlord_id).catch(() => null);
  return (owner && owner.full_name) || 'mmiliki aliyesajiliwa';
}

async function councilOf(base44, unit) {
  if (!unit.council_id) return unit.district || 'halmashauri';
  const council = await base44.entities.Council.get(unit.council_id).catch(() => null);
  return (council && council.name) || unit.district || 'halmashauri';
}

function buildNotice({ tenantName, councilName, unitRef, ownerName }) {
  return {
    sw: `IBMT: ${tenantName}, umesajiliwa na ${councilName} kama mpangaji rasmi wa nyumba ${unitRef} inayomilikiwa na ${ownerName}. Kumbuka: ni lazima uwe na mkataba uliosainiwa na mwenye nyumba. Serikali haitekelezi wala kusimamia mkataba huo.`,
    en: `IBMT: ${tenantName}, you are recorded by ${councilName} as the official tenant of house ${unitRef}, owned by ${ownerName}. Note: you must hold a signed contract with the landlord. The government does not enforce that contract.`,
  };
}

function intakeShape(row) {
  return {
    intake_id: row.id,
    unit_id: row.unit_id,
    unit_ref: row.unit_ref || null,
    tenant_name: row.tenant_name,
    tenant_phone: row.tenant_phone,
    nida_number: row.nida_number,
    nida_masked: maskNida(row.nida_number),
    rent_amount: row.rent_amount || 0,
    start_date: row.start_date || null,
    status: row.status,
    owner_name: row.owner_name || null,
    council_name: row.council_name || null,
    entered_by_role: row.entered_by_role,
    notice_state: row.notice_state || 'not_sent',
  };
}

function noticeOf(row) {
  return {
    text: row.notice_text || '',
    text_en: row.notice_text_en || '',
    state: row.notice_state || 'not_sent',
    channel: row.notice_channel || 'sms',
    to: row.notice_to_masked || null,
    at: row.notice_at || null,
  };
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}

function maskNida(nida) {
  const value = String(nida || '');
  return value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : value;
}