/**
 * Module 1 fixtures — IBMT Events.
 * Pilot context: events-service businesses in Kinondoni and Ilala.
 * All fictional.
 */

const B = (en, sw) => ({ en, sw });

export const OPERATOR_BUSINESS = {
  business_id: 'IBMT-BIZ-2026-000913',
  name: 'Kilimanjaro Events & Decor',
  trading_name: B('Kilimanjaro Events', 'Kilimanjaro Events'),
  ward_id: 'Mwananyamala',
  council: 'Kinondoni Municipal Council',
  category: B('Events services — decoration, hire, catering coordination', 'Huduma za matukio — mapambo, kukodisha, uratibu wa chakula'),
  phone: '+255 7•• ••• 214',
  completed: false,
  onboarding_steps: [
    { id: 'identity', label: B('Identity and business details', 'Utambulisho na maelezo ya biashara'), state: 'complete' },
    { id: 'ward', label: B('Ward and council confirmation', 'Uthibitisho wa kata na halmashauri'), state: 'complete' },
    { id: 'payout', label: B('Payment partner registration', 'Usajili wa mshirika wa malipo'), state: 'in_review' },
    { id: 'receipts', label: B('First receipt issued to a customer', 'Risiti ya kwanza kwa mteja'), state: 'pending' },
    { id: 'privacy', label: B('Privacy and consent review', 'Mapitio ya faragha na ridhaa'), state: 'pending' },
  ],
};

export const OPERATOR_OVERVIEW = {
  business: { name: 'Kilimanjaro Events & Decor', ward_id: 'Mwananyamala', registration_status: 'active' },
  counters: [
    { key: 'turnover', label: B('Turnover recorded this month', 'Mauzo yaliyorekodiwa mwezi huu'), value: 'TZS 4,180,000', noteKey: 'policy.turnoverVsTax' },
    { key: 'receipts_awaiting', label: B('Receipts awaiting buyer confirmation', 'Risiti zinasubiri uthibitisho wa mteja'), value: '3' },
    { key: 'bookings_open', label: B('Bookings with a balance outstanding', 'Oda zenye salio'), value: '2' },
    { key: 'expenses_weak', label: B('Expenses with weak evidence', 'Matumizi yenye ushahidi hafifu'), value: '2', noteKey: 'policy.expenseEvidence' },
  ],
  next_actions: [
    { id: 'a1', label: B('Issue the August receipt for Mwenge Hall', 'Toa risiti ya Agosti kwa Mwenge Hall'), to: '/operator/receipts' },
    { id: 'a2', label: B('Attach supplier evidence to 2 expenses', 'Ambatisha ushahidi wa muuzaji kwa matumizi 2'), to: '/operator/money' },
    { id: 'a3', label: B('Answer the council query on permit 000338', 'Jibu swali la halmashauri kuhusu kibali 000338'), to: '/operator/operations' },
  ],
  policy_version: '2026.1-proposed',
};

