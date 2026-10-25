/**
 * Live adapter — calls the external IBMT backend.
 *
 * There is no fallback to demonstration data here: a failed request surfaces a
 * real error state. Amounts, statuses and eligibility always come from the
 * backend response.
 */

import { IBMTError, errorFromResponse } from './errors';

const DEFAULT_TIMEOUT_MS = 20000;

function buildUrl(apiBase, path, params) {
  const used = new Set();
  const resolved = path.replace(/\{(\w+)\}/g, (_match, key) => {
    used.add(key);
    return encodeURIComponent(params[key] ?? '');
  });
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (used.has(key) || key === 'body' || key === 'version' || key === 'idempotencyKey') return;
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return `${apiBase.replace(/\/$/, '')}${resolved}${qs ? `?${qs}` : ''}`;
}

function normalize(body) {
  if (body === null || body === undefined) return null;
  if (Array.isArray(body)) return { items: body, next_cursor: null, has_more: false, total: body.length };
  if (body.data !== undefined && body.meta !== undefined) {
    const meta = body.meta || {};
    return {
      ...body.data,
      next_cursor: meta.next_cursor ?? null,
      has_more: Boolean(meta.has_more),
      total: meta.total ?? null,
    };
  }
  if (body.data !== undefined) return normalize(body.data);
  if (body.items !== undefined) return body;
  return body;
}

export async function liveInvoke({ apiBase, spec, id, params, idempotencyKey, getToken, onSessionExpired }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers = { Accept: 'application/json' };
  const method = spec.method || 'GET';
  if (method !== 'GET') headers['Content-Type'] = 'application/json';

  const token = getToken ? await getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  // Duplicate-sensitive writes carry one key, reused on every retry of the same action.
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
  if (params.version !== undefined && params.version !== null) headers['If-Match'] = String(params.version);

  let response;
  try {
    response = await fetch(buildUrl(apiBase, spec.path, params), {
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: method === 'GET' ? undefined : JSON.stringify(params.body || {}),
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      // A timeout is unconfirmed: never reported as success or as failure.
      throw new IBMTError({ code: 'TIMEOUT', message: `Request timed out: ${id}`, cause: error });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new IBMTError({ code: 'OFFLINE', message: 'No connection', cause: error });
    }
    throw new IBMTError({ code: 'NETWORK', message: `Network request failed: ${id}`, cause: error });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    const error = errorFromResponse(response.status, body, response.headers.get('x-request-id'));
    if (error.httpStatus === 401 && onSessionExpired) onSessionExpired();
    throw error;
  }

  return normalize(body);
}