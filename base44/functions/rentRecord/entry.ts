import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, findExistingByKey, isoNow, json, nextSerial, bilingual } from '../../shared/moneyOps.ts';
import { RENT_RECORD_DISCLAIMER, periodOf, dueDateOf } from '../../shared/leaseTemplate.ts';

const METHODS = ['cash', 'mobile_money', 'bank_transfer', 'other'];

/**
 * Stage 1 rent records.
 *
 * One party enters the record; the other party confirms or disputes it. Nothing
 * is confirmed by the person who entered it. Only a confirmed record produces a
 * receipt reference, and that reference is issued at the moment of confirmation
 * — including a late one — never earlier.
 *
 * A retried submit returns the record that already exists: the same idempotency
 * key, or the same mobile-money reference for the same tenancy and period.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'enter';

    if (action === 'enter') return await enter(base44, user, payload);
    if (action === 'confirm' || action === 'dispute') return await decide(base44, user, payload, action);
    if (action === 'receipt') return await receipt(base44, payload);
    if (action === 'arrears') return await arrears(base44, user);

    return fail(422, 'VALIDATION', 'Unknown rent record action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function enter(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  if (!tenancyId) return fail(422, 'VALIDATION', 'The tenancy is required', { tenancy_id: 'Choose the tenancy.' });

  const tenancy = await base44.entities.Tenancy.get(tenancyId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!tenancy) return fail(404, 'NOT_FOUND', 'That tenancy is not visible to you');
  if (tenancy.landlord_id !== user.id && tenancy.tenant_id !== user.id && user.role !== 'admin') {
    return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can record rent for this tenancy');
  }
  if (tenancy.status === 'ended') return fail(409, 'TENANCY_ENDED', 'This tenancy has ended');

  const amount = Math.round(Number(payload.amount) || 0);
  if (amount <= 0) return fail(422, 'VALIDATION', 'The amount is required', { amount: 'Enter the rent paid.' });

  const method = METHODS.includes(cleanText(payload.method)) ? cleanText(payload.method) : 'mobile_money';
  const mobileRef = cleanText(payload.mobile_money_ref);
  if (method !== 'cash' && !mobileRef) {
    return fail(422, 'VALIDATION', 'The payment reference is required for this method', {
      mobile_money_ref: 'Enter the mobile-money or bank reference.',
    });
  }

  const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(cleanText(payload.paid_on))
    ? cleanText(payload.paid_on)
    : new Date().toISOString().slice(0, 10);
  const periodMonth = /^\d{4}-\d{2}$/.test(cleanText(payload.period_month))
    ? cleanText(payload.period_month)
    : periodOf(paidOn);

  const idempotencyKey = cleanText(payload.idempotency_key);
  if (idempotencyKey) {
    const existing = await findExistingByKey(base44, 'RentPayment', idempotencyKey);
    if (existing) return json({ ...recordShape(existing), duplicate: true });
  }
  if (mobileRef) {
    const same = await base44.entities.RentPayment.filter(
      { tenancy_id: tenancy.id, mobile_money_ref: mobileRef, period_month: periodMonth },
      { limit: 1 },
    );
    const rows = same.items || [];
    if (rows.length) return json({ ...recordShape(rows[0]), duplicate: true });
  }

  const asLandlord = tenancy.landlord_id === user.id;
  const asTenant = tenancy.tenant_id === user.id;
  if (!asLandlord && !asTenant) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can record rent');

  const reference = await nextSerial(base44, 'RentPayment', `IBMT-RPT-${new Date().getFullYear()}-`);
  const record = await base44.entities.RentPayment.create({
    reference,
    tenancy_id: tenancy.id,
    unit_id: tenancy.unit_id,
    unit_ref: tenancy.unit_ref,
    landlord_id: tenancy.landlord_id,
    tenant_id: tenancy.tenant_id,
    council_id: tenancy.council_id || null,
    region: tenancy.region || null,
    district: tenancy.district || null,
    ward: tenancy.ward || null,
    period_month: periodMonth,
    period_months: 1,
    amount,
    deposit_amount: Math.round(Number(payload.deposit_amount) || 0),
    tenant_total: amount + Math.round(Number(payload.deposit_amount) || 0),
    currency: 'TZS',
    method,
    mobile_money_ref: mobileRef || null,
    paid_on: paidOn,
    paid_at: `${paidOn}T00:00:00.000Z`,
    record_status: 'pending',
    entered_by_id: user.id,
    entered_by_role: asLandlord ? 'landlord' : 'tenant',
    entered_by_name: user.full_name || user.email || null,
    entered_at: isoNow(),
    new_tenancy: false,
    idempotency_key: idempotencyKey || null,
    policy_version: '2026.1-stage1',
  });

  return json({ ...recordShape(record), duplicate: false });
}

async function decide(base44, user, payload, action) {
  const id = cleanText(payload.id);
  if (!id) return fail(422, 'VALIDATION', 'The record is required');
  const record = await base44.entities.RentPayment.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!record) return fail(404, 'NOT_FOUND', 'That record is not visible to you');

  const isLandlord = record.landlord_id === user.id;
  const isTenant = record.tenant_id === user.id;
  if (!isLandlord && !isTenant) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can decide this record');

  const enteredByMe = record.entered_by_id === user.id;
  if (enteredByMe && user.role !== 'admin') {
    return fail(403, 'SELF_CONFIRM', 'The record must be confirmed by the other party');
  }
  const status = record.record_status || 'pending';
  if (status !== 'pending') {
    return fail(409, status === 'confirmed' ? 'ALREADY_CONFIRMED' : 'NOT_PENDING', 'This record has already been decided', {
      record_status: 'Only a pending record can be confirmed or disputed.',
    });
  }

  if (action === 'dispute') {
    const reason = cleanText(payload.reason);
    if (reason.length < 8) {
      return fail(422, 'VALIDATION', 'Say what is wrong with the record', { reason: 'At least 8 characters.' });
    }
    const updated = await base44.entities.RentPayment.update(record.id, {
      record_status: 'disputed',
      disputed_at: isoNow(),
      dispute_reason: reason,
    });
    await notifyCounterpart(base44, updated, 'rent_record_disputed', 'Rekodi ya kodi imepingwa', 'Rent record disputed',
      `Rekodi ${updated.reference} imepingwa: ${reason}`, `Record ${updated.reference} was disputed: ${reason}`);
    return json({ ...recordShape(updated), duplicate: false });
  }

  // Confirmation issues the receipt reference, and only here.
  const year = new Date().getFullYear();
  const receiptReference = await nextSerial(base44, 'RentPayment', `IBMT-RCT-${year}-`, 'receipt_reference');
  const updated = await base44.entities.RentPayment.update(record.id, {
    record_status: 'confirmed',
    confirmed_at: isoNow(),
    confirmed_by_id: user.id,
    confirmed_by_name: user.full_name || user.email || null,
    receipt_reference: receiptReference,
    receipt_issued_at: isoNow(),
  });
  const smsState = await notifyCounterpart(
    base44,
    updated,
    'rent_record_confirmed',
    'Rekodi ya kodi imethibitishwa',
    'Rent record confirmed',
    `Rekodi ${updated.reference} imethibitishwa. Risiti ${receiptReference}.`,
    `Record ${updated.reference} is confirmed. Receipt ${receiptReference}.`,
  );
  return json({ ...recordShape({ ...updated, sms_state: smsState }), duplicate: false });
}

async function receipt(base44, payload) {
  const id = cleanText(payload.id);
  if (!id) return fail(422, 'VALIDATION', 'The record is required');
  const record = await base44.entities.RentPayment.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!record) return fail(404, 'NOT_FOUND', 'That record is not visible to you');
  if ((record.record_status || '') !== 'confirmed' || !record.receipt_reference) {
    return fail(409, 'NO_RECEIPT', 'No receipt exists for this record until the other party confirms it', {
      record_status: 'A pending or disputed record produces no receipt.',
    });
  }
  const lease = record.tenancy_id
    ? await base44.entities.Lease.filter({ tenancy_id: record.tenancy_id }, { sort: '-created_date', limit: 1 }).catch(() => ({ items: [] }))
    : { items: [] };
  const leaseRow = (lease.items || [])[0] || null;
  return json({
    receipt: {
      receipt_reference: record.receipt_reference,
      record_reference: record.reference,
      issued_at: record.receipt_issued_at || record.confirmed_at,
      unit_ref: record.unit_ref,
      ward: record.ward,
      period_month: record.period_month,
      amount: record.amount,
      deposit_amount: record.deposit_amount || 0,
      method: record.method,
      mobile_money_ref: record.mobile_money_ref || null,
      paid_on: record.paid_on,
      entered_by_role: record.entered_by_role,
      entered_by_name: record.entered_by_name,
      confirmed_by_name: record.confirmed_by_name,
      lease_ref: leaseRow ? leaseRow.lease_ref : null,
      template_version: leaseRow ? leaseRow.template_version : null,
      disclaimer: RENT_RECORD_DISCLAIMER,
      qr_url: `${record.receipt_reference}`,
    },
    sms: {
      state: record.sms_state || 'not_sent',
      note: bilingual(
        'The SMS copy is queued in the app. It leaves as a text message once the SMS gateway is connected.',
        'Nakala ya SMS imo ndani ya app. Itatoka kama ujumbe mfupi baada ya lango la SMS kuunganishwa.',
      ),
    },
  });
}

/**
 * Arrears for the caller's own scope: the last six periods of every active
 * tenancy they are part of. Expected rent, what is confirmed, and what is
 * waiting on the other party — never mixed together.
 */