export const RECEIPTS = [
  { id: 'rcp-4812', reference: 'IBMT-RCP-2026-004812', issued_on: '2026-10-12', buyer_name: 'Neema Sanga', buyer_ref: 'IBMT-CNS-000118', total: 1250000, status: 'confirmed', version: 3, fiscal_status: 'not_fiscal', fiscal_note: 'notices.fiscal', buyer_confirmation: 'confirmed', lines: [{ label: B('Hall decoration', 'Mapambo ya ukumbi'), amount: 850000 }, { label: B('Chair hire, 120', 'Kukodisha viti, 120'), amount: 400000 }], evidence: [{ id: 'ev-1', label: B('Signed delivery note', 'Hati ya kupeana iliyosainiwa'), grade: 'strong' }] },
  { id: 'rcp-4819', reference: 'IBMT-RCP-2026-004819', issued_on: '2026-10-18', buyer_name: 'Tumaini Sacco', buyer_ref: 'IBMT-CNS-000204', total: 2400000, status: 'awaiting_confirmation', version: 1, fiscal_status: 'not_fiscal', fiscal_note: 'notices.fiscal', buyer_confirmation: 'awaiting_confirmation', lines: [{ label: B('Annual dinner setup', 'Mapambo ya chakula cha mwaka'), amount: 2400000 }], evidence: [{ id: 'ev-2', label: B('Photograph of setup', 'Picha ya mapambo'), grade: 'moderate' }] },
  { id: 'rcp-4821', reference: 'IBMT-RCP-2026-004821', issued_on: '2026-10-21', buyer_name: 'Salma Rajabu', buyer_ref: 'IBMT-CNS-000311', total: 380000, status: 'issued', version: 1, fiscal_status: 'not_fiscal', fiscal_note: 'notices.fiscal', buyer_confirmation: 'issued', lines: [{ label: B('Chair hire, 40', 'Kukodisha viti, 40'), amount: 380000 }], evidence: [] },
  { id: 'rcp-4822', reference: 'IBMT-RCP-2026-004822', issued_on: '2026-10-22', buyer_name: 'Mbezi Beach Hotel', buyer_ref: 'IBMT-CNS-000088', total: 5200000, status: 'draft', version: 1, fiscal_status: 'not_fiscal', fiscal_note: 'notices.fiscal', buyer_confirmation: 'draft', lines: [{ label: B('Wedding decoration package', 'Kifurushi cha mapambo ya harusi'), amount: 5200000 }], evidence: [] },
  { id: 'rcp-4801', reference: 'IBMT-RCP-2026-004801', issued_on: '2026-09-28', buyer_name: 'Ilala Youth Group', buyer_ref: 'IBMT-CNS-000140', total: 640000, status: 'confirmed', version: 2, fiscal_status: 'not_fiscal', fiscal_note: 'notices.fiscal', buyer_confirmation: 'confirmed', lines: [{ label: B('Sound hire', 'Kukodisha sauti'), amount: 640000 }], evidence: [{ id: 'ev-3', label: B('Signed hire form', 'Fomu ya kukodisha iliyosainiwa'), grade: 'strong' }] },
  { id: 'rcp-4795', reference: 'IBMT-RCP-2026-004795', issued_on: '2026-09-14', buyer_name: 'Bw. Hamisi', buyer_ref: 'IBMT-CNS-000102', total: 210000, status: 'confirmed', version: 2, fiscal_status: 'not_fiscal', fiscal_note: 'notices.fiscal', buyer_confirmation: 'confirmed', lines: [{ label: B('Table hire', 'Kukodisha meza'), amount: 210000 }], evidence: [] },
];

export const EXPENSES = [
  { id: 'exp-1', supplier: 'Pamoja Fabrics', amount: 720000, incurred_on: '2026-10-04', evidence_grade: 'strong', evidence_label: B('Receipt and bank payment', 'Risiti na malipo ya benki'), evidence: [{ id: 'e1', label: B('Supplier receipt', 'Risiti ya muuzaji'), grade: 'strong' }] },
  { id: 'exp-2', supplier: 'Mwenge Transport', amount: 180000, incurred_on: '2026-10-07', evidence_grade: 'moderate', evidence_label: B('Signed delivery note only', 'Hati ya kupeana iliyosainiwa pekee'), evidence: [{ id: 'e2', label: B('Delivery note', 'Hati ya kupeana'), grade: 'moderate' }] },
  { id: 'exp-3', supplier: 'Ushindi Sound', amount: 450000, incurred_on: '2026-10-11', evidence_grade: 'strong', evidence_label: B('Invoice and mobile payment', 'Ankara na malipo ya simu'), evidence: [{ id: 'e3', label: B('Invoice', 'Ankara'), grade: 'strong' }] },
  { id: 'exp-4', supplier: 'Local labour (5 people)', amount: 250000, incurred_on: '2026-10-13', evidence_grade: 'weak', evidence_label: B('Handwritten note, no counterpart', 'Nota ya mkono, hakuna mwenzake'), evidence: [{ id: 'e4', label: B('Handwritten note', 'Nota ya mkono'), grade: 'weak' }] },
  { id: 'exp-5', supplier: 'Ward stall levy', amount: 60000, incurred_on: '2026-10-15', evidence_grade: 'moderate', evidence_label: B('Council acknowledgement slip', 'Slip ya uthibitisho ya halmashauri'), evidence: [] },
  { id: 'exp-6', supplier: 'Generator fuel', amount: 140000, incurred_on: '2026-10-20', evidence_grade: 'weak', evidence_label: B('No third-party evidence held', 'Hakuna ushahidi wa mtu wa tatu'), evidence: [] },
];

