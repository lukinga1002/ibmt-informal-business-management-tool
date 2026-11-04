import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { isAdmin, issueOtp, listForCaller, notify, otpVerdict } from '../../shared/r5.ts';

const KINDS = ['move_in', 'move_out'];

/**
 * Move-in and move-out checklists. Both sides sign with a one-time code; the
 * report is agreed only when the landlord and the tenant have both signed.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'list';

    if (action === 'create') return await create(base44, user, payload);
    if (action === 'request_otp') return await requestOtp(base44, user, payload);
    if (action === 'sign') return await sign(base44, user, payload);
    if (action === 'list') return await list(base44, user, payload);

    return fail(422, 'VALIDATION', 'Unknown condition report action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function loadReport(base44, id) {
  return await base44.asServiceRole.entities.ConditionReport.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
}

function partyOf(report, user) {
  if (report.landlord_id === user.id) return 'landlord';
  if (report.tenant_id === user.id) return 'tenant';
  return null;
}

async function create(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  if (!tenancyId) return fail(422, 'VALIDATION', 'The tenancy is required');
  const tenancy = await base44.asServiceRole.entities.Tenancy.get(tenancyId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!tenancy) return fail(404, 'NOT_FOUND', 'That tenancy does not exist');

  const role = tenancy.landlord_id === user.id ? 'landlord' : tenancy.tenant_id === user.id ? 'tenant' : null;
  if (!role && !isAdmin(user)) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can write this report');

  const kind = KINDS.includes(cleanText(payload.kind)) ? cleanText(payload.kind) : 'move_in';
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .map((item) => ({
      area: cleanText(item && item.area),
      condition: cleanText(item && item.condition),
      photo_uri: cleanText(item && item.photo_uri) || null,
    }))
    .filter((item) => item.area && item.condition);
  if (!items.length) {
    return fail(422, 'VALIDATION', 'Add at least one area with its condition and a photo', { items: 'One checklist line is required.' });
  }

  const row = await base44.entities.ConditionReport.create({
    tenancy_id: tenancy.id,
    lease_id: cleanText(payload.lease_id) || tenancy.lease_id || null,
    deposit_id: cleanText(payload.deposit_id) || null,
    landlord_id: tenancy.landlord_id,
    tenant_id: tenancy.tenant_id,
    kind,
    author_role: role || 'landlord',
    items,
    status: 'awaiting_signature',
    signatures: [],
    agreed: false,
    council_id: tenancy.council_id || null,
    district: tenancy.district || null,
    ward: tenancy.ward || null,
  });

  const counterpart = role === 'landlord' ? tenancy.tenant_id : tenancy.landlord_id;
  await notify(base44, {
    subjectId: counterpart,
    kind: 'condition_report_ready',
    title: { sw: 'Orodha ya hali ya nyumba', en: 'Condition report ready' },
    body: {
      sw: `Orodha ya ${kind === 'move_in' ? 'kuingia' : 'kuondoka'} imeandaliwa. Inahitaji sahihi yako.`,
      en: `The ${kind === 'move_in' ? 'move-in' : 'move-out'} checklist is ready. It needs your signature.`,
    },
    data: { report_id: row.id, tenancy_id: tenancy.id },
    dedupeKey: `condition_ready:${row.id}`,
  });

  return json({ report: shape(row), duplicate: false });
}

async function requestOtp(base44, user, payload) {
  const report = await loadReport(base44, cleanText(payload.report_id));
  if (!report) return fail(404, 'NOT_FOUND', 'That report does not exist');
  const party = partyOf(report, user);
  if (!party) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant signs this report');
  if ((report.signatures || []).some((row) => row.party === party)) {
    return fail(409, 'ALREADY_SIGNED', 'You have already signed this report');
  }
  const otp = await issueOtp(base44, 'ConditionReport', report.id, party);
  return json({ report_id: report.id, otp });
}

async function sign(base44, user, payload) {
  const report = await loadReport(base44, cleanText(payload.report_id));
  if (!report) return fail(404, 'NOT_FOUND', 'That report does not exist');
  const party = partyOf(report, user);
  if (!party) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant signs this report');
  const signatures = report.signatures || [];
  if (signatures.some((row) => row.party === party)) {
    return json({ report: shape(report), duplicate: true });
  }
  const verdict = otpVerdict(report.otp, party, payload.code);
  if (verdict === 'expired') return fail(409, 'OTP_EXPIRED', 'Request a new code');
  if (verdict === 'invalid') return fail(422, 'OTP_INVALID', 'That code is not correct');

  const next = [...signatures, { party, method: 'otp', signed_at: isoNow(), name: user.full_name || user.email || null }];
  const agreed = ['landlord', 'tenant'].every((role) => next.some((row) => row.party === role));
  const updated = await base44.asServiceRole.entities.ConditionReport.update(report.id, {
    signatures: next,
    agreed,
    status: agreed ? 'agreed' : 'awaiting_signature',
    otp: null,
  });

  const counterpart = party === 'landlord' ? report.tenant_id : report.landlord_id;
  await notify(base44, {
    subjectId: counterpart,
    kind: agreed ? 'condition_report_agreed' : 'condition_report_signed',
    title: { sw: agreed ? 'Orodha imekubaliwa na pande zote' : 'Sahihi imepokelewa', en: agreed ? 'Checklist agreed by both sides' : 'Signature received' },
    body: {
      sw: agreed
        ? 'Orodha ya hali ya nyumba imesainiwa na pande zote mbili.'
        : 'Upande mmoja umesaini. Inasubiri sahihi ya upande wa pili.',
      en: agreed
        ? 'The condition report is signed by both sides.'
        : 'One side has signed. The other signature is still needed.',
    },
    data: { report_id: report.id },
    dedupeKey: `condition_sign:${report.id}:${party}`,
  });

  return json({ report: shape(updated), duplicate: false });
}

async function list(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  const filter = tenancyId ? { tenancy_id: tenancyId } : {};
  const rows = await listForCaller(
    base44,
    'ConditionReport',
    filter,
    30,
    (row) => row.landlord_id === user.id || row.tenant_id === user.id || isAdmin(user),
  );
  return json({ rows: rows.map((row) => ({ ...shape(row), my_party: partyOf(row, user) })) });
}

function shape(row) {
  return {
    report_id: row.id,
    tenancy_id: row.tenancy_id,
    lease_id: row.lease_id || null,
    kind: row.kind || 'move_in',
    author_role: row.author_role,
    items: row.items || [],
    signatures: row.signatures || [],
    agreed: Boolean(row.agreed),
    status: row.status || 'awaiting_signature',
    signed: {
      landlord: (row.signatures || []).some((item) => item.party === 'landlord'),
      tenant: (row.signatures || []).some((item) => item.party === 'tenant'),
    },
    created_at: row.created_date || null,
  };
}