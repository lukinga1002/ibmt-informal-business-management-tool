/**
 * Registration and verification rules shared by every R3 function.
 *
 * A registration is a claim. It is never proof of ownership, and no automated
 * check may reject it: duplicates are flagged for a mtaa officer, nothing more.
 */

import { OTP_POLICY, RATE_LIMIT, addMinutes, maskPhone, sixDigitCode } from './r7.ts';

export const EVIDENCE_KINDS = [
  'title_deed',
  'residential_licence',
  'offer_letter',
  'mtaa_letter',
  'inheritance_letter',
  'other',
];

export const EVIDENCE_LABEL = {
  title_deed: { sw: 'Hati ya umiliki', en: 'Title deed' },
  residential_licence: { sw: 'Leseni ya makazi', en: 'Residential licence' },
  offer_letter: { sw: 'Barua ya mgao', en: 'Offer letter' },
  mtaa_letter: { sw: 'Barua ya Mtaa', en: 'Mtaa letter' },
  inheritance_letter: { sw: 'Barua ya urithi', en: 'Inheritance letter' },
  other: { sw: 'Nyingine', en: 'Other' },
};

export const DISCLAIMER = {
  sw: 'Usajili huu si uthibitisho wa umiliki.',
  en: 'Registration does not prove ownership.',
};

export const UNIT_TYPES = ['room', 'flat', 'house', 'shop'];

/** Every digit comes from the CSPRNG, never Math.random. */
export function randomDigits(count) {
  const buffer = new Uint32Array(1);
  let digits = '';
  while (digits.length < count) {
    crypto.getRandomValues(buffer);
    digits += String(buffer[0]).padStart(10, '0');
  }
  return digits.slice(0, count);
}

export function reference(prefix) {
  const tail = String(Date.now()).slice(-6);
  return `IBMT-${prefix}-2026-${tail}${randomDigits(2)}`;
}

export function certificateNumber(sequence) {
  return `IBMT-CERT-2026-${String(1000 + sequence).padStart(5, '0')}`;
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function newOtp() {
  return sixDigitCode();
}

/** A fresh salt per code: a shared constant salt lets one leak unlock every code. */
export function newSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hashOtp(salt, code) {
  return sha256(`${salt}:${String(code).trim()}`);
}

/**
 * The same rules as r7's checkOtp (five minutes, five attempts, fifteen-minute
 * lockout), applied to a salted hash instead of a stored plain code.
 */
export async function checkHashedOtp({ challenge, code, now = new Date().toISOString() }) {
  const current = challenge || {};
  const attemptsSoFar = Number(current.attempts) || 0;

  if (current.consumed_at) {
    return { ok: false, reason: 'already_used', attempts: attemptsSoFar, locked_until: current.locked_until || null };
  }
  if (current.locked_until && new Date(current.locked_until) > new Date(now)) {
    return { ok: false, reason: 'locked', attempts: attemptsSoFar, locked_until: current.locked_until };
  }
  if (current.expires_at && new Date(current.expires_at) <= new Date(now)) {
    return { ok: false, reason: 'expired', attempts: attemptsSoFar, locked_until: null };
  }

  const attempts = attemptsSoFar + 1;
  const candidate = await hashOtp(current.salt, code);

  if (candidate !== current.code_hash) {
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

/**
 * Issues a code and stores nothing but its salted hash, on the admin-only
 * OtpChallenge row. The code itself leaves this function once, to the party the
 * code was sent to; it is never written to a case record.
 */
export async function issueChallenge(base44, { subjectId, subjectRef, purpose, phone }) {
  const now = new Date().toISOString();
  const code = newOtp();
  const salt = newSalt();
  const challenge = await base44.asServiceRole.entities.OtpChallenge.create({
    subject_id: subjectId,
    purpose,
    subject_ref: subjectRef,
    phone_masked: maskPhone(phone),
    code_hash: await hashOtp(salt, code),
    salt,
    channel: 'in_app_demo',
    issued_at: now,
    expires_at: addMinutes(now, OTP_POLICY.ttl_minutes),
    attempts: 0,
  });
  return {
    code,
    challenge,
    expires_at: challenge.expires_at,
    ttl_minutes: OTP_POLICY.ttl_minutes,
    max_attempts: OTP_POLICY.max_attempts,
  };
}

/**
 * The R7 send limits, applied before anything is written: three codes per phone
 * per hour, and three per subject per hour.
 */
export async function issuanceAllowed(base44, { subjectId, phone }) {
  const page = await base44.asServiceRole.entities.OtpChallenge
    .filter({ subject_id: subjectId }, { sort: '-created_date', limit: 20 })
    .catch(() => ({ items: [] }));
  const rows = page.items || page;
  const now = new Date().toISOString();
  const withinHour = (stamps) =>
    (stamps || []).filter((value) => new Date(value).getTime() >= new Date(now).getTime() - 60 * 60000).length;

  if (withinHour(rows.map((row) => row.issued_at)) >= RATE_LIMIT.otp_per_user_per_hour) {
    return { allowed: false, reason: 'per_user' };
  }
  if (phone) {
    const masked = maskPhone(phone);
    const sameNumber = rows.filter((row) => row.phone_masked === masked);
    if (withinHour(sameNumber.map((row) => row.issued_at)) >= RATE_LIMIT.otp_per_phone_per_hour) {
      return { allowed: false, reason: 'per_phone' };
    }
  }
  return { allowed: true };
}

/** A landlord's name is shown on public verification, never their contact. */
export function maskName(name) {
  const clean = String(name || '').trim();
  if (!clean) return '—';
  const parts = clean.split(/\s+/);
  return parts
    .map((part, index) =>
      index === parts.length - 1 && parts.length > 1
        ? `${part.slice(0, 1)}${'•'.repeat(Math.max(part.length - 1, 1))}`
        : part,
    )
    .join(' ');
}

export function wardListOf(user) {
  const wards = user && user.data ? user.data.ward_ids : null;
  return Array.isArray(wards) ? wards : [];
}

export function servesWard(user, ward) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const role = user.data ? user.data.ibmt_role : null;
  if (role !== 'mtaa_officer') return false;
  return wardListOf(user).includes(ward);
}

export function normaliseAddress(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normaliseMeter(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** The only fields public verification ever returns. No address, no meter, no rent. */
export function publicCertificateView(record) {
  return {
    found: true,
    certificate_no: record.certificate_no,
    unit_ref: record.unit_ref,
    ward: record.ward,
    mtaa: record.mtaa,
    district: record.district,
    region: record.region,
    landlord_display: maskName(record.landlord_name),
    status: record.status,
    verified_on: record.certificate_issued_at || record.decided_at || null,
    decided_by: record.decided_by_name || null,
    disclaimer: DISCLAIMER,
  };
}