export const FINANCIAL_SUMMARY = {
  period: { from: '2026-10-01', to: '2026-10-31' },
  turnover: 4180000,
  turnover_note: 'policy.turnoverVsTax',
  tax: { amount: 0, label: B('No tax is calculated or collected in this module', 'Hakuna kodi inayohesabiwa au kukusanywa kwenye moduli hii') },
  permit_fees: { amount: 120000, label: B('Council permit fees, separate from TRA tax', 'Ada za vibali za halmashauri, tofauti na kodi ya TRA'), note: 'policy.permitVsTax' },
  expense_totals_by_grade: [
    { grade: 'strong', label: B('Strong evidence', 'Ushahidi imara'), amount: 1170000 },
    { grade: 'moderate', label: B('Moderate evidence', 'Ushahidi wa kati'), amount: 240000 },
    { grade: 'weak', label: B('Weak evidence', 'Ushahidi hafifu'), amount: 390000 },
  ],
  evidence_note: 'policy.expenseEvidence',
};

export const BOOKINGS = [
  {
    id: 'bkg-1', reference: 'IBMT-BKG-2026-002201', counterparty_name: 'Tumaini Sacco', counterparty_ref: 'IBMT-CNS-000204',
    event_date: '2026-11-08', agreed_total: 4800000, deposit: 1500000, balance: 3300000, status: 'pending',
    agreed_terms: B('Decoration, sound and 150 chairs, set up by 16:00 the day before.', 'Mapambo, sauti na viti 150, vilianze kuwekwa kabla ya saa 22:00 siku moja kabla.'),
    deliverables: [
      { id: 'd1', label: B('Stage backdrop', 'Mandhari ya jukwaa'), state: 'completed' },
      { id: 'd2', label: B('Sound system', 'Mfumo wa sauti'), state: 'scheduled' },
      { id: 'd3', label: B('150 chairs', 'Viti 150'), state: 'scheduled' },
    ],
    deposit_records: [{ id: 'dep-1', amount: 1500000, received_at: '2026-10-18', method: B('Mobile money', 'Fedha za simu'), reference: 'DEP-2026-118' }],
  },
  {
    id: 'bkg-2', reference: 'IBMT-BKG-2026-002188', counterparty_name: 'Neema Sanga', counterparty_ref: 'IBMT-CNS-000118',
    event_date: '2026-10-12', agreed_total: 1250000, deposit: 400000, balance: 850000, status: 'completed',
    agreed_terms: B('Hall decoration and chair hire, delivered as agreed.', 'Mapambo ya ukumbi na kukodisha viti, kama yalivyokubaliwa.'),
    deliverables: [
      { id: 'd4', label: B('Hall decoration', 'Mapambo ya ukumbi'), state: 'completed' },
      { id: 'd5', label: B('120 chairs', 'Viti 120'), state: 'completed' },
    ],
    deposit_records: [{ id: 'dep-2', amount: 400000, received_at: '2026-10-02', method: B('Mobile money', 'Fedha za simu'), reference: 'DEP-2026-094' }],
  },
];

export const PERMITS = [
  {
    id: 'pmt-338', reference: 'IBMT-PMT-2026-000338', event_date: '2026-11-08', venue: B('Mwenge Social Hall', 'Ukumbi wa Mwenge'),
    ward_id: 'Mwananyamala', status: 'queried', version: 2, fee_amount: 120000,
    decision_reason: B('Confirm the expected attendance and the sound curfew time.', 'Thibitisha idadi inayotarajiwa ya wageni na muda wa kumaliza muziki.'),
    decided_at: '2026-10-23T14:31:00Z', decided_by: B('Ilala permits desk', 'Dawati la vibali la Ilala'),
    attachments: [{ id: 'pa-1', label: B('Venue booking letter', 'Barua ya uhifadhi wa ukumbi'), grade: 'strong' }],
  },
  {
    id: 'pmt-329', reference: 'IBMT-PMT-2026-000329', event_date: '2026-09-27', venue: B('Mwananyamala Open Ground', 'Uwanja wa wazi wa Mwananyamala'),
    ward_id: 'Mwananyamala', status: 'approved', version: 3, fee_amount: 90000,
    decision_reason: B('Approved with the standard sound curfew.', 'Imeidhinishwa na kikomo cha kawaida cha muziki.'),
    decided_at: '2026-09-15T10:02:00Z', decided_by: B('Ilala permits desk', 'Dawati la vibali la Ilala'), attachments: [],
  },
  {
    id: 'pmt-344', reference: 'IBMT-PMT-2026-000344', event_date: '2026-12-12', venue: B('Kariakoo Rooftop', 'Paa la Kariakoo'),
    ward_id: 'Kariakoo', status: 'in_review', version: 1, fee_amount: 150000,
    decision_reason: null, decided_at: null, decided_by: null,
    attachments: [{ id: 'pa-2', label: B('Fire safety declaration', 'Tamko la usalama wa moto'), grade: 'moderate' }],
  },
];

