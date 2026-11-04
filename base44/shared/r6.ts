/**
 * Shared rules for the R6 government dashboards.
 *
 * Three rules live here and nowhere else:
 *  - any cell describing fewer than five units is suppressed;
 *  - a district with no registered units is reported as not started;
 *  - a government export is built from aggregate counters only, never from a
 *    person, an address, a phone number or one landlord's rent.
 */
import { cleanText, isoNow } from './moneyOps.ts';

export const MIN_CELL = 5;

export const NOT_STARTED = { en: 'Not started', sw: 'Bado haijaanza' };

export const SUPPRESSED_LABEL = {
  en: 'Suppressed: fewer than 5 units',
  sw: 'Imefichwa: chini ya vitengo 5',
};

export function cellSuppressed(value) {
  return Number(value) < MIN_CELL;
}

/** A rate is only published when its denominator can be published too. */
export function rate(part, whole) {
  const total = Number(whole) || 0;
  if (total < MIN_CELL) return null;
  return Math.round(((Number(part) || 0) / total) * 1000) / 10;
}

export function monthKeys(count = 6) {
  const keys = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function monthOf(iso) {
  return String(iso || '').slice(0, 7);
}

/** Wards the council lists plus any ward a registered unit actually sits in. */
export function wardList(council, units) {
  const names = new Set();
  for (const ward of (council && council.wards) || []) {
    if (ward && ward.name) names.add(ward.name);
  }
  for (const unit of units || []) {
    if (unit.ward) names.add(unit.ward);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/**
 * The basis that lets a council see owner, address and meter for
 * property-rates work: an effective by-law, never a voluntary mode alone.
 */
export function activeByLaw(council) {
  const reference = cleanText(council && council.bylaw_reference);
  const mode = council && council.enforcement_mode;
  if (!reference || mode === 'voluntary') return null;
  const effective = council.bylaw_effective_date
    ? String(council.bylaw_effective_date).slice(0, 10)
    : null;
  const today = new Date().toISOString().slice(0, 10);
  if (effective && effective > today) return null;
  return { reference, effective_date: effective, mode };
}

export function csvText(header, rows) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    header.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');
}

export function fileStamp() {
  return isoNow().slice(0, 19).replace(/[:T]/g, '-');
}

/** Every decision about enforcement, and every export, is written here. */
export async function writeAudit(base44, entry) {
  try {
    const row = await base44.entities.AuditLog.create({ ...entry, occurred_at: isoNow() });
    return row && row.id ? row.id : null;
  } catch {
    return null;
  }
}