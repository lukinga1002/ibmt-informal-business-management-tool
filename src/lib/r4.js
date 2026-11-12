import { base44 } from '@/api/base44Client';
import { hasKey, labelTable, translate } from '@/i18n/translate';

/** One place the lease and rent screens call our own backend functions. */
export async function callFn(name, payload) {
  const response = await base44.functions.invoke(name, payload);
  return response.data;
}

/**
 * A backend error as a message in the language in use. Every error code the
 * functions return has a translation (errors.<CODE>); a validation error lists
 * the fields to check. The server's own English message is never shown, so the
 * screen never mixes languages.
 */
export function fnError(error) {
  const data = error?.response?.data || {};
  const code = typeof data.code === 'string' ? data.code : '';
  if (!error?.response && error?.message && /network|fetch/i.test(error.message)) return translate('errors.network');
  if (code === 'VALIDATION' && data.fields && typeof data.fields === 'object') {
    const names = Object.keys(data.fields).filter((name) => hasKey(`errors.fields.${name}`));
    if (names.length) {
      return translate('errors.checkFields', { fields: names.map((name) => translate(`errors.fields.${name}`)).join(', ') });
    }
  }
  if (code && hasKey(`errors.${code}`)) return translate(`errors.${code}`);
  return code ? translate('errors.genericWithCode', { code }) : translate('errors.generic');
}

/** A retried submit reuses its key, so one action can never create two records. */
export function newKey(prefix = 'r4') {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

export function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const METHOD_LABEL = labelTable({
  cash: 'labels.method.cash',
  mobile_money: 'labels.method.mobile_money',
  bank_transfer: 'labels.method.bank_transfer',
  other: 'labels.method.other',
});

export const RECORD_LABEL = labelTable({
  pending: 'labels.record.pending',
  confirmed: 'labels.record.confirmed',
  disputed: 'labels.record.disputed',
  unconfirmed: 'labels.record.unconfirmed',
  recorded: 'labels.record.recorded',
});

export const LEASE_LABEL = labelTable({
  draft: 'labels.lease.draft',
  awaiting_tenant: 'labels.lease.awaiting_tenant',
  awaiting_signature: 'labels.lease.awaiting_signature',
  signed: 'labels.lease.signed',
  amended: 'labels.lease.amended',
  terminated: 'labels.lease.terminated',
});

export const ARREARS_LABEL = labelTable({
  paid: 'labels.arrears.paid',
  unpaid: 'labels.arrears.unpaid',
  pending_confirmation: 'labels.arrears.pending_confirmation',
  disputed: 'labels.arrears.disputed',
  not_due: 'labels.arrears.not_due',
});
/**
 * An error kept in state as data, not text: { key, vars } for a screen message
 * or { err } for a backend error. Rendering it here, at draw time, means an
 * error on screen follows a language switch like everything else.
 */
export function errorText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.err) return fnError(value.err);
  if (value.key) return translate(value.key, value.vars);
  return '';
}
