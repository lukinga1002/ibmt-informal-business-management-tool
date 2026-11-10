/**
 * R7 — money engine, ledger and controls (SIMULATION).
 *
 * Every figure here is computed on the server from rates that are passed in
 * from the active PolicyRule row. Nothing in this module touches a real payment
 * provider: the partner is a mock, and every screen says so.
 *
 * Rules encoded here:
 *  - whole TZS integers only, never decimals
 *  - split order: tax, agent commission, landlord service fee, remainder
 *  - every rounding remainder goes to the landlord
 *  - the tenant pays exactly rent, plus the deposit on the first payment
 *  - stage 1 runs no split and charges no fee
 *  - payment states move only through the transitions listed below
 */

export const MOCK_PARTNER = {
  provider: 'mock_partner',
  name: 'Mock partner (simulation)',
  /** A real provider gives this to us through app secrets. This one is a label. */
  secret: 'ibmt-simulation-signing-key-not-real',
  simulation: true,
};

export const STAGE = {
  stage1: 'stage1_record_only',
  stage2: 'stage2_partner',
  stage3: 'stage3_tax_split',
};

export const STAGE_LABEL = {
  stage1_record_only: { en: 'Stage 1 — record only', sw: 'Hatua 1 — kumbukumbu pekee' },
  stage2_partner: { en: 'Stage 2 — partner collects (simulation)', sw: 'Hatua 2 — mshirika hukusanya (majaribio)' },
  stage3_tax_split: { en: 'Stage 3 — tax split (simulation)', sw: 'Hatua 3 — mgawanyo wa kodi (majaribio)' },
};

export const SPLIT_KEY_LABEL = {
  council_fee: { sw: 'Ada ya huduma ya halmashauri', en: 'Council service fee' },
  partner_charge: { sw: 'Ada ya mshirika', en: 'Partner charge' },
  tax: { en: 'Tax (withheld)', sw: 'Kodi (inayozuiliwa)' },
  agent_commission: { en: 'Agent commission', sw: 'Kamisheni ya wakala' },
  service_fee: { en: 'Landlord service fee', sw: 'Ada ya huduma kwa mmiliki' },
  landlord_remainder: { en: 'Remainder to landlord', sw: 'Salio kwa mmiliki' },
  deposit: { en: 'Deposit (not IBMT money)', sw: 'Amana (si fedha za IBMT)' },
};

/** Whole shillings. A fraction of a shilling is never stored. */
export function wholeTZS(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number);
}

/**
 * The split. Rates arrive from the policy version (or from an explicit
 * placeholder set in a test), never from the browser.
 */
/** Floor the decimal rate before converting the result back to whole TZS. */
function share(amount, rate) {
  const decimal = String(rate ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0 || !/^(0(\.\d+)?|1(\.0+)?)$/.test(decimal)) {
    throw new Error('Invalid simulated amount or rate');
  }
  const decimals = (decimal.split('.')[1] || '').length;
  return Number(BigInt(amount) * BigInt(decimal.replace('.', '')) / (10n ** BigInt(decimals)));
}

export function incomeForSettlement(split, rules) {
  if (!split.runs) return { system_fee: 0, partner_rebate: 0 };
  if (!['share_of_rent', 'share_of_council_fee'].includes(rules.ibmt_fee_basis)) throw new Error('Unknown invoice basis');
  const basis = rules.ibmt_fee_basis === 'share_of_rent' ? split.rent_total : split.council_fee;
  const rebate = share(split.rent_total, rules.partner_rebate_rate);
  if (rebate > split.partner_charge) throw new Error('Partner rebate exceeds the partner charge');
  return { system_fee: share(basis, rules.ibmt_fee_rate), partner_rebate: rebate };
}

/** Use amounts from the original settled bill and invoice, including their rounding. */
export function reversalAdjustments(original) {
  const credit = value => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Missing or invalid original posting amount');
    return value === 0 ? 0 : -value;
  };
  return {
    council_fee: credit(original.council_fee),
    system_fee: credit(original.system_fee),
    partner_rebate: credit(original.partner_rebate),
  };
}

