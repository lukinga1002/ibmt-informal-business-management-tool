/**
 * Demonstration adapter.
 *
 * Stands in for the external IBMT backend while the interface is built.
 * Rules this adapter follows deliberately:
 *  - it never answers a failed live request (there is no fallback path here);
 *  - it enforces the operation scope, so permission states are real;
 *  - payments keep the same answer for the same idempotency key;
 *  - a timeout is reported as unconfirmed, never as success or failure;
 *  - every amount and status it returns is fictional and labelled as such.
 */

import { OPERATIONS } from '../operations';
import { IBMTError } from '../errors';
import { POLICY_VALUES, DEMO_SUBJECTS, NOTIFICATIONS, ACCESS_HISTORY, CONSENTS, VERIFICATION_RECORDS, DOCUMENT_SPECIMENS, USSD_MENU } from './data.shared';
import * as events from './data.events';
import * as rent from './data.rent';

const clone = (value) => JSON.parse(JSON.stringify(value));

let store = null;

function db() {
  if (!store) {
    store = {
      POLICY_VALUES: clone(POLICY_VALUES),
      DEMO_SUBJECTS: clone(DEMO_SUBJECTS),
      NOTIFICATIONS: clone(NOTIFICATIONS),
      ACCESS_HISTORY: clone(ACCESS_HISTORY),
      CONSENTS: clone(CONSENTS),
      VERIFICATION_RECORDS: clone(VERIFICATION_RECORDS),
      DOCUMENT_SPECIMENS: clone(DOCUMENT_SPECIMENS),
      USSD_MENU: clone(USSD_MENU),
      ...clone(events),
      ...clone(rent),
      EXPORTS: [],
      USSD_SESSIONS: {},
      _idempotency: {},
    };
  }
  return store;
}

export function resetMockStore() {
  store = null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

function fail(code, message, extra = {}) {
  throw new IBMTError({ code, message, ...extra });
}

function scenarioOf() {
  try {
    return window.localStorage.getItem('ibmt.pref.mockScenario') || 'happy';
  } catch {
    return 'happy';
  }
}

function scopeCheck(id, ctx) {
  const spec = OPERATIONS[id];
  if (!spec || !spec.auth) return;
  const scope = spec.scope || ['*'];
  if (scope.includes('*')) return;
  const role = ctx.role || 'public';
  if (!scope.includes(role)) {
    fail('FORBIDDEN', `Role ${role} is not permitted to call ${id}`);
  }
}

function paginate(items, params = {}) {
  const limit = Math.max(1, Math.min(Number(params.limit) || 8, 50));
  const offset = params.cursor ? Number(params.cursor) || 0 : 0;
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    items: slice,
    next_cursor: next < items.length ? String(next) : null,
    has_more: next < items.length,
    total: items.length,
  };
}

function filterList(items, params = {}, keys = []) {
  const q = (params.q || '').trim().toLowerCase();
  const status = params.status;
  return items.filter((item) => {
    if (status && status !== 'all' && item.status !== status) return false;
    if (!q) return true;
    return keys.some((key) => String(item[key] || '').toLowerCase().includes(q));
  });
}

function findById(list, id) {
  const record = list.find((item) => item.id === id);
  if (!record) fail('NOT_FOUND', `No record for ${id}`);
  return record;
}

function idempotent(key, fn) {
  if (!key) return fn();
  const cache = db()._idempotency;
  if (cache[key]) return clone(cache[key]);
  const result = fn();
  cache[key] = clone(result);
  return result;
}

/* ------------------------------------------------------------------ handlers */

