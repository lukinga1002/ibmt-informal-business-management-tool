import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import {
  ZERO_FEE,
  activePolicy,
  commissionCap,
  hasAnyRole,
  isAdmin,
  issueOtp,
  listForCaller,
  notify,
  otpLive,
  otpVerdict,
} from '../../shared/r5.ts';

/**
 * A landlord names one licensed agent, at or under the commission cap, and
 * signs the mandate with a one-time code. An unlicensed agent cannot be named.
 * The tenant fee is always zero.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'list';

    if (action === 'check') return await check(base44, payload);
    if (action === 'offer') return await offer(base44, user, payload);
    if (action === 'request_otp') return await requestOtp(base44, user, payload);
    if (action === 'sign') return await sign(base44, user, payload);
    if (action === 'end') return await end(base44, user, payload);
    if (action === 'list') return await list(base44, user);

    return fail(422, 'VALIDATION', 'Unknown mandate action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function findAgent(base44, email) {
  const wanted = cleanText(email).toLowerCase();
  if (!wanted) return null;
  const page = await base44.asServiceRole.entities.User.filter({ email: wanted }, '-created_date', 5, 0).catch(() => []);
  const rows = Array.isArray(page) ? page : page.items || [];
  const direct = rows.find((row) => String(row.email || '').toLowerCase() === wanted);
  if (direct) return direct;
  const all = await base44.asServiceRole.entities.User.list('-created_date', 200, 0).catch(() => []);
  const list = Array.isArray(all) ? all : all.items || [];
  return list.find((row) => String(row.email || '').toLowerCase() === wanted) || null;
}

/** Pre-flight for the landlord: is this agent licensed before anything is offered? */
async function check(base44, payload) {
  const agent = await findAgent(base44, payload.agent_email);
  if (!agent) return json({ found: false, licensed: false, status: 'no_account' });
  const approved = await base44.asServiceRole.entities.AgentLicence
    .filter({ agent_id: agent.id, status: 'approved' }, { sort: '-created_date', limit: 1 });
  const licence = (approved.items || [])[0] || null;
  const latestPage = await base44.asServiceRole.entities.AgentLicence
    .filter({ agent_id: agent.id }, { sort: '-created_date', limit: 1 });
  const latest = (latestPage.items || [])[0] || null;
  return json({
    found: true,
    agent_name: agent.full_name || null,
    licensed: Boolean(licence),
    licence_no: licence ? licence.licence_no || null : null,
    status: latest ? latest.status : 'none',
    council_id: licence ? licence.council_id || null : null,
  });
}