async function arrears(base44, user) {
  const tenancyPage = await base44.entities.Tenancy
    .filter({ status: 'active' }, { sort: '-created_date', limit: 100 })
    .catch(() => ({ items: [] }));
  const tenancies = (tenancyPage.items || []).filter(
    (row) => row.landlord_id === user.id || row.tenant_id === user.id,
  );
  if (!tenancies.length) return json({ rows: [], totals: { due: 0, confirmed: 0, outstanding: 0 }, periods: [] });

  const periods = lastPeriods(6);
  const ids = tenancies.map((row) => row.id);
  const payments = await base44.entities.RentPayment
    .filter({ tenancy_id: { $in: ids } }, { limit: 500 })
    .catch(() => ({ items: [] }));
  const byKey = new Map();
  for (const row of payments.items || []) {
    byKey.set(`${row.tenancy_id}|${row.period_month || ''}`, [...(byKey.get(`${row.tenancy_id}|${row.period_month || ''}`) || []), row]);
  }
  const leasePage = await base44.entities.Lease
    .filter({ tenancy_id: { $in: ids } }, { sort: '-created_date', limit: 100 })
    .catch(() => ({ items: [] }));
  const leaseByTenancy = new Map();
  for (const row of leasePage.items || []) {
    if (!leaseByTenancy.has(row.tenancy_id)) leaseByTenancy.set(row.tenancy_id, row);
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  for (const tenancy of tenancies) {
    const lease = leaseByTenancy.get(tenancy.id) || null;
    const dueDay = (lease && lease.terms && lease.terms.due_day) || 1;
    const step = lease && lease.frequency === 'quarterly' ? 3 : 1;
    const rent = Math.round(Number(tenancy.rent_amount) || (lease ? lease.rent_amount : 0) || 0);
    for (const period of periods) {
      if (step > 1 && Number(period.slice(5, 7)) % step !== 0) continue;
      if (tenancy.start_date && period < tenancy.start_date.slice(0, 7)) continue;
      const due = dueDateOf(period, dueDay);
      const list = byKey.get(`${tenancy.id}|${period}`) || [];
      const confirmed = list.filter((row) => row.record_status === 'confirmed').reduce((sum, row) => sum + Math.round(Number(row.amount) || 0), 0);
      const pending = list.some((row) => row.record_status === 'pending');
      const disputed = list.some((row) => row.record_status === 'disputed');
      let state = 'not_due';
      if (confirmed >= rent && rent > 0) state = 'paid';
      else if (disputed) state = 'disputed';
      else if (pending) state = 'pending_confirmation';
      else if (due <= today) state = 'unpaid';
      rows.push({
        tenancy_id: tenancy.id,
        unit_ref: tenancy.unit_ref,
        role: tenancy.landlord_id === user.id ? 'landlord' : 'tenant',
        period_month: period,
        due_on: due,
        expected: rent,
        confirmed,
        state,
      });
    }
  }

  const dueRows = rows.filter((row) => row.due_on <= today);
  const totals = {
    due: dueRows.reduce((sum, row) => sum + row.expected, 0),
    confirmed: dueRows.reduce((sum, row) => sum + row.confirmed, 0),
    outstanding: dueRows.reduce((sum, row) => sum + Math.max(0, row.expected - row.confirmed), 0),
  };
  return json({ rows, totals, periods });
}

function lastPeriods(count) {
  const out = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    out.push(date.toISOString().slice(0, 7));
  }
  return out;
}

