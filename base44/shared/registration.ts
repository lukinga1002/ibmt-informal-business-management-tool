/**
 * Registration and verification rules shared by every R3 function.
 *
 * A registration is a claim. It is never proof of ownership, and no automated
 * check may reject it: duplicates are flagged for a mtaa officer, nothing more.
 */

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

export function reference(prefix) {
  const tail = String(Date.now()).slice(-6);
  const salt = Math.floor(Math.random() * 90 + 10);
  return `IBMT-${prefix}-2026-${tail}${salt}`;
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
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(buffer[0] % 1000000).padStart(6, '0');
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