export function computeSplit(input = {}) {
  const rentTotal = wholeTZS(input.rent_total);
  if (rentTotal <= 0) throw new Error('The rent must be a positive whole amount');

  const months = Math.max(1, Math.round(Number(input.months) || 1));
  const monthlyRent = wholeTZS(input.monthly_rent == null ? rentTotal / months : input.monthly_rent);
  const newTenancy = input.new_tenancy !== false;
  const stage = STAGE[input.stage] || input.stage || STAGE.stage2;
  const rates = input.rates || {};

  const taxRate = Number(rates.tax_rate) || 0;
  const feeRate = stage === STAGE.stage2 ? 0 : Number(rates.service_fee_rate) || 0;
  const commissionShare = Number(rates.commission_share) || 0;
  const commissionCap = Number(rates.commission_cap) || 0;

  const deposit = newTenancy ? wholeTZS(input.deposit_amount) : 0;
  const tenantPays = rentTotal + deposit;

  // Stage 1: no split runs, and no service fee is charged.
  if (stage === STAGE.stage1) {
    return {
      stage,
      runs: false,
      rent_total: rentTotal,
      monthly_rent: monthlyRent,
      months,
      new_tenancy: newTenancy,
      deposit,
      tenant_pays: tenantPays,
      tax: 0,
      council_fee: 0,
      partner_charge: 0,
      agent_commission: 0,
      service_fee: 0,
      landlord_remainder: null,
      lines: [],
      balanced: true,
      note: {
        en: 'Stage 1 records only. No split runs and no service fee is charged.',
        sw: 'Hatua 1 huhifadhi kumbukumbu pekee. Hakuna mgawanyo na hakuna ada ya huduma.',
      },
    };
  }

  // Stage 3 adds the tax line. With stage 3 off there is no tax line at all.
  const tax = stage === STAGE.stage3 ? Math.floor(rentTotal * taxRate) : 0;
  const rawCommission = Math.floor(monthlyRent * commissionShare);
  const commission = newTenancy ? (commissionCap > 0 ? Math.min(rawCommission, commissionCap) : rawCommission) : 0;
  const serviceFee = Math.floor(rentTotal * feeRate);
  const councilFee = rates.council_fee_type === 'fixed'
    ? rates.council_fee_fixed_amount : share(rentTotal, rates.council_fee_rate);
  if (!Number.isSafeInteger(councilFee) || councilFee < 0) throw new Error('Invalid fixed council fee');
  const partnerCharge = share(rentTotal, rates.partner_charge_rate);
  const landlord = rentTotal - tax - councilFee - commission - partnerCharge - serviceFee;
  if (landlord < 0) throw new Error(`Simulation / Majaribio: upungufu / shortfall TZS ${-landlord}`);

  const lines = [];
  if (stage === STAGE.stage3) {
    lines.push({ key: 'tax', amount: tax, basis: `${(taxRate * 100).toFixed(2)}% of rent` });
  }
  if (councilFee) lines.push({ key: 'council_fee', amount: councilFee, basis: 'registered rent' });
  lines.push({
    key: 'agent_commission',
    amount: commission,
    basis: newTenancy ? `one period share, capped` : 'renewal — no commission',
  });
  if (partnerCharge) lines.push({ key: 'partner_charge', amount: partnerCharge, basis: 'rent only' });
  if (serviceFee) lines.push({ key: 'service_fee', amount: serviceFee, basis: `${(feeRate * 100).toFixed(2)}% of rent` });
  lines.push({ key: 'landlord_remainder', amount: landlord, basis: 'rent less the lines above' });

  const allocated = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    stage,
    runs: true,
    rent_total: rentTotal,
    monthly_rent: monthlyRent,
    months,
    new_tenancy: newTenancy,
    deposit,
    tenant_pays: tenantPays,
    tax,
    council_fee: councilFee,
    partner_charge: partnerCharge,
    agent_commission: commission,
    service_fee: serviceFee,
    landlord_remainder: landlord,
    lines,
    balanced: allocated === rentTotal,
    note: {
      en: 'Simulation. The rounding remainder always goes to the landlord.',
      sw: 'Majaribio. Salio la kuzungusha huenda kwa mmiliki kila wakati.',
    },
  };
}

/* ------------------------------------------------------------------ ledger */