export const COMPLAINTS = [
  {
    id: 'cmp-1', reference: 'IBMT-CMP-2026-000144', subject: B('Sound equipment arrived late', 'Vifaa vya sauti vilichelewa'),
    filed_at: '2026-10-13', status: 'in_review', visibility: 'private',
    filed_by_ref: 'IBMT-CNS-000118', about_ref: 'IBMT-RCP-2026-004812',
    body: B('The sound system arrived two hours after the agreed time.', 'Mfumo wa sauti ulifika saa mbili baada ya muda uliokubaliwa.'),
    replies: [{ id: 'rep-1', by: B('Provider', 'Mtoa huduma'), at: '2026-10-14T09:20:00Z', body: B('The van broke down in Mwenge. We refunded the transport charge.', 'Gari iliharibika Mwenge. Tulirudisha malipo ya usafiri.') }],
  },
  {
    id: 'cmp-2', reference: 'IBMT-CMP-2026-000151', subject: B('Deposit not refunded after cancellation', 'Amana haikurudishwa baada ya kughairi'),
    filed_at: '2026-10-20', status: 'submitted', visibility: 'private',
    filed_by_ref: 'IBMT-CNS-000311', about_ref: 'IBMT-BKG-2026-002188',
    body: B('The event was cancelled 12 days ahead but the deposit was not returned.', 'Hafla ilighairiwa siku 12 mapema lakini amana haikurudishwa.'),
    replies: [],
  },
];

export const RATINGS = [
  { id: 'rat-1', receipt_reference: 'IBMT-RCP-2026-004812', score: 5, comment: B('Setup was exactly as agreed and on time.', 'Mapambo yalikuwa kama yalivyokubaliwa na kwa wakati.'), moderation_status: 'awaiting_confirmation', published: false, submitted_at: '2026-10-13' },
  { id: 'rat-2', receipt_reference: 'IBMT-RCP-2026-004819', score: 3, comment: B('Good decoration, sound was late.', 'Mapambo mazuri, sauti ilichelewa.'), moderation_status: 'in_review', published: false, submitted_at: '2026-10-19' },
  { id: 'rat-3', receipt_reference: 'IBMT-RCP-2026-004801', score: 4, comment: B('Reliable for the youth group event.', 'Inaaminika kwa hafla ya kikundi cha vijana.'), moderation_status: 'approved', published: true, submitted_at: '2026-09-30' },
];

export const COMMITTEE_LEDGER = {
  excluded_from_turnover: true,
  note: 'policy.giftsExcluded',
  items: [
    { id: 'cl-1', kind: 'contribution_in', counterparty: B('Committee members, October', 'Wanakamati, Oktoba'), amount: 300000, occurred_on: '2026-10-03', noteKey: 'term.committee' },
    { id: 'cl-2', kind: 'contribution_in', counterparty: B('Welfare collection, September', 'Mchango wa ustawi, Septemba'), amount: 250000, occurred_on: '2026-09-05', noteKey: 'term.committee' },
    { id: 'cl-3', kind: 'vendor_payment', counterparty: B('Bahari Tent Hire', 'Bahari Tent Hire'), amount: 180000, occurred_on: '2026-10-06', noteKey: 'common.details' },
    { id: 'cl-4', kind: 'contribution_in', counterparty: B('Chair rental refund pool', 'Mfuko wa marejesho ya viti'), amount: 120000, occurred_on: '2026-09-22', noteKey: 'term.committee' },
    { id: 'cl-5', kind: 'vendor_payment', counterparty: B('Mama Asha Catering', 'Mama Asha Catering'), amount: 220000, occurred_on: '2026-09-28', noteKey: 'common.details' },
  ],
};

