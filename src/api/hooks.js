import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIBMT } from './IBMTContext';
import { newIdempotencyKey } from './ibmt';
import { isIBMTError } from './errors';

const IDLE = { status: 'idle', data: null, items: [], error: null, hasMore: false, cursor: null, collection: false };

/**
 * Read from the integration layer, with every required screen state derived
 * from the real answer — loading, empty, error, offline, permission denied,
 * session ended and stale record.
 */
export function useIBMTQuery(operationId, params = {}, options = {}) {
  const { invoke, offline, sessionState, dataVersion } = useIBMT();
  const { enabled = true, limit = 8, watchDataVersion = true } = options;
  const paramsKey = JSON.stringify(params || {});
  const [state, setState] = useState(IDLE);
  const [refetching, setRefetching] = useState(false);
  const requestRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor, { append = false } = {}) => {
      const ticket = requestRef.current + 1;
      requestRef.current = ticket;
      if (!append) setState((prev) => ({ ...prev, status: prev.data ? 'refreshing' : 'loading', error: null }));
      else setState((prev) => ({ ...prev, status: 'loading_more' }));

      try {
        const payload = await invoke(operationId, { ...JSON.parse(paramsKey), cursor, limit });
        if (requestRef.current !== ticket) return;
        const isCollection = Array.isArray(payload) || Array.isArray(payload?.items);
        const items = isCollection ? (Array.isArray(payload) ? payload : payload.items) : [];
        setState((prev) => ({
          status: 'ready',
          data: payload,
          items: append ? [...prev.items, ...items] : items,
          error: null,
          hasMore: Boolean(payload?.has_more),
          cursor: payload?.next_cursor ?? null,
          collection: isCollection,
        }));
      } catch (error) {
        if (requestRef.current !== ticket) return;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: isIBMTError(error) ? error : { kind: 'error', code: 'SERVER', message: String(error) },
        }));
      } finally {
        if (requestRef.current === ticket) setRefetching(false);
      }
    },
    [invoke, operationId, paramsKey, limit],
  );

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return;
    }
    fetchPage(null);
  }, [fetchPage, enabled, watchDataVersion ? dataVersion : null]);

  const reload = useCallback(() => fetchPage(null), [fetchPage]);
  const loadMore = useCallback(() => {
    if (!state.cursor) return;
    fetchPage(state.cursor, { append: true });
  }, [fetchPage, state.cursor]);

  const kind = useMemo(() => {
    if (!enabled) return 'idle';
    if (state.status === 'error') return state.error?.kind || 'error';
    if (sessionState === 'expired') return 'session';
    if (offline && state.status !== 'ready') return 'offline';
    if (state.status === 'loading' || state.status === 'loading_more') return 'loading';
    if (state.status === 'ready' && state.collection && state.items.length === 0) return 'empty';
    return 'ready';
  }, [enabled, state, offline, sessionState]);

  return {
    status: state.status,
    kind,
    data: state.data,
    items: state.items,
    error: state.error,
    hasMore: state.hasMore,
    loadingMore: state.status === 'loading_more',
    reload,
    loadMore,
    refetching,
    offline,
  };
}

/**
 * Write through the integration layer.
 *
 * The idempotency key is created once for an action and reused when the same
 * action is retried, so a retry cannot create a second payment. The key is
 * cleared only after a confirmed result or an explicit reset.
 */
export function useIBMTMutation(operationId) {
  const { invoke, notifyChange, sessionState } = useIBMT();
  const [state, setState] = useState({ status: 'idle', error: null, result: null });
  const keyRef = useRef(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (params = {}, { idempotencyKey } = {}) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      if (!keyRef.current) keyRef.current = idempotencyKey || newIdempotencyKey(operationId);
      setState({ status: 'saving', error: null, result: null });
      try {
        const result = await invoke(operationId, { ...params, idempotencyKey: keyRef.current });
        keyRef.current = null;
        setState({ status: 'success', error: null, result });
        notifyChange();
        return result;
      } catch (error) {
        const normalised = isIBMTError(error) ? error : { kind: 'error', code: 'SERVER', message: String(error) };
        setState({ status: 'error', error: normalised, result: null });
        return null;
      } finally {
        inFlight.current = false;
      }
    },
    [invoke, notifyChange, operationId],
  );

  // Retrying the same action keeps the key that was used the first time.
  const retry = useCallback((params = {}) => {
    const key = keyRef.current;
    return run(params, { idempotencyKey: key });
  }, [run]);

  const reset = useCallback(() => {
    keyRef.current = null;
    setState({ status: 'idle', error: null, result: null });
  }, []);

  return {
    run,
    retry,
    reset,
    status: state.status,
    saving: state.status === 'saving',
    error: state.error,
    fieldErrors: (state.error && state.error.fieldErrors) || {},
    result: state.result,
    sessionEnded: sessionState === 'expired',
    hasIdempotencyKey: Boolean(keyRef.current),
  };
}

/** One-shot read for a single record or configuration object. */
export function useIBMTRecord(operationId, params = {}, options = {}) {
  const query = useIBMTQuery(operationId, params, { ...options, limit: options.limit });
  return { ...query, record: query.data };
}