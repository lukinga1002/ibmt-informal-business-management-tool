import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json, nextSerial } from '../../shared/moneyOps.ts';
import { hasAnyRole, isAdmin, notify, rateLimit, requesterKey } from '../../shared/r5.ts';
import { resolveCouncil as resolveDeskCouncil } from '../../shared/councilScope.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

const DECISIONS = ['approve', 'reject', 'suspend', 'revoke'];
const NEEDS_REASON = ['reject', 'suspend', 'revoke'];
const SCOPES = ['rental', 'sale', 'both'];

const DISCLAIMER = {
  sw: 'Ukurasa huu unaonyesha hali ya usajili na halmashauri pekee. Hakuna jina, anwani wala namba ya simu.',
  en: 'This page shows the registration status and the council only. No name, address or phone number.',
};

/**
 * Agent licensing: an agent applies, the council approves, rejects, suspends or
 * revokes with a reason. Every decision is kept in the licence history.
 *
 * A public check answers with status only.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'mine';

    if (action === 'public') {
      const gate = await rateLimit(base44, `agent:${requesterKey(req)}`, 20, 300);
      if (!gate.allowed) return fail(429, 'RATE_LIMITED', 'Too many checks. Try again later.', { retry_after_seconds: gate.retry_after_seconds });
      const licenceNo = cleanText(payload.licence_no).toUpperCase();
      if (!licenceNo) return fail(400, 'VALIDATION', 'The licence number is required');
      const found = await base44.asServiceRole.entities.AgentLicence.filter({ licence_no: licenceNo }, { limit: 1 });
      const row = (found.items || [])[0];
      if (!row) return fail(404, 'NOT_FOUND', 'No licence matches that number');
      // Ruling 14: the council and the status only. No name, no district chain,
      // nothing that identifies the broker.
      return json({
        licence_no: row.licence_no,
        status: row.status,
        council: row.council_name || null,
        valid: row.status === 'approved',
        checked_at: isoNow(),
        disclaimer: DISCLAIMER,
      });
    }

    const user = await trustedMe(base44).catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    if (action === 'apply') return await apply(base44, user, payload);
    if (action === 'decide') return await decide(base44, user, payload);
    if (action === 'queue') return await queue(base44, user, payload);
    if (action === 'mine') return await mine(base44, user);

    return fail(422, 'VALIDATION', 'Unknown licence action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function resolveCouncil(base44, district, councilId) {
  const page = await base44.asServiceRole.entities.Council.list({ limit: 50 }).catch(() => ({ items: [] }));
  const rows = page.items || [];
  return rows.find((row) => row.id === councilId) || rows.find((row) => row.district === district) || null;
}

async function apply(base44, user, payload) {
  if (!hasAnyRole(user, ['agent']) && !isAdmin(user)) {
    return fail(403, 'FORBIDDEN', 'Only an agent account can apply for an agent licence');
  }
  const brokerName = cleanText(payload.agent_name) || user.full_name || '';
  if (brokerName.length < 3) {
    return fail(422, 'VALIDATION', 'The broker name is required', { agent_name: 'Enter the broker name.' });
  }
  const nida = cleanText(payload.nida_number).replace(/[^0-9]/g, '');
  if (nida.length !== 20) {
    return fail(422, 'VALIDATION', 'A NIDA number of twenty digits is required', {
      nida_number: 'Enter the twenty digits on the NIDA card.',
    });
  }
  const phone = cleanText(payload.agent_phone).replace(/[^0-9]/g, '');
  if (!/^(0\d{9}|255\d{9})$/.test(phone)) {
    return fail(422, 'VALIDATION', 'A phone number is required', {
      agent_phone: 'Enter the phone number, for example 0712345678.',
    });
  }
  const email = cleanText(payload.agent_email);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail(422, 'VALIDATION', 'That email address is not valid', { agent_email: 'Check the email, or leave it empty.' });
  }

  const region = cleanText(payload.region);
  if (!region) return fail(422, 'VALIDATION', 'The region is required', { region: 'Choose the region.' });

  const district = cleanText(payload.district);
  if (!district) return fail(422, 'VALIDATION', 'The district is required', { district: 'Choose the district.' });

  const council = await resolveCouncil(base44, district, cleanText(payload.council_id));
  if (!council) return fail(422, 'VALIDATION', 'No council is configured for that district', { district: 'Try another district.' });

  // Ruling 11: one licence per broker per council. A broker may register in
  // several councils, but never twice in the same one.
  const existing = await base44.asServiceRole.entities.AgentLicence
    .filter({ agent_id: user.id, council_id: council.id }, { sort: '-created_date', limit: 5 });
  const rows = existing.items || [];
  const open = rows.find((row) => ['pending', 'approved', 'suspended'].includes(row.status));
  if (open) return json({ ...licenceShape(open), duplicate: true });

  const scope = cleanText(payload.scope) || 'rental';
  if (!SCOPES.includes(scope)) {
    return fail(422, 'VALIDATION', 'Choose what the brokerage covers', { scope: 'Rental, sale or both.' });
  }

  const row = await base44.entities.AgentLicence.create({
    agent_id: user.id,
    agent_name: brokerName,
    agent_phone: phone,
    agent_email: email || user.email || null,
    nida_number: nida,
    business_name: cleanText(payload.business_name) || null,
    district: council.district,
    region: region || council.region || null,
    council_id: council.id,
    council_name: council.name || null,
    scope,
    ward: cleanText(payload.ward) || null,
    status: 'pending',
    notes: cleanText(payload.notes) || null,
    history: [{ status: 'pending', reason: null, at: isoNow(), by: user.email || user.id }],
  });

  const users = await base44.asServiceRole.entities.User.list('-created_date', 200, 0).catch(() => []);
  const officers = (Array.isArray(users) ? users : []).filter((row) => row.data && row.data.council_id === council.id);
  for (const officer of officers) {
    await notify(base44, {
      subjectId: officer.id,
      kind: 'agent_licence_application',
      title: { sw: 'Ombi jipya la leseni ya wakala', en: 'New agent licence application' },
      body: {
        sw: `Ombi la leseni limewasilishwa katika halmashauri ya ${council.name}.`,
        en: `A licence application was submitted in ${council.name} council.`,
      },
      data: { licence_id: row.id },
      dedupeKey: `agent_licence_apply:${row.id}`,
    });
  }

  return json({ ...licenceShape(row), duplicate: false });
}

async function decide(base44, user, payload) {
  if (!isAdmin(user) && !hasAnyRole(user, ['council_official'])) {
    return fail(403, 'FORBIDDEN', 'Only a council official can decide a licence');
  }
  const decision = cleanText(payload.decision);
  if (!DECISIONS.includes(decision)) return fail(422, 'VALIDATION', 'Unknown decision');
  const reason = cleanText(payload.reason);
  if (NEEDS_REASON.includes(decision) && reason.length < 8) {
    return fail(422, 'VALIDATION', 'A reason is required for this decision', { reason: 'At least 8 characters.' });
  }

  const id = cleanText(payload.licence_id);
  if (!id) return fail(422, 'VALIDATION', 'The licence is required');
  const row = await base44.asServiceRole.entities.AgentLicence.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!row) return fail(404, 'NOT_FOUND', 'That licence does not exist');
  if (!isAdmin(user) && row.council_id && user.data && user.data.council_id && row.council_id !== user.data.council_id) {
    return fail(403, 'OUTSIDE_COUNCIL', 'This licence belongs to another council');
  }

  const next = { approve: 'approved', reject: 'rejected', suspend: 'suspended', revoke: 'revoked' }[decision];
  if (row.status === next) return fail(409, 'ALREADY_DECIDED', 'The licence already holds that status');

  const patch = {
    status: next,
    decided_by: user.full_name || user.email || user.id,
    decided_at: isoNow(),
    decision_reason: reason || null,
    decision_note: reason ? { sw: reason, en: reason } : null,
    history: [
      ...(row.history || []),
      { status: next, reason: reason || null, at: isoNow(), by: user.email || user.id },
    ],
  };
  if (next === 'approved' && !row.licence_no) {
    patch.licence_no = await nextSerial(base44, 'AgentLicence', `IBMT-AGL-${new Date().getFullYear()}-`, 'licence_no');
  }

  const updated = await base44.asServiceRole.entities.AgentLicence.update(id, patch);

  // A suspended or revoked licence can no longer hold a mandate.
  if (next === 'suspended' || next === 'revoked') {
    const mandates = await base44.asServiceRole.entities.Mandate
      .filter({ agent_id: row.agent_id, status: 'active' }, { limit: 100 });
    for (const mandate of mandates.items || []) {
      await base44.asServiceRole.entities.Mandate.update(mandate.id, {
        status: 'ended',
        ended_at: isoNow(),
        end_reason: `licence_${next}`,
      });
      await base44.asServiceRole.entities.RentalUnit.update(mandate.unit_id, { agent_id: null }).catch(() => null);
    }
  }

  await notify(base44, {
    subjectId: row.agent_id,
    kind: `agent_licence_${next}`,
    title: { sw: 'Hali ya leseni yako imebadilika', en: 'Your licence status changed' },
    body: {
      sw: `Leseni yako sasa ni: ${next}.${reason ? ` Sababu: ${reason}` : ''}`,
      en: `Your licence is now: ${next}.${reason ? ` Reason: ${reason}` : ''}`,
    },
    data: { licence_id: id, status: next },
    dedupeKey: `agent_licence:${id}:${next}`,
  });

  return json({ ...licenceShape(updated), duplicate: false });
}

async function queue(base44, user, payload) {
  if (!isAdmin(user) && !hasAnyRole(user, ['council_official'])) {
    return fail(403, 'FORBIDDEN', 'Only a council official can read the licence queue');
  }
  // A council desk works in one council only, so the queue holds that council's
  // agents and never a neighbouring council's: the official's own council, and
  // for an admin the council the desk opened on.
  const resolved = await resolveDeskCouncil(base44, user, payload);
  if (!resolved.council) return resolved.refusal;
  const council = resolved.council;

  const filter = { council_id: council.id };
  const scope = cleanText(payload.scope);
  if (SCOPES.includes(scope)) filter.scope = scope;
  const page = await base44.asServiceRole.entities.AgentLicence.filter(filter, { sort: '-created_date', limit: 100 });
  return json({
    rows: (page.items || []).map(licenceShape),
    scope: SCOPES.includes(scope) ? scope : null,
    council: { id: council.id, name: council.name || null, district: council.district || null },
  });
}

async function mine(base44, user) {
  const page = await base44.entities.AgentLicence.filter({ agent_id: user.id }, { sort: '-created_date', limit: 10 });
  const rows = (page.items || []).map(licenceShape);
  return json({ rows, current: rows[0] || null });
}

function licenceShape(row) {
  return {
    licence_id: row.id,
    licence_no: row.licence_no || null,
    agent_id: row.agent_id,
    agent_name: row.agent_name,
    agent_phone: row.agent_phone || null,
    agent_email: row.agent_email || null,
    nida_number: row.nida_number || null,
    business_name: row.business_name || null,
    district: row.district,
    region: row.region || null,
    council_id: row.council_id,
    council_name: row.council_name || null,
    scope: row.scope || 'rental',
    allows_rental: (row.scope || 'rental') !== 'sale',
    allows_sale: ['sale', 'both'].includes(row.scope || 'rental'),
    status: row.status,
    notes: row.notes || null,
    decided_by: row.decided_by || null,
    decided_at: row.decided_at || null,
    decision_reason: row.decision_reason || null,
    history: row.history || [],
    valid: row.status === 'approved',
    disclaimer: DISCLAIMER,
  };
}