const HANDLERS = {
  /* session and privacy */
  session: (_p, ctx) => {
    const subject = db().DEMO_SUBJECTS[ctx.role] || db().DEMO_SUBJECTS.public;
    return { ...subject, demonstration: true, session_mechanism: 'demonstration' };
  },

  listNotifications: (params) => {
    const items = filterList(db().NOTIFICATIONS, params, ['kind']);
    return paginate(items, params);
  },

  markNotificationRead: (params) => {
    const record = findById(db().NOTIFICATIONS, params.id);
    record.read = true;
    record.read_at = now();
    return { id: record.id, read: true };
  },

  listAccessHistory: (params) => paginate(db().ACCESS_HISTORY, params),

  getConsents: () => db().CONSENTS,

  setConsent: (params) => {
    const key = params.key;
    const record = db().CONSENTS[key];
    if (!record) fail('NOT_FOUND', `No consent ${key}`);
    if (record.mandatory && params.granted === false) {
      fail('VALIDATION', 'The core consent cannot be withdrawn while a tenancy is active', {
        fieldErrors: { consent: 'The core consent cannot be withdrawn while a tenancy is active.' },
      });
    }
    record.granted = Boolean(params.granted);
    record.effective_at = now();
    return { key, granted: record.granted, effective_at: record.effective_at };
  },

  requestExport: (params) =>
    idempotent(params.idempotencyKey, () => {
      const record = { export_id: uid('exp'), scope: params.scope || 'own_records', state: 'queued', requested_at: now(), note: 'Handled and recorded by the backend.' };
      db().EXPORTS.unshift(record);
      return record;
    }),

  getPolicyValues: () => db().POLICY_VALUES,

  /* events */
  getOperatorOverview: () => db().OPERATOR_OVERVIEW,
  getOperatorProfile: () => db().OPERATOR_BUSINESS,

  saveOperatorProfile: (params) => {
    const profile = db().OPERATOR_BUSINESS;
    Object.assign(profile, params || {});
    profile.completed = profile.onboarding_steps.every((step) => step.state === 'complete');
    return profile;
  },

  listReceipts: (params) => {
    const items = filterList(db().RECEIPTS, params, ['reference', 'buyer_name']);
    return paginate(params.limit ? items : items, params);
  },

  getReceipt: (params) => findById(db().RECEIPTS, params.id),

  createReceipt: (params, ctx) =>
    idempotent(params.idempotencyKey, () => {
      const receipt = {
        id: uid('rcp'),
        reference: `IBMT-RCP-2026-${String(5000 + db().RECEIPTS.length).padStart(6, '0')}`,
        issued_on: new Date().toISOString().slice(0, 10),
        buyer_name: params.buyer_name,
        buyer_ref: params.buyer_ref || null,
        total: Number(params.total) || 0,
        status: 'draft',
        version: 1,
        fiscal_status: 'not_fiscal',
        fiscal_note: 'notices.fiscal',
        buyer_confirmation: 'draft',
        lines: params.lines || [],
        evidence: [],
        created_by_role: ctx.role,
      };
      db().RECEIPTS.unshift(receipt);
      return receipt;
    }),

  issueReceipt: (params) =>
    idempotent(params.idempotencyKey, () => {
      const receipt = findById(db().RECEIPTS, params.id);
      if (receipt.status === 'confirmed') fail('CONFLICT', 'A confirmed receipt cannot be re-issued');
      receipt.status = 'awaiting_confirmation';
      receipt.buyer_confirmation = 'awaiting_confirmation';
      receipt.version += 1;
      receipt.confirmation_expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
      return receipt;
    }),

  confirmReceipt: (params) =>
    idempotent(params.idempotencyKey, () => {
      const receipt = findById(db().RECEIPTS, params.id);
      if (params.version && Number(params.version) !== receipt.version) {
        fail('CONFLICT', 'This receipt changed after you opened it', { fieldErrors: null });
      }
      receipt.status = 'confirmed';
      receipt.buyer_confirmation = 'confirmed';
      receipt.confirmed_at = now();
      receipt.version += 1;
      return receipt;
    }),

  verifyRecord: (params) => {
    const reference = String(params.reference || '').trim().toUpperCase();
    const record = db().VERIFICATION_RECORDS[reference];
    if (!record) {
      return { kind: params.kind || null, reference, found: false, searched_at: now() };
    }
    return { ...record, reference, searched_at: now() };
  },

  listExpenses: (params) => paginate(filterList(db().EXPENSES, params, ['supplier']), params),

  createExpense: (params) =>
    idempotent(params.idempotencyKey, () => {
      const expense = {
        id: uid('exp'),
        supplier: params.supplier,
        amount: Number(params.amount) || 0,
        incurred_on: params.incurred_on || new Date().toISOString().slice(0, 10),
        evidence_grade: params.evidence ? 'moderate' : 'weak',
        evidence_label: params.evidence ? { en: 'Evidence attached', sw: 'Ushahidi umeambatishwa' } : { en: 'No third-party evidence held', sw: 'Hakuna ushahidi wa mtu wa tatu' },
        evidence: params.evidence ? [{ id: uid('ev'), label: { en: 'Uploaded evidence', sw: 'Ushahidi uliopakiwa' }, grade: 'moderate' }] : [],
      };
      db().EXPENSES.unshift(expense);
      return expense;
    }),

  getFinancialSummary: () => db().FINANCIAL_SUMMARY,

  listBookings: (params) => paginate(filterList(db().BOOKINGS, params, ['reference', 'counterparty_name']), params),

  recordDeposit: (params) =>
    idempotent(params.idempotencyKey, () => {
      const booking = findById(db().BOOKINGS, params.id);
      const amount = Number(params.amount) || 0;
      booking.deposit += amount;
      booking.balance = booking.agreed_total - booking.deposit;
      booking.deposit_records = [
        ...booking.deposit_records,
        { id: uid('dep'), amount, received_at: new Date().toISOString().slice(0, 10), method: params.method || { en: 'Payment partner', sw: 'Mshirika wa malipo' }, reference: `DEP-${Date.now().toString().slice(-6)}` },
      ];
      return { booking_id: booking.id, deposit: booking.deposit, balance: booking.balance, deposit_record: booking.deposit_records.slice(-1)[0] };
    }),

  listPermits: (params) => paginate(filterList(db().PERMITS, params, ['reference']), params),

  submitPermit: (params) =>
    idempotent(params.idempotencyKey, () => {
      const permit = {
        id: uid('pmt'),
        reference: `IBMT-PMT-2026-${String(400 + db().PERMITS.length).padStart(6, '0')}`,
        event_date: params.event_date,
        venue: { en: params.venue, sw: params.venue },
        ward_id: params.ward_id || 'Mwananyamala',
        status: 'submitted',
        version: 1,
        fee_amount: null,
        decision_reason: null,
        decided_at: null,
        decided_by: null,
        attachments: [],
        applied_at: now(),
      };
      db().PERMITS.unshift(permit);
      return permit;
    }),

  decidePermit: (params) =>
    idempotent(params.idempotencyKey, () => {
      if (!params.reason || !params.reason.trim()) {
        fail('VALIDATION', 'A reason is required for this decision', { fieldErrors: { reason: 'A reason is required for this decision.' } });
      }
      const permit = findById(db().PERMITS, params.id);
      permit.status = params.decision;
      permit.decision_reason = { en: params.reason, sw: params.reason };
      permit.decided_at = now();
      permit.version += 1;
      return permit;
    }),

  listComplaints: (params) => {
    const scope = params.scope;
    let items = db().COMPLAINTS;
    if (scope === 'mine') items = items.filter((item) => item.filed_by_ref === 'IBMT-CNS-000118' || item.filed_by_ref === 'IBMT-CNS-000311');
    return paginate(filterList(items, params, ['reference', 'subject']), params);
  },

  createComplaint: (params) =>
    idempotent(params.idempotencyKey, () => {
      const complaint = {
        id: uid('cmp'),
        reference: `IBMT-CMP-2026-${String(200 + db().COMPLAINTS.length).padStart(6, '0')}`,
        subject: { en: params.subject, sw: params.subject },
        filed_at: new Date().toISOString().slice(0, 10),
        status: 'submitted',
        visibility: 'private',
        filed_by_ref: params.filed_by_ref || 'IBMT-CNS-000118',
        about_ref: params.about_ref || null,
        body: { en: params.body, sw: params.body },
        replies: [],
      };
      db().COMPLAINTS.unshift(complaint);
      return complaint;
    }),

  replyComplaint: (params) =>
    idempotent(params.idempotencyKey, () => {
      const complaint = findById(db().COMPLAINTS, params.id);
      complaint.replies.push({ id: uid('rep'), by: { en: 'Provider', sw: 'Mtoa huduma' }, at: now(), body: { en: params.body, sw: params.body } });
      complaint.status = 'in_review';
      return complaint;
    }),

  listRatings: (params) => paginate(filterList(db().RATINGS, params, ['comment']), params),

  moderateRating: (params) =>
    idempotent(params.idempotencyKey, () => {
      if (!params.reason || !params.reason.trim()) {
        fail('VALIDATION', 'A reason is required for this decision', { fieldErrors: { reason: 'A reason is required for this decision.' } });
      }
      const rating = findById(db().RATINGS, params.id);
      rating.moderation_status = params.decision;
      rating.published = params.decision === 'approved';
      rating.moderation_reason = params.reason;
      return rating;
    }),

  listCommitteeLedger: () => db().COMMITTEE_LEDGER,

  listWardReports: (params) => paginate(filterList(db().WARD_REPORTS, params, ['ward_id']), params),

  reviewWardReport: (params) =>
    idempotent(params.idempotencyKey, () => {
      if (!params.reason || !params.reason.trim()) {
        fail('VALIDATION', 'A reason is required for this review', { fieldErrors: { reason: 'A reason is required for this review.' } });
      }
      const report = findById(db().WARD_REPORTS, params.id);
      report.status = params.decision;
      report.review_reason = params.reason;
      report.reviewed_at = now();
      return report;
    }),

  getCouncilOverview: () => db().COUNCIL_OVERVIEW,
  getCouncilFees: () => db().COUNCIL_FEES,
  getTraOverview: () => db().TRA_OVERVIEW,
  listTraBusinesses: (params) => paginate(db().TRA_BUSINESSES, params),
  getTraEstimates: () => db().TRA_ESTIMATES,
  getTraQuality: () => db().TRA_QUALITY,

  /* rent — landlord, portfolio, tenancies */
  getLandlordOverview: () => db().LANDLORD_OVERVIEW,
  listUnits: (params) => paginate(filterList(db().UNITS, params, ['unit_ref', 'ward_id']), params),

  createUnit: (params) =>
    idempotent(params.idempotencyKey, () => {
      const unit = {
        id: uid('unt'),
        unit_ref: `IBMT-UNIT-2026-${String(2400 + db().UNITS.length).padStart(6, '0')}`,
        ward_id: params.ward_id || 'Mwananyamala',
        mtaa: params.mtaa || 'Mwananyamala',
        monthly_rent: Number(params.monthly_rent) || 0,
        occupancy: 'vacant',
        registration_status: 'submitted',
        ownership_status: 'in_review',
        version: 1,
        address_private: { anwani_ya_makazi: 'Private until verified', meter: 'Private until verified' },
        documents: [],
        verification: { status: 'in_review', verified_by: null, verified_at: null, reason: null },
        eligible_for_rent: false,
        certificate_note: 'policy.registrationNoOwnership',
      };
      db().UNITS.unshift(unit);
      db().VERIFICATION_QUEUE.unshift({ unit_id: unit.id, unit_ref: unit.unit_ref, mtaa: unit.mtaa, monthly_rent: unit.monthly_rent, status: 'submitted', age_days: 0, match_flags: [], documents: [] });
      return unit;
    }),

  uploadEvidence: (params) =>
    idempotent(params.idempotencyKey, () => ({
      file_id: uid('file'),
      content_type: params.content_type || 'application/pdf',
      bytes: params.bytes || 0,
      sha256: 'demonstration-hash',
      uploaded_at: now(),
      storage: 'private',
      note: 'Stored privately. Only a time-limited signed link is ever produced.',
    })),

  getUnitOwnership: (params) => {
    const unit = findById(db().UNITS, params.id);
    return { unit_id: unit.id, unit_ref: unit.unit_ref, documents: unit.documents, verification_status: unit.ownership_status, ...unit.verification, eligible_for_rent: unit.eligible_for_rent, certificate_note: 'policy.registrationNoOwnership' };
  },

  submitOwnershipEvidence: (params) =>
    idempotent(params.idempotencyKey, () => {
      const unit = findById(db().UNITS, params.id);
      unit.documents.push({ id: uid('ud'), label: { en: params.label || 'Uploaded evidence', sw: params.label || 'Ushahidi uliopakiwa' }, grade: 'moderate', uploaded_at: new Date().toISOString().slice(0, 10) });
      unit.ownership_status = 'in_review';
      unit.registration_status = 'submitted';
      unit.verification = { status: 'in_review', verified_by: null, verified_at: null, reason: null };
      unit.version += 1;
      return unit;
    }),

  listVerificationQueue: (params) => paginate(filterList(db().VERIFICATION_QUEUE, params, ['unit_ref', 'mtaa']), params),

  decideOwnership: (params) =>
    idempotent(params.idempotencyKey, () => {
      if (!params.reason || !params.reason.trim()) {
        fail('VALIDATION', 'A reason is required for this decision', { fieldErrors: { reason: 'A reason is required for this decision.' } });
      }
      const unit = findById(db().UNITS, params.id);
      const map = { approve: 'verified', query: 'queried', reject: 'unverified' };
      const status = map[params.decision] || 'queried';
      unit.ownership_status = status;
      unit.registration_status = status === 'verified' ? 'verified' : 'queried';
      unit.eligible_for_rent = status === 'verified';
      unit.verification = { status, verified_by: { en: 'Mtaa officer (demonstration)', sw: 'Afisa wa Mtaa (majaribio)' }, verified_at: now(), reason: { en: params.reason, sw: params.reason } };
      unit.version += 1;
      const queueItem = db().VERIFICATION_QUEUE.find((item) => item.unit_id === unit.id);
      if (queueItem) queueItem.status = status;
      return unit;
    }),

  listListings: (params) => {
    let items = db().LISTINGS;
    if (params.verified_only) items = items.filter((item) => item.verified);
    const filtered = filterList(items, params, ['headline']);
    return paginate(filtered, params);
  },

  createListing: (params) =>
    idempotent(params.idempotencyKey, () => {
      const unit = findById(db().UNITS, params.unit_id);
      if (!unit.eligible_for_rent) {
        fail('VALIDATION', 'A unit cannot be listed until ownership evidence is verified', {
          fieldErrors: { unit_id: 'Ownership evidence must be verified by the authorised officer first.' },
        });
      }
      const listing = {
        id: uid('lst'),
        unit_id: unit.id,
        unit_ref: unit.unit_ref,
        ward_id: unit.ward_id,
        mtaa: unit.mtaa,
        headline: { en: params.headline, sw: params.headline },
        monthly_rent: unit.monthly_rent,
        deposit: unit.monthly_rent,
        verified: true,
        marketing_consent: Boolean(params.marketing_consent),
        viewings_open: true,
        listed_at: new Date().toISOString().slice(0, 10),
        available_from: params.available_from || null,
        amenities: [],
      };
      db().LISTINGS.unshift(listing);
      return listing;
    }),

  listMandates: (params) => paginate(filterList(db().MANDATES, params, ['agent_name']), params),

  createMandate: (params) =>
    idempotent(params.idempotencyKey, () => {
      const licence = db().AGENT_LICENCES.find((item) => item.agent_id === params.agent_id);
      if (!licence || licence.status !== 'active' || !licence.ibmt_business) {
        return {
          mandate_id: null,
          status: 'rejected',
          rejected_reason: 'policy.licenceRule',
          note: { en: 'Only council-licensed agents registered as IBMT businesses can be selected on a mandate.', sw: 'Ni mawakala walioidhinishwa na halmashauri na waliosajiliwa kama biashara za IBMT pekee wanaoweza kuchaguliwa.' },
        };
      }
      const mandate = {
        id: uid('mnd'),
        agent_id: licence.agent_id,
        agent_name: licence.name,
        licence_status: licence.status,
        licence_expires_at: licence.expires_at,
        ibmt_business: true,
        scope: params.scope || [{ en: 'Market the unit', sw: 'Kutangaza kitengo' }],
        commission_cap_percent: 10,
        status: 'active',
        created_at: now(),
        note: 'policy.commissionRule',
      };
      db().MANDATES.unshift(mandate);
      return { mandate_id: mandate.id, status: mandate.status, mandate };
    }),

  listTenancies: (params) => paginate(filterList(db().TENANCIES, params, ['unit_ref', 'tenant_name']), params),
  getLease: (params) => findById(db().LEASES, params.id),

  buildLease: (params) =>
    idempotent(params.idempotencyKey, () => {
      const lease = {
        id: uid('lse'),
        tenancy_id: params.tenancy_id || null,
        unit_ref: params.unit_ref,
        terms_version: 'T-2026.10-v1',
        version: 1,
        parties: params.parties,
        terms: params.terms,
        language_pairs: ['en', 'sw'],
        signature_state: 'draft',
        otp_challenge: null,
        stamp_duty_state: 'not_assessed',
        activation_state: 'not_active',
        changed_after_signature: false,
      };
      db().LEASES.unshift(lease);
      return lease;
    }),

  updateLease: (params) =>
    idempotent(params.idempotencyKey, () => {
      const lease = findById(db().LEASES, params.id);
      const wasSigned = lease.signature_state === 'success';
      lease.terms = { ...lease.terms, ...(params.terms || {}) };
      lease.terms_version = `T-2026.10-v${lease.version + 1}`;
      lease.version += 1;
      lease.changed_after_signature = wasSigned;
      if (wasSigned) {
        lease.signature_state = 'invalidated';
        lease.activation_state = 'not_active';
        lease.parties = lease.parties.map((party) => ({ ...party, signed: false, signed_at: null }));
        lease.note = { en: 'Terms changed: the earlier signature is no longer valid and both parties must sign again.', sw: 'Masharti yamebadilika: saini ya awali haitumiki na wahusika wote wanapaswa kusaini tena.' };
      }
      return lease;
    }),

  requestLeaseSignature: (params) =>
    idempotent(params.idempotencyKey, () => {
      const lease = findById(db().LEASES, params.id);
      const challenge = { challenge_id: uid('otp'), party: params.party || 'tenant', expires_at: new Date(Date.now() + 5 * 60000).toISOString(), attempts_remaining: 3, demonstration_code: '123456' };
      lease.otp_challenge = challenge;
      lease.signature_state = 'pending';
      return challenge;
    }),

  signLease: (params) =>
    idempotent(params.idempotencyKey, () => {
      const lease = findById(db().LEASES, params.id);
      const challenge = lease.otp_challenge;
      if (!challenge) fail('BAD_REQUEST', 'No active signing challenge for this lease');
      if (new Date(challenge.expires_at).getTime() < Date.now()) {
        fail('VALIDATION', 'This signing challenge has expired', { fieldErrors: { otp: 'The one-time code expired. Request a new challenge.' } });
      }
      if (String(params.otp) !== String(challenge.demonstration_code)) {
        challenge.attempts_remaining -= 1;
        fail('VALIDATION', 'The code did not match', { fieldErrors: { otp: `The code did not match. ${challenge.attempts_remaining} attempt(s) remaining.` } });
      }
      lease.parties = lease.parties.map((party) => (party.role.en === 'Tenant' || party.role === challenge.party ? { ...party, signed: true, signed_at: now() } : party));
      lease.signature_state = 'success';
      lease.stamp_duty_state = 'assessed';
      lease.activation_state = 'active';
      lease.otp_challenge = null;
      lease.version += 1;
      return lease;
    }),

  getStampDutyAssessment: (params) => {
    const lease = findById(db().LEASES, params.id);
    return { lease_id: lease.id, state: lease.stamp_duty_state, assessed_amount: lease.stamp_duty_state === 'assessed' ? 15000 : null, assessed_at: lease.stamp_duty_state === 'assessed' ? now() : null, policy_version: db().POLICY_VALUES.version, rule: { en: 'Assessed by the backend from the versioned policy values.', sw: 'Inakadiriwa na backend kutoka viwango vya sera vyenye toleo.' } };
  },

  listRentPayments: (params) => {
    const scope = params.scope;
    let items = db().PAYMENTS;
    if (scope === 'landlord') items = items.filter((item) => ['IBMT-UNIT-2026-002310', 'IBMT-UNIT-2026-002313', 'IBMT-UNIT-2026-002314', 'IBMT-UNIT-2026-002315'].includes(item.unit_ref));
    return paginate(filterList(items, params, ['reference', 'unit_ref']), params);
  },

  quoteRentPayment: (params) =>
    idempotent(params.idempotencyKey, () => {
      const quote = clone(db().RENT_PAYMENT_QUOTE);
      if (Number(params.rent_amount) && Number(params.period_months)) {
        quote.rent_amount = Number(params.rent_amount) * Number(params.period_months);
        quote.period_months = Number(params.period_months);
        quote.monthly_rent = Number(params.rent_amount);
        quote.new_tenancy = params.new_tenancy !== false;
      }
      return quote;
    }),

  createRentPayment: (params) =>
    idempotent(params.idempotencyKey, () => {
      const payment = {
        id: uid('pay'),
        reference: `IBMT-RENT-PAY-2026-${String(720 + db().PAYMENTS.length).padStart(6, '0')}`,
        unit_ref: params.unit_ref,
        tenancy_id: params.tenancy_id || null,
        period_months: params.period_months,
        rent_amount: params.rent_amount,
        deposit_amount: params.deposit_amount || 0,
        tenant_total: (params.rent_amount || 0) + (params.deposit_amount || 0),
        new_tenancy: Boolean(params.new_tenancy),
        allocation: params.allocation,
        allocation_note: 'policy.allocationTitle',
        illustrative: true,
        partner: { en: 'Approved payment partner', sw: 'Mshirika wa malipo aliyeidhinishwa' },
        statuses: { payment_confirmation: 'awaiting_confirmation', tax_remittance: 'not_connected', landlord_settlement: 'not_connected', deposit_custody: params.deposit_amount ? 'not_connected' : 'not_connected' },
        state: 'awaiting_confirmation',
        paid_at: null,
        version: 1,
      };
      db().PAYMENTS.unshift(payment);
      return payment;
    }),

  getRentPayment: (params) => {
    if (params.simulate === 'timeout') {
      return { id: params.id, state: 'unconfirmed', statuses: { payment_confirmation: 'pending', tax_remittance: 'not_connected', landlord_settlement: 'not_connected', deposit_custody: 'not_connected' }, note: 'forms.timeout' };
    }
    return findById(db().PAYMENTS, params.id);
  },

  listDeposits: (params) => paginate(filterList(db().DEPOSITS, params, ['unit_ref', 'tenant_name']), params),

  createConditionReport: (params) =>
    idempotent(params.idempotencyKey, () => {
      const report = {
        id: uid('cr'),
        deposit_id: params.deposit_id,
        phase: params.phase,
        created_at: new Date().toISOString().slice(0, 10),
        agreement_state: 'pending',
        version: 1,
        items: params.items || [],
        photos: params.photos || [],
        note: 'policy.checklistNotRelease',
      };
      db().CONDITION_REPORTS.unshift(report);
      return report;
    }),

  agreeConditionReport: (params) =>
    idempotent(params.idempotencyKey, () => {
      const report = findById(db().CONDITION_REPORTS, params.id);
      if (params.agreement_state === 'disputed' && !params.disagreement_reason) {
        fail('VALIDATION', 'A reason is required when you disagree', { fieldErrors: { reason: 'A reason is required when you disagree.' } });
      }
      report.agreement_state = params.agreement_state;
      report.disagreement_reason = params.disagreement_reason || null;
      report.agreed_at = now();
      report.version += 1;
      return report;
    }),

  releaseDeposit: (params) =>
    idempotent(params.idempotencyKey, () => {
      const deposit = findById(db().DEPOSITS, params.id);
      const challenge = params.otp;
      if (!challenge) fail('BAD_REQUEST', 'A mutual one-time code is required to release a deposit');
      if (String(challenge) !== '123456') {
        fail('VALIDATION', 'The code did not match', { fieldErrors: { otp: 'The code did not match. Both parties must confirm with their own code.' } });
      }
      if (deposit.checklist_state === 'disputed') {
        fail('VALIDATION', 'A disputed checklist cannot be released. Continue in dispute or mediation.', {
          fieldErrors: { otp: 'This deposit has a disputed condition report. Resolve the dispute first.' },
        });
      }
      deposit.release_codes = { tenant: true, landlord: true };
      deposit.custody_state = 'released';
      deposit.custodian_confirmation_state = 'pending';
      return { deposit_id: deposit.id, custody_state: deposit.custody_state, custodian_confirmation_state: deposit.custodian_confirmation_state, note: 'Custodian confirmation is still pending. Release is not complete until the custodian confirms.' };
    }),

  listNotices: (params) => paginate(filterList(db().NOTICES, params, ['unit_ref']), params),

  issueNotice: (params) =>
    idempotent(params.idempotencyKey, () => {
      const notice = {
        id: uid('ntc'),
        kind: params.kind,
        unit_ref: params.unit_ref,
        issued_at: new Date().toISOString().slice(0, 10),
        response_due: params.response_due || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'pending',
        body: { en: params.body, sw: params.body },
      };
      db().NOTICES.unshift(notice);
      return notice;
    }),

  listDisputes: (params) => paginate(filterList(db().DISPUTES, params, ['unit_ref', 'kind']), params),

  createDispute: (params) =>
    idempotent(params.idempotencyKey, () => {
      const dispute = {
        id: uid('dsp'),
        unit_ref: params.unit_ref,
        kind: params.kind,
        raised_by: { en: 'Tenant', sw: 'Mpangaji' },
        filed_at: new Date().toISOString().slice(0, 10),
        status: 'pending',
        mediation_state: 'not_started',
        summary: { en: params.summary, sw: params.summary },
      };
      db().DISPUTES.unshift(dispute);
      return dispute;
    }),

  getTaxCompliance: () => db().TAX_COMPLIANCE,
  getAmnestyNotice: () => db().AMNESTY,
  getTenantRegistration: () => db().TENANT_REGISTRATION,

  submitTenantRegistration: (params) =>
    idempotent(params.idempotencyKey, () => {
      const claim = db().TENANT_REGISTRATION;
      claim.state = 'awaiting_landlord';
      claim.landlord_notified_at = now();
      claim.response_due = new Date(Date.now() + 14 * 86400000).toISOString();
      claim.council_review_state = 'not_started';
      claim.unit_ref = params.unit_ref || claim.unit_ref;
      return claim;
    }),

  getViewingSlots: (params) => ({ items: db().VIEWING_SLOTS.filter((slot) => !params.id || slot.listing_id === params.id), total: db().VIEWING_SLOTS.length }),

  bookViewing: (params) =>
    idempotent(params.idempotencyKey, () => {
      const viewing = { id: uid('vw'), listing_id: params.listing_id, unit_ref: params.unit_ref, starts_at: params.starts_at, status: 'scheduled', fee_amount: 0, tenant_ref: 'IBMT-TNT-000822' };
      db().VIEWINGS.unshift(viewing);
      return viewing;
    }),

  listViewings: (params) => paginate(filterList(db().VIEWINGS, params, ['unit_ref']), params),

  listEvidencePack: () => db().EVIDENCE_PACK,

  previewEvidencePack: () => db().EVIDENCE_PACK,

  exportEvidencePack: (params) =>
    idempotent(params.idempotencyKey, () => {
      const record = { export_id: uid('pack'), items: params.items || [], state: 'ready', created_at: now(), note: 'Only the items you selected. Nothing is sent to any other party automatically.' };
      db().EXPORTS.unshift(record);
      return record;
    }),

  getAgentProfile: () => db().AGENT_PROFILE,
  listAgentCommissions: (params) => paginate(db().AGENT_COMMISSIONS, params),
  getManagerScope: () => db().MANAGER_SCOPE,
  getAreaStats: () => db().AREA_STATS,
  listAgentLicences: (params) => paginate(filterList(db().AGENT_LICENCES, params, ['name', 'licence_number']), params),

  decideAgentLicence: (params) =>
    idempotent(params.idempotencyKey, () => {
      if (!params.reason || !params.reason.trim()) {
        fail('VALIDATION', 'A reason is required for this decision', { fieldErrors: { reason: 'A reason is required for this decision.' } });
      }
      const licence = db().AGENT_LICENCES.find((item) => item.agent_id === params.id);
      if (!licence) fail('NOT_FOUND', 'No licence for that agent');
      licence.status = params.decision;
      licence.reason = params.reason;
      licence.decided_at = now();
      return licence;
    }),

  listComplianceQueue: (params) => paginate(db().COMPLIANCE_QUEUE, params),
  listMediationCases: (params) => paginate(db().MEDIATION_CASES, params),
  getRentTraStats: () => db().RENT_TRA_STATS,
  getRentAccessLog: (params) => paginate(db().ACCESS_HISTORY.filter((item) => item.actor_role === 'tra' || item.actor_role === 'council'), params),

  listDocuments: () => Object.values(db().DOCUMENT_SPECIMENS),

  getDocument: (params) => db().DOCUMENT_SPECIMENS[params.type] || fail('NOT_FOUND', 'No specimen of that type'),

  /* USSD simulator: state machine held by the mock backend */
  ussdSession: (params) => {
    const sessions = db().USSD_SESSIONS;
    const id = params.sessionId || 'default';
    const input = String(params.input || '').trim();
    let session = sessions[id];
    if (!session || input === '') {
      session = { step: 'menu', history: [] };
      sessions[id] = session;
      return { menu: db().USSD_MENU, lines: [{ text: { en: 'Welcome to IBMT Rent. Select an option.', sw: 'Karibu IBMT Kodi. Chagua huduma.' } }], options: db().USSD_MENU.options, step: 'menu' };
    }
    if (input === '0') {
      sessions[id] = { step: 'menu', history: [] };
      return { lines: [{ text: { en: 'Session ended.', sw: 'Kipindi kimemalizika.' } }], ended: true };
    }
    if (session.step === 'menu') {
      if (input === '1') {
        session.step = 'pay_amount';
        return { step: 'pay_amount', lines: [{ text: { en: 'Pay rent. The tenant pays rent plus the applicable initial deposit, and nothing else. Enter the amount in TZS.', sw: 'Lipa kodi. Mpangaji analipa kodi pamoja na amana ya awali inayohitajika, na hakuna kingine. Weka kiasi kwa TZS.' } }] };
      }
      if (input === '2') {
        session.step = 'menu';
        return { step: 'menu', lines: [{ text: { en: 'Balance due: TZS 3,000,000 for 6 months, plus deposit TZS 500,000. Tenant total TZS 3,500,000.', sw: 'Salio linalotakiwa: TZS 3,000,000 kwa miezi 6, pamoja na amana TZS 500,000. Jumla ya mpangaji TZS 3,500,000.' } }, { text: { en: 'IBMT never holds funds. Payment is routed to the approved payment partner.', sw: 'IBMT haishikilii fedha. Malipo yanapitia mshirika wa malipo aliyeidhinishwa.' } }], options: db().USSD_MENU.options };
      }
      if (input === '3') {
        session.step = 'verify_receipt';
        return { step: 'verify_receipt', lines: [{ text: { en: 'Enter the receipt reference.', sw: 'Weka namba ya risiti.' } }] };
      }
      if (input === '4') {
        session.step = 'verify_agent';
        return { step: 'verify_agent', lines: [{ text: { en: 'Enter the agent licence reference.', sw: 'Weka namba ya leseni ya wakala.' } }] };
      }
      return { step: 'menu', lines: [{ text: { en: 'That option is not available.', sw: 'Huduma hiyo haipatikani.' } }], options: db().USSD_MENU.options };
    }
    if (session.step === 'pay_amount') {
      session.step = 'pay_confirm';
      session.amount = input;
      return { step: 'pay_confirm', lines: [{ text: { en: `You entered TZS ${input}. Reply 1 to confirm, 0 to cancel.`, sw: `Umeingiza TZS ${input}. Jibu 1 kuthibitisha, 0 kughairi.` } }] };
    }
    if (session.step === 'pay_confirm') {
      if (input === '1') {
        sessions[id] = { step: 'menu', history: [] };
        return { lines: [{ text: { en: 'A payment request was created. Confirmation will follow from the payment partner. This is a demonstration response.', sw: 'Ombi la malipo limeundwa. Uthibitisho utafuata kutoka mshirika wa malipo. Hili ni jibu la majaribio.' } }], ended: true };
      }
      sessions[id] = { step: 'menu', history: [] };
      return { lines: [{ text: { en: 'Payment cancelled. Nothing was sent.', sw: 'Malipo yameghairiwa. Hakuna kilichotumwa.' } }], options: db().USSD_MENU.options, step: 'menu' };
    }
    if (session.step === 'verify_receipt' || session.step === 'verify_agent') {
      const reference = input.toUpperCase();
      const record = db().VERIFICATION_RECORDS[reference];
      sessions[id] = { step: 'menu', history: [] };
      if (!record) {
        return { lines: [{ text: { en: 'No public record matches that reference.', sw: 'Hakuna kumbukumbu ya umma inayolingana na namba hiyo.' } }], ended: true };
      }
      return { lines: [{ text: { en: `Found: ${record.public_fields[0].value.en}. Status: ${record.status}.`, sw: `Imepatikana: ${record.public_fields[0].value.sw}. Hali: ${record.status}.` } }], ended: true };
    }
    return { step: 'menu', lines: [{ text: { en: 'Session reset.', sw: 'Kipindi kimeanzishwa upya.' } }], options: db().USSD_MENU.options };
  },
};

