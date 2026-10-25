/**
 * Platform adapter — the live IBMT backend on Base44.
 *
 * Implements the same operation contract the demonstration and external-API
 * adapters follow. Records are read through the app's own row-level security;
 * money math, numbering and duplicate protection happen in backend functions.
 * An operation not yet wired surfaces an honest error, never demo data.
 */

import { base44 } from '@/api/base44Client';
import { IBMTError } from './errors';

const GRADE_DISPLAY = { verified_supplier: 'strong', audited: 'strong', supplier_receipt: 'strong', photo: 'moderate', none: 'weak' };
const GRADE_LABELS = {
  strong: { en: 'Verified supplier evidence', sw: 'Ushahidi wa muuzaji uliothibitishwa' },
  moderate: { en: 'Photograph evidence', sw: 'Ushahidi wa picha' },
  weak: { en: 'No third-party evidence held', sw: 'Hakuna ushahidi wa mtu wa tatu' },
};
const GRADE_TO_ENTITY = { strong: ['verified_supplier', 'audited', 'supplier_receipt'], moderate: ['photo'], weak: ['none'] };

function notWired(id) {
  throw new IBMTError({ code: 'NOT_CONNECTED', message: `This screen is not wired to the live backend yet (${id}).` });
}

export function mapReceipt(record) {
  if (!record) return null;
  return {
    id: record.id,
    reference: record.reference,
    issued_on: record.issued_on,
    buyer_name: record.buyer_name,
    buyer_ref: record.buyer_ref || null,
    total: record.total,
    status: record.status,
    version: record.version ?? 1,
    fiscal_status: record.fiscal_status === 'reported' ? 'fiscal' : 'not_fiscal',
    fiscal_note: 'notices.fiscal',
    buyer_confirmation: record.buyer_confirmation || record.status,
    confirmation_expires_at: record.confirmation_expires_at || null,
    confirmed_at: record.confirmed_at || null,
    lines: (record.lines || []).map((line) => ({
      label: { en: line.description, sw: line.description },
      amount: line.line_total != null ? line.line_total : (line.qty || 1) * (line.unit_amount || 0),
    })),
    evidence: [],
    duplicate: Boolean(record.duplicate),
  };
}

export function mapExpense(record) {
  if (!record) return null;
  const grade = GRADE_DISPLAY[record.evidence_grade] || 'weak';
  return {
    id: record.id,
    supplier: record.supplier_name,
    amount: record.amount,
    incurred_on: record.issued_on,
    evidence_grade: grade,
    evidence_label: GRADE_LABELS[grade],
    evidence: [],
    duplicate: Boolean(record.duplicate),
  };
}

function pageOf(result) {
  const items = result?.items || [];
  return { items, next_cursor: result?.next_cursor ?? null, has_more: Boolean(result?.has_more), total: null };
}

async function invokeFunction(name, payload) {
  const response = await base44.functions.invoke(name, payload);
  return response.data;
}

async function listReceipts(params) {
  const query = {};
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.q) {
    const rx = { $regex: String(params.q), $options: 'i' };
    query.$or = [{ reference: rx }, { buyer_name: rx }];
  }
  if (params.from || params.to) {
    query.issued_on = { ...(params.from ? { $gte: params.from } : {}), ...(params.to ? { $lte: params.to } : {}) };
  }
  const page = await base44.entities.Receipt.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  return { ...pageOf(page), items: page.items.map(mapReceipt) };
}

async function getReceipt(params) {
  const record = await base44.entities.Receipt.get(params.id);
  return mapReceipt(record);
}

async function createReceipt(params) {
  const lines = (params.lines || [])
    .map((line) => ({
      description: (line.label && (line.label.en || line.label.sw)) || line.label,
      qty: 1,
      unit_amount: Number(line.amount) || 0,
    }))
    .filter((line) => line.unit_amount > 0);
  const record = await invokeFunction('createReceipt', {
    buyer_name: params.buyer_name,
    buyer_contact: params.buyer_contact,
    buyer_ref: params.buyer_ref,
    total: params.total,
    lines,
    issued_on: params.issued_on,
    idempotency_key: params.idempotencyKey,
  });
  return mapReceipt(record);
}