/** Tells the party who entered the record what the other one decided. */
async function notifyCounterpart(base44, record, kind, titleSw, titleEn, bodySw, bodyEn) {
  const subjectId = record.entered_by_id;
  if (!subjectId) return 'not_sent';
  const pref = await base44.asServiceRole.entities.User.get(subjectId).catch(() => null);
  const allowsSms = !(pref && pref.data && pref.data.sms_rent_reminders === false);
  const channel = allowsSms ? 'sms' : 'in_app';
  try {
    await base44.asServiceRole.entities.Notification.create({
      subject_id: subjectId,
      kind,
      channel,
      title: { sw: titleSw, en: titleEn },
      body: { sw: bodySw, en: bodyEn },
      data: { unit_ref: record.unit_ref, period_month: record.period_month, amount: record.amount, record_ref: record.reference },
      dedupe_key: `${record.id}:${kind}`,
      sent_via: 'in_app',
    });
  } catch {
    return 'not_sent';
  }
  return channel === 'sms' ? 'queued_gateway_off' : 'in_app_only';
}

function recordShape(record) {
  return {
    id: record.id,
    reference: record.reference,
    tenancy_id: record.tenancy_id,
    unit_ref: record.unit_ref,
    period_month: record.period_month,
    amount: record.amount,
    deposit_amount: record.deposit_amount || 0,
    method: record.method || null,
    mobile_money_ref: record.mobile_money_ref || null,
    paid_on: record.paid_on || null,
    record_status: record.record_status || 'pending',
    entered_by_role: record.entered_by_role || null,
    entered_by_name: record.entered_by_name || null,
    entered_at: record.entered_at || null,
    confirmed_at: record.confirmed_at || null,
    confirmed_by_name: record.confirmed_by_name || null,
    disputed_at: record.disputed_at || null,
    dispute_reason: record.dispute_reason || null,
    receipt_reference: record.receipt_reference || null,
    receipt_issued_at: record.receipt_issued_at || null,
    sms_state: record.sms_state || 'not_sent',
    disclaimer: RENT_RECORD_DISCLAIMER,
  };
}