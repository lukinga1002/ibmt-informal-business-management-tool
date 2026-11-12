import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { hasAnyRole, isAdmin, listForCaller, notify } from '../../shared/r5.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

const KINDS = ['deposit', 'repairs', 'entry', 'notice', 'other'];

/**
 * A dispute moves open -> Mtaa mediation -> resolved or escalated, and every
 * step carries its own timestamp.
 *
 * The evidence pack is built from the tenancy's own records and is shared only
 * when the party who owns it chooses to share it.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44).catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'list';

    if (action === 'open') return await open(base44, user, payload);
    if (action === 'mediate') return await step(base44, user, payload, 'mediation');
    if (action === 'resolve') return await step(base44, user, payload, 'resolved');
    if (action === 'escalate') return await step(base44, user, payload, 'escalated');
    if (action === 'pack') return await pack(base44, user, payload);
    if (action === 'share') return await share(base44, user, payload);
    if (action === 'list') return await list(base44, user, payload);

    return fail(422, 'VALIDATION', 'Unknown dispute action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function loadDispute(base44, id) {
  return await base44.asServiceRole.entities.Dispute.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
}

function officerInScope(user, dispute) {
  if (isAdmin(user)) return true;
  if (hasAnyRole(user, ['mtaa_officer'])) {
    const wards = (user.data && user.data.ward_ids) || [];
    return Array.isArray(wards) && wards.includes(dispute.ward);
  }
  return hasAnyRole(user, ['council_official', 'district_commissioner', 'regional_commissioner']);
}

async function open(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  if (!tenancyId) return fail(422, 'VALIDATION', 'The tenancy is required');
  const tenancy = await base44.asServiceRole.entities.Tenancy.get(tenancyId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!tenancy) return fail(404, 'NOT_FOUND', 'That tenancy does not exist');

  const role = tenancy.landlord_id === user.id ? 'landlord' : tenancy.tenant_id === user.id ? 'tenant' : null;
  if (!role && !isAdmin(user)) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can open a dispute');

  const kind = KINDS.includes(cleanText(payload.kind)) ? cleanText(payload.kind) : 'other';
  const bodySw = cleanText(payload.body_sw);
  if (bodySw.length < 10) {
    return fail(422, 'VALIDATION', 'Say what happened', { body_sw: 'At least 10 characters.' });
  }

  const row = await base44.entities.Dispute.create({
    tenancy_id: tenancy.id,
    lease_id: cleanText(payload.lease_id) || tenancy.lease_id || null,
    deposit_id: cleanText(payload.deposit_id) || null,
    landlord_id: tenancy.landlord_id,
    tenant_id: tenancy.tenant_id,
    kind,
    opened_by_role: role || 'tenant',
    opened_by_id: user.id,
    body: { sw: bodySw, en: cleanText(payload.body_en) || bodySw },
    status: 'open',
    timeline: [{ action: 'opened', by_role: role || 'tenant', by_name: user.full_name || user.email || null, at: isoNow(), note: null }],
    council_id: tenancy.council_id || null,
    district: tenancy.district || null,
    ward: tenancy.ward || null,
  });

  const counterpart = role === 'landlord' ? tenancy.tenant_id : tenancy.landlord_id;
  await notify(base44, {
    subjectId: counterpart,
    kind: 'dispute_opened',
    title: { sw: 'Mgogoro umefunguliwa', en: 'A dispute was opened' },
    body: {
      sw: `Mgogoro wa aina ${kind} umefunguliwa kwa nyumba ${tenancy.unit_ref}.`,
      en: `A ${kind} dispute was opened for unit ${tenancy.unit_ref}.`,
    },
    data: { dispute_id: row.id, tenancy_id: tenancy.id },
    dedupeKey: `dispute_opened:${row.id}`,
  });

  return json({ dispute: shape(row), duplicate: false });
}

async function step(base44, user, payload, next) {
  const dispute = await loadDispute(base44, cleanText(payload.dispute_id));
  if (!dispute) return fail(404, 'NOT_FOUND', 'That dispute does not exist');
  if (!officerInScope(user, dispute)) return fail(403, 'FORBIDDEN', 'Only the officer responsible for this ward can move the case');

  if (dispute.status === 'resolved' && next !== 'resolved') return fail(409, 'ALREADY_RESOLVED', 'This case is already resolved');
  if (next === 'mediation' && dispute.status !== 'open') return fail(409, 'NOT_OPEN', 'Only an open case can go to mediation');

  const note = cleanText(payload.note);
  if (next === 'resolved' && note.length < 8) {
    return fail(422, 'VALIDATION', 'Say how it was resolved', { note: 'At least 8 characters.' });
  }
  if (next === 'escalate' && note.length < 8) {
    return fail(422, 'VALIDATION', 'Say why it is being escalated', { note: 'At least 8 characters.' });
  }

  const patch = {
    status: next === 'escalated' ? 'escalated' : next,
    timeline: [
      ...(dispute.timeline || []),
      {
        action: next,
        by_role: (user.data && user.data.ibmt_role) || user.role || null,
        by_name: user.full_name || user.email || null,
        at: isoNow(),
        note: note || null,
      },
    ],
  };
  if (next === 'resolved') patch.resolution_note = { sw: note, en: cleanText(payload.note_en) || note };
  if (next === 'escalated') patch.escalated_to = cleanText(payload.to) || 'district_commissioner';

  const updated = await base44.asServiceRole.entities.Dispute.update(dispute.id, patch);

  for (const subjectId of [dispute.tenant_id, dispute.landlord_id]) {
    await notify(base44, {
      subjectId,
      kind: `dispute_${next}`,
      title: { sw: 'Mgogoro umesonga mbele', en: 'Dispute moved forward' },
      body: {
        sw: `Hali mpya: ${updated.status}.${note ? ` Maelezo: ${note}` : ''}`,
        en: `New status: ${updated.status}.${note ? ` Note: ${note}` : ''}`,
      },
      data: { dispute_id: dispute.id, status: updated.status },
      dedupeKey: `dispute_step:${dispute.id}:${next}:${(dispute.timeline || []).length}`,
    });
  }

  return json({ dispute: shape(updated), duplicate: false });
}

/** One tap: every record this tenancy holds, in one pack the party controls. */
async function pack(base44, user, payload) {
  const dispute = await loadDispute(base44, cleanText(payload.dispute_id));
  if (!dispute) return fail(404, 'NOT_FOUND', 'That dispute does not exist');
  if (dispute.landlord_id !== user.id && dispute.tenant_id !== user.id && !isAdmin(user)) {
    return fail(403, 'FORBIDDEN', 'Only the parties to this tenancy can build the pack');
  }

  const items = [];
  const leases = await base44.asServiceRole.entities.Lease.filter({ tenancy_id: dispute.tenancy_id }, { limit: 5 });
  for (const lease of leases.items || []) {
    items.push({
      kind: 'lease',
      uri: `lease:${lease.id}`,
      caption: { sw: `Mkataba ${lease.lease_ref}`, en: `Lease ${lease.lease_ref}` },
      included: true,
    });
  }
  const records = await base44.asServiceRole.entities.RentPayment
    .filter({ tenancy_id: dispute.tenancy_id }, { sort: '-created_date', limit: 60 });
  for (const record of records.items || []) {
    items.push({
      kind: 'rent_record',
      uri: `rent:${record.reference}`,
      caption: {
        sw: `Rekodi ${record.reference} (${record.period_month}) — ${record.record_status}`,
        en: `Record ${record.reference} (${record.period_month}) — ${record.record_status}`,
      },
      included: true,
    });
  }
  const notices = await base44.asServiceRole.entities.Notice
    .filter({ tenancy_id: dispute.tenancy_id }, { sort: '-created_date', limit: 30 });
  for (const notice of notices.items || []) {
    items.push({
      kind: 'notice',
      uri: `notice:${notice.id}`,
      caption: {
        sw: `Taarifa ${notice.kind} (${notice.effective_date})`,
        en: `Notice ${notice.kind} (${notice.effective_date})`,
      },
      included: true,
    });
  }
  const conditions = await base44.asServiceRole.entities.ConditionReport
    .filter({ tenancy_id: dispute.tenancy_id }, { sort: '-created_date', limit: 10 });
  for (const report of conditions.items || []) {
    items.push({
      kind: 'condition_report',
      uri: `condition:${report.id}`,
      caption: {
        sw: `Orodha ya hali (${report.kind}) — ${report.agreed ? 'imekubaliwa' : 'haijakubaliwa'}`,
        en: `Condition report (${report.kind}) — ${report.agreed ? 'agreed' : 'not agreed'}`,
      },
      included: true,
    });
  }

  const row = await base44.entities.EvidencePack.create({
    tenant_id: user.id,
    case_kind: `${dispute.kind} dispute`,
    items,
    status: 'exported',
    exported_at: isoNow(),
    shared_with: [],
  });

  const updated = await base44.asServiceRole.entities.Dispute.update(dispute.id, {
    evidence_pack_id: row.id,
    timeline: [
      ...(dispute.timeline || []),
      { action: 'evidence_pack', by_role: dispute.opened_by_role, by_name: user.full_name || user.email || null, at: isoNow(), note: `${items.length} items` },
    ],
  });

  return json({
    pack: {
      pack_id: row.id,
      items,
      count: items.length,
      shared_with: [],
      status: row.status,
      note: {
        sw: 'Pakiti hii ni yako. Inashirikiwa tu pale unapochagua kushiriki.',
        en: 'This pack is yours. It is shared only when you choose to share it.',
      },
    },
    dispute: shape(updated),
  });
}

