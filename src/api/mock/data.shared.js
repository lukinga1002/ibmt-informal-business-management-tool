/**
 * Demonstration fixtures shared by both modules.
 *
 * These records are fictional. They exist so the interface can be developed and
 * reviewed; they are never presented as real business records, tax decisions or
 * payments. Every field shape mirrors the proposed API contract so the backend
 * team can implement against it directly.
 */

export const B = (en, sw) => ({ en, sw });

export const POLICY_VALUES = {
  version: '2026.1-proposed',
  effective_from: '2026-01-01',
  status: 'not_effective',
  note: B(
    'Policy values are supplied by the backend and carry a version. Nothing here is hard-coded in the interface.',
    'Viwango vya sera vinatolewa na backend na vina toleo. Hakuna kilichoandikwa moja kwa moja kwenye kiolesura.',
  ),
  values: [
    { key: 'withholding_rate', label: B('Rental withholding rate', 'Kiwango cha kodi inayozuiliwa'), display: '10%', rule: B('Applied once at the point of payment.', 'Inatumika mara moja wakati wa malipo.') },
    { key: 'commission_cap', label: B('Agent commission cap', 'Kikomo cha kamisheni ya wakala'), display: '10%', rule: B('Capped, landlord funded, charged once per new tenancy.', 'Ina kikomo, inalipwa na mwenye nyumba, inatozwa mara moja kwa upangaji mpya.') },
    { key: 'stamp_duty', label: B('Stamp duty', 'Ushuru wa stempu'), display: '0.5%', rule: B('Assessed by the backend when a lease is signed.', 'Inakadiriwa na backend wakati mkataba unatiwa saini.') },
    { key: 'low_rent_exemption', label: B('Low-rent exemption threshold', 'Kiwango cha kutotozwa kodi'), display: 'TZS 100,000 / month', rule: B('Defined by TRA.', 'Kinaainishwa na TRA.') },
    { key: 'advance_rent_limit', label: B('Advance rent limit', 'Kikomo cha kodi ya mapema'), display: '6 months', rule: B('Enforced by the backend at checkout.', 'Inatekelezwa na backend wakati wa malipo.') },
    { key: 'registration_window', label: B('Registration window before penalties', 'Kipindi cha usajili kabla ya adhabu'), display: '90 days (placeholder)', rule: B('A placeholder the backend replaces with the confirmed window.', 'Nafasi ya mfano ambayo backend itaibadilisha na kipindi kilichothibitishwa.') },
    { key: 'response_window', label: B('Landlord response window', 'Kipindi cha kujibu cha mwenye nyumba'), display: '14 days', rule: B('Used before council review of a tenant claim.', 'Inatumika kabla ya halmashauri kupitia madai ya mpangaji.') },
  ],
};

