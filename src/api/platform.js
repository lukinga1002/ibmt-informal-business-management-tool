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

const EVIDENCE_KIND_LABELS = {
  title_deed: { en: 'Title deed', sw: 'Hati ya umiliki' },
  lease_agreement: { en: 'Lease agreement', sw: 'Mkataba wa kodi' },
  utility_bill: { en: 'Utility bill', sw: 'Bili ya huduma' },
  tax_receipt: { en: 'Tax receipt', sw: 'Risiti ya kodi' },
  other: { en: 'Other evidence', sw: 'Ushahidi mwingine' },
};
const EVIDENCE_KIND_GRADE = { title_deed: 'strong', lease_agreement: 'strong', utility_bill: 'moderate', tax_receipt: 'moderate', other: 'weak' };

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

function mapPermit(record) {
  if (!record) return null;
  return {
    id: record.id,
    reference: record.reference,
    event_date: record.start_date,
    venue: { en: record.venue, sw: record.venue },
    ward_id: record.ward,
    status: record.status,
    version: record.version ?? 1,
    fee_amount: record.fee_amount || null,
    decision_reason: record.decision_note || null,
    decided_at: record.decided_at || null,
    duplicate: Boolean(record.duplicate),
  };
}

const REGISTRATION_DISPLAY = { verified: 'verified', evidence_pending: 'submitted', registered: 'unverified', suspended: 'inactive' };
const OWNERSHIP_DISPLAY = { approved: 'verified', rejected: 'queried', submitted: 'in_review', under_review: 'in_review' };

function mapUnit(record, evidence = [], activeTenancies = []) {
  if (!record) return null;
  const latest = evidence[0] || null;
  const ownershipStatus = latest ? OWNERSHIP_DISPLAY[latest.status] || 'unverified' : 'unverified';
  const verificationReason = latest && latest.decision_note ? latest.decision_note : null;
  return {
    id: record.id,
    unit_ref: record.unit_ref,
    ward_id: record.ward,
    mtaa: record.street,
    monthly_rent: record.rent_amount,
    occupancy: activeTenancies.some((tenancy) => tenancy.unit_id === record.id) ? 'occupied' : 'vacant',
    registration_status: REGISTRATION_DISPLAY[record.status] || 'unverified',
    ownership_status: ownershipStatus,
    version: record.version ?? 1,
    address_private: {
      anwani_ya_makazi: `${record.street || record.ward || ''} · plot reference held privately`,
      meter: 'TANESCO meter reference held privately',
    },
    documents: evidence.map((doc) => ({
      id: doc.id,
      label: EVIDENCE_KIND_LABELS[doc.evidence_kind] || EVIDENCE_KIND_LABELS.other,
      grade: EVIDENCE_KIND_GRADE[doc.evidence_kind] || 'weak',
      uploaded_at: (doc.created_date || '').slice(0, 10),
    })),
    verification: {
      status: ownershipStatus,
      verified_by: latest && latest.decided_by_name ? { en: latest.decided_by_name, sw: latest.decided_by_name } : null,
      verified_at: latest && latest.decided_at ? latest.decided_at.slice(0, 10) : null,
      reason: verificationReason,
    },
    eligible_for_rent: record.status === 'verified',
    certificate_note: record.status === 'verified' ? 'policy.registrationNoOwnership' : 'policy.ownershipVerifiedFirst',
  };
}

function mapTenancy(record) {
  if (!record) return null;
  return {
    id: record.id,
    unit_id: record.unit_id,
    unit_ref: record.unit_ref,
    tenant_ref: record.tenant_id || null,
    tenant_name: null,
    lease_id: null,
    start_date: record.start_date || null,
    paid_through: null,
    legacy: false,
    status: record.status,
    monthly_rent: record.rent_amount || null,
  };
}