export const ACCOUNTS = {
  partner_clearing: { en: 'Partner clearing (funds received)', sw: 'Malipo kwa mshirika (fedha zilizopokelewa)' },
  tenant_funds: { en: 'Tenant funds held for allocation', sw: 'Fedha za mpangaji zinazosubiri mgawanyo' },
  council_fee_payable: { en: 'Council service fee payable', sw: 'Ada ya huduma ya halmashauri' },
  partner_charge: { en: 'Partner charge', sw: 'Ada ya mshirika' },
  tax_payable: { en: 'Tax payable', sw: 'Kodi inayodaiwa' },
  agent_payable: { en: 'Agent commission payable', sw: 'Kamisheni ya wakala inayodaiwa' },
  platform_income: { en: 'IBMT service fee income', sw: 'Mapato ya ada ya huduma ya IBMT' },
  landlord_payable: { en: 'Landlord payable', sw: 'Inayodaiwa kwa mmiliki' },
  deposit_payable: { en: 'Deposit payable (held by landlord)', sw: 'Amana inayodaiwa (inashikiliwa na mmiliki)' },
  refunds: { en: 'Refunds issued', sw: 'Marejesho yaliyotolewa' },
};

export const ACCOUNT_BY_SPLIT_KEY = {
  council_fee: 'council_fee_payable',
  partner_charge: 'partner_charge',
  tax: 'tax_payable',
  agent_commission: 'agent_payable',
  service_fee: 'platform_income',
  landlord_remainder: 'landlord_payable',
};

/**
 * Double-entry lines for a settled payment. Debits must equal credits for the
 * whole posting group; the caller refuses to write an unbalanced group.
 */
export function buildSettlementLedger(split, paymentId = null) {
  const lines = [];
  let posting = 1;

  lines.push({ posting, account: 'partner_clearing', side: 'debit', amount: split.tenant_pays });
  lines.push({ posting, account: 'tenant_funds', side: 'credit', amount: split.tenant_pays });

  if (split.runs) {
    posting += 1;
    lines.push({ posting, account: 'tenant_funds', side: 'debit', amount: split.rent_total });
    for (const line of split.lines) {
      if (!line.amount) continue;
      lines.push({ posting, account: ACCOUNT_BY_SPLIT_KEY[line.key], side: 'credit', amount: line.amount });
    }

    if (split.deposit > 0) {
      posting += 1;
      lines.push({ posting, account: 'tenant_funds', side: 'debit', amount: split.deposit });
      lines.push({ posting, account: 'deposit_payable', side: 'credit', amount: split.deposit });
    }
  }

  const totals = ledgerTotals(lines);
  return { payment_id: paymentId, lines, ...totals };
}

export function ledgerTotals(lines) {
  let debits = 0;
  let credits = 0;
  for (const line of lines) {
    if (line.side === 'debit') debits += wholeTZS(line.amount);
    else credits += wholeTZS(line.amount);
  }
  return { debits, credits, balanced: debits === credits };
}

/** A correction is a mirror entry, never an edit of the original. */
export function reversingLines(lines, offset = 100) {
  return lines.map((line) => ({
    posting: wholeTZS(line.posting) + offset,
    account: line.account,
    side: line.side === 'debit' ? 'credit' : 'debit',
    amount: wholeTZS(line.amount),
  }));
}

/** A refund can never exceed what was actually paid. */
export function refundGuard({ paid, alreadyRefunded = 0, requested }) {
  const amount = wholeTZS(requested);
  const remaining = wholeTZS(paid) - wholeTZS(alreadyRefunded);
  if (amount <= 0) return { ok: false, reason: 'The refund must be a positive amount', remaining };
  if (amount > remaining) return { ok: false, reason: 'A refund cannot exceed the amount paid', remaining };
  return { ok: true, amount, remaining: remaining - amount };
}

/* ------------------------------------------------------------ payment states */

export const PAYMENT_STATES = ['initiated', 'pending', 'succeeded', 'failed', 'reversed'];

/** The only transitions that exist. Validated in this one place. */
export const TRANSITIONS = {
  initiated: ['pending', 'failed'],
  pending: ['succeeded', 'failed'],
  succeeded: ['reversed'],
  failed: [],
  reversed: [],
};