async function issueReceipt(params) {
  const record = await invokeFunction('issueReceipt', { id: params.id, idempotency_key: params.idempotencyKey });
  return mapReceipt(record);
}

async function confirmReceipt(params) {
  const record = await invokeFunction('confirmReceipt', { id: params.id, version: params.version, idempotency_key: params.idempotencyKey });
  return mapReceipt(record);
}

async function listExpenses(params) {
  const query = {};
  if (params.evidence && GRADE_TO_ENTITY[params.evidence]) query.evidence_grade = { $in: GRADE_TO_ENTITY[params.evidence] };
  const page = await base44.entities.Expense.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  return { ...pageOf(page), items: page.items.map(mapExpense) };
}

async function createExpense(params) {
  const record = await invokeFunction('createExpense', {
    supplier_name: params.supplier,
    description: params.description,
    amount: params.amount,
    incurred_on: params.incurred_on,
    evidence: params.evidence === true,
    idempotency_key: params.idempotencyKey,
  });
  return mapExpense(record);
}

function businessProfileRecord(record) {
  return {
    business_id: record.id,
    name: { en: record.business_name, sw: record.business_name },
    trading_name: record.business_name,
    ward_id: record.ward,
    council: record.district,
    category: record.sector,
    onboarding_steps: [],
    completed: record.status === 'verified',
  };
}

async function getOperatorProfile() {
  const page = await base44.entities.BusinessProfile.filter({}, { sort: '-created_date', limit: 1 });
  const first = (page.items || [])[0];
  if (!first) throw new IBMTError({ code: 'NOT_FOUND', message: 'No business profile yet. Complete onboarding first.' });
  return businessProfileRecord(first);
}

async function saveOperatorProfile(params) {
  const page = await base44.entities.BusinessProfile.filter({}, { sort: '-created_date', limit: 1 });
  const first = (page.items || [])[0];
  if (!first) throw new IBMTError({ code: 'NOT_FOUND', message: 'No business profile yet. Complete onboarding first.' });
  const changes = {};
  if (params.business_name) changes.business_name = params.business_name;
  if (params.name && typeof params.name === 'string') changes.business_name = params.name;
  if (params.sector || params.category) changes.sector = params.sector || params.category;
  if (params.district) changes.district = params.district;
  if (params.ward || params.ward_id) changes.ward = params.ward || params.ward_id;
  if (params.mtaa) changes.mtaa = params.mtaa;
  if (params.phone) changes.phone = params.phone;
  if (params.tin) changes.tin = params.tin;
  const updated = await base44.entities.BusinessProfile.update(first.id, changes);
  return businessProfileRecord(updated);
}

async function requestExport(params) {
  const record = await base44.entities.ExportRequest.create({
    kind: params.scope || 'own_records',
    status: 'requested',
    requested_at: new Date().toISOString(),
  });
  return { export_id: record.id, scope: record.kind, state: record.status, requested_at: record.requested_at };
}

async function session() {
  let user = null;
  try {
    user = await base44.auth.me();
  } catch {
    user = null;
  }
  if (!user) {
    return {
      subject_id: null,
      display_name: { en: 'Public visitor', sw: 'Mgeni wa umma' },
      role: 'public',
      jurisdiction: { wards: [] },
      policy_version: null,
      demonstration: false,
    };
  }
  const data = user.data || {};
  return {
    subject_id: user.id,
    display_name: user.full_name || user.email,
    role: data.ibmt_role || 'public',
    jurisdiction: { wards: data.ward_ids || [], district: data.district || null },
    policy_version: null,
    demonstration: false,
  };
}

const HANDLERS = {
  session,
  listReceipts,
  getReceipt,
  createReceipt,
  issueReceipt,
  confirmReceipt,
  listExpenses,
  createExpense,
  getFinancialSummary: (params) => invokeFunction('financialSummary', { from: params.from, to: params.to }),
  getOperatorOverview: () => invokeFunction('operatorOverview', {}),
  getOperatorProfile,
  saveOperatorProfile,
  requestExport,
};

export async function platformInvoke({ id, params = {} }) {
  const handler = HANDLERS[id];
  if (!handler) notWired(id);
  return handler(params || {});
}