function mapRentPayment(record) {
  if (!record) return null;
  const settled = record.status === 'settled';
  return {
    id: record.id,
    reference: record.reference,
    unit_ref: record.unit_ref || null,
    tenancy_id: record.tenancy_id,
    period_months: record.period_months || 1,
    rent_amount: record.amount,
    deposit_amount: record.deposit_amount || 0,
    tenant_total: record.tenant_total || (record.amount || 0) + (record.deposit_amount || 0),
    new_tenancy: Boolean(record.new_tenancy),
    allocation: {
      tax: record.withholding_amount || 0,
      commission: record.agent_commission || 0,
      landlord_settlement: record.net_to_landlord || record.amount || 0,
    },
    allocation_note: 'policy.allocationTitle',
    statuses: {
      payment_confirmation: settled ? 'settled' : 'pending',
      tax_remittance: 'not_connected',
      landlord_settlement: settled ? 'settled' : 'pending',
      deposit_custody: (record.deposit_amount || 0) > 0 ? 'pending' : 'not_connected',
    },
    state: settled ? 'settled' : record.status || 'pending',
    paid_at: record.paid_at || null,
    version: 1,
    duplicate: Boolean(record.duplicate),
  };
}

function mapWardReport(record) {
  if (!record) return null;
  const metrics = record.metrics || {};
  const flags = Object.keys(metrics).map((key) => ({
    id: `${record.id}-${key}`,
    label: { en: key.replace(/_/g, ' '), sw: key.replace(/_/g, ' ') },
    automatic_action: false,
  }));
  return {
    id: record.id,
    ward_id: record.ward,
    period: record.period,
    submitted_by: { en: record.submitted_by_name, sw: record.submitted_by_name },
    submitted_at: record.created_date,
    status: record.review_status,
    flags,
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

/* --------------------------------------------------------- events/council */

async function listPermits(params) {
  const query = {};
  if (params.status && params.status !== 'all') query.status = params.status;
  const page = await base44.entities.Permit.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  return { ...pageOf(page), items: page.items.map(mapPermit) };
}

async function submitPermit(params) {
  const record = await invokeFunction('createPermit', {
    event_name: params.event_name,
    event_date: params.event_date,
    venue: params.venue,
    vendor_count: params.vendor_count,
    idempotency_key: params.idempotencyKey,
  });
  return mapPermit(record);
}

async function decidePermit(params) {
  const record = await invokeFunction('decidePermit', {
    id: params.id,
    decision: params.decision,
    reason: params.reason,
    version: params.version,
    idempotency_key: params.idempotencyKey,
  });
  return mapPermit(record);
}

async function getCouncilOverview() {
  return invokeFunction('councilOverview', {});
}

async function getCouncilFees() {
  const user = await base44.auth.me();
  const district = user?.data?.district || null;
  const today = new Date().toISOString().slice(0, 10);
  const from = `${today.slice(0, 7)}-01`;
  const aggregate = await base44.entities.Permit.aggregate({
    query: { ...(district ? { district } : {}), status: 'approved' },
    groupBy: 'ward',
    sum: ['fee_amount'],
  });
  const rows = (aggregate?.rows || []).filter((row) => row.ward);
  const byWard = rows.map((row) => ({
    ward_id: row.ward,
    fees: Number(row.sum_fee_amount) || 0,
    permits: Number(row.count) || 0,
  }));
  return {
    period: { from, to: today },
    permit_fees: byWard.reduce((sum, row) => sum + row.fees, 0),
    permit_note: 'policy.permitVsTax',
    tax_note: {
      en: 'No tax figure is shown here. Council permit fees are not tax revenue.',
      sw: 'Hakuna kiasi cha kodi kinachoonyeshwa hapa. Ada za vibali za halmashauri si mapato ya kodi.',
    },
    by_ward: byWard,
  };
}

async function listWardReports(params) {
  const query = {};
  if (params.status && params.status !== 'all') query.review_status = params.status;
  const page = await base44.entities.WardReport.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  return { ...pageOf(page), items: page.items.map(mapWardReport) };
}

async function reviewWardReport(params) {
  return invokeFunction('decideWardReport', {
    id: params.id,
    decision: params.decision,
    reason: params.reason,
    idempotency_key: params.idempotencyKey,
  });
}

/* ------------------------------------------------------------------- rent */

async function fetchUnitContext(unitRows) {
  const unitIds = unitRows.map((unit) => unit.id);
  if (unitIds.length === 0) return { evidenceByUnit: new Map(), activeTenancies: [] };
  const [evidencePage, tenancyPage] = await Promise.all([
    base44.entities.OwnershipEvidence.filter({ unit_id: { $in: unitIds } }, { sort: '-created_date', limit: 100 }),
    base44.entities.Tenancy.filter({ unit_id: { $in: unitIds }, status: 'active' }, { limit: 100 }),
  ]);
  const evidence = evidencePage.items || [];
  const tenancies = tenancyPage.items || [];
  const evidenceByUnit = new Map();
  for (const doc of evidence) {
    const list = evidenceByUnit.get(doc.unit_id) || [];
    list.push(doc);
    evidenceByUnit.set(doc.unit_id, list);
  }
  return { evidenceByUnit, activeTenancies: tenancies };
}

async function listUnits(params) {
  const query = {};
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.ward_id) query.ward = params.ward_id;
  const page = await base44.entities.RentalUnit.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  const { evidenceByUnit, activeTenancies } = await fetchUnitContext(page.items);
  return {
    ...pageOf(page),
    items: page.items.map((unit) => mapUnit(unit, evidenceByUnit.get(unit.id) || [], activeTenancies)),
  };
}

async function createUnit(params) {
  const record = await invokeFunction('createUnit', {
    ward_id: params.ward_id,
    mtaa: params.mtaa,
    rent_amount: params.monthly_rent ?? params.rent_amount,
    property_type: params.property_type,
    bedrooms: params.bedrooms,
    idempotency_key: params.idempotencyKey,
  });
  return mapUnit(record, [], []);
}

async function getUnitOwnership(params) {
  const unit = await base44.entities.RentalUnit.get(params.id);
  const evidencePage = await base44.entities.OwnershipEvidence.filter({ unit_id: unit.id }, { sort: '-created_date', limit: 10 });
  const mapped = mapUnit(unit, evidencePage.items || [], []);
  return {
    unit_id: unit.id,
    unit_ref: unit.unit_ref,
    documents: mapped.documents,
    verification_status: mapped.ownership_status,
    ...mapped.verification,
    eligible_for_rent: mapped.eligible_for_rent,
    certificate_note: mapped.certificate_note,
  };
}

async function submitOwnershipEvidence(params) {
  return invokeFunction('submitOwnershipEvidence', {
    unit_id: params.unit_id || params.id,
    evidence_uri: params.evidence_uri,
    kind: params.kind,
    idempotency_key: params.idempotencyKey,
  });
}

async function decideOwnership(params) {
  return invokeFunction('decideOwnership', {
    id: params.id,
    decision: params.decision,
    reason: params.reason,
    idempotency_key: params.idempotencyKey,
  });
}

async function listVerificationQueue(params) {
  const query = { status: { $in: ['submitted', 'under_review'] } };
  const page = await base44.entities.OwnershipEvidence.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  const evidence = page.items || [];
  const unitIds = [...new Set(evidence.map((doc) => doc.unit_id))];
  let unitsById = new Map();
  if (unitIds.length > 0) {
    const unitPage = await base44.entities.RentalUnit.filter({ id: { $in: unitIds } }, { limit: 100 });
    unitsById = new Map((unitPage.items || []).map((unit) => [unit.id, unit]));
  }
  const items = evidence
    .map((doc) => {
      const unit = unitsById.get(doc.unit_id);
      if (!unit) return null;
      const ageDays = Math.max(0, Math.floor((Date.now() - new Date(doc.created_date).getTime()) / 86400000));
      return {
        unit_id: unit.id,
        unit_ref: unit.unit_ref,
        mtaa: unit.street,
        monthly_rent: unit.rent_amount,
        status: doc.status === 'submitted' ? 'submitted' : 'in_review',
        age_days: ageDays,
        match_flags: [],
        documents: [
          {
            id: doc.id,
            label: EVIDENCE_KIND_LABELS[doc.evidence_kind] || EVIDENCE_KIND_LABELS.other,
            grade: EVIDENCE_KIND_GRADE[doc.evidence_kind] || 'weak',
          },
        ],
      };
    })
    .filter(Boolean);
  return { ...pageOf(page), items };
}

async function getLandlordOverview() {
  return invokeFunction('landlordOverview', {});
}

/**
 * The signed-in account, read once per session. Row-level security already
 * hides other people's rows; this lets a workspace ask for its own side of a
 * tenancy explicitly, so a desk never relies on that alone.
 */
let viewerPromise = null;
function viewer() {
  if (!viewerPromise) viewerPromise = base44.auth.me().catch(() => null);
  return viewerPromise;
}

const OWNER_FIELD = { tenant: 'tenant_id', landlord: 'landlord_id' };

async function ownerQuery(params, base) {
  const query = { ...base };
  const field = OWNER_FIELD[params.scope];
  if (!field) return query;
  const user = await viewer();
  if (user) query[field] = user.id;
  return query;
}

async function listTenancies(params) {
  const base = {};
  if (params.status && params.status !== 'all') base.status = params.status;
  const query = await ownerQuery(params, base);
  const page = await base44.entities.Tenancy.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  return { ...pageOf(page), items: page.items.map(mapTenancy) };
}

async function listRentPayments(params) {
  const query = await ownerQuery(params, {});
  const page = await base44.entities.RentPayment.filter(query, {
    sort: '-created_date',
    limit: params.limit || 8,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  });
  return { ...pageOf(page), items: page.items.map(mapRentPayment) };
}

async function quoteRentPayment(params) {
  return invokeFunction('rentPayment', {
    mode: 'quote',
    rent_amount: params.rent_amount,
    period_months: params.period_months,
    new_tenancy: params.new_tenancy,
    deposit_amount: params.deposit_amount,
    idempotency_key: params.idempotencyKey,
  });
}

async function createRentPayment(params) {
  return invokeFunction('rentPayment', {
    mode: 'pay',
    unit_ref: params.unit_ref,
    rent_amount: params.rent_amount,
    period_months: params.period_months,
    deposit_amount: params.deposit_amount,
    new_tenancy: params.new_tenancy,
    idempotency_key: params.idempotencyKey,
  });
}

async function getRentPayment(params) {
  return invokeFunction('rentPayment', { mode: 'status', id: params.id, idempotency_key: params.idempotencyKey });
}

/* ---------------------------------------------------------------- uploads */

async function uploadEvidence(params) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: params.file });
  return {
    file_id: file_uri,
    content_type: params.content_type || null,
    bytes: params.bytes || null,
    sha256: null,
    uploaded_at: new Date().toISOString(),
  };
}

/* --------------------------------------------------------- operator/user */

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
    // The platform admin role (founder) is not an IBMT role value: it is shown
    // as `admin` so navigation and guards can open every workspace. Every admin
    // action is written to the audit log by the backend.
    role: data.ibmt_role || (user.role === 'admin' ? 'admin' : 'public'),
    jurisdiction: {
      wards: data.ward_ids || [],
      district: data.district || null,
      region: data.region || null,
    },
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
  /* events and council */
  listPermits,
  submitPermit,
  decidePermit,
  getCouncilOverview,
  getCouncilFees,
  listWardReports,
  reviewWardReport,
  /* rent */
  getLandlordOverview,
  listUnits,
  createUnit,
  getUnitOwnership,
  submitOwnershipEvidence,
  decideOwnership,
  listVerificationQueue,
  listTenancies,
  listRentPayments,
  quoteRentPayment,
  createRentPayment,
  getRentPayment,
  /* uploads */
  uploadEvidence,
};

export async function platformInvoke({ id, params = {} }) {
  const handler = HANDLERS[id];
  if (!handler) notWired(id);
  return handler(params || {});
}