export const WARD_REPORTS = [
  { id: 'wr-1', ward_id: 'Mwananyamala', period: '2026-09', submitted_by: B('Mtaa executive officer', 'Afisa mtendaji wa mtaa'), status: 'in_review', submitted_at: '2026-10-04', flags: [{ id: 'f1', label: B('Two businesses reported no receipts', 'Biashara mbili hazikutoa risiti'), automatic_action: false }] },
  { id: 'wr-2', ward_id: 'Kariakoo', period: '2026-09', submitted_by: B('Mtaa executive officer', 'Afisa mtendaji wa mtaa'), status: 'approved', submitted_at: '2026-10-02', flags: [] },
  { id: 'wr-3', ward_id: 'Ilala', period: '2026-08', submitted_by: B('Mtaa executive officer', 'Afisa mtendaji wa mtaa'), status: 'queried', submitted_at: '2026-09-06', flags: [{ id: 'f2', label: B('Receipt count does not match the summary', 'Idadi ya risiti hailingani na muhtasari'), automatic_action: false }] },
];

export const COUNCIL_OVERVIEW = {
  jurisdiction: { region: 'Dar es Salaam', wards: ['Mwananyamala', 'Kariakoo', 'Ilala'], council: 'Ilala Municipal Council' },
  counters: [
    { key: 'permits_pending', label: B('Permits awaiting a decision', 'Vibali vinasubiri uamuzi'), value: '4' },
    { key: 'complaints_open', label: B('Private complaints open', 'Malalamiko ya faragha yaliyo wazi'), value: '3' },
    { key: 'ratings_queue', label: B('Ratings awaiting moderation', 'Kadirio yanasubiri kusimamiwa'), value: '2' },
    { key: 'ward_reports', label: B('Ward reports awaiting human review', 'Ripoti za kata zinasubiri mapitio ya mtu'), value: '2' },
  ],
  queue: [
    { id: 'q1', kind: 'permit', reference: 'IBMT-PMT-2026-000344', ward_id: 'Kariakoo', age_days: 3, status: 'in_review' },
    { id: 'q2', kind: 'ward_report', reference: 'WR-2026-09-KARIAKOO', ward_id: 'Kariakoo', age_days: 5, status: 'in_review' },
    { id: 'q3', kind: 'rating', reference: 'IBMT-RAT-2026-000092', ward_id: 'Mwananyamala', age_days: 2, status: 'awaiting_confirmation' },
    { id: 'q4', kind: 'complaint', reference: 'IBMT-CMP-2026-000151', ward_id: 'Ilala', age_days: 1, status: 'submitted' },
  ],
  calendar: [
    { id: 'cal-1', date: '2026-11-08', label: B('Tumaini Sacco annual dinner', 'Chakula cha mwaka cha Tumaini Sacco'), venue: B('Mwenge Social Hall', 'Ukumbi wa Mwenge'), ward_id: 'Mwananyamala', permit_ref: 'IBMT-PMT-2026-000338', status: 'queried' },
    { id: 'cal-2', date: '2026-11-22', label: B('Kariakoo trade fair opening', 'Ufunguzi wa maonesho ya Kariakoo'), venue: B('Kariakoo Grounds', 'Uwanja wa Kariakoo'), ward_id: 'Kariakoo', permit_ref: 'IBMT-PMT-2026-000351', status: 'approved' },
    { id: 'cal-3', date: '2026-12-12', label: B('Rooftop concert', 'Tamasha la paa'), venue: B('Kariakoo Rooftop', 'Paa la Kariakoo'), ward_id: 'Kariakoo', permit_ref: 'IBMT-PMT-2026-000344', status: 'in_review' },
  ],
};

export const COUNCIL_FEES = {
  period: { from: '2026-09-01', to: '2026-09-30' },
  permit_fees: 1840000,
  permit_note: 'policy.permitVsTax',
  tax_note: B('No tax figure is shown here. Council permit fees are not tax revenue.', 'Hakuna kiasi cha kodi kinachoonyeshwa hapa. Ada za vibali za halmashauri si mapato ya kodi.'),
  by_ward: [
    { ward_id: 'Mwananyamala', fees: 760000, permits: 6 },
    { ward_id: 'Kariakoo', fees: 640000, permits: 5 },
    { ward_id: 'Ilala', fees: 440000, permits: 4 },
  ],
};

