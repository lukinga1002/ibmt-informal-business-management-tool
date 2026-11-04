import { useCallback, useEffect, useState } from 'react';
import { callFn, fnError } from '@/lib/r4';

/**
 * One backend call, with the loading, empty and error states the screens show.
 * The answer is whatever the server returned — never a local guess.
 */
export function useFn(name, payload = {}, { enabled = true } = {}) {
  const key = JSON.stringify(payload || {});
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(async () => {
    setState((prev) => ({ status: prev.data ? 'refreshing' : 'loading', data: prev.data, error: '' }));
    try {
      const data = await callFn(name, JSON.parse(key));
      setState({ status: 'ready', data, error: '' });
    } catch (error) {
      setState({ status: 'error', data: null, error: fnError(error) });
    }
  }, [name, key]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [load, enabled]);

  return { ...state, reload: load };
}