async function offer(base44, user, payload) {
  const unitId = cleanText(payload.unit_id);
  if (!unitId) return fail(422, 'VALIDATION', 'The unit is required', { unit_id: 'Choose the unit.' });

  const unit = await base44.entities.RentalUnit.get(unitId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');
  if (unit.landlord_id !== user.id && !isAdmin(user)) {
    return fail(403, 'FORBIDDEN', 'Only the landlord of this unit can name an agent');
  }

  const agent = await findAgent(base44, payload.agent_email);
  if (!agent) return fail(422, 'VALIDATION', 'No account matches that email', { agent_email: 'Ask the agent for the email on their IBMT account.' });

  // The licence is checked first: an unlicensed agent is refused before anything else.
  const licences = await base44.asServiceRole.entities.AgentLicence
    .filter({ agent_id: agent.id, status: 'approved' }, { sort: '-created_date', limit: 1 });
  const licence = (licences.items || [])[0];
  if (!licence) {
    return fail(403, 'AGENT_NOT_LICENSED', 'That agent has no approved licence, so they cannot be named on a mandate', {
      agent_email: 'The agent must be licensed by the council first.',
    });
  }
  // A sale-only registration never covers a rental mandate, whoever is asking.
  if ((licence.scope || 'rental') === 'sale') {
    return fail(403, 'AGENT_SCOPE_SALE_ONLY', 'That broker is registered for sales only, not rentals', {
      agent_email: 'The council registered this broker for sales only.',
    });
  }
  if (agent.id === user.id) return fail(422, 'VALIDATION', 'You cannot name yourself as the agent');
  if (licence.council_id && unit.council_id && licence.council_id !== unit.council_id) {
    return fail(422, 'OUTSIDE_COUNCIL', 'That agent is licensed in a different council');
  }

  const policy = await activePolicy(base44);
  const cap = commissionCap(policy, unit.rent_amount);
  const fee = Math.round(Number(payload.fee_amount) || 0);
  if (fee <= 0) return fail(422, 'VALIDATION', 'The commission is required', { fee_amount: 'Enter the amount the landlord pays.' });
  if (cap > 0 && fee > cap) {
    return fail(422, 'ABOVE_CAP', `The commission cannot exceed ${cap} TZS (the policy cap)`, {
      fee_amount: `At most ${cap} TZS under the policy in force.`,
    });
  }

  const openMandate = await base44.asServiceRole.entities.Mandate
    .filter({ unit_id: unit.id, status: { $in: ['offered', 'active'] } }, { limit: 1 });
  if ((openMandate.items || []).length) {
    return fail(409, 'MANDATE_EXISTS', 'This unit already has a mandate in place. End it before naming another agent.');
  }

  const row = await base44.entities.Mandate.create({
    unit_id: unit.id,
    unit_ref: unit.unit_ref,
    council_id: unit.council_id || null,
    region: unit.region || null,
    district: unit.district,
    landlord_id: user.id,
    agent_id: agent.id,
    agent_name: agent.full_name || agent.email,
    agent_email: agent.email || null,
    licence_id: licence.id,
    licence_no: licence.licence_no || null,
    fee_basis: 'monthly_flat',
    fee_amount: fee,
    commission_cap: cap,
    currency: 'TZS',
    tenant_fee: 0,
    starts_on: cleanText(payload.starts_on) || null,
    ends_on: cleanText(payload.ends_on) || null,
    status: 'offered',
    policy_version: policy ? policy.version : null,
  });

  await notify(base44, {
    subjectId: agent.id,
    kind: 'mandate_offered',
    title: { sw: 'Umependekezwa kuwa wakala', en: 'You have been named as agent' },
    body: {
      sw: `Mmiliki amekupendekeza kwa nyumba ${unit.unit_ref}. Kamisheni: TZS ${fee.toLocaleString('en-US')} (mmiliki hulipa). Ada ya mpangaji: TZS 0.`,
      en: `A landlord named you for unit ${unit.unit_ref}. Commission: TZS ${fee.toLocaleString('en-US')} (paid by the landlord). Tenant fee: TZS 0.`,
    },
    data: { mandate_id: row.id, unit_ref: unit.unit_ref },
    dedupeKey: `mandate_offered:${row.id}`,
  });

  return json({ ...mandateShape(row), zero_fee: ZERO_FEE, duplicate: false });
}

async function loadLandlordMandate(base44, user, payload) {
  const id = cleanText(payload.mandate_id);
  if (!id) return { error: fail(422, 'VALIDATION', 'The mandate is required') };
  const row = await base44.asServiceRole.entities.Mandate.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!row) return { error: fail(404, 'NOT_FOUND', 'That mandate does not exist') };
  if (row.landlord_id !== user.id && !isAdmin(user)) {
    return { error: fail(403, 'FORBIDDEN', 'Only the landlord can sign this mandate') };
  }
  return { row };
}

async function requestOtp(base44, user, payload) {
  const { row, error } = await loadLandlordMandate(base44, user, payload);
  if (error) return error;
  if (row.status === 'active') return fail(409, 'ALREADY_SIGNED', 'This mandate is already signed');
  if (row.status === 'ended') return fail(409, 'MANDATE_ENDED', 'This mandate has ended');

  const otp = await issueOtp(base44, 'Mandate', row.id, 'landlord');
  return json({ otp, mandate_id: row.id });
}

