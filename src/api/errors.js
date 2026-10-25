/**
 * Error taxonomy for the integration layer.
 *
 * The external IBMT backend decides what happened. This module only translates
 * its answers into the interface states the product requires, and it never
 * turns a failure into a success or into demonstration data.
 */

export const KIND = {
  LOADING: 'loading',
  OFFLINE: 'offline',
  ERROR: 'error',
  PERMISSION: 'permission',
  SESSION: 'session',
  CONFLICT: 'conflict',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  RATE_LIMITED: 'rate_limited',
};

const STATE_KEYS = {
  [KIND.OFFLINE]: { title: 'states.offlineTitle', body: 'states.offlineBody', retry: true },
  [KIND.ERROR]: { title: 'states.errorTitle', body: 'states.errorBody', retry: true },
  [KIND.PERMISSION]: { title: 'states.permissionTitle', body: 'states.permissionBody', retry: false },
  [KIND.SESSION]: { title: 'states.sessionTitle', body: 'states.sessionBody', retry: false },
  [KIND.CONFLICT]: { title: 'states.conflictTitle', body: 'states.conflictBody', retry: true },
  [KIND.VALIDATION]: { title: 'states.errorTitle', body: 'states.errorBody', retry: false },
  [KIND.NOT_FOUND]: { title: 'states.emptyTitle', body: 'states.emptyBody', retry: false },
  [KIND.RATE_LIMITED]: { title: 'states.errorTitle', body: 'states.errorBody', retry: true },
};

export class IBMTError extends Error {
  constructor({ code = 'SERVER', httpStatus = null, message = '', fieldErrors = null, requestId = null, retryAfter = null, cause = null }) {
    super(message || code);
    this.name = 'IBMTError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    this.cause = cause;
  }

  get kind() {
    return CODE_TO_KIND[this.code] || KIND.ERROR;
  }

  get stateKeys() {
    return STATE_KEYS[this.kind] || STATE_KEYS[KIND.ERROR];
  }
}

const CODE_TO_KIND = {
  OFFLINE: KIND.OFFLINE,
  NETWORK: KIND.OFFLINE,
  TIMEOUT: KIND.ERROR,
  UNAUTHORISED: KIND.SESSION,
  SESSION_EXPIRED: KIND.SESSION,
  FORBIDDEN: KIND.PERMISSION,
  JURISDICTION: KIND.PERMISSION,
  NOT_FOUND: KIND.NOT_FOUND,
  VALIDATION: KIND.VALIDATION,
  CONFLICT: KIND.CONFLICT,
  RATE_LIMITED: KIND.RATE_LIMITED,
  SERVER: KIND.ERROR,
  BAD_REQUEST: KIND.ERROR,
  NOT_CONNECTED: KIND.ERROR,
};

export function httpStatusToCode(status) {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'SESSION_EXPIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 412) return 'CONFLICT';
  if (status === 422) return 'VALIDATION';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER';
  return 'SERVER';
}

/**
 * Read a backend error body: { code, message, fields: { field: message }, request_id }.
 * Unknown shapes degrade to a generic server error, never to a success.
 */
export function errorFromResponse(status, body, requestId) {
  const payload = body && typeof body === 'object' ? body : {};
  const code = payload.code && CODE_TO_KIND[payload.code] ? payload.code : httpStatusToCode(status);
  return new IBMTError({
    code,
    httpStatus: status,
    message: payload.message || payload.error || `Request failed with status ${status}`,
    fieldErrors: payload.fields || null,
    requestId: payload.request_id || requestId || null,
    retryAfter: payload.retry_after || null,
  });
}

export function isIBMTError(value) {
  return value instanceof IBMTError;
}

/** Field errors are shown next to their input, never as a global success. */
export function fieldErrorsOf(error) {
  return (error && error.fieldErrors) || {};
}