export function canTransition(from, to) {
  const allowed = TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function transitionError(from, to) {
  if (!PAYMENT_STATES.includes(String(to))) return `Unknown payment state: ${to}`;
  return `A payment cannot move from ${from} to ${to}`;
}

/** Credit is written only when a payment reaches succeeded. */
export function creditsOnSuccess(state) {
  return state === 'succeeded';
}

/**
 * The steps a move must pass through. A provider may report `succeeded`
 * directly from `initiated`, so the walk records `pending` in between — the
 * state history still shows every step, and no other shortcut is allowed.
 */
export function statePath(from, to) {
  if (from === to) return [];
  const direct = canTransition(from, to);
  if (direct) return [to];
  if (from === 'initiated' && to === 'succeeded' && canTransition('initiated', 'pending')) return ['pending', 'succeeded'];
  return null;
}

/* -------------------------------------------------------- mock partner rules */

export async function hmacHex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function signatureMessage(payload = {}) {
  return [payload.provider_reference || '', payload.payment_id || '', wholeTZS(payload.amount), payload.status || ''].join('|');
}

export async function verifySignature(secret, payload, signature) {
  const expected = await hmacHex(secret, signatureMessage(payload));
  const given = String(signature || '').trim().toLowerCase();
  if (expected.length !== given.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ given.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * The mock partner's own status endpoint. A real provider is asked separately,
 * so a callback's word is never taken on its own.
 */
export function mockProviderStatus({ provider_reference, amount }) {
  const value = wholeTZS(amount);
  const declined = String(provider_reference || '').endsWith('9');
  return {
    provider: MOCK_PARTNER.provider,
    provider_reference,
    status: declined ? 'failed' : 'succeeded',
    amount: value,
    checked_at: new Date().toISOString(),
    simulation: true,
  };
}

/* ----------------------------------------------------------------- OTP policy */

export const OTP_POLICY = {
  ttl_minutes: 5,
  max_attempts: 5,
  lockout_minutes: 15,
  resend_seconds: 60,
};

export const RATE_LIMIT = {
  otp_per_phone_per_hour: 3,
  otp_per_user_per_hour: 10,
  callbacks_per_minute: 10,
};

export function sixDigitCode() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(100000 + (buffer[0] % 900000));
}

export function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

export function issueOtp(now = new Date().toISOString()) {
  return {
    code: sixDigitCode(),
    issued_at: now,
    expires_at: addMinutes(now, OTP_POLICY.ttl_minutes),
    attempts: 0,
    locked_until: null,
  };
}

/**
 * One place that decides whether a code is still usable. Expiry, attempt count
 * and lockout are all applied here, never in the browser.
 */
export function checkOtp({ challenge, code, now = new Date().toISOString() }) {
  const current = challenge || {};
  if (current.locked_until && new Date(current.locked_until) > new Date(now)) {
    return { ok: false, reason: 'locked', locked_until: current.locked_until, attempts: current.attempts || 0 };
  }
  if (current.expires_at && new Date(current.expires_at) <= new Date(now)) {
    return { ok: false, reason: 'expired', attempts: current.attempts || 0, locked_until: null };
  }
  const attempts = (current.attempts || 0) + 1;
  if (String(current.code) !== String(code || '').trim()) {
    if (attempts >= OTP_POLICY.max_attempts) {
      return {
        ok: false,
        reason: 'too_many_attempts',
        attempts,
        locked_until: addMinutes(now, OTP_POLICY.lockout_minutes),
      };
    }
    return { ok: false, reason: 'mismatch', attempts, locked_until: null };
  }
  return { ok: true, reason: 'ok', attempts, locked_until: null };
}

export function withinRateLimit(timestamps, limit, windowMinutes, now = new Date().toISOString()) {
  const from = new Date(now).getTime() - windowMinutes * 60000;
  const recent = (timestamps || []).filter((value) => new Date(value).getTime() >= from);
  return { allowed: recent.length < limit, used: recent.length, limit, window_minutes: windowMinutes, recent };
}

/* -------------------------------------------------------------- masking / logs */

export function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 6) return '***';
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  return `${head}${'*'.repeat(Math.max(3, digits.length - 5))}${tail}`;
}