export const TRA_OVERVIEW = {
  counters: [
    { key: 'businesses', label: B('Businesses with permitted details', 'Biashara zenye maelezo yaliyoruhusiwa'), value: '128' },
    { key: 'records', label: B('Records complete enough for an estimate', 'Kumbukumbu zilizokamilika kwa makadirio'), value: '96' },
    { key: 'reviewed', label: B('Records under human review', 'Kumbukumbu zilizo chini ya mapitio ya mtu'), value: '7' },
  ],
  projection_note: B('Business turnover is not government tax revenue. Estimates below are produced by the backend from its own rules.', 'Mauzo ya biashara si Mapato ya kodi ya serikali. Makadirio hapa chini yanatolewa na backend kwa kanuni zake.'),
  policy_version: '2026.1-proposed',
};

export const TRA_BUSINESSES = [
  { business_id: 'IBMT-BIZ-2026-000913', name: 'Kilimanjaro Events & Decor', category: B('Events services', 'Huduma za matukio'), ward_id: 'Mwananyamala', registration_status: 'active', permitted_fields: ['category', 'ward', 'registration_status'] },
  { business_id: 'IBMT-BIZ-2026-000927', name: 'Ilala Sound & Lighting', category: B('Equipment hire', 'Kukodisha vifaa'), ward_id: 'Ilala', registration_status: 'active', permitted_fields: ['category', 'ward', 'registration_status'] },
  { business_id: 'IBMT-BIZ-2026-000944', name: 'Kariakoo Decorators', category: B('Events services', 'Huduma za matukio'), ward_id: 'Kariakoo', registration_status: 'unverified', permitted_fields: ['category', 'ward', 'registration_status'] },
  { business_id: 'IBMT-BIZ-2026-000955', name: 'Msimbazi Catering', category: B('Catering coordination', 'Uratibu wa chakula'), ward_id: 'Ilala', registration_status: 'active', permitted_fields: ['category', 'ward', 'registration_status'] },
];

export const TRA_ESTIMATES = {
  period: { from: '2026-07-01', to: '2026-09-30' },
  policy_version: '2026.1-proposed',
  estimates: [
    {
      id: 'est-1', label: B('Presumptive estimate, events services, Kinondoni', 'Makadirio ya kudhaniwa, huduma za matukio, Kinondoni'), amount: 21600000,
      rule_text: B('Applied by the backend using the published band for the declared category and period. The interface displays the rule; it does not apply it.', 'Inatumika na backend kwa kutumia kiwango kilichochapishwa kwa aina iliyotangazwa na kipindi. Kiolesura kinaonyesha kanuni; hakikitekeleza.'),
      inputs: [
        { label: B('Declared category', 'Aina iliyotangazwa'), value: B('Events services', 'Huduma za matukio') },
        { label: B('Ward band', 'Kiwango cha kata'), value: 'Kinondoni — band 2' },
        { label: B('Records used', 'Kumbukumbu zilizotumika'), value: '11 complete records' },
      ],
    },
    {
      id: 'est-2', label: B('Presumptive estimate, equipment hire, Ilala', 'Makadirio ya kudhaniwa, kukodisha vifaa, Ilala'), amount: 14400000,
      rule_text: B('Returned with its inputs so the estimate can be challenged with evidence.', 'Inarudishwa na vigezo vyake ili makadirio yaweze kupingwa kwa ushahidi.'),
      inputs: [
        { label: B('Declared category', 'Aina iliyotangazwa'), value: B('Equipment hire', 'Kukodisha vifaa') },
        { label: B('Ward band', 'Kiwango cha kata'), value: 'Ilala — band 1' },
        { label: B('Records used', 'Kumbukumbu zilizotumika'), value: '6 complete records' },
      ],
    },
  ],
  note: B('Estimates are produced and explained by the backend. Committee contributions are excluded from every TRA view.', 'Makadirio yanatolewa na kuelezwa na backend. Michango ya kamati haijumuishwi kwenye maoni yoyote ya TRA.'),
};

export const TRA_QUALITY = {
  note: B('Record quality only. No individual enforcement data is shown to TRA here.', 'Ubora wa kumbukumbu pekee. Hakuna data ya utekelezaji ya mtu binafsi inayoonyeshwa kwa TRA hapa.'),
  series: [
    { period: '2026-04', complete_records: 42, reviewed: 6 },
    { period: '2026-05', complete_records: 51, reviewed: 5 },
    { period: '2026-06', complete_records: 58, reviewed: 4 },
    { period: '2026-07', complete_records: 66, reviewed: 8 },
    { period: '2026-08', complete_records: 79, reviewed: 6 },
    { period: '2026-09', complete_records: 96, reviewed: 7 },
  ],
};