async function sign(base44, user, payload) {
  const { row, error } = await loadLandlordMandate(base44, user, payload);
  if (error) return error;
  if (row.status === 'active') return json({ ...mandateShape(row), duplicate: true });
  if (row.status === 'ended') return fail(409, 'MANDATE_ENDED', 'This mandate has ended');
  const verdict = otpVerdict(row.otp, 'landlord', payload.code);
  if (verdict === 'expired') return fail(409, 'OTP_EXPIRED', 'Request a new code');
  if (verdict === 'invalid') return fail(422, 'OTP_INVALID', 'That code is not correct');

  const licence = await base44.asServiceRole.entities.AgentLicence
    .filter({ agent_id: row.agent_id, status: 'approved' }, { limit: 1 });
  if (!(licence.items || []).length) {
    return fail(403, 'AGENT_NOT_LICENSED', 'The agent licence is no longer valid, so this mandate cannot be signed');
  }
  if (((licence.items || [])[0].scope || 'rental') === 'sale') {
    return fail(403, 'AGENT_SCOPE_SALE_ONLY', 'That broker is registered for sales only, so this rental mandate cannot be signed');
  }

  const updated = await base44.asServiceRole.entities.Mandate.update(row.id, {
    status: 'active',
    signed_at: isoNow(),
    otp: null,
    signatures: [{ party: 'landlord', method: 'otp', signed_at: isoNow() }],
  });
  await base44.asServiceRole.entities.RentalUnit.update(row.unit_id, { agent_id: row.agent_id }).catch(() => null);

  await notify(base44, {
    subjectId: row.agent_id,
    kind: 'mandate_signed',
    title: { sw: 'Mandate imesainiwa', en: 'Mandate signed' },
    body: {
      sw: `Mmiliki amesaini mandate ya nyumba ${row.unit_ref}. Unaweza kuitangaza sasa.`,
      en: `The landlord signed the mandate for unit ${row.unit_ref}. You can list it now.`,
    },
    data: { mandate_id: row.id, unit_ref: row.unit_ref },
    dedupeKey: `mandate_signed:${row.id}`,
  });

  return json({ ...mandateShape(updated), zero_fee: ZERO_FEE, duplicate: false });
}

async function end(base44, user, payload) {
  const { row, error } = await loadLandlordMandate(base44, user, payload);
  if (error) return error;
  if (row.status === 'ended') return json({ ...mandateShape(row), duplicate: true });

  const updated = await base44.asServiceRole.entities.Mandate.update(row.id, {
    status: 'ended',
    ended_at: isoNow(),
    end_reason: cleanText(payload.reason) || 'landlord_ended',
  });
  await base44.asServiceRole.entities.RentalUnit.update(row.unit_id, { agent_id: null }).catch(() => null);
  await notify(base44, {
    subjectId: row.agent_id,
    kind: 'mandate_ended',
    title: { sw: 'Mandate imekwisha', en: 'Mandate ended' },
    body: {
      sw: `Mandate ya nyumba ${row.unit_ref} imekwisha. Huna ufikiaji tena.`,
      en: `The mandate for unit ${row.unit_ref} has ended. You no longer have access.`,
    },
    data: { mandate_id: row.id, unit_ref: row.unit_ref },
    dedupeKey: `mandate_ended:${row.id}`,
  });
  return json({ ...mandateShape(updated), zero_fee: ZERO_FEE, duplicate: false });
}

async function list(base44, user) {
  const mine = await listForCaller(
    base44,
    'Mandate',
    {},
    50,
    (row) => row.landlord_id === user.id || row.agent_id === user.id || isAdmin(user),
  );
  return json({
    rows: mine.map(mandateShape),
    zero_fee: ZERO_FEE,
    role: hasAnyRole(user, ['agent']) && !mine.some((row) => row.landlord_id === user.id) ? 'agent' : 'landlord',
  });
}

function mandateShape(row) {
  return {
    mandate_id: row.id,
    unit_id: row.unit_id,
    unit_ref: row.unit_ref || null,
    landlord_id: row.landlord_id,
    agent_id: row.agent_id,
    agent_name: row.agent_name,
    agent_email: row.agent_email || null,
    licence_no: row.licence_no || null,
    fee_amount: row.fee_amount,
    commission_cap: row.commission_cap || 0,
    fee_basis: row.fee_basis,
    tenant_fee: 0,
    currency: 'TZS',
    starts_on: row.starts_on || null,
    ends_on: row.ends_on || null,
    status: row.status,
    signature_pending: row.status === 'offered',
    signed_at: row.signed_at || null,
    otp_active: otpLive(row.otp),
    policy_version: row.policy_version || null,
  };
}