export function maskIdNumber(value) {
  const text = String(value || '').trim();
  if (text.length < 4) return '***';
  return `${'*'.repeat(Math.max(3, text.length - 4))}${text.slice(-4)}`;
}

export function maskEmail(value) {
  const text = String(value || '').trim();
  const at = text.indexOf('@');
  if (at < 1) return '***';
  return `${text.slice(0, 2)}${'*'.repeat(Math.max(2, at - 2))}${text.slice(at)}`;
}

/**
 * Anything written to a log passes through here. No full phone number, no ID
 * number, no e-mail address, no URL with an identifier in it.
 */
export function safeLog(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (/phone|msisdn/i.test(key)) out[key] = maskPhone(value);
    else if (/id_number|nida|nida_no|passport/i.test(key)) out[key] = maskIdNumber(value);
    else if (/email/i.test(key)) out[key] = maskEmail(value);
    else out[key] = value;
  }
  return out;
}

/* -------------------------------------------------------------- payout change */

export const PAYOUT = {
  cooling_off_hours: 24,
};

export function coolingOffEndsAt(now = new Date().toISOString()) {
  return addMinutes(now, PAYOUT.cooling_off_hours * 60);
}

export function payoutActivationGuard({ cooling_off_ends_at, now = new Date().toISOString() }) {
  if (!cooling_off_ends_at) return { ok: false, reason: 'The cooling-off period has not started' };
  if (new Date(cooling_off_ends_at) > new Date(now)) {
    return { ok: false, reason: 'The change is still inside its cooling-off period', cooling_off_ends_at };
  }
  return { ok: true, cooling_off_ends_at };
}

/* -------------------------------------------------------------- retention */

/**
 * Placeholder periods. None of these has been signed off by a lawyer or by the
 * commissioner: the screen says so, and the purge job refuses to run unless an
 * admin confirms it is a placeholder run.
 */
export const RETENTION_DEFAULTS = [
  {
    key: 'access_log',
    label: { en: 'Access history', sw: 'Historia ya ufikiaji' },
    entity: 'AccessLog',
    days: 730,
    keeps: { en: 'Two years, so a tenant can see who opened their records.', sw: 'Miaka miwili, ili mpangaji aone nani alifungua kumbukumbu zake.' },
  },
  {
    key: 'export_request',
    label: { en: 'Export requests', sw: 'Maombi ya kuhamisha data' },
    entity: 'ExportRequest',
    days: 365,
    keeps: { en: 'One year, as evidence that an export was granted.', sw: 'Mwaka mmoja, kama ushahidi kwamba uhamishaji uliruhusiwa.' },
  },
  {
    key: 'notification',
    label: { en: 'Notifications', sw: 'Taarifa' },
    entity: 'Notification',
    days: 180,
    keeps: { en: 'Six months, enough to answer a query about a message.', sw: 'Miezi sita, inatosha kujibu swali kuhusu ujumbe.' },
  },
];

/* -------------------------------------------------------------- worked tests */

/**
 * Stage 3 TEST inputs only, used by the worked examples and the admin demo
 * switch. A live run never sees them: it reads the active PolicyRule row.
 * Commission here is one month's rent, the Stage 1 cap.
 */
export const PLACEHOLDER_RATES = { tax_rate: 0.1, service_fee_rate: 0.01, commission_share: 1, commission_cap: 0 };

function splitOf(overrides) {
  return computeSplit({
    rent_total: 3000000,
    monthly_rent: 500000,
    months: 6,
    new_tenancy: true,
    deposit_amount: 0,
    stage: STAGE.stage3,
    rates: PLACEHOLDER_RATES,
    ...overrides,
  });
}

