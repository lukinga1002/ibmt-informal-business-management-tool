/**
 * Screen inventory: the route, the role that owns it, what it is for and the
 * operations it depends on. This is the list handed to the backend team.
 */
export const SCREEN_INVENTORY = [
  { path: '/', scope: 'public', purpose: 'Product value, module overview, entry to verification', apis: [] },
  { path: '/verify', scope: 'public', purpose: 'Public verification of a receipt, business, lease, agent licence or unit', apis: ['verifyRecord'] },
  { path: '/ussd', scope: 'public', purpose: 'Rent USSD simulator: pay rent, balance due, verify receipt, verify agent licence', apis: ['ussdSession'] },
  { path: '/documents', scope: 'public', purpose: 'Bilingual lease and rent receipt specimens. The tax compliance specimen is dormant and never shown.', apis: ['getDocument', 'listDocuments'] },
  { path: '/data-rights', scope: 'public', purpose: 'Privacy, consent purposes, access history, retention and export requests', apis: ['getConsents', 'setConsent', 'listAccessHistory', 'requestExport', 'getPolicyValues'] },
  { path: '/handover', scope: 'public', purpose: 'Delivery package for the backend team: inventory, matrix, contract, assumptions', apis: [] },

  { path: '/operator', scope: 'operator', purpose: 'Operator dashboard with counters and next actions', apis: ['getOperatorOverview'] },
  { path: '/operator/onboarding', scope: 'operator', purpose: 'Onboarding steps and business profile', apis: ['getOperatorProfile', 'saveOperatorProfile', 'uploadEvidence'] },
  { path: '/operator/receipts', scope: 'operator', purpose: 'Issue, review, confirm and search receipts', apis: ['listReceipts', 'getReceipt', 'createReceipt', 'issueReceipt', 'confirmReceipt'] },
  { path: '/operator/money', scope: 'operator', purpose: 'Expenses with evidence quality, financial summary, exports', apis: ['listExpenses', 'createExpense', 'getFinancialSummary', 'requestExport', 'uploadEvidence'] },
  { path: '/operator/operations', scope: 'operator', purpose: 'Bookings with deposits and balances, permits, complaints and replies', apis: ['listBookings', 'recordDeposit', 'listPermits', 'submitPermit', 'listComplaints', 'replyComplaint'] },
  { path: '/operator/settings', scope: 'operator', purpose: 'Profile, privacy, consent and own-record exports', apis: ['getOperatorProfile', 'getConsents', 'setConsent', 'requestExport'] },

  { path: '/consumer', scope: 'consumer', purpose: 'Bookings, agreed terms, deposits and balances', apis: ['listBookings', 'recordDeposit'] },
  { path: '/consumer/cases', scope: 'consumer', purpose: 'Private complaints and replies, receipt-linked ratings awaiting moderation', apis: ['listComplaints', 'createComplaint', 'listRatings'] },
  { path: '/consumer/contributions', scope: 'consumer', purpose: 'Private committee contribution and vendor-payment ledger', apis: ['listCommitteeLedger'] },
  { path: '/consumer/settings', scope: 'consumer', purpose: 'Privacy, consent and exports', apis: ['getConsents', 'setConsent', 'requestExport'] },

  { path: '/council', scope: 'council', purpose: 'Assigned-jurisdiction dashboard, event calendar, ward-report review, fee reporting', apis: ['getCouncilOverview', 'listWardReports', 'reviewWardReport', 'getCouncilFees', 'requestExport'] },
  { path: '/council/permits', scope: 'council', purpose: 'Permit review with a mandatory reason', apis: ['listPermits', 'decidePermit'] },
  { path: '/council/complaints', scope: 'council', purpose: 'Private complaints within the council jurisdiction', apis: ['listComplaints', 'replyComplaint'] },

  { path: '/tra', scope: 'tra', purpose: 'Read-only overview, permitted business details, estimates with rule explanations, quality trends, exports', apis: ['getTraOverview', 'listTraBusinesses', 'getTraEstimates', 'getTraQuality', 'requestExport'] },
  { path: '/tra/access', scope: 'tra', purpose: 'Access-history and access-logging indicators', apis: ['listAccessHistory'] },

  { path: '/rent', scope: 'public', purpose: 'Rent module hub: policy in force, role entry points, versioned policy values', apis: ['getPolicyValues', 'getAmnestyNotice'] },
  { path: '/rent/landlord', scope: 'landlord', purpose: 'Units, occupancy, rent due, collected, tax withheld, arrears', apis: ['getLandlordOverview'] },
  { path: '/rent/landlord/portfolio', scope: 'landlord', purpose: 'Unit registration, ownership upload, verification status, listings, agent mandates', apis: ['listUnits', 'createUnit', 'submitOwnershipEvidence', 'getUnitOwnership', 'listListings', 'createListing', 'listMandates', 'createMandate', 'uploadEvidence'] },
  { path: '/rent/landlord/tenancies', scope: 'landlord', purpose: 'Lease builder, tenants, renewals and notices', apis: ['listTenancies', 'getLease', 'buildLease', 'updateLease', 'listNotices', 'issueNotice'] },
  { path: '/rent/landlord/money', scope: 'landlord', purpose: 'Payments, receipts, deposits and the amnesty notice', apis: ['listRentPayments', 'listDeposits', 'getAmnestyNotice'] },
  { path: '/rent/landlord/cases', scope: 'landlord', purpose: 'Disputes and condition reports', apis: ['listDisputes', 'listDeposits', 'createConditionReport'] },

  { path: '/rent/tenant', scope: 'tenant', purpose: 'Tenancy summary, paid-through position, deposit status', apis: ['listTenancies', 'listRentPayments', 'listDeposits', 'listNotices'] },
  { path: '/rent/tenant/find', scope: 'tenant', purpose: 'Verified listings and free viewing booking', apis: ['listListings', 'getViewingSlots', 'bookViewing'] },
  { path: '/rent/tenant/lease', scope: 'tenant', purpose: 'Lease review, signature challenge, stamp duty, activation', apis: ['listTenancies', 'getLease', 'requestLeaseSignature', 'signLease', 'getStampDutyAssessment'] },
  { path: '/rent/tenant/pay', scope: 'tenant', purpose: 'Quote, allocation, payment with an idempotency key, receipts, deposit status', apis: ['listRentPayments', 'quoteRentPayment', 'createRentPayment', 'getRentPayment'] },
  { path: '/rent/tenant/register', scope: 'tenant', purpose: 'Tenant-initiated registration, landlord notification and response window', apis: ['getTenantRegistration', 'submitTenantRegistration'] },
  { path: '/rent/tenant/cases', scope: 'tenant', purpose: 'Notices, disputes and mediation, condition reports, evidence-pack preview and export, consent', apis: ['listNotices', 'listDisputes', 'createDispute', 'createConditionReport', 'agreeConditionReport', 'previewEvidencePack', 'exportEvidencePack', 'getConsents', 'setConsent'] },

  { path: '/rent/agent', scope: 'agent', purpose: 'Licence status, mandates, listings, viewings, commissions, ratings', apis: ['getAgentProfile', 'listMandates', 'listListings', 'listViewings', 'listAgentCommissions'] },
  { path: '/rent/manager', scope: 'manager', purpose: 'Assets and actions granted by an active delegated mandate, landlord shown', apis: ['getManagerScope', 'listUnits'] },
  { path: '/rent/ward', scope: 'ward', purpose: 'Ownership verification queue with mandatory reasons, mediation cases', apis: ['listVerificationQueue', 'decideOwnership', 'listMediationCases'] },
  { path: '/rent/council', scope: 'council', purpose: 'Agent licensing, human compliance-review queue, complaints, area statistics', apis: ['listAgentLicences', 'decideAgentLicence', 'listComplianceQueue', 'listComplaints', 'getAreaStats'] },
  { path: '/rent/tra', scope: 'tra', purpose: 'Unit statistics, withheld against remitted, stamp duty, exemptions, trends, access logging', apis: ['getRentTraStats', 'getRentAccessLog'] },
];