/* ------------------------------------------------------------------- invoke */

export async function mockInvoke({ id, params = {}, idempotencyKey, role }) {
  const spec = OPERATIONS[id];
  if (!spec) fail('SERVER', `Unknown operation ${id}`);

  const scenario = scenarioOf();
  await sleep(180 + Math.round(Math.random() * 220));

  if (scenario === 'offline') fail('OFFLINE', 'No connection to the IBMT backend (demonstration scenario)');
  if (scenario === 'error') fail('SERVER', 'The IBMT backend returned an error (demonstration scenario)');
  if (scenario === 'expired') fail('SESSION_EXPIRED', 'The IBMT session ended (demonstration scenario)');
  if (scenario === 'forbidden') fail('FORBIDDEN', 'This role is not permitted (demonstration scenario)');
  if (scenario === 'conflict' && spec.method !== 'GET') fail('CONFLICT', 'The record changed after you opened it (demonstration scenario)');

  scopeCheck(id, { role });

  const handler = HANDLERS[id];
  if (!handler) fail('SERVER', `No demonstration handler for ${id}`);

  const result = await handler({ ...params, idempotencyKey }, { role });

  if (scenario === 'empty') {
    if (result && Array.isArray(result.items)) return { items: [], next_cursor: null, has_more: false, total: 0 };
  }

  return result;
}