export const DEMO_SUBJECTS = {
  public: { subject_id: 'demo-public', display_name: B('Public visitor', 'Mgeni wa umma'), role: 'public', jurisdiction: { region: 'Dar es Salaam', wards: [] }, policy_version: POLICY_VALUES.version },
  consumer: { subject_id: 'demo-consumer-118', display_name: B('Neema Sanga', 'Neema Sanga'), role: 'consumer', jurisdiction: { region: 'Dar es Salaam', wards: ['Ilala'] }, policy_version: POLICY_VALUES.version },
  operator: { subject_id: 'demo-operator-204', display_name: B('Kilimanjaro Events & Decor', 'Kilimanjaro Events & Decor'), role: 'operator', jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala', 'Ilala'] }, policy_version: POLICY_VALUES.version },
  council: { subject_id: 'demo-council-31', display_name: B('Ilala Municipal Council — Permits desk', 'Halmashauri ya Ilala — Dawati la vibali'), role: 'council', jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala', 'Kariakoo', 'Ilala'] }, policy_version: POLICY_VALUES.version },
  tra: { subject_id: 'demo-tra-07', display_name: B('TRA — Domestic Revenue, informal sector', 'TRA — Mapato ya Ndani, sekta isiyo rasmi'), role: 'tra', jurisdiction: { region: 'Dar es Salaam', wards: [] }, policy_version: POLICY_VALUES.version },
  landlord: { subject_id: 'demo-landlord-455', display_name: B('Mariam H. Mwinyi', 'Mariam H. Mwinyi'), role: 'landlord', jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala'] }, policy_version: POLICY_VALUES.version },
  tenant: { subject_id: 'demo-tenant-822', display_name: B('Juma A. Komba', 'Juma A. Komba'), role: 'tenant', jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala'] }, policy_version: POLICY_VALUES.version },
  agent: { subject_id: 'demo-agent-19', display_name: B('Bahari Properties Ltd', 'Bahari Properties Ltd'), role: 'agent', jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala', 'Kariakoo'] }, policy_version: POLICY_VALUES.version },
  manager: { subject_id: 'demo-manager-66', display_name: B('Kariakoo Asset Care', 'Kariakoo Asset Care'), role: 'manager', jurisdiction: { region: 'Dar es Salaam', wards: ['Kariakoo'] }, policy_version: POLICY_VALUES.version },
  ward: { subject_id: 'demo-ward-12', display_name: B('Mtaa Officer — Mwananyamala', 'Afisa wa Mtaa — Mwananyamala'), role: 'ward', jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala'] }, policy_version: POLICY_VALUES.version },
};

export const NOTIFICATIONS = [
  { id: 'ntf-1', kind: 'receipt_confirmed', title: B('Receipt confirmed by buyer', 'Risiti imethibitishwa na mteja'), body: B('IBMT-RCP-2026-004812 was confirmed by the buyer today.', 'IBMT-RCP-2026-004812 ilithibitishwa na mteja leo.'), created_at: '2026-10-24T09:12:00Z', read: false },
  { id: 'ntf-2', kind: 'permit_decision', title: B('Permit decision recorded', 'Uamuzi wa kibali umerekodiwa'), body: B('Ilala council raised a query on IBMT-PMT-2026-000338. A reason is attached.', 'Halmashauri ya Ilala iliuliza swali kuhusu IBMT-PMT-2026-000338. Sababu imeambatishwa.'), created_at: '2026-10-23T14:40:00Z', read: false },
  { id: 'ntf-3', kind: 'policy_version', title: B('Policy values updated', 'Viwango vya sera vimebadilika'), body: B('The backend published policy version 2026.1-proposed. Amounts on screen now carry this version.', 'Backend imetoa toleo la sera 2026.1-proposed. Kiasi kwenye skrini sasa kina toleo hili.'), created_at: '2026-10-22T08:00:00Z', read: true },
  { id: 'ntf-4', kind: 'human_review', title: B('Human review queued', 'Mapitio ya mtu yamepangwa'), body: B('A unit in Mwananyamala has a meter mismatch. No fine has been created.', 'Kitengo kimoja Mwananyamala kina tofauti ya mita. Hakuna faini iliyoundwa.'), created_at: '2026-10-21T11:05:00Z', read: true },
  { id: 'ntf-5', kind: 'registration_window', title: B('Registration window open', 'Kipindi cha usajili kimefunguliwa'), body: B('Registration is compulsory from launch. The window shown is a placeholder pending the confirmed instrument.', 'Usajili ni lazima kuanzia kuanza. Kipindi kinachoonyeshwa ni nafasi ya mfano inasubiri hati iliyothibitishwa.'), created_at: '2026-10-20T07:30:00Z', read: true },
  { id: 'ntf-6', kind: 'export_ready', title: B('Export prepared', 'Uhamishaji umeandaliwa'), body: B('Your controlled export of own records is ready for download.', 'Uhamishaji wako uliodhibitiwa wa kumbukumbu zako uko tayari kupakuliwa.'), created_at: '2026-10-19T16:22:00Z', read: true },
];

export const ACCESS_HISTORY = [
  { id: 'acc-1', actor_role: 'tra', actor_org: B('TRA — Domestic Revenue', 'TRA — Mapato ya Ndani'), purpose: B('Aggregate quality review of the ward', 'Mapitio ya jumla ya ubora wa kata'), record_type: B('Receipt aggregate (no names)', 'Jumla ya risiti (bila majina)'), occurred_at: '2026-10-24T10:02:00Z' },
  { id: 'acc-2', actor_role: 'council', actor_org: B('Ilala Municipal Council', 'Halmashauri ya Ilala'), purpose: B('Permit application review', 'Mapitio ya ombi la kibali'), record_type: B('Event permit IBMT-PMT-2026-000338', 'Kibali cha hafla IBMT-PMT-2026-000338'), occurred_at: '2026-10-23T14:31:00Z' },
  { id: 'acc-3', actor_role: 'ward', actor_org: B('Mtaa office — Mwananyamala', 'Ofisi ya Mtaa — Mwananyamala'), purpose: B('Ownership evidence verification', 'Uthibitisho wa ushahidi wa umiliki'), record_type: B('Unit IBMT-UNIT-2026-002310', 'Kitengo IBMT-UNIT-2026-002310'), occurred_at: '2026-10-22T09:18:00Z' },
  { id: 'acc-4', actor_role: 'manager', actor_org: B('Kariakoo Asset Care', 'Kariakoo Asset Care'), purpose: B('Delegated mandate: rent collection only', 'Wakala uliokabidhiwa: kukusanya kodi pekee'), record_type: B('Tenancy ledger summary', 'Muhtasari wa daftari la upangaji'), occurred_at: '2026-10-21T08:44:00Z' },
  { id: 'acc-5', actor_role: 'tenant', actor_org: B('Juma A. Komba (self)', 'Juma A. Komba (mwenyewe)'), purpose: B('Own evidence pack preview', 'Onyesho la kifurushi chake cha ushahidi'), record_type: B('Evidence pack preview', 'Onyesho la kifurushi cha ushahidi'), occurred_at: '2026-10-20T19:03:00Z' },
  { id: 'acc-6', actor_role: 'council', actor_org: B('Ilala Municipal Council', 'Halmashauri ya Ilala'), purpose: B('Human compliance review of a mismatch flag', 'Mapitio ya mtu ya alama ya kutolingana'), record_type: B('Unit compliance flag', 'Alama ya kufuata sheria ya kitengo'), occurred_at: '2026-10-19T13:12:00Z' },
];

export const CONSENTS = {
  registration_processing: { granted: true, mandatory: true, label: B('Registration and withholding processing', 'Usajili na uchakataji wa kodi inayozuiliwa'), note: B('Mandatory under the confirmed legal mandate. It cannot be withdrawn while a tenancy is active.', 'Ni lazima chini ya mamlaka ya kisheria yaliyothibitishwa. Haiwezi kuondolewa wakati upangaji unaendelea.') },
  listing_marketing: { granted: true, mandatory: false, label: B('Publishing a listing for marketing', 'Kuchapisha tangazo kwa matangazo'), note: B('Optional. Withdrawing it removes the public listing, never the registration.', 'Ni hiari. Kuondoa huondoa tangazo la umma, si usajili.') },
  rent_history_credit: { granted: false, mandatory: false, label: B('Using rent history to support credit', 'Kutumia historia ya kodi kusaidia mkopo'), note: B('Optional and separate from lender sharing.', 'Ni hiari na ni tofauti na kushiriki na mkopeshaji.') },
  lender_sharing: { granted: false, mandatory: false, label: B('Sharing with a lender you name', 'Kushiriki na mkopeshaji unaemtaja'), note: B('Optional. You choose the lender each time.', 'Ni hiari. Unachagua mkopeshaji kila mara.') },
};

/** Public verification. Only already-public fields are ever returned. */
export const VERIFICATION_RECORDS = {
  'IBMT-RCP-2026-004812': {
    kind: 'receipt', found: true, module: 'events', status: 'confirmed',
    issued_on: '2026-10-12',
    public_fields: [
      { label: B('Business', 'Biashara'), value: B('Kilimanjaro Events & Decor', 'Kilimanjaro Events & Decor') },
      { label: B('Record type', 'Aina ya kumbukumbu'), value: B('Business record — not a fiscal EFD/VFD receipt', 'Kumbukumbu ya biashara — si risiti ya kifiskali ya EFD/VFD') },
      { label: B('Amount paid', 'Kiasi kilicholipwa'), value: 'TZS 1,250,000' },
      { label: B('Buyer confirmation', 'Uthibitisho wa mteja'), value: B('Confirmed by the buyer', 'Ilithibitishwa na mteja') },
      { label: B('Ward', 'Kata'), value: B('Mwananyamala, Kinondoni', 'Mwananyamala, Kinondoni') },
    ],
  },
  'IBMT-BIZ-2026-000913': {
    kind: 'business', found: true, module: 'events', status: 'active', issued_on: '2026-04-02',
    public_fields: [
      { label: B('Business', 'Biashara'), value: B('Kilimanjaro Events & Decor', 'Kilimanjaro Events & Decor') },
      { label: B('Category', 'Aina'), value: B('Events services — decoration and hire', 'Huduma za matukio — mapambo na kukodisha') },
      { label: B('Ward', 'Kata'), value: B('Mwananyamala, Kinondoni', 'Mwananyamala, Kinondoni') },
      { label: B('Registration', 'Usajili'), value: B('Active in IBMT', 'Inaendelea kwenye IBMT') },
      { label: B('Turnover', 'Mauzo'), value: B('Not public. Business turnover is not government tax revenue.', 'Si ya umma. Mauzo ya biashara si Mapato ya kodi ya serikali.') },
    ],
  },
  'IBMT-LEASE-2026-000271': {
    kind: 'lease', found: true, module: 'rent', status: 'active', issued_on: '2026-08-15',
    public_fields: [
      { label: B('Lease status', 'Hali ya mkataba'), value: B('Signed by both parties, stamp duty assessed', 'Imesainiwa na wahusika wote, ushuru wa stempu umekadiriwa') },
      { label: B('Unit registration', 'Usajili wa kitengo'), value: B('Registered, ownership verified', 'Imesajiliwa, umiliki umethibitishwa') },
      { label: B('Term', 'Muda'), value: B('12 months, one active lease for this unit', 'Miezi 12, mkataba mmoja unaoendelea kwa kitengo hiki') },
      { label: B('Address', 'Anwani'), value: B('Not disclosed. Addresses are never published.', 'Haitolewi. Anwani hazichapishwi kamwe.') },
    ],
  },
  'IBMT-AGT-2026-000044': {
    kind: 'agent', found: true, module: 'rent', status: 'active', issued_on: '2026-02-20',
    public_fields: [
      { label: B('Agent', 'Wakala'), value: B('Bahari Properties Ltd', 'Bahari Properties Ltd') },
      { label: B('Licence', 'Leseni'), value: 'IBMT-AGT-2026-000044' },
      { label: B('Licensing council', 'Halmashauri ya leseni'), value: B('Ilala Municipal Council', 'Halmashauri ya Ilala') },
      { label: B('Commission rule', 'Kanuni ya kamisheni'), value: B('Capped, landlord funded, charged once per new tenancy, never on renewal.', 'Ina kikomo, inalipwa na mwenye nyumba, inatozwa mara moja kwa upangaji mpya, kamwe si kwa kuongeza muda.') },
    ],
  },
  'IBMT-UNIT-2026-002310': {
    kind: 'unit', found: true, module: 'rent', status: 'verified', issued_on: '2026-09-01',
    public_fields: [
      { label: B('Unit registration', 'Usajili wa kitengo'), value: B('Registered. Registration does not confer ownership.', 'Imesajiliwa. Usajili haukupi umiliki.') },
      { label: B('Ownership evidence', 'Ushahidi wa umiliki'), value: B('Verified by the authorised officer', 'Umethibitishwa na afisa aliyeidhinishwa') },
      { label: B('Eligible to receive rent', 'Inaweza kupokea kodi'), value: B('Yes, while verification stands', 'Ndiyo, wakati uthibitisho unaendelea') },
      { label: B('Mtaa / Ward', 'Mtaa / Kata'), value: B('Mwananyamala, Kinondoni', 'Mwananyamala, Kinondoni') },
    ],
  },
};

/** Documents that parties can preview. Final documents come from the backend. */
export const DOCUMENT_SPECIMENS = {
  lease: {
    id: 'spec-lease-1',
    kind: 'lease',
    title: B('Residential tenancy agreement (bilingual specimen)', 'Mkataba wa pango la nyumba (mfano wa lugha mbili)'),
    terms_version: 'T-2026.08-v3',
    parties: [
      { role: B('Landlord', 'Mwenye nyumba'), name: 'Mariam H. Mwinyi', ref: 'IBMT-LND-000455' },
      { role: B('Tenant', 'Mpangaji'), name: 'Juma A. Komba', ref: 'IBMT-TNT-000822' },
    ],
    clauses: [
      { en: 'The landlord lets, and the tenant takes, the unit described in the schedule for a term of twelve months.', sw: 'Mwenye nyumba anakodisha, na mpangaji anakubali, kitengo kilichoelezwa kwenye ratiba kwa kipindi cha miezi kumi na miwili.' },
      { en: 'Rent is payable monthly in advance through an approved payment partner. IBMT does not hold funds at any time.', sw: 'Kodi inalipwa kila mwezi mapema kupitia mshirika wa malipo aliyeidhinishwa. IBMT haishikilii fedha wakati wowote.' },
      { en: 'The deposit is held separately in the tenant name and is released by mutual one-time-code confirmation.', sw: 'Amana inashikiliwa kivyake kwa jina la mpangaji na inatolewa kwa uthibitisho wa namba ya siri ya mara moja wa pande zote.' },
      { en: 'Registration of the unit does not confer ownership of the property.', sw: 'Usajili wa kitengo haukupi umiliki wa mali.' },
      { en: 'A change to these terms invalidates any earlier signature and requires a fresh signing challenge.', sw: 'Mabadiliko ya masharti haya yanabatilisha saini ya awali na yanahitaji changamoto mpya ya kusaini.' },
    ],
  },
  receipt: {
    id: 'spec-receipt-1',
    kind: 'receipt',
    title: B('Rent receipt (specimen)', 'Risiti ya kodi (mfano)'),
    reference: 'IBMT-RENT-RCP-2026-000644',
    issued_on: '2026-10-05',
    lines: [
      { label: B('Unit', 'Kitengo'), value: 'IBMT-UNIT-2026-002310' },
      { label: B('Rent, 6 months', 'Kodi, miezi 6'), value: 'TZS 3,000,000' },
      { label: B('Deposit (initial, held separately)', 'Amana (ya awali, inashikiliwa kivyake)'), value: 'TZS 500,000' },
      { label: B('Total paid by tenant', 'Jumla iliyolipwa na mpangaji'), value: 'TZS 3,500,000' },
    ],
    statement: B('Business record — not a fiscal EFD/VFD receipt. Allocation statuses are separate: payment confirmation, tax remittance, landlord settlement and deposit custody.', 'Kumbukumbu ya biashara — si risiti ya kifiskali ya EFD/VFD. Hali za mgawanyo ni tofauti: uthibitisho wa malipo, uwasilishaji wa kodi, malipo ya mwenye nyumba na ulinzi wa amana.'),
  },
  tax: {
    id: 'spec-tax-1',
    kind: 'tax',
    title: B('Landlord tax compliance certificate (specimen)', 'Cheti cha kufuata kodi cha mwenye nyumba (mfano)'),
    holder: 'Mariam H. Mwinyi',
    certificate_id: 'IBMT-TAXC-2026-000177',
    issued_on: '2026-09-30',
    valid_until: '2027-09-29',
    statements: [
      B('Withholding is applied once at the point of payment and remitted by the payment partner.', 'Kodi inayozuiliwa inatumika mara moja wakati wa malipo na inatumwa na mshirika wa malipo.'),
      B('Registration does not confer ownership.', 'Usajili haukupi umiliki.'),
      B('This specimen is not an issued certificate. Eligibility and the final document come from the backend.', 'Mfano huu si cheti kilichotolewa. Ustahiki na hati ya mwisho vinatoka backend.'),
    ],
  },
};

/** USSD menu, as the mock backend would return it. */
export const USSD_MENU = {
  title: B('IBMT Rent', 'IBMT Kodi'),
  cost: B('Free of charge', 'Bila malipo'),
  options: [
    { key: '1', label: B('Pay rent', 'Lipa kodi') },
    { key: '2', label: B('Balance due', 'Salio linalotakiwa') },
    { key: '3', label: B('Verify receipt', 'Thibitisha risiti') },
    { key: '4', label: B('Verify agent licence', 'Thibitisha leseni ya wakala') },
  ],
};