/**
 * Shared rules for the R5 agent, listing, deposit, condition and dispute flows.
 *
 * The commission cap, the licence check and the zero tenant fee are decided
 * here, never in the interface. Nothing in this module returns demo data.
 */
import { isoNow } from './moneyOps.ts';

/** A tenant is never charged by IBMT, an agent or a landlord. */
export const ZERO_FEE = {
  tenant_fee: 0,
  currency: 'TZS',
  label: {
    sw: 'Ada ya mpangaji: TZS 0',
    en: 'Tenant fee: TZS 0',
  },
  note: {
    sw: 'Mpangaji halipi ada yoyote: hakuna ada ya kuona nyumba, hakuna kamisheni.',
    en: 'A tenant pays no fee of any kind: no viewing fee and no commission.',
  },
};

export const DEPOSIT_STAGE1_NOTE = {
  sw: 'IBMT haishikilii pesa hii.',
  en: 'IBMT does not hold this money.',
};

export async function activePolicy(base44) {
  const page = await base44.asServiceRole.entities.PolicyRule.list({ sort: '-created_date', limit: 20 }).catch(() => ({ items: [] }));
  const rows = page.items || [];
  return rows.find((row) => row.status === 'confirmed') || rows.find((row) => row.status === 'placeholder') || null;
}

/** The cap in shillings: a share of one month's rent, per the policy in force. */
export function commissionCap(policy, monthlyRent) {
  const share = Number(policy && policy.commission_cap);
  const rent = Math.round(Number(monthlyRent) || 0);
  if (!Number.isFinite(share) || share <= 0 || rent <= 0) return 0;
  return Math.round(rent * share);
}

export function sixDigit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function otpChallenge(party) {
  return {
    party,
    code: sixDigit(),
    issued_at: isoNow(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

export function otpLive(otp) {
  if (!otp || !otp.code || !otp.expires_at) return false;
  return new Date(otp.expires_at).getTime() > Date.now();
}

export function isAdmin(user) {
  return Boolean(user && user.role === 'admin');
}

export function rolesOf(user) {
  const data = (user && user.data) || {};
  const list = Array.isArray(data.ibmt_roles) ? data.ibmt_roles : [];
  return [data.ibmt_role, ...list].filter(Boolean);
}

export function hasAnyRole(user, wanted) {
  const held = rolesOf(user);
  return wanted.some((role) => held.includes(role));
}

export async function notify(base44, { subjectId, kind, title, body, data = {}, dedupeKey = null }) {
  if (!subjectId) return false;
  try {
    await base44.asServiceRole.entities.Notification.create({
      subject_id: subjectId,
      kind,
      channel: 'in_app',
      title,
      body,
      data,
      dedupe_key: dedupeKey,
      sent_via: 'in_app',
    });
    return true;
  } catch {
    return false;
  }
}

/** Issue a signing challenge on any entity that carries an `otp` object. */
export async function issueOtp(base44, entity, id, party) {
  const otp = otpChallenge(party);
  await base44.asServiceRole.entities[entity].update(id, { otp });
  return { code: otp.code, expires_at: otp.expires_at, party: otp.party };
}

/** 'ok' | 'expired' | 'invalid' — the one place a signing code is judged. */
export function otpVerdict(otp, party, code) {
  if (!otp || otp.party !== party || !otpLive(otp)) return 'expired';
  if (String(code ?? '').trim() !== String(otp.code)) return 'invalid';
  return 'ok';
}

/** One page filtered to what the caller is a party to. */
export async function listForCaller(base44, entity, filter, limit, match) {
  const page = await base44.entities[entity].filter(filter, { sort: '-created_date', limit });
  return (page.items || []).filter(match);
}

export function requesterKey(req) {
  const header = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  return String(header).split(',')[0].trim();
}

/**
 * Public lookups are cheap to abuse. Each call is written to the access log and
 * refused once the same key passes the limit inside the window.
 */
export async function rateLimit(base44, key, limit = 20, windowSeconds = 300) {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const page = await base44.asServiceRole.entities.AccessLog
    .filter({ record_type: 'public_check', record_reference: key, occurred_at: { $gte: since } }, { limit: 200 })
    .catch(() => ({ items: [] }));
  const used = (page.items || []).length;
  if (used >= limit) {
    return { allowed: false, used, limit, retry_after_seconds: windowSeconds };
  }
  await base44.asServiceRole.entities.AccessLog
    .create({
      subject_id: 'public',
      actor_role: 'public',
      purpose: 'public_status_check',
      record_type: 'public_check',
      record_reference: key,
      occurred_at: isoNow(),
    })
    .catch(() => null);
  return { allowed: true, used: used + 1, limit, retry_after_seconds: windowSeconds };
}