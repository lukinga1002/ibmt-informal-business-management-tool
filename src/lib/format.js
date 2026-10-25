/**
 * Display formatting for the interface layer.
 * No calculations of tax, commission, stamp duty or allocation happen here:
 * every amount shown is a value returned by the integration layer.
 */

const LOCALE = { en: 'en-TZ', sw: 'sw-TZ' };

export function formatAmount(amount, currency = 'TZS', lang = 'en') {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  const value = Number(amount);
  const formatted = new Intl.NumberFormat(LOCALE[lang] || 'en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return currency === 'TZS' ? `TZS ${formatted}` : `${currency} ${formatted}`;
}

export function formatNumber(value, lang = 'en') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(LOCALE[lang] || 'en-TZ').format(Number(value));
}

export function formatPercent(value, lang = 'en') {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat(LOCALE[lang] || 'en-TZ', { maximumFractionDigits: 1 }).format(Number(value))}%`;
}

export function formatDate(value, lang = 'en') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE[lang] || 'en-TZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value, lang = 'en') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE[lang] || 'en-TZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Whole days between now and a backend-supplied deadline. */
export function daysUntil(value) {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

/** Mask an identifier for public screens: never a full reference in public view. */
export function maskRef(value, keep = 4) {
  if (!value) return '—';
  const text = String(value);
  if (text.length <= keep) return text;
  return `${'•'.repeat(Math.max(4, text.length - keep))}${text.slice(-keep)}`;
}