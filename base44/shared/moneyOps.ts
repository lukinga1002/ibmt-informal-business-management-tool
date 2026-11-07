/**
 * Shared rules for the operator money functions.
 *
 * Every amount, serial number and confirmation window is decided here on the
 * server, never in the interface. Nothing in this module returns demo data.
 */

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function fail(status, code, message, fields = null) {
  return Response.json({ code, message, fields }, { status });
}

export function cleanText(value) {
  return String(value ?? '').trim();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isoNow() {
  return new Date().toISOString();
}

export function formatTZS(amount) {
  const value = Math.round(Number(amount) || 0);
  return `TZS ${value.toLocaleString('en-US')}`;
}

/** Evidence grades as the interface displays them (strong / moderate / weak). */
export const GRADE_DISPLAY = {
  verified_supplier: 'strong',
  audited: 'strong',
  supplier_receipt: 'strong',
  photo: 'moderate',
  none: 'weak',
};

export function displayGrade(grade) {
  return GRADE_DISPLAY[grade] || 'weak';
}

/** Default reporting window: the current calendar month, bounded by today. */
export function monthRange(from = null, to = null) {
  const today = todayISO();
  return { from: cleanText(from) || `${today.slice(0, 7)}-01`, to: cleanText(to) || today };
}

/**
 * DORMANT. PolicyVersion is no longer read by any rent money path: PolicyRule is
 * the single source for every rent rate. Kept only for the parked operator
 * module, which still reads permit fees and presumptive bands from it.
 */
export async function getActivePolicy(base44) {
  const page = await base44.entities.PolicyVersion.filter({ status: 'active' }, { sort: '-effective_from', limit: 1 });
  const items = page.items || page;
  return Array.isArray(items) && items.length ? items[0] : null;
}

/**
 * The rent policy rule in force: the latest row that has not been closed with
 * an effective_to date. PolicyRule is the single source for rent rates.
 */
export async function getPolicyRules(base44) {
  const page = await base44.entities.PolicyRule.filter({}, { sort: '-effective_from', limit: 5 });
  const items = page.items || page;
  const open = Array.isArray(items) ? items.filter((row) => !row.effective_to) : [];
  return open[0] || null;
}

/**
 * Rent rates exactly as the money functions read them, with the Stage 1 ruling:
 * the agent commission is one month's rent on a new tenancy, never 8% and never
 * capped in shillings. Tax is absent because Stage 1 runs no withholding.
 */
export function rentRates(rule) {
  const row = rule || {};
  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  return {
    landlord_service_fee_rate: num(row.landlord_service_fee_rate, 0),
    commission_months: num(row.commission_cap, 1),
    deposit_cap_months: num(row.deposit_cap_months, 1),
  };
}

/**
 * The signed-in operator's business. Receipts, expenses and summaries always
 * belong to exactly one business. A first-time operator gets a draft profile
 * provisioned, exactly as onboarding would, so no screen ever runs on data
 * that belongs to someone else.
 */
export async function findBusiness(base44, user, { provision = true } = {}) {
  const page = await base44.entities.BusinessProfile.filter({}, { sort: '-created_date', limit: 1 });
  const items = page.items || page;
  if (Array.isArray(items) && items.length) return items[0];
  if (!provision) return null;
  return base44.entities.BusinessProfile.create({
    business_name: cleanText(user.full_name) || 'My business',
    owner_name: cleanText(user.full_name),
    district: 'Kinondoni',
    ward: 'Mikocheni',
    status: 'draft',
  });
}

/**
 * Duplicate protection part one: the same action key must always return the
 * same receipt, so a retried submit can never create a second record.
 */
export async function findExistingByKey(base44, entity, idempotencyKey) {
  const page = await base44.entities[entity].filter({ idempotency_key: idempotencyKey }, { limit: 1 });
  const items = page.items || page;
  return Array.isArray(items) && items.length ? items[0] : null;
}

/**
 * Duplicate protection part two: serial numbers are unique per year. The
 * sequence is global, so the service role counts references; the caller still
 * only ever reads or writes its own records.
 */
/** Bilingual text pair, the shape every screen label in the interface expects. */
export function bilingual(en, sw) {
  return { en, sw };
}

/** True when the signed-in user holds one of the given IBMT roles (or is an app admin). */
export function hasIbmtRole(user, roles) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const role = user.data && user.data.ibmt_role;
  return Array.isArray(roles) ? roles.includes(role) : role === roles;
}

/** Days since an ISO timestamp, floored at zero. Used for queue and reminder ages. */
export function ageDays(isoDate) {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Duplicate protection, generalized: serial numbers are unique per year for
 * one entity. The service role counts existing references; the caller still
 * only ever reads or writes its own records.
 */
export async function nextSerial(base44, entity, prefix, fieldName = 'reference') {
  const query = { [fieldName]: { $regex: `^${prefix}` } };
  const existing = await base44.asServiceRole.entities[entity].filter(query, { limit: 500 });
  const rows = existing.items || existing;
  let highest = 0;
  for (const row of rows) {
    const seq = Number(String(row[fieldName] || '').slice(prefix.length));
    if (Number.isFinite(seq) && seq > highest) highest = seq;
  }
  let candidate = highest + 1;
  for (let attempt = 0; attempt < 10; attempt++) {
    const reference = `${prefix}${String(candidate + attempt).padStart(6, '0')}`;
    const taken = await base44.asServiceRole.entities[entity].filter({ [fieldName]: reference }, { limit: 1 });
    const takenRows = taken.items || taken;
    if (!Array.isArray(takenRows) || !takenRows.length) return reference;
  }
  return `${prefix}${Date.now().toString().slice(-8)}`;
}

export async function nextReceiptReference(base44) {
  const year = new Date().getFullYear();
  return nextSerial(base44, 'Receipt', `IBMT-RCP-${year}-`);
}