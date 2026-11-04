import { base44 } from '@/api/base44Client';

/** One place the lease and rent screens call our own backend functions. */
export async function callFn(name, payload) {
  const response = await base44.functions.invoke(name, payload);
  return response.data;
}

export function fnError(error) {
  return error?.response?.data?.message || error?.message || 'Ombi halikufanikiwa. Jaribu tena.';
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

export const METHOD_LABEL = {
  cash: 'Fedha taslimu',
  mobile_money: 'Mobile money',
  bank_transfer: 'Benki',
  other: 'Njia nyingine',
};

export const RECORD_LABEL = {
  pending: 'Inasubiri uthibitisho',
  confirmed: 'Imethibitishwa',
  disputed: 'Imepingwa',
  unconfirmed: 'Haijathibitishwa',
  recorded: 'Imeandikwa',
};

export const LEASE_LABEL = {
  draft: 'Rasimu',
  awaiting_tenant: 'Inasubiri mpangaji',
  awaiting_signature: 'Inasubiri sahihi',
  signed: 'Imesainiwa',
  amended: 'Imebadilishwa',
  terminated: 'Imefungwa',
};

export const ARREARS_LABEL = {
  paid: 'Imelipwa',
  unpaid: 'Haijalipwa',
  pending_confirmation: 'Inasubiri uthibitisho',
  disputed: 'Imepingwa',
  not_due: 'Bado haijafika',
};