export const COMPONENT_INVENTORY = [
  { name: 'AppShell', where: 'Every signed-in screen', purpose: 'Navigation, identity, banners, one shared frame' },
  { name: 'PublicTopBar / PublicFooter', where: 'Every public screen', purpose: 'Shared public chrome, persistent SW/EN switch' },
  { name: 'Sidebar', where: 'AppShell', purpose: 'Role navigation map, module grouping, mobile drawer' },
  { name: 'TopBar / NotificationPanel', where: 'AppShell', purpose: 'Identity, language, theme, notifications with read state' },
  { name: 'RoleSwitcher', where: 'AppShell (demonstration only)', purpose: 'Demonstration role change, hidden in API mode' },
  { name: 'SettingsDialog', where: 'AppShell', purpose: 'Data source, API base URL, scenario, theme, language' },
  { name: 'DataState', where: 'Every data screen', purpose: 'Loading, empty, error, offline, permission, session, stale' },
  { name: 'DataTable', where: 'Every list', purpose: 'Responsive table that becomes stacked records at 375px' },
  { name: 'StatusBadge', where: 'Every status', purpose: 'Word plus icon plus tone, never colour alone' },
  { name: 'Money / AmountRow', where: 'Every amount', purpose: 'Tabular figures with the source or policy note attached' },
  { name: 'AllocationBreakdown', where: 'Rent payments', purpose: 'Backend allocation and four separate statuses' },
  { name: 'StatGrid', where: 'Dashboards', purpose: 'Counters with the note that prevents misreading' },
  { name: 'SectionCard / PageHeader', where: 'Every screen', purpose: 'Consistent rhythm, jurisdiction and policy context' },
  { name: 'Notice / PolicyList', where: 'Policy and privacy statements', purpose: 'One statement, one icon, one tone' },
  { name: 'Field / ReasonDialog / ConfirmDialog', where: 'Forms and decisions', purpose: 'Inline field errors and mandatory-reason decisions' },
  { name: 'Timeline', where: 'Signature, permit, payment states', purpose: 'Ordered state history from the backend' },
  { name: 'UploadField', where: 'Evidence upload', purpose: 'Private evidence upload, reference kept, nothing stored here' },
  { name: 'DocumentSheet', where: 'Documents', purpose: 'Specimen sheet with both languages visible' },
  { name: 'ConsentToggle', where: 'Privacy screens', purpose: 'One consent per control, independently withdrawable' },
  { name: 'StateBanner / DemoBadge', where: 'Every screen', purpose: 'Connection, session and demonstration-data markers' },
];