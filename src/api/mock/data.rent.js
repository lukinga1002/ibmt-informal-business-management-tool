/**
 * Module 2 fixtures — IBMT Rent (Kodi ya Nyumba).
 * All fictional. Amounts mirror the labelled acceptance example.
 */

const B = (en, sw) => ({ en, sw });

export const LANDLORD_OVERVIEW = {
  jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala'], mtaa: ['Mwananyamala', 'Mabatini'] },
  counters: [
    { key: 'units', label: B('Units registered', 'Vitego vilivyosajiliwa'), value: '6' },
    { key: 'occupancy', label: B('Occupancy', 'Ukaaji'), value: '5 of 6' },
    { key: 'rent_due', label: B('Rent due this month', 'Kodi inayotakiwa mwezi huu'), value: 'TZS 2,300,000' },
    { key: 'collected', label: B('Collected through the payment partner', 'Iliyokusanywa kupitia mshirika wa malipo'), value: 'TZS 1,800,000' },
    { key: 'tax_withheld', label: B('Tax withheld (status separate)', 'Kodi iliyozuiliwa (hali ni tofauti)'), value: 'TZS 180,000' },
    { key: 'arrears', label: B('Arrears', 'Malimbikizo'), value: 'TZS 500,000' },
  ],
  arrears_note: B('Arrears are shown as a total and a count. No automatic penalty is applied.', 'Malimbikizo yanaonyeshwa kwa jumla na idadi. Hakuna adhabu ya kiotomatiki inayotumika.'),
  policy_version: '2026.1-proposed',
};

export const UNITS = [
  {
    id: 'unt-2310', unit_ref: 'IBMT-UNIT-2026-002310', ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', monthly_rent: 500000,
    occupancy: 'occupied', registration_status: 'verified', ownership_status: 'verified', version: 4,
    address_private: { anwani_ya_makazi: 'Mwananyamala · plot reference held privately', meter: 'TANESCO meter reference held privately' },
    documents: [
      { id: 'ud-1', label: B('Title deed extract', 'Dondoo la hati ya umiliki'), grade: 'strong', uploaded_at: '2026-08-20' },
      { id: 'ud-2', label: B('TANESCO meter evidence', 'Ushahidi wa mita ya TANESCO'), grade: 'strong', uploaded_at: '2026-08-20' },
      { id: 'ud-3', label: B('Municipal rates receipt', 'Risiti ya kodi ya halmashauri'), grade: 'moderate', uploaded_at: '2026-08-22' },
    ],
    verification: { status: 'verified', verified_by: B('Mtaa office — Mwananyamala', 'Ofisi ya Mtaa — Mwananyamala'), verified_at: '2026-09-01', reason: B('Title extract and meter match the Anwani ya Makazi record.', 'Dondoo la hati na mita vinalingana na kumbukumbu ya Anwani ya Makazi.') },
    eligible_for_rent: true,
    certificate_note: 'policy.registrationNoOwnership',
  },
  {
    id: 'unt-2311', unit_ref: 'IBMT-UNIT-2026-002311', ward_id: 'Mwananyamala', mtaa: 'Mabatini', monthly_rent: 650000,
    occupancy: 'occupied', registration_status: 'submitted', ownership_status: 'in_review', version: 2,
    address_private: { anwani_ya_makazi: 'Mabatini · plot reference held privately', meter: 'TANESCO meter reference held privately' },
    documents: [{ id: 'ud-4', label: B('Sale agreement', 'Mkataba wa mauzo'), grade: 'moderate', uploaded_at: '2026-10-14' }],
    verification: { status: 'in_review', verified_by: null, verified_at: null, reason: null },
    eligible_for_rent: false,
    certificate_note: 'policy.ownershipVerifiedFirst',
  },
  {
    id: 'unt-2312', unit_ref: 'IBMT-UNIT-2026-002312', ward_id: 'Mwananyamala', mtaa: 'Mabatini', monthly_rent: 380000,
    occupancy: 'vacant', registration_status: 'queried', ownership_status: 'queried', version: 3,
    address_private: { anwani_ya_makazi: 'Mabatini · plot reference held privately', meter: 'TANESCO meter reference held privately' },
    documents: [{ id: 'ud-5', label: B('Letter of authority from the family', 'Barua ya mamlaka kutoka familia'), grade: 'weak', uploaded_at: '2026-09-30' }],
    verification: { status: 'queried', verified_by: B('Mtaa office — Mwananyamala', 'Ofisi ya Mtaa — Mwananyamala'), verified_at: '2026-10-06', reason: B('The meter reference on the letter does not match the Anwani ya Makazi record. Human review only.', 'Namba ya mita kwenye barua hailingani na kumbukumbu ya Anwani ya Makazi. Mapitio ya mtu pekee.') },
    eligible_for_rent: false,
    certificate_note: 'policy.humanReviewOnly',
  },
  {
    id: 'unt-2313', unit_ref: 'IBMT-UNIT-2026-002313', ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', monthly_rent: 450000,
    occupancy: 'occupied', registration_status: 'verified', ownership_status: 'verified', version: 1,
    address_private: { anwani_ya_makazi: 'Mwananyamala · plot reference held privately', meter: 'TANESCO meter reference held privately' },
    documents: [{ id: 'ud-6', label: B('Title deed extract', 'Dondoo la hati ya umiliki'), grade: 'strong', uploaded_at: '2026-07-11' }],
    verification: { status: 'verified', verified_by: B('Mtaa office — Mwananyamala', 'Ofisi ya Mtaa — Mwananyamala'), verified_at: '2026-07-20', reason: B('Documents consistent with the ward record.', 'Nyaraka zinalingana na kumbukumbu ya kata.') },
    eligible_for_rent: true,
    certificate_note: 'policy.registrationNoOwnership',
  },
  {
    id: 'unt-2314', unit_ref: 'IBMT-UNIT-2026-002314', ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', monthly_rent: 320000,
    occupancy: 'occupied', registration_status: 'verified', ownership_status: 'verified', version: 1,
    address_private: { anwani_ya_makazi: 'Mwananyamala · plot reference held privately', meter: 'TANESCO meter reference held privately' },
    documents: [{ id: 'ud-7', label: B('Title deed extract', 'Dondoo la hati ya umiliki'), grade: 'strong', uploaded_at: '2026-06-30' }],
    verification: { status: 'verified', verified_by: B('Mtaa office — Mwananyamala', 'Ofisi ya Mtaa — Mwananyamala'), verified_at: '2026-07-05', reason: B('Documents consistent with the ward record.', 'Nyaraka zinalingana na kumbukumbu ya kata.') },
    eligible_for_rent: true,
    certificate_note: 'policy.registrationNoOwnership',
  },
  {
    id: 'unt-2315', unit_ref: 'IBMT-UNIT-2026-002315', ward_id: 'Mwananyamala', mtaa: 'Mabatini', monthly_rent: 300000,
    occupancy: 'occupied', registration_status: 'not_effective', ownership_status: 'unverified', version: 1,
    address_private: { anwani_ya_makazi: 'Mabatini · plot reference held privately', meter: 'TANESCO meter reference held privately' },
    documents: [],
    verification: { status: 'unverified', verified_by: null, verified_at: null, reason: null },
    eligible_for_rent: false,
    certificate_note: 'policy.registrationVoluntary',
  },
];