async function share(base44, user, payload) {
  const packId = cleanText(payload.pack_id);
  if (!packId) return fail(422, 'VALIDATION', 'The pack is required');
  const row = await base44.asServiceRole.entities.EvidencePack.get(packId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!row) return fail(404, 'NOT_FOUND', 'That pack does not exist');
  if (row.tenant_id !== user.id) return fail(403, 'FORBIDDEN', 'Only the party who built the pack can share it');

  const emails = (Array.isArray(payload.emails) ? payload.emails : []).map((value) => cleanText(value).toLowerCase()).filter(Boolean);
  if (!emails.length) return fail(422, 'VALIDATION', 'Add at least one email to share with');

  const all = await base44.asServiceRole.entities.User.list('-created_date', 200, 0).catch(() => []);
  const rows = Array.isArray(all) ? all : all.items || [];
  const byEmail = new Map(rows.map((item) => [String(item.email || '').toLowerCase(), item.id]));
  const ids = emails.map((email) => byEmail.get(email)).filter(Boolean);
  if (!ids.length) return fail(422, 'VALIDATION', 'No registered account matches those emails');

  const merged = Array.from(new Set([...(row.shared_with || []), ...ids]));
  const updated = await base44.asServiceRole.entities.EvidencePack.update(row.id, { shared_with: merged });
  return json({ pack_id: updated.id, shared_with: updated.shared_with || [], shared_count: (updated.shared_with || []).length });
}

async function list(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  const filter = tenancyId ? { tenancy_id: tenancyId } : {};
  const rows = await listForCaller(
    base44,
    'Dispute',
    filter,
    40,
    (row) => row.landlord_id === user.id || row.tenant_id === user.id || officerInScope(user, row),
  );
  return json({ rows: rows.map(shape) });
}

function shape(row) {
  return {
    dispute_id: row.id,
    tenancy_id: row.tenancy_id,
    lease_id: row.lease_id || null,
    kind: row.kind,
    status: row.status,
    opened_by_role: row.opened_by_role,
    body: row.body || null,
    resolution_note: row.resolution_note || null,
    escalated_to: row.escalated_to || null,
    evidence_pack_id: row.evidence_pack_id || null,
    timeline: row.timeline || [],
    created_at: row.created_date || null,
    updated_at: row.updated_date || null,
  };
}