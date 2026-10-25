/**
 * The one integration layer every screen uses.
 *
 * Mode is explicit: 'mock' resolves to the demonstration adapter, 'api' calls
 * the external IBMT backend. A failed API request is never answered with
 * demonstration data — the failure is surfaced as a real state.
 */

import { OPERATIONS, IDEMPOTENT_OPERATIONS } from './operations';
import { IBMTError } from './errors';
import { mockInvoke, resetMockStore } from './mock';
import { liveInvoke } from './live';
import { platformInvoke } from './platform';

export { OPERATIONS, IDEMPOTENT_OPERATIONS };
export { IBMTError } from './errors';
export { resetMockStore } from './mock';

export function newIdempotencyKey(prefix = 'ibmt') {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

export function isIdempotent(operationId) {
  return IDEMPOTENT_OPERATIONS.includes(operationId);
}

export async function invokeOperation({
  operationId,
  params = {},
  mode = 'mock',
  apiBase,
  role = 'public',
  idempotencyKey = null,
  getToken = null,
  onSessionExpired = null,
}) {
  const spec = OPERATIONS[operationId];
  if (!spec) {
    throw new IBMTError({ code: 'SERVER', message: `Unknown operation: ${operationId}` });
  }

  const key = idempotencyKey || (spec.idempotent ? newIdempotencyKey(operationId) : null);

  if (mode === 'platform') {
    // The live IBMT backend on this platform. Same contract, real records;
    // a failure is never answered with demonstration data.
    return platformInvoke({ id: operationId, params });
  }

  if (mode === 'api') {
    if (!apiBase) {
      throw new IBMTError({ code: 'BAD_REQUEST', message: 'The IBMT API base URL is not configured' });
    }
    return liveInvoke({ apiBase, spec, id: operationId, params, idempotencyKey: key, getToken, onSessionExpired });
  }

  return mockInvoke({ id: operationId, params, idempotencyKey: key, role });
}