export const LISTINGS = [
  { id: 'lst-1', unit_id: 'unt-2314', unit_ref: 'IBMT-UNIT-2026-002314', ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', headline: B('Two-bedroom, quiet lane, water tank', 'Vyumba viwili, mtaa mtulivu, tanki la maji'), monthly_rent: 320000, deposit: 320000, verified: true, marketing_consent: true, viewings_open: true, listed_at: '2026-09-12', available_from: '2026-11-01', amenities: [B('Water tank', 'Tanki la maji'), B('Tiled floors', 'Sakafu ya tiles'), B('Own meter', 'Mita yake')] },
  { id: 'lst-2', unit_id: 'unt-2310', unit_ref: 'IBMT-UNIT-2026-002310', ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', headline: B('Three-bedroom with parking', 'Vyumba vitatu na maegesho'), monthly_rent: 500000, deposit: 500000, verified: true, marketing_consent: true, viewings_open: true, listed_at: '2026-08-25', available_from: '2026-12-01', amenities: [B('Parking', 'Maegesho'), B('Own meter', 'Mita yake')] },
  { id: 'lst-3', unit_id: 'unt-2313', unit_ref: 'IBMT-UNIT-2026-002313', ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', headline: B('Single room, shared yard', 'Chumba kimoja, ua la kushirikiana'), monthly_rent: 450000, deposit: 450000, verified: true, marketing_consent: false, viewings_open: false, listed_at: '2026-07-28', available_from: '2026-11-15', amenities: [B('Shared yard', 'Ua la kushirikiana')] },
  { id: 'lst-4', unit_id: 'unt-2311', unit_ref: 'IBMT-UNIT-2026-002311', ward_id: 'Mwananyamala', mtaa: 'Mabatini', headline: B('Four-bedroom, gated compound', 'Vyumba vinne, eneo lenye lango'), monthly_rent: 650000, deposit: 650000, verified: false, marketing_consent: true, viewings_open: true, listed_at: '2026-10-15', available_from: '2026-11-20', amenities: [B('Gated', 'Lango'), B('Water tank', 'Tanki la maji')] },
];

export const MANDATES = [
  { id: 'mnd-1', agent_id: 'IBMT-AGT-2026-000044', agent_name: 'Bahari Properties Ltd', licence_status: 'active', licence_expires_at: '2027-02-19', ibmt_business: true, scope: [B('Market the unit', 'Kutangaza kitengo'), B('Conduct free viewings', 'Kufanya ziara za bure'), B('Collect rent through IBMT', 'Kukusanya kodi kupitia IBMT')], commission_cap_percent: 10, status: 'active', created_at: '2026-09-02', note: 'policy.commissionRule' },
  { id: 'mnd-2', agent_id: 'IBMT-AGT-2026-000051', agent_name: 'Msimbazi Agency', licence_status: 'expired', licence_expires_at: '2026-08-31', ibmt_business: true, scope: [B('Market the unit', 'Kutangaza kitengo')], commission_cap_percent: 10, status: 'rejected', created_at: '2026-10-10', rejected_reason: 'policy.licenceRule', note: 'policy.licenceRule' },
];

export const TENANCIES = [
  { id: 'tny-1', unit_id: 'unt-2310', unit_ref: 'IBMT-UNIT-2026-002310', tenant_ref: 'IBMT-TNT-000822', tenant_name: 'Juma A. Komba', lease_id: 'lse-1', start_date: '2026-08-15', paid_through: '2027-02-14', legacy: false, status: 'active', monthly_rent: 500000 },
  { id: 'tny-2', unit_id: 'unt-2313', unit_ref: 'IBMT-UNIT-2026-002313', tenant_ref: 'IBMT-TNT-000845', tenant_name: 'Halima Yusuph', lease_id: 'lse-2', start_date: '2026-05-01', paid_through: '2026-12-31', legacy: true, status: 'active', monthly_rent: 450000 },
  { id: 'tny-3', unit_id: 'unt-2314', unit_ref: 'IBMT-UNIT-2026-002314', tenant_ref: null, tenant_name: null, lease_id: null, start_date: null, paid_through: null, legacy: false, status: 'pending', monthly_rent: 320000 },
  { id: 'tny-4', unit_id: 'unt-2315', unit_ref: 'IBMT-UNIT-2026-002315', tenant_ref: 'IBMT-TNT-000861', tenant_name: 'Ramadhani Said', lease_id: null, start_date: '2026-03-01', paid_through: '2026-10-31', legacy: true, status: 'active', monthly_rent: 300000 },
];

export const LEASES = [
  {
    id: 'lse-1', tenancy_id: 'tny-1', unit_ref: 'IBMT-UNIT-2026-002310', terms_version: 'T-2026.08-v3', version: 5,
    parties: [
      { role: B('Landlord', 'Mwenye nyumba'), name: 'Mariam H. Mwinyi', ref: 'IBMT-LND-000455', signed: true, signed_at: '2026-08-14T10:02:00Z' },
      { role: B('Tenant', 'Mpangaji'), name: 'Juma A. Komba', ref: 'IBMT-TNT-000822', signed: false, signed_at: null },
    ],
    terms: {
      term_months: 12, monthly_rent: 500000, deposit: 500000, advance_months: 6,
      start_date: '2026-08-15', end_date: '2027-08-14',
      clauses: [
        B('Rent is payable through an approved payment partner. IBMT never holds funds.', 'Kodi inalipwa kupitia mshirika wa malipo aliyeidhinishwa. IBMT haishikilii fedha.'),
        B('The deposit is held in the tenant name and released by mutual one-time-code confirmation.', 'Amana inashikiliwa kwa jina la mpangaji na inatolewa kwa uthibitisho wa namba ya siri ya mara moja wa pande zote.'),
      ],
    },
    language_pairs: ['en', 'sw'],
    signature_state: 'pending',
    otp_challenge: { challenge_id: 'otp-ch-9921', party: 'tenant', expires_at: '2026-10-25T13:04:00Z', attempts_remaining: 3 },
    stamp_duty_state: 'assessed',
    activation_state: 'awaiting_signatures',
    changed_after_signature: false,
  },
  {
    id: 'lse-2', tenancy_id: 'tny-2', unit_ref: 'IBMT-UNIT-2026-002313', terms_version: 'T-2026.04-v1', version: 9, legacy: true,
    parties: [
      { role: B('Landlord', 'Mwenye nyumba'), name: 'Mariam H. Mwinyi', ref: 'IBMT-LND-000455', signed: true, signed_at: '2026-04-28T09:15:00Z' },
      { role: B('Tenant', 'Mpangaji'), name: 'Halima Yusuph', ref: 'IBMT-TNT-000845', signed: true, signed_at: '2026-04-29T18:40:00Z' },
    ],
    terms: { term_months: 12, monthly_rent: 450000, deposit: 450000, advance_months: 3, start_date: '2026-05-01', end_date: '2027-04-30', clauses: [B('Migrated legacy terms, preserved as originally agreed.', 'Masharti ya awali yaliyohamishwa, yamehifadhiwa kama yalivyokubaliwa.')] },
    language_pairs: ['en', 'sw'],
    signature_state: 'success',
    otp_challenge: null,
    stamp_duty_state: 'assessed',
    activation_state: 'active',
    changed_after_signature: false,
  },
];

/**
 * Payments. The allocation shown is a backend response, never computed here.
 * Labelled acceptance example: 500,000 × 6 = 3,000,000 rent,
 * tax 300,000, new-tenancy commission 500,000, landlord 2,200,000.
 * Renewal: commission zero, landlord 2,700,000.
 */
export const PAYMENTS = [
  {
    id: 'pay-1', reference: 'IBMT-RENT-PAY-2026-000644', unit_ref: 'IBMT-UNIT-2026-002310', tenancy_id: 'tny-1',
    period_months: 6, rent_amount: 3000000, deposit_amount: 500000, tenant_total: 3500000, new_tenancy: true,
    allocation: { tax: 300000, commission: 500000, landlord_settlement: 2200000, total: 3000000 },
    allocation_note: 'policy.allocationTitle',
    illustrative: true,
    partner: B('Approved payment partner', 'Mshirika wa malipo aliyeidhinishwa'),
    statuses: { payment_confirmation: 'confirmed', tax_remittance: 'remitted', landlord_settlement: 'settled', deposit_custody: 'held' },
    state: 'settled', paid_at: '2026-08-15T11:20:00Z', version: 4,
  },
  {
    id: 'pay-2', reference: 'IBMT-RENT-PAY-2026-000702', unit_ref: 'IBMT-UNIT-2026-002313', tenancy_id: 'tny-2',
    period_months: 6, rent_amount: 2700000, deposit_amount: 0, tenant_total: 2700000, new_tenancy: false,
    allocation: { tax: 270000, commission: 0, landlord_settlement: 2430000, total: 2700000 },
    allocation_note: 'policy.commissionRule',
    illustrative: true,
    partner: B('Approved payment partner', 'Mshirika wa malipo aliyeidhinishwa'),
    statuses: { payment_confirmation: 'confirmed', tax_remittance: 'withheld', landlord_settlement: 'due', deposit_custody: 'held' },
    state: 'partial', paid_at: '2026-10-02T08:05:00Z', version: 2,
  },
  {
    id: 'pay-3', reference: 'IBMT-RENT-PAY-2026-000711', unit_ref: 'IBMT-UNIT-2026-002314', tenancy_id: null,
    period_months: 6, rent_amount: 1920000, deposit_amount: 320000, tenant_total: 2240000, new_tenancy: true,
    allocation: { tax: 192000, commission: 192000, landlord_settlement: 1536000, total: 1920000 },
    allocation_note: 'policy.allocationTitle', illustrative: true,
    partner: B('Approved payment partner', 'Mshirika wa malipo aliyeidhinishwa'),
    statuses: { payment_confirmation: 'awaiting_confirmation', tax_remittance: 'not_connected', landlord_settlement: 'not_connected', deposit_custody: 'not_connected' },
    state: 'awaiting_confirmation', paid_at: null, version: 1,
  },
];

export const RENT_PAYMENT_QUOTE = {
  rent_amount: 3000000,
  period_months: 6,
  monthly_rent: 500000,
  tax: 300000,
  commission: 500000,
  landlord_settlement: 2200000,
  tenant_total: 3500000,
  deposit_amount: 500000,
  new_tenancy: true,
  policy_version: '2026.1-proposed',
  allocation_note: 'policy.allocationTitle',
  illustrative: true,
  renewal_example: { commission: 0, landlord_settlement: 2700000, rent_amount: 3000000, note: 'policy.commissionRule' },
  statements: ['policy.ibmtHoldsNoFunds', 'policy.tenantPaysExact', 'policy.noTenantFee', 'policy.depositCustody'],
};

export const DEPOSITS = [
  { id: 'dep-1', unit_ref: 'IBMT-UNIT-2026-002310', amount: 500000, custody_state: 'held', custodian: B('Approved custodian — in the tenant name', 'Mlezi aliyeidhinishwa — kwa jina la mpangaji'), tenant_name: 'Juma A. Komba', dispute_state: 'none', release_codes: { tenant: false, landlord: false }, custodian_confirmation_state: 'not_connected', checklist_state: 'satisfied', note: 'policy.checklistNotRelease' },
  { id: 'dep-2', unit_ref: 'IBMT-UNIT-2026-002313', amount: 450000, custody_state: 'held', custodian: B('Approved custodian — in the tenant name', 'Mlezi aliyeidhinishwa — kwa jina la mpangaji'), tenant_name: 'Halima Yusuph', dispute_state: 'none', release_codes: { tenant: false, landlord: false }, custodian_confirmation_state: 'not_connected', checklist_state: 'satisfied', note: 'policy.checklistNotRelease' },
  { id: 'dep-3', unit_ref: 'IBMT-UNIT-2026-002315', amount: 300000, custody_state: 'disputed', custodian: B('Approved custodian — in the tenant name', 'Mlezi aliyeidhinishwa — kwa jina la mpangaji'), tenant_name: 'Ramadhani Said', dispute_state: 'mediation', release_codes: { tenant: true, landlord: false }, custodian_confirmation_state: 'held', checklist_state: 'disputed', note: 'policy.checklistNotRelease' },
];

export const CONDITION_REPORTS = [
  {
    id: 'cr-1', deposit_id: 'dep-1', phase: 'move_in', created_at: '2026-08-15', agreement_state: 'satisfied', version: 2,
    items: [
      { id: 'ci-1', label: B('Walls and ceiling', 'Kuta na dari'), state: B('Good', 'Nzuri') },
      { id: 'ci-2', label: B('Plumbing', 'Mabomba'), state: B('Good', 'Nzuri') },
      { id: 'ci-3', label: B('Window locks', 'Kufunga madirisha'), state: B('One broken', 'Kimoja kimevunjika') },
    ],
    photos: [{ id: 'ph-1', label: B('Kitchen, move-in', 'Jikoni, wakati wa kuingia'), private: true }],
    note: 'policy.checklistNotRelease',
  },
  {
    id: 'cr-2', deposit_id: 'dep-1', phase: 'move_out', created_at: '2026-10-20', agreement_state: 'pending', version: 1,
    items: [
      { id: 'ci-4', label: B('Walls and ceiling', 'Kuta na dari'), state: B('Good', 'Nzuri') },
      { id: 'ci-5', label: B('Window locks', 'Kufunga madirisha'), state: B('Repaired by tenant', 'Ilirekebishwa na mpangaji') },
    ],
    photos: [{ id: 'ph-2', label: B('Window lock after repair', 'Kufunga dirisha baada ya kurekebisha'), private: true }],
    note: 'policy.checklistNotRelease',
  },
  {
    id: 'cr-3', deposit_id: 'dep-3', phase: 'move_out', created_at: '2026-09-28', agreement_state: 'queried', version: 3,
    items: [
      { id: 'ci-6', label: B('Roof leak repair', 'Kurekebisha uvujaji wa paa'), state: B('Disputed', 'Inagombana') },
      { id: 'ci-7', label: B('Paint condition', 'Hali ya rangi'), state: B('Fair', 'Ya kati') },
    ],
    photos: [],
    note: 'policy.checklistNotRelease',
  },
];

export const NOTICES = [
  { id: 'ntc-1', kind: 'renewal', unit_ref: 'IBMT-UNIT-2026-002310', issued_at: '2026-10-01', response_due: '2026-10-15', status: 'in_review', body: B('Renewal offered on the same terms. The commission rule does not apply to a renewal.', 'Kuongeza muda kunatolewa kwa masharti yale yale. Kanuni ya kamisheni haitumiki kwa kuongeza muda.') },
  { id: 'ntc-2', kind: 'rent_due', unit_ref: 'IBMT-UNIT-2026-002313', issued_at: '2026-10-05', response_due: '2026-10-19', status: 'overdue', body: B('Rent for November has not been received. No penalty has been applied.', 'Kodi ya Novemba haijapokelewa. Hakuna adhabu iliyotumika.') },
  { id: 'ntc-3', kind: 'landlord_notification', unit_ref: 'IBMT-UNIT-2026-002315', issued_at: '2026-10-18', response_due: '2026-11-01', status: 'pending', body: B('A tenant has claimed the tenancy for this unit. You can respond within the backend response window; after it expires the claim goes to council review.', 'Mpangaji amedai upangaji wa kitengo hiki. Unaweza kujibu ndani ya kipindi kilichowekwa na backend; baada ya kipindi, dai linaenda kwa halmashauri.') },
];

export const DISPUTES = [
  { id: 'dsp-1', unit_ref: 'IBMT-UNIT-2026-002315', kind: 'deposit', raised_by: B('Tenant', 'Mpangaji'), filed_at: '2026-09-30', status: 'disputed', mediation_state: 'in_review', summary: B('The tenant disputes the roof repair deduction from the deposit.', 'Mpangaji anagombana na makato ya kurekebisha paa kutoka amana.') },
  { id: 'dsp-2', unit_ref: 'IBMT-UNIT-2026-002313', kind: 'arrears', raised_by: B('Landlord', 'Mwenye nyumba'), filed_at: '2026-10-08', status: 'pending', mediation_state: 'not_started', summary: B('Two months of rent outstanding; the landlord asks for a payment plan.', 'Kodi ya miezi miwili haijalipwa; mwenye nyumba anaomba mpango wa malipo.') },
];

export const TAX_COMPLIANCE = {
  eligible: true,
  certificate_id: 'IBMT-TAXC-2026-000177',
  issued_at: '2026-09-30',
  valid_until: '2027-09-29',
  statement: 'policy.registrationNoOwnership',
  note: B('Eligibility and the final certificate come from the backend. Landlord tax compliance is separate from council permit fees.', 'Ustahiki na cheti cha mwisho vinatoka backend. Kufuata kodi kwa mwenye nyumba ni tofauti na ada za vibali za halmashauri.'),
};

export const AMNESTY = {
  amnesty_forward_only: true,
  registration_window_days: 90,
  window_placeholder: true,
  assisted_onboarding: true,
  proxy_registration: true,
  migration_preserves_terms: true,
  note: 'policy.registrationWindow',
  statements: ['policy.amnestyForward', 'policy.migration', 'policy.assistedOnboarding', 'policy.proxyRegistration', 'policy.registrationVoluntary'],
};

export const TENANT_REGISTRATION = {
  claim_id: 'IBMT-CLM-2026-000058',
  unit_id: 'unt-2315',
  unit_ref: 'IBMT-UNIT-2026-002315',
  state: 'awaiting_landlord',
  landlord_notified_at: '2026-10-18T09:00:00Z',
  response_due: '2026-11-01T09:00:00Z',
  council_review_state: 'not_started',
  note: B('A claim is not ownership verification and not a penalty. If no response arrives inside the backend window, council review follows.', 'Dai si uthibitisho wa umiliki na si adhabu. Kama hakuna jibu ndani ya kipindi cha backend, mapitio ya halmashauri yanafuata.'),
  statements: ['policy.humanReviewOnly', 'policy.registrationNoOwnership'],
};

export const VIEWING_SLOTS = [
  { id: 'vs-1', listing_id: 'lst-1', starts_at: '2026-10-27T16:00:00Z', kind: 'in_person', fee_amount: 0, fee_note: 'policy.noTenantFee' },
  { id: 'vs-2', listing_id: 'lst-1', starts_at: '2026-10-29T10:00:00Z', kind: 'in_person', fee_amount: 0, fee_note: 'policy.noTenantFee' },
  { id: 'vs-3', listing_id: 'lst-2', starts_at: '2026-10-28T14:00:00Z', kind: 'in_person', fee_amount: 0, fee_note: 'policy.noTenantFee' },
  { id: 'vs-4', listing_id: 'lst-4', starts_at: '2026-10-30T11:00:00Z', kind: 'in_person', fee_amount: 0, fee_note: 'policy.noTenantFee' },
];

export const VIEWINGS = [
  { id: 'vw-1', listing_id: 'lst-1', unit_ref: 'IBMT-UNIT-2026-002314', starts_at: '2026-10-27T16:00:00Z', status: 'scheduled', fee_amount: 0, tenant_ref: 'IBMT-TNT-000822' },
  { id: 'vw-2', listing_id: 'lst-2', unit_ref: 'IBMT-UNIT-2026-002310', starts_at: '2026-10-22T10:00:00Z', status: 'completed', fee_amount: 0, tenant_ref: 'IBMT-TNT-000822' },
];

export const EVIDENCE_PACK = {
  items: [
    { id: 'ep-1', kind: 'lease', label: B('Signed lease, version T-2026.08-v3', 'Mkataba uliosainiwa, toleo T-2026.08-v3'), period: '2026-08-15 — 2027-08-14', sensitive: false },
    { id: 'ep-2', kind: 'payment', label: B('Rent payment, 6 months', 'Malipo ya kodi, miezi 6'), period: '2026-08-15', sensitive: false },
    { id: 'ep-3', kind: 'receipt', label: B('Rent receipt IBMT-RENT-RCP-2026-000644', 'Risiti ya kodi IBMT-RENT-RCP-2026-000644'), period: '2026-08-15', sensitive: false },
    { id: 'ep-4', kind: 'condition_report', label: B('Move-in condition report', 'Ripoti ya hali wakati wa kuingia'), period: '2026-08-15', sensitive: true },
    { id: 'ep-5', kind: 'condition_report', label: B('Move-out condition report', 'Ripoti ya hali wakati wa kutoka'), period: '2026-10-20', sensitive: true },
    { id: 'ep-6', kind: 'notice', label: B('Renewal notice', 'Notisi ya kuongeza muda'), period: '2026-10-01', sensitive: false },
  ],
  note: B('The requesting party previews and selects what to include. Nothing is sent to a tribunal or any other party automatically.', 'Mhusika anayeomba anapitia na kuchagua cha kujumuisha. Hakuna kinachotumwa kwa mahakama au mhusika mwingine kiotomatiki.'),
};

export const AGENT_PROFILE = {
  agent_id: 'IBMT-AGT-2026-000044',
  name: 'Bahari Properties Ltd',
  licence_status: 'active',
  licence_number: 'IBMT-AGT-2026-000044',
  licence_expires_at: '2027-02-19',
  licensed_by: 'Ilala Municipal Council',
  ibmt_business: true,
  rating_average: 4.4,
  rating_count: 11,
  counters: [
    { key: 'mandates', label: B('Active mandates', 'Wakala unaoendelea'), value: '3' },
    { key: 'listings', label: B('Listings under mandate', 'Matangazo chini ya wakala'), value: '5' },
    { key: 'viewings', label: B('Viewings arranged this month', 'Ziara zilizopangwa mwezi huu'), value: '9' },
    { key: 'commission', label: B('Commission earned, new tenancies only', 'Kamisheni iliyopatikana, upangaji mpya pekee'), value: 'TZS 500,000' },
  ],
  licence_note: 'policy.licenceRule',
};

export const AGENT_COMMISSIONS = [
  { id: 'com-1', unit_ref: 'IBMT-UNIT-2026-002310', tenancy_kind: 'new', amount: 500000, cap_percent: 10, state: 'settled', charged_at: '2026-08-15', note: 'policy.commissionRule' },
  { id: 'com-2', unit_ref: 'IBMT-UNIT-2026-002313', tenancy_kind: 'renewal', amount: 0, cap_percent: 10, state: 'satisfied', charged_at: '2026-10-02', note: 'policy.commissionRule' },
  { id: 'com-3', unit_ref: 'IBMT-UNIT-2026-002314', tenancy_kind: 'new', amount: 192000, cap_percent: 10, state: 'withheld', charged_at: null, note: 'policy.allocationCommission' },
];

export const MANAGER_SCOPE = {
  mandates: [
    {
      mandate_id: 'mnd-m1', landlord_display: B('Mariam H. Mwinyi', 'Mariam H. Mwinyi'), landlord_ref: 'IBMT-LND-000455',
      scope: [B('Collect rent through IBMT', 'Kukusanya kodi kupitia IBMT'), B('Issue rent notices', 'Kutoa notisi za kodi')],
      not_granted: [B('Sell or transfer the unit', 'Kuuza au kuhamisha kitengo'), B('Sign leases on the landlord behalf', 'Kusaini mikataba kwa niaba ya mwenye nyumba')],
      expires_at: '2027-03-31', status: 'active',
    },
    {
      mandate_id: 'mnd-m2', landlord_display: B('Kariakoo Holdings', 'Kariakoo Holdings'), landlord_ref: 'IBMT-LND-000512',
      scope: [B('Market units', 'Kutangaza vitego'), B('Conduct viewings', 'Kufanya ziara')],
      not_granted: [B('Collect rent', 'Kukusanya kodi'), B('Hold deposit instructions', 'Kushikilia maelekezo ya amana')],
      expires_at: '2026-12-31', status: 'active',
    },
  ],
  note: B('Only the assets and actions granted by an active delegated mandate are available here. The landlord represented is shown on every record.', 'Ni mali na vitendo vilivyoruhusiwa na wakala unaoendelea pekee vinavyopatikana hapa. Mwenye nyumba anayewakilishwa anaonyeshwa kwenye kila kumbukumbu.'),
  units: ['unt-2310', 'unt-2313'],
};

export const VERIFICATION_QUEUE = [
  { unit_id: 'unt-2311', unit_ref: 'IBMT-UNIT-2026-002311', mtaa: 'Mabatini', monthly_rent: 650000, status: 'in_review', age_days: 4, match_flags: [{ id: 'vf-1', label: B('Meter reference not yet confirmed', 'Namba ya mita haijathibitishwa'), automatic_action: false }], documents: [{ id: 'vd-1', label: B('Sale agreement', 'Mkataba wa mauzo'), grade: 'moderate' }] },
  { unit_id: 'unt-2312', unit_ref: 'IBMT-UNIT-2026-002312', mtaa: 'Mabatini', monthly_rent: 380000, status: 'queried', age_days: 12, match_flags: [{ id: 'vf-2', label: B('Address and meter do not match the Anwani ya Makazi record', 'Anwani na mita hazilingani na kumbukumbu ya Anwani ya Makazi'), automatic_action: false }, { id: 'vf-3', label: B('Rent below the ward median for the size', 'Kodi chini ya wastani wa kata kwa ukubwa huu'), automatic_action: false }], documents: [{ id: 'vd-2', label: B('Letter of authority', 'Barua ya mamlaka'), grade: 'weak' }] },
  { unit_id: 'unt-2315', unit_ref: 'IBMT-UNIT-2026-002315', mtaa: 'Mabatini', monthly_rent: 300000, status: 'submitted', age_days: 2, match_flags: [], documents: [] },
];

export const MEDIATION_CASES = [
  { id: 'mdn-1', unit_ref: 'IBMT-UNIT-2026-002315', dispute_id: 'dsp-1', filed_at: '2026-09-30', status: 'in_review', parties: [B('Tenant', 'Mpangaji'), B('Landlord', 'Mwenye nyumba')], summary: B('Deposit deduction for a roof repair is disputed. The case is with mediation, not with enforcement.', 'Makato ya amana kwa kurekebisha paa yanagombewa. Kesi iko kwa usuluhishi, si utekelezaji.') },
];

export const COMPLIANCE_QUEUE = [
  { id: 'cq-1', unit_ref: 'IBMT-UNIT-2026-002312', flag: B('Address and meter mismatch', 'Kutolingana kwa anwani na mita'), raised_at: '2026-10-06', status: 'in_review', automatic_action: false, note: 'policy.humanReviewOnly' },
  { id: 'cq-2', unit_ref: 'IBMT-UNIT-2026-002318', flag: B('Rent well below the ward median', 'Kodi chini sana ya wastani wa kata'), raised_at: '2026-10-11', status: 'submitted', automatic_action: false, note: 'policy.humanReviewOnly' },
  { id: 'cq-3', unit_ref: 'IBMT-UNIT-2026-002321', flag: B('Registration claimed by a tenant, no landlord response', 'Usajili umedaiwa na mpangaji, hakuna jibu la mwenye nyumba'), raised_at: '2026-10-19', status: 'in_review', automatic_action: false, note: 'policy.humanReviewOnly' },
];

export const AGENT_LICENCES = [
  { agent_id: 'IBMT-AGT-2026-000044', name: 'Bahari Properties Ltd', licence_number: 'IBMT-AGT-2026-000044', status: 'active', expires_at: '2027-02-19', ibmt_business: true, wards: ['Mwananyamala', 'Kariakoo'] },
  { agent_id: 'IBMT-AGT-2026-000051', name: 'Msimbazi Agency', licence_number: 'IBMT-AGT-2026-000051', status: 'expired', expires_at: '2026-08-31', ibmt_business: true, wards: ['Ilala'] },
  { agent_id: 'IBMT-AGT-2026-000062', name: 'Upanga Homes', licence_number: null, status: 'pending', expires_at: null, ibmt_business: false, wards: ['Upanga'] },
];

export const AREA_STATS = {
  wards: [
    { ward_id: 'Mwananyamala', units: 412, registered_percent: 61, median_rent: 380000, occupancy_percent: 92 },
    { ward_id: 'Mabatini', units: 288, registered_percent: 47, median_rent: 320000, occupancy_percent: 89 },
    { ward_id: 'Kariakoo', units: 731, registered_percent: 38, median_rent: 460000, occupancy_percent: 95 },
    { ward_id: 'Ilala', units: 604, registered_percent: 44, median_rent: 350000, occupancy_percent: 90 },
  ],
  note: B('Area statistics are aggregates. They never reveal an address, a person or a GPS point.', 'Takwimu za eneo ni jumla. Hazionyeshi anwani, mtu au kipimo cha GPS kamwe.'),
};

export const RENT_TRA_STATS = {
  policy_version: '2026.1-proposed',
  units: { registered: 2035, eligible: 1240, awaiting_verification: 512 },
  withheld: 184000000,
  remitted: 141000000,
  stamp_duty: { assessed: 64000000, collected: 52000000 },
  exemptions: { low_rent_units: 318, note: 'policy.lowRentExemption' },
  trend: [
    { period: '2026-04', withheld: 12000000, remitted: 9400000 },
    { period: '2026-05', withheld: 16800000, remitted: 13100000 },
    { period: '2026-06', withheld: 21400000, remitted: 17200000 },
    { period: '2026-07', withheld: 26000000, remitted: 20100000 },
    { period: '2026-08', withheld: 32000000, remitted: 24800000 },
    { period: '2026-09', withheld: 38000000, remitted: 27600000 },
  ],
  notes: ['policy.tenantDetailsLimit', 'policy.committeeNeverTra', 'policy.retentionFromBackend', 'policy.policyVersioned'],
  access_note: B('Access to these figures is logged and visible to the subject in the access-history screen.', 'Ufikiaji wa takwimu hizi unarekodiwa na unaonekana kwa mhusika kwenye skrini ya historia ya ufikiaji.'),
};