/** The four worked examples the brief names, plus rounding and ledger checks. */
export function runWorkedExamples() {
  const cases = [];

  const fresh = splitOf({});
  cases.push({
    name: 'New tenancy: 500,000 x 6',
    expected: { tax: 300000, agent_commission: 500000, service_fee: 30000, landlord_remainder: 2170000 },
    actual: { tax: fresh.tax, agent_commission: fresh.agent_commission, service_fee: fresh.service_fee, landlord_remainder: fresh.landlord_remainder },
  });

  const renewal = splitOf({ new_tenancy: false });
  cases.push({
    name: 'Renewal: commission is zero',
    expected: { tax: 300000, agent_commission: 0, service_fee: 30000, landlord_remainder: 2670000 },
    actual: { tax: renewal.tax, agent_commission: renewal.agent_commission, service_fee: renewal.service_fee, landlord_remainder: renewal.landlord_remainder },
  });

  const stage2 = splitOf({ stage: STAGE.stage2 });
  cases.push({
    name: 'Stage 3 off: tax zero and no tax line',
    expected: { tax: 0, tax_line: false, service_fee: 0 },
    actual: { tax: stage2.tax, tax_line: stage2.lines.some((line) => line.key === 'tax'), service_fee: stage2.service_fee },
  });

  const stage1 = splitOf({ stage: STAGE.stage1 });
  cases.push({
    name: 'Stage 1: no split, no service fee',
    expected: { runs: false, lines: 0, service_fee: 0 },
    actual: { runs: stage1.runs, lines: stage1.lines.length, service_fee: stage1.service_fee },
  });

  const odd = computeSplit({
    rent_total: 100003,
    monthly_rent: 33334,
    months: 3,
    new_tenancy: true,
    stage: STAGE.stage3,
    rates: { tax_rate: 0.1, service_fee_rate: 0.01, commission_share: 0.5, commission_cap: 100000 },
  });
  cases.push({
    name: 'Rounding remainder goes to the landlord',
    expected: { sum_equals_rent: true, remainder_whole: Number.isInteger(odd.landlord_remainder) },
    actual: { sum_equals_rent: odd.lines.reduce((sum, line) => sum + line.amount, 0) === odd.rent_total, remainder_whole: Number.isInteger(odd.landlord_remainder) },
  });

  const ledger = buildSettlementLedger(fresh, 'test');
  cases.push({
    name: 'Debits equal credits on a settled payment',
    expected: { balanced: true },
    actual: { balanced: ledger.balanced },
    detail: { debits: ledger.debits, credits: ledger.credits, lines: ledger.lines.length },
  });

  const depositRates = { ...PLACEHOLDER_RATES, commission_share: 0 };
  const withDeposit = computeSplit({
    rent_total: 500000,
    monthly_rent: 500000,
    months: 1,
    new_tenancy: true,
    deposit_amount: 500000,
    stage: STAGE.stage3,
    rates: depositRates,
  });
  cases.push({
    name: 'Deposit is added on the first payment only',
    expected: { tenant_pays: 1000000, renewal_tenant_pays: 500000 },
    actual: {
      tenant_pays: withDeposit.tenant_pays,
      renewal_tenant_pays: computeSplit({
        rent_total: 500000,
        monthly_rent: 500000,
        months: 1,
        new_tenancy: false,
        deposit_amount: 500000,
        stage: STAGE.stage3,
        rates: depositRates,
      }).tenant_pays,
    },
  });

  cases.push({
    name: 'State machine refuses an illegal transition',
    expected: { pending_to_succeeded: true, succeeded_to_pending: false, reversed_is_terminal: true },
    actual: {
      pending_to_succeeded: canTransition('pending', 'succeeded'),
      succeeded_to_pending: canTransition('succeeded', 'pending'),
      reversed_is_terminal: (TRANSITIONS.reversed || []).length === 0,
    },
  });

  cases.push({
    name: 'A refund cannot exceed the amount paid',
    expected: { over: false, partial: true },
    actual: {
      over: refundGuard({ paid: 100000, requested: 100001 }).ok,
      partial: refundGuard({ paid: 100000, requested: 40000 }).ok,
    },
  });

  cases.push({
    name: 'Phones and IDs are masked for logs',
    expected: { phone_hidden: true, id_hidden: true },
    actual: {
      phone_hidden: !maskPhone('255712345678').includes('7123456'),
      id_hidden: !maskIdNumber('19900101123456789012').includes('19900101'),
    },
  });

  const passed = cases.filter((item) => JSON.stringify(item.expected) === JSON.stringify(item.actual)).length;
  return { cases, passed, failed: cases.length - passed, total: cases.length };
}