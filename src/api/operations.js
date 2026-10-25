/**
 * API contract proposal.
 *
 * Every route below is PROPOSED and UNCONFIRMED until the IBMT backend team
 * approves it. Nothing in this frontend treats a proposed route as agreed.
 *
 * `scope` is the role set the screen expects. The backend enforces role and
 * jurisdiction; the interface only hides what a role should not reach.
 * `idempotent: true` marks duplicate-sensitive writes, which must be sent with
 * an idempotency key that stays the same across retries of the same action.
 */

export const CONTRACT_VERSION = '0.9-proposed';

export const OPERATIONS = {
  /* ---------------------------------------------------------- session ---- */
  session: {
    method: 'GET', path: '/session', auth: true, scope: ['*'],
    purpose: 'Active IBMT session: subject id, role, jurisdiction, policy version',
    fields: ['subject_id', 'role', 'jurisdiction.ward_ids', 'policy_version', 'expires_at'],
    screens: ['Shell (every screen)'],
  },
  sessionSignIn: {
    method: 'POST', path: '/session', auth: false, scope: ['*'],
    purpose: 'Create a session using the backend approved mechanism',
    fields: ['token | cookie', 'role', 'jurisdiction'],
    screens: ['Sign in'],
  },
  sessionSignOut: {
    method: 'DELETE', path: '/session', auth: true, scope: ['*'],
    purpose: 'End the session', fields: [], screens: ['Shell'],
  },
  listNotifications: {
    method: 'GET', path: '/notifications', auth: true, scope: ['*'],
    params: ['cursor', 'limit', 'unread_only'],
    purpose: 'Notifications for the signed-in subject',
    fields: ['items[].id', 'items[].kind', 'items[].title', 'items[].body', 'items[].created_at', 'items[].read', 'next_cursor'],
    screens: ['Notification panel (every screen)'],
  },
  markNotificationRead: {
    method: 'POST', path: '/notifications/{id}/read', auth: true, scope: ['*'],
    purpose: 'Mark one notification read', fields: ['read_at'], screens: ['Notification panel'],
  },
  listAccessHistory: {
    method: 'GET', path: '/privacy/access-history', auth: true, scope: ['*'],
    params: ['cursor', 'limit'],
    purpose: 'Who opened this subject records, as recorded by the backend',
    fields: ['items[].id', 'items[].actor_role', 'items[].actor_org', 'items[].purpose', 'items[].record_type', 'items[].occurred_at'],
    screens: ['TRA access', 'Privacy and data rights', 'TRA rent access logging'],
  },
  getConsents: {
    // Any subject can read their own consent state; the backend returns only the
    // caller's own record.
    method: 'GET', path: '/privacy/consents', auth: true, scope: ['*'],
    purpose: 'Separate consent switches with their own state',
    fields: ['registration_processing', 'listing_marketing', 'rent_history_credit', 'lender_sharing'],
    screens: ['Operator settings', 'Consumer settings', 'Tenant evidence and disputes'],
  },
  setConsent: {
    // A subject changes only their own consent; the backend rejects any other.
    method: 'PUT', path: '/privacy/consents/{key}', auth: true, scope: ['*'],
    purpose: 'Grant or withdraw one consent independently',
    fields: ['key', 'granted', 'effective_at'], screens: ['Privacy and data rights'],
  },
  requestExport: {
    method: 'POST', path: '/privacy/exports', auth: true, scope: ['*'], idempotent: true,
    purpose: 'Request a controlled export of own records',
    fields: ['export_id', 'scope', 'state', 'requested_at'], screens: ['Operator settings', 'Consumer settings', 'Council oversight'],
  },
  getPolicyValues: {
    method: 'GET', path: '/policy/values', auth: true, scope: ['*'],
    params: ['module', 'jurisdiction'],
    purpose: 'Versioned policy values: rates, caps, thresholds, response windows',
    fields: ['version', 'effective_from', 'values[]', 'values[].key', 'values[].amount', 'values[].unit', 'values[].note'],
    screens: ['Rent hub', 'Landlord money', 'Tenant pay rent', 'Agent', 'TRA rent'],
  },

  /* ----------------------------------------------------------- events ---- */
  getOperatorOverview: {
    method: 'GET', path: '/events/operator/overview', auth: true, scope: ['operator'],
    purpose: 'Operator dashboard counters and next actions',
    fields: ['business', 'counters', 'permit', 'next_actions[]', 'policy_version'],
    screens: ['Operator dashboard'],
  },
  getOperatorProfile: {
    method: 'GET', path: '/events/operator/profile', auth: true, scope: ['operator'],
    purpose: 'Business profile and onboarding completion',
    fields: ['business_id', 'name', 'trading_name', 'ward_id', 'category', 'onboarding_steps[]', 'completed'],
    screens: ['Operator onboarding'],
  },
  saveOperatorProfile: {
    method: 'PUT', path: '/events/operator/profile', auth: true, scope: ['operator'],
    purpose: 'Save profile changes and upload supporting evidence',
    fields: ['business_id', 'updated_at'], screens: ['Operator onboarding'],
  },
  listReceipts: {
    method: 'GET', path: '/events/receipts', auth: true, scope: ['operator', 'council'],
    params: ['status', 'q', 'from', 'to', 'cursor', 'limit'],
    purpose: 'Receipt history with filters and pagination',
    fields: ['items[].id', 'items[].reference', 'items[].issued_on', 'items[].buyer_name', 'items[].total', 'items[].status', 'items[].version', 'next_cursor', 'total'],
    screens: ['Operator receipts', 'Operator dashboard'],
  },
  getReceipt: {
    method: 'GET', path: '/events/receipts/{id}', auth: true, scope: ['operator', 'council'],
    purpose: 'One receipt with its lines, evidence and fiscal status',
    fields: ['id', 'reference', 'status', 'version', 'lines[]', 'evidence[]', 'fiscal_status', 'buyer_confirmation'],
    screens: ['Operator receipt detail'],
  },
  createReceipt: {
    method: 'POST', path: '/events/receipts', auth: true, scope: ['operator'], idempotent: true,
    purpose: 'Create a receipt draft, then issue it for buyer confirmation',
    fields: ['receipt_id', 'reference', 'status', 'version', 'issued_reference'],
    screens: ['Operator receipt issue'],
  },
  issueReceipt: {
    method: 'POST', path: '/events/receipts/{id}/issue', auth: true, scope: ['operator'], idempotent: true,
    purpose: 'Issue a receipt so the buyer can confirm it',
    fields: ['status', 'version', 'confirmation_expires_at'], screens: ['Operator receipt review'],
  },
  confirmReceipt: {
    method: 'POST', path: '/events/receipts/{id}/confirm', auth: true, scope: ['operator', 'consumer'], idempotent: true,
    purpose: 'Record confirmation by the party entitled to confirm',
    fields: ['status', 'confirmed_at', 'version'], screens: ['Operator receipt detail', 'Consumer activity'],
  },
  verifyRecord: {
    method: 'GET', path: '/public/verify', auth: false, scope: ['*'],
    params: ['kind', 'reference'],
    purpose: 'Public confirmation of existence, status and already-public amounts',
    fields: ['kind', 'reference', 'found', 'status', 'issued_on', 'module', 'public_fields[]', 'check_url', 'searched_at'],
    screens: ['Public verification'],
  },
  listExpenses: {
    method: 'GET', path: '/events/expenses', auth: true, scope: ['operator'],
    params: ['evidence', 'cursor', 'limit'],
    purpose: 'Expense records with evidence-quality labelling',
    fields: ['items[].id', 'items[].supplier', 'items[].amount', 'items[].incurred_on', 'items[].evidence_grade', 'items[].evidence_label'],
    screens: ['Operator money and evidence'],
  },
  createExpense: {
    method: 'POST', path: '/events/expenses', auth: true, scope: ['operator'], idempotent: true,
    purpose: 'Record an expense and attach supplier evidence',
    fields: ['expense_id', 'evidence_grade'], screens: ['Operator money and evidence'],
  },
  getFinancialSummary: {
    method: 'GET', path: '/events/summary', auth: true, scope: ['operator'],
    params: ['from', 'to'],
    purpose: 'Turnover, recorded tax kept separate, permit fees kept separate',
    fields: ['period', 'turnover', 'turnover_note', 'tax', 'permit_fees', 'permit_note', 'expense_totals_by_grade[]'],
    screens: ['Operator money and evidence'],
  },
  listBookings: {
    method: 'GET', path: '/events/bookings', auth: true, scope: ['operator', 'consumer'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Bookings with agreed terms, deliverables, deposits and balances',
    fields: ['items[].id', 'items[].reference', 'items[].counterparty_name', 'items[].event_date', 'items[].agreed_total', 'items[].deposit', 'items[].balance', 'items[].status', 'items[].deliverables[]'],
    screens: ['Operator operations', 'Consumer activity'],
  },
  recordDeposit: {
    method: 'POST', path: '/events/bookings/{id}/deposit', auth: true, scope: ['operator', 'consumer'], idempotent: true,
    purpose: 'Record a deposit against agreed terms',
    fields: ['deposit_record_id', 'amount', 'received_at', 'balance_after'], screens: ['Operator operations', 'Consumer activity'],
  },
  listPermits: {
    method: 'GET', path: '/events/permits', auth: true, scope: ['operator', 'council'],
    params: ['status', 'ward_id', 'cursor', 'limit'],
    purpose: 'Event permit applications and their current state',
    fields: ['items[].id', 'items[].reference', 'items[].event_date', 'items[].venue', 'items[].status', 'items[].decision_reason', 'items[].fee_amount', 'items[].version'],
    screens: ['Operator operations', 'Council permits'],
  },
  submitPermit: {
    method: 'POST', path: '/events/permits', auth: true, scope: ['operator'], idempotent: true,
    purpose: 'Apply for an event permit inside the operator ward',
    fields: ['permit_id', 'reference', 'status'], screens: ['Operator operations'],
  },
  decidePermit: {
    method: 'POST', path: '/events/permits/{id}/decision', auth: true, scope: ['council'], idempotent: true,
    purpose: 'Approve, query or reject with a mandatory reason',
    fields: ['status', 'decision_reason', 'decided_at', 'version'], screens: ['Council permits'],
  },
  listComplaints: {
    method: 'GET', path: '/events/complaints', auth: true, scope: ['operator', 'consumer', 'council'],
    params: ['scope', 'status', 'cursor', 'limit'],
    purpose: 'Private complaints and provider replies',
    fields: ['items[].id', 'items[].reference', 'items[].subject', 'items[].filed_at', 'items[].status', 'items[].visibility', 'items[].replies[]'],
    screens: ['Operator operations', 'Consumer cases', 'Council oversight'],
  },
  createComplaint: {
    method: 'POST', path: '/events/complaints', auth: true, scope: ['consumer', 'operator'], idempotent: true,
    purpose: 'File a private complaint linked to a record',
    fields: ['complaint_id', 'reference', 'visibility'], screens: ['Consumer cases', 'Operator operations'],
  },
  replyComplaint: {
    method: 'POST', path: '/events/complaints/{id}/replies', auth: true, scope: ['operator', 'council'], idempotent: true,
    purpose: 'Add a provider or council reply to a complaint',
    fields: ['reply_id', 'created_at', 'status'], screens: ['Operator operations', 'Council oversight'],
  },
  listRatings: {
    method: 'GET', path: '/events/ratings', auth: true, scope: ['operator', 'council'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Receipt-linked ratings and their moderation state',
    fields: ['items[].id', 'items[].receipt_reference', 'items[].score', 'items[].comment', 'items[].moderation_status', 'items[].published'],
    screens: ['Consumer cases', 'Council oversight'],
  },
  moderateRating: {
    method: 'POST', path: '/events/ratings/{id}/moderation', auth: true, scope: ['council'], idempotent: true,
    purpose: 'Human moderation decision with a mandatory reason',
    fields: ['moderation_status', 'reason', 'decided_at'], screens: ['Council oversight'],
  },
  listCommitteeLedger: {
    method: 'GET', path: '/events/committee-ledger', auth: true, scope: ['consumer'],
    purpose: 'Private committee contributions and vendor payments. Never exposed to TRA.',
    fields: ['items[].id', 'items[].kind', 'items[].counterparty', 'items[].amount', 'items[].occurred_on', 'items[].note', 'excluded_from_turnover'],
    screens: ['Consumer committee ledger'],
  },
  listWardReports: {
    method: 'GET', path: '/events/ward-reports', auth: true, scope: ['council', 'ward'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Ward reports awaiting human review',
    fields: ['items[].id', 'items[].ward_id', 'items[].period', 'items[].submitted_by', 'items[].status', 'items[].flags[]'],
    screens: ['Council oversight'],
  },
  reviewWardReport: {
    method: 'POST', path: '/events/ward-reports/{id}/review', auth: true, scope: ['council'], idempotent: true,
    purpose: 'Human review outcome with a mandatory reason',
    fields: ['status', 'reason', 'reviewed_at'], screens: ['Council oversight'],
  },
  getCouncilOverview: {
    method: 'GET', path: '/events/council/overview', auth: true, scope: ['council'],
    params: ['ward_id'],
    purpose: 'Assigned-jurisdiction dashboard',
    fields: ['jurisdiction', 'counters', 'queue[]', 'calendar[]'], screens: ['Council dashboard'],
  },
  getCouncilFees: {
    method: 'GET', path: '/events/council/fees', auth: true, scope: ['council'],
    params: ['from', 'to'],
    purpose: 'Council permit fee reporting, kept separate from TRA tax',
    fields: ['period', 'permit_fees', 'permit_note', 'by_ward[]'], screens: ['Council oversight'],
  },
  getTraOverview: {
    method: 'GET', path: '/tra/overview', auth: true, scope: ['tra'],
    purpose: 'Read-only overview of permitted aggregates',
    fields: ['counters', 'projection_note', 'policy_version'], screens: ['TRA overview'],
  },
  listTraBusinesses: {
    method: 'GET', path: '/tra/businesses', auth: true, scope: ['tra'],
    params: ['ward_id', 'cursor', 'limit'],
    purpose: 'Permitted business details only, as projected by the backend',
    fields: ['items[].business_id', 'items[].name', 'items[].category', 'items[].ward_id', 'items[].registration_status', 'permitted_fields[]'],
    screens: ['TRA overview'],
  },
  getTraEstimates: {
    method: 'GET', path: '/tra/estimates', auth: true, scope: ['tra'],
    params: ['from', 'to'],
    purpose: 'Backend-provided estimates with the rule that produced them',
    fields: ['period', 'estimates[]', 'estimates[].label', 'estimates[].amount', 'estimates[].rule_text', 'estimates[].inputs[]', 'policy_version'],
    screens: ['TRA overview'],
  },
  getTraQuality: {
    method: 'GET', path: '/tra/record-quality', auth: true, scope: ['tra'],
    purpose: 'Record-quality trends, no individual enforcement data',
    fields: ['series[]', 'series[].period', 'series[].complete_records', 'series[].reviewed'], screens: ['TRA overview'],
  },

  /* ------------------------------------------------------------- rent ---- */
  getLandlordOverview: {
    method: 'GET', path: '/rent/landlord/overview', auth: true, scope: ['landlord'],
    purpose: 'Units, occupancy, rent due, collected, tax withheld, arrears',
    fields: ['counters', 'units[]', 'arrears_note', 'policy_version'], screens: ['Landlord dashboard'],
  },
  listUnits: {
    method: 'GET', path: '/rent/units', auth: true, scope: ['landlord', 'manager', 'ward', 'council'],
    params: ['status', 'ward_id', 'cursor', 'limit'],
    purpose: 'Unit register. The unit is the compliance entity.',
    fields: ['items[].id', 'items[].unit_ref', 'items[].ward_id', 'items[].mtaa', 'items[].monthly_rent', 'items[].occupancy', 'items[].registration_status', 'items[].ownership_status', 'items[].version'],
    screens: ['Landlord portfolio', 'Ward verification', 'Rent council'],
  },
  createUnit: {
    method: 'POST', path: '/rent/units', auth: true, scope: ['landlord', 'manager'], idempotent: true,
    purpose: 'Register a unit. Private Anwani ya Makazi address and meter evidence stay private.',
    fields: ['unit_id', 'unit_ref', 'registration_status'], screens: ['Landlord portfolio'],
  },
  uploadEvidence: {
    method: 'POST', path: '/uploads', auth: true, scope: ['*'], idempotent: true,
    purpose: 'Upload evidence to private storage and return a reference for the backend to hold',
    fields: ['file_id', 'content_type', 'bytes', 'sha256', 'uploaded_at'], screens: ['Ownership upload', 'Expense evidence', 'Condition reports'],
  },
  getUnitOwnership: {
    method: 'GET', path: '/rent/units/{id}/ownership', auth: true, scope: ['landlord', 'manager', 'ward'],
    purpose: 'Ownership evidence and its verification state',
    fields: ['unit_id', 'documents[]', 'verification_status', 'verified_by', 'verified_at', 'reason', 'certificate_note'],
    screens: ['Landlord portfolio', 'Ward verification'],
  },
  submitOwnershipEvidence: {
    method: 'POST', path: '/rent/units/{id}/ownership', auth: true, scope: ['landlord', 'manager'], idempotent: true,
    purpose: 'Submit ownership evidence for verification',
    fields: ['verification_status', 'submitted_at'], screens: ['Landlord portfolio'],
  },
  listVerificationQueue: {
    method: 'GET', path: '/rent/verification-queue', auth: true, scope: ['ward', 'council'],
    params: ['status', 'mtaa', 'cursor', 'limit'],
    purpose: 'Assigned ownership-verification queue for the officer ward',
    fields: ['items[].unit_id', 'items[].unit_ref', 'items[].mtaa', 'items[].match_flags[]', 'items[].status', 'items[].age_days'],
    screens: ['Ward verification'],
  },
  decideOwnership: {
    method: 'POST', path: '/rent/verification-queue/{unitId}/decision', auth: true, scope: ['ward'], idempotent: true,
    purpose: 'Approve, query or reject with a mandatory reason. A human decides; nothing is automatic.',
    fields: ['decision', 'reason', 'decided_at'], screens: ['Ward verification'],
  },
  listListings: {
    method: 'GET', path: '/rent/listings', auth: true, scope: ['landlord', 'agent', 'manager', 'tenant', 'consumer'],
    params: ['ward_id', 'verified_only', 'cursor', 'limit'],
    purpose: 'Listings. Public listing marketing is optional and consented separately.',
    fields: ['items[].id', 'items[].unit_id', 'items[].ward_id', 'items[].mtaa', 'items[].headline', 'items[].monthly_rent', 'items[].deposit', 'items[].verified', 'items[].marketing_consent', 'items[].viewings_open'],
    screens: ['Tenant find', 'Landlord portfolio', 'Agent', 'Public verification'],
  },
  createListing: {
    method: 'POST', path: '/rent/listings', auth: true, scope: ['landlord', 'agent', 'manager'], idempotent: true,
    purpose: 'Create or update a listing for a verified unit',
    fields: ['listing_id', 'state', 'marketing_consent'], screens: ['Landlord portfolio'],
  },
  listMandates: {
    method: 'GET', path: '/rent/mandates', auth: true, scope: ['landlord', 'agent', 'manager'],
    params: ['status'],
    purpose: 'Agency or management mandates and their granted scope',
    fields: ['items[].id', 'items[].agent_id', 'items[].agent_name', 'items[].licence_status', 'items[].scope[]', 'items[].commission_cap_percent', 'items[].status'],
    screens: ['Landlord portfolio', 'Agent', 'Property manager'],
  },
  createMandate: {
    method: 'POST', path: '/rent/mandates', auth: true, scope: ['landlord'], idempotent: true,
    purpose: 'Appoint a council-licensed agent registered as an IBMT business',
    fields: ['mandate_id', 'status', 'rejected_reason'], screens: ['Landlord portfolio'],
  },
  listTenancies: {
    method: 'GET', path: '/rent/tenancies', auth: true, scope: ['landlord', 'tenant', 'manager', 'agent'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'One tenancy per unit and one active lease',
    fields: ['items[].id', 'items[].unit_id', 'items[].unit_ref', 'items[].tenant_ref', 'items[].lease_id', 'items[].start_date', 'items[].paid_through', 'items[].legacy', 'items[].status'],
    screens: ['Landlord tenancies', 'Tenant lease'],
  },
  getLease: {
    method: 'GET', path: '/rent/leases/{id}', auth: true, scope: ['landlord', 'tenant', 'manager', 'agent', 'council'],
    purpose: 'Lease with both parties, terms, version and signature state',
    fields: ['id', 'terms_version', 'parties[]', 'terms', 'language_pairs', 'signature_state', 'otp_challenge', 'stamp_duty_state', 'activation_state', 'version'],
    screens: ['Landlord tenancies', 'Tenant lease', 'Documents'],
  },
  buildLease: {
    method: 'POST', path: '/rent/leases', auth: true, scope: ['landlord', 'manager'], idempotent: true,
    purpose: 'Create a lease from agreed terms',
    fields: ['lease_id', 'terms_version', 'language_pairs'], screens: ['Landlord tenancies'],
  },
  updateLease: {
    method: 'PUT', path: '/rent/leases/{id}', auth: true, scope: ['landlord', 'manager'],
    purpose: 'Change terms. A changed lease must not keep an apparently valid old signature.',
    fields: ['terms_version', 'signature_state', 'version'], screens: ['Landlord tenancies'],
  },
  requestLeaseSignature: {
    method: 'POST', path: '/rent/leases/{id}/signature-challenge', auth: true, scope: ['landlord', 'tenant', 'manager'], idempotent: true,
    purpose: 'Ask the backend for a one-time-code challenge for one party',
    fields: ['challenge_id', 'party', 'expires_at', 'attempts_remaining'], screens: ['Tenant lease', 'Landlord tenancies'],
  },
  signLease: {
    method: 'POST', path: '/rent/leases/{id}/signature', auth: true, scope: ['landlord', 'tenant'], idempotent: true,
    purpose: 'Submit the signed challenge. Success, failure and expiry are separate states.',
    fields: ['signature_state', 'signed_at', 'stamp_duty_state', 'activation_state', 'version'], screens: ['Tenant lease'],
  },
  getStampDutyAssessment: {
    method: 'GET', path: '/rent/leases/{id}/stamp-duty', auth: true, scope: ['landlord', 'tenant', 'council', 'tra'],
    purpose: 'Stamp-duty assessment state for the lease',
    fields: ['state', 'assessed_amount', 'assessed_at', 'policy_version'], screens: ['Tenant lease', 'TRA rent'],
  },
  listRentPayments: {
    method: 'GET', path: '/rent/payments', auth: true, scope: ['landlord', 'tenant', 'manager', 'tra'],
    params: ['scope', 'status', 'cursor', 'limit'],
    purpose: 'Payments with separate confirmation, remittance, settlement and custody statuses',
    fields: ['items[].id', 'items[].reference', 'items[].unit_ref', 'items[].period_months', 'items[].rent_amount', 'items[].deposit_amount', 'items[].tenant_total', 'items[].allocation', 'items[].statuses', 'items[].version'],
    screens: ['Landlord money', 'Tenant pay rent', 'TRA rent'],
  },
  quoteRentPayment: {
    method: 'POST', path: '/rent/payments/quote', auth: true, scope: ['tenant', 'manager'], idempotent: true,
    purpose: 'Backend-calculated allocation before payment. Never computed in the interface.',
    fields: ['rent_amount', 'period_months', 'tax', 'commission', 'landlord_settlement', 'tenant_total', 'deposit_amount', 'new_tenancy', 'policy_version', 'allocation_note'],
    screens: ['Tenant pay rent'],
  },
  createRentPayment: {
    method: 'POST', path: '/rent/payments', auth: true, scope: ['tenant', 'manager'], idempotent: true,
    purpose: 'Start a payment through the approved payment partner. The same idempotency key must be reused when retrying.',
    fields: ['payment_id', 'reference', 'state', 'checkout_url', 'partner', 'statuses'],
    screens: ['Tenant pay rent'],
  },
  getRentPayment: {
    method: 'GET', path: '/rent/payments/{id}', auth: true, scope: ['tenant', 'landlord', 'manager', 'tra'],
    purpose: 'Payment status. A timeout is reported as unconfirmed, never as success or failure.',
    fields: ['id', 'state', 'statuses', 'confirmed_at', 'remitted_at', 'settled_at', 'custody_state'],
    screens: ['Tenant pay rent', 'Landlord money'],
  },
  listDeposits: {
    method: 'GET', path: '/rent/deposits', auth: true, scope: ['landlord', 'tenant', 'manager'],
    purpose: 'Deposit custody in the tenant name, separate from rent',
    fields: ['items[].id', 'items[].unit_ref', 'items[].amount', 'items[].custody_state', 'items[].custodian', 'items[].tenant_name', 'items[].dispute_state'],
    screens: ['Landlord money', 'Tenant pay rent'],
  },
  createConditionReport: {
    method: 'POST', path: '/rent/deposits/{id}/condition-report', auth: true, scope: ['landlord', 'tenant', 'manager'], idempotent: true,
    purpose: 'Move-in or move-out checklist with private photographs',
    fields: ['report_id', 'phase', 'items[]', 'photos[]', 'agreement_state'], screens: ['Tenant evidence', 'Landlord cases'],
  },
  agreeConditionReport: {
    method: 'POST', path: '/rent/condition-reports/{id}/agreement', auth: true, scope: ['landlord', 'tenant'], idempotent: true,
    purpose: 'Agree or disagree with the checklist. Agreement is not deposit release.',
    fields: ['agreement_state', 'disagreement_reason', 'agreed_at'], screens: ['Tenant evidence'],
  },
  releaseDeposit: {
    method: 'POST', path: '/rent/deposits/{id}/release', auth: true, scope: ['landlord', 'tenant'], idempotent: true,
    purpose: 'Mutual one-time-code release, then pending custodian confirmation',
    fields: ['custody_state', 'release_codes', 'custodian_confirmation_state'], screens: ['Tenant evidence', 'Landlord cases'],
  },
  listNotices: {
    method: 'GET', path: '/rent/notices', auth: true, scope: ['landlord', 'tenant', 'manager'],
    purpose: 'Notices, renewals and their response windows',
    fields: ['items[].id', 'items[].kind', 'items[].issued_at', 'items[].response_due', 'items[].status', 'items[].body'],
    screens: ['Landlord cases', 'Tenant cases'],
  },
  issueNotice: {
    method: 'POST', path: '/rent/notices', auth: true, scope: ['landlord', 'manager'], idempotent: true,
    purpose: 'Issue a notice or renewal inside the backend response window',
    fields: ['notice_id', 'response_due', 'status'], screens: ['Landlord cases'],
  },
  listDisputes: {
    method: 'GET', path: '/rent/disputes', auth: true, scope: ['landlord', 'tenant', 'ward', 'council', 'manager'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Disputes and mediation cases',
    fields: ['items[].id', 'items[].unit_ref', 'items[].kind', 'items[].raised_by', 'items[].filed_at', 'items[].status', 'items[].mediation_state'],
    screens: ['Landlord cases', 'Tenant evidence', 'Ward mediation'],
  },
  createDispute: {
    method: 'POST', path: '/rent/disputes', auth: true, scope: ['landlord', 'tenant'], idempotent: true,
    purpose: 'Raise a dispute or ask for mediation',
    fields: ['dispute_id', 'status'], screens: ['Tenant evidence'],
  },
  getTaxCompliance: {
    method: 'GET', path: '/rent/tax-compliance', auth: true, scope: ['landlord'],
    purpose: 'Landlord tax compliance document and eligibility. Issued by the backend.',
    fields: ['eligible', 'certificate_id', 'issued_at', 'valid_until', 'statement', 'note'], screens: ['Landlord money'],
  },
  getAmnestyNotice: {
    method: 'GET', path: '/rent/amnesty', auth: true, scope: ['*'],
    purpose: 'Forward-only amnesty, registration window and assisted onboarding',
    fields: ['amnesty_forward_only', 'registration_window_days', 'window_placeholder', 'assisted_onboarding', 'proxy_registration', 'note'],
    screens: ['Landlord money', 'Landlord portfolio', 'Rent hub'],
  },
  getTenantRegistration: {
    method: 'GET', path: '/rent/registration', auth: true, scope: ['tenant'],
    purpose: 'A tenant-initiated registration claim and its notification state',
    fields: ['claim_id', 'unit_id', 'state', 'landlord_notified_at', 'response_due', 'council_review_state', 'note'],
    screens: ['Tenant register'],
  },
  submitTenantRegistration: {
    method: 'POST', path: '/rent/registration', auth: true, scope: ['tenant'], idempotent: true,
    purpose: 'Claim a tenancy. A claim is not ownership verification and not a penalty.',
    fields: ['claim_id', 'state', 'landlord_notified_at', 'response_due'], screens: ['Tenant register'],
  },
  getViewingSlots: {
    method: 'GET', path: '/rent/listings/{id}/slots', auth: true, scope: ['tenant', 'consumer', 'agent'],
    purpose: 'Free viewing slots offered by the landlord or agent',
    fields: ['items[].id', 'items[].starts_at', 'items[].kind', 'items[].fee_note'], screens: ['Tenant find'],
  },
  bookViewing: {
    method: 'POST', path: '/rent/listings/{id}/viewings', auth: true, scope: ['tenant', 'consumer'], idempotent: true,
    purpose: 'Book a free viewing. No viewing fee exists for tenants.',
    fields: ['viewing_id', 'starts_at', 'status', 'fee_amount'], screens: ['Tenant find'],
  },
  listEvidencePack: {
    method: 'GET', path: '/rent/evidence-pack', auth: true, scope: ['tenant'],
    purpose: 'Items available for an evidence pack. The party chooses what to include.',
    fields: ['items[].id', 'items[].kind', 'items[].label', 'items[].period', 'items[].sensitive'],
    screens: ['Tenant evidence'],
  },
  exportEvidencePack: {
    method: 'POST', path: '/rent/evidence-pack/export', auth: true, scope: ['tenant'], idempotent: true,
    purpose: 'Export only the items the tenant selected. Nothing is sent automatically.',
    fields: ['export_id', 'items[]', 'state', 'created_at'], screens: ['Tenant evidence'],
  },
  getAgentProfile: {
    method: 'GET', path: '/rent/agent/profile', auth: true, scope: ['agent'],
    purpose: 'Agent licence state, mandates, commissions and ratings',
    fields: ['agent_id', 'name', 'licence_status', 'licence_number', 'licence_expires_at', 'mandates[]', 'counters'],
    screens: ['Agent'],
  },
  listAgentCommissions: {
    method: 'GET', path: '/rent/agent/commissions', auth: true, scope: ['agent'],
    params: ['cursor', 'limit'],
    purpose: 'Commission earned once per new tenancy, capped, from the landlord share',
    fields: ['items[].id', 'items[].unit_ref', 'items[].tenancy_kind', 'items[].amount', 'items[].cap_percent', 'items[].state', 'items[].charged_at'],
    screens: ['Agent'],
  },
  getManagerScope: {
    method: 'GET', path: '/rent/manager/scope', auth: true, scope: ['manager'],
    purpose: 'Only the assets and actions granted by an active delegated mandate',
    fields: ['mandates[]', 'mandates[].landlord_display', 'mandates[].scope[]', 'mandates[].expires_at', 'units[]'],
    screens: ['Property manager'],
  },
  getAreaStats: {
    method: 'GET', path: '/rent/council/area-stats', auth: true, scope: ['council'],
    params: ['ward_id', 'from', 'to'],
    purpose: 'Area rental statistics for council use',
    fields: ['wards[]', 'wards[].ward', 'wards[].units', 'wards[].registered_percent', 'wards[].median_rent'], screens: ['Rent council'],
  },
  listAgentLicences: {
    method: 'GET', path: '/rent/council/agent-licences', auth: true, scope: ['council'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Agent licensing for the council',
    fields: ['items[].agent_id', 'items[].name', 'items[].licence_number', 'items[].status', 'items[].expires_at', 'items[].ibmt_business'],
    screens: ['Rent council'],
  },
  decideAgentLicence: {
    method: 'POST', path: '/rent/council/agent-licences/{id}/decision', auth: true, scope: ['council'], idempotent: true,
    purpose: 'Licensing decision with a mandatory reason',
    fields: ['status', 'reason', 'decided_at'], screens: ['Rent council'],
  },
  listComplianceQueue: {
    method: 'GET', path: '/rent/council/compliance-queue', auth: true, scope: ['council'],
    params: ['cursor', 'limit'],
    purpose: 'Human compliance-review queue: mismatches and unusual rent only',
    fields: ['items[].id', 'items[].unit_ref', 'items[].flag', 'items[].raised_at', 'items[].status', 'items[].automatic_action'],
    screens: ['Rent council'],
  },
  getRentTraStats: {
    method: 'GET', path: '/rent/tra/stats', auth: true, scope: ['tra'],
    params: ['from', 'to'],
    purpose: 'Read-only unit statistics, withheld versus remitted, stamp duty, exemptions',
    fields: ['units', 'registered', 'withheld', 'remitted', 'stamp_duty', 'exemptions', 'trend[]', 'policy_version'],
    screens: ['TRA rent'],
  },
  listMediationCases: {
    method: 'GET', path: '/rent/mediation-cases', auth: true, scope: ['ward', 'council'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Mediation cases handled by the Mtaa or ward officer',
    fields: ['items[].id', 'items[].unit_ref', 'items[].dispute_id', 'items[].status', 'items[].parties[]', 'items[].summary'],
    screens: ['Ward mediation'],
  },
  listViewings: {
    method: 'GET', path: '/rent/viewings', auth: true, scope: ['agent', 'tenant', 'landlord', 'manager'],
    params: ['status', 'cursor', 'limit'],
    purpose: 'Arranged viewings. Viewings are free of charge for the tenant.',
    fields: ['items[].id', 'items[].listing_id', 'items[].unit_ref', 'items[].starts_at', 'items[].status', 'items[].fee_amount'],
    screens: ['Agent', 'Tenant find'],
  },
  getRentAccessLog: {
    method: 'GET', path: '/rent/access-log', auth: true, scope: ['tra'],
    params: ['cursor', 'limit'],
    purpose: 'Access-logging information for the rent module',
    fields: ['items[].actor_role', 'items[].actor_org', 'items[].purpose', 'items[].record_type', 'items[].occurred_at'],
    screens: ['TRA rent'],
  },
  listDocuments: {
    method: 'GET', path: '/documents', auth: false, scope: ['*'],
    purpose: 'Document specimens available for preview',
    fields: ['items[].id', 'items[].kind', 'items[].title'],
    screens: ['Documents'],
  },
  getDocument: {
    method: 'GET', path: '/documents/{type}', auth: true, scope: ['*'],
    purpose: 'One document. Final documents and eligibility come from the backend.',
    fields: ['id', 'kind', 'title', 'parties[]', 'clauses[]', 'lines[]', 'statements[]'],
    screens: ['Documents'],
  },
  previewEvidencePack: {
    method: 'GET', path: '/rent/evidence-pack/preview', auth: true, scope: ['tenant'],
    purpose: 'Preview of the items a party may choose to include in an evidence pack',
    fields: ['items[].id', 'items[].kind', 'items[].label', 'items[].period', 'items[].sensitive'],
    screens: ['Tenant evidence and disputes'],
  },
  ussdSession: {
    method: 'POST', path: '/ussd/session', auth: false, scope: ['*'], idempotent: true,
    purpose: 'One USSD session step: pay rent, balance due, verify receipt, verify agent licence',
    fields: ['step', 'lines[].text', 'options[].key', 'options[].label', 'ended'],
    screens: ['USSD simulator'],
  },
};

export const IDEMPOTENT_OPERATIONS = Object.keys(OPERATIONS).filter((id) => OPERATIONS[id].idempotent);

export const ERROR_CODES = [
  { code: 'VALIDATION', http: 422, body: 'field-level messages', frontend: 'Inline errors next to each field; never a success state.' },
  { code: 'SESSION_EXPIRED', http: 401, body: 'session ended', frontend: 'Session-expired state; the action is not recorded and no data is edited.' },
  { code: 'FORBIDDEN', http: 403, body: 'role not permitted', frontend: 'Permission-denied state naming the role, not the record.' },
  { code: 'JURISDICTION', http: 403, body: 'outside assigned ward', frontend: 'Permission-denied with the assigned jurisdiction shown.' },
  { code: 'NOT_FOUND', http: 404, body: 'absent or not public', frontend: 'Empty state. Absence is never confirmed or denied for private records.' },
  { code: 'CONFLICT', http: 409, body: 'version mismatch', frontend: 'Stale-record state with reload, before any decision is submitted.' },
  { code: 'RATE_LIMITED', http: 429, body: 'retry_after seconds', frontend: 'Safe-retry state with the wait shown.' },
  { code: 'TIMEOUT', http: null, body: 'no response', frontend: 'Unconfirmed state: not displayed as success or failure; status is re-checked.' },
  { code: 'OFFLINE', http: null, body: 'no connection', frontend: 'Offline state; queued actions are not claimed as submitted.' },
  { code: 'SERVER', http: 500, body: 'backend fault', frontend: 'Error state with safe retry and the request id shown for support.' },
];

export const AUTH_BEHAVIOUR = {
  mechanism: 'The external IBMT backend owns sessions, credentials, roles and jurisdiction.',
  transport: 'Cookie-based session on the backend domain (credentials included) or a bearer token issued by the backend session endpoint.',
  browserStorage: 'No credentials, tokens, or business records are written to browser storage. Only language, theme, data-source mode and the API base URL are kept locally.',
  roleSwitcher: 'A role switcher exists in demonstration mode only, labelled as a demonstration. In API mode the role comes from the session.',
  expiry: 'A 401 surfaces the session-ended state and stops the action. The interface never re-authenticates silently.',
};

export const UPLOAD_REQUIREMENTS = {
  private: 'Ownership evidence, expense evidence, condition photographs and complaint attachments use private storage and signed, time-limited links.',
  public: 'Only listing cover images are public, and only for a unit whose ownership evidence is verified and whose marketing consent is active.',
  limits: 'Proposed: 10 MB per file, PDF and JPEG/PNG only, SHA-256 recorded by the backend.',
  never: 'Exact home addresses, GPS coordinates and tenant personal details must never appear in a public link or analytics payload.',
};

export const ENV_NAMES = [
  { name: 'IBMT_API_BASE_URL', where: 'Runtime setting in the interface (Integration). Not a build-time secret.', note: 'Arbitrary VITE_* variables are not documented for a deployed frontend build, so the base URL is configuration, not a compiled constant.' },
  { name: 'IBMT_SESSION_MODE', where: 'Backend', note: 'cookie or bearer.' },
  { name: 'IBMT_PAYMENT_PARTNER_KEY', where: 'Backend secret', note: 'Never in browser code.' },
  { name: 'IBMT_OTP_CHANNEL_KEY', where: 'Backend secret', note: 'Never in browser code.' },
  { name: 'IBMT_POLICY_VERSION', where: 'Backend', note: 'Version of the policy values returned with every amount.' },
];

export const REMAINING_MOCKS = [
  'Session, role and jurisdiction in demonstration mode.',
  'Every list, record, amount and status in demonstration mode.',
  'Payment partner checkout and settlement statuses.',
  'One-time-code signature and deposit-release challenges.',
  'Stamp-duty assessment, tax estimates and policy values.',
  'Ownership verification decisions and the ward queue.',
  'Ratings moderation, permit decisions and complaint replies.',
  'Evidence-pack generation and document delivery.',
  'USSD session state machine.',
  'Notifications feed and access-history entries.',
];

export const PLATFORM_CONSTRAINTS = [
  'This layer keeps no business database and no authoritative audit log: records, tax treatment, licence decisions and payments belong to the IBMT backend.',
  'The frontend is hosted on this platform, which does not support self-hosting. Source is handed over through project export or two-way repository sync; the exported project still runs on this platform.',
  'Arbitrary build-time frontend environment variables are not documented for a deployed build, so the IBMT API base URL is a runtime setting and never a secret.',
  'Secrets stay server-side. If a future IBMT call needs a server-held credential, that single call must be a thin server-side connector to the IBMT backend — not a second business system.',
  'Browser storage may be unavailable in private browsing; preferences then simply do not persist and no business function depends on them.',
  'If the IBMT backend requires cross-site cookies, its CORS and SameSite policy must allow the interface origin; until then API mode reports the session state honestly rather than falling back to demonstration data.',
];