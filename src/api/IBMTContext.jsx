import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { invokeOperation } from './ibmt';
import { prefs, defaultLangForRole, DEFAULT_API_BASE } from '@/lib/prefs';

const IBMTContext = createContext(null);

/**
 * Owns three things only:
 *  - the data-source mode (demonstration or IBMT API);
 *  - the presentation settings around it (theme, API base URL, role in
 *    demonstration mode only);
 *  - the session state the backend reports.
 * It never holds credentials and never invents a session.
 */
export function IBMTProvider({ children }) {
  const [mode, setModeState] = useState(() => prefs.getMode());
  const [apiBase, setApiBaseState] = useState(() => prefs.getApiBase() || DEFAULT_API_BASE);
  const [role, setRoleState] = useState(() => prefs.getRole());
  const [theme, setThemeState] = useState(() => prefs.getTheme());
  const [scenario, setScenarioState] = useState(() => prefs.getMockScenario());
  const [session, setSession] = useState(null);
  const [sessionState, setSessionState] = useState('loading');
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const loadSession = useCallback(async () => {
    setSessionState('loading');
    try {
      const result = await invokeOperation({
        operationId: 'session',
        mode,
        apiBase,
        role,
        onSessionExpired: () => setSessionState('expired'),
      });
      setSession(result);
      setSessionState('ready');
    } catch (error) {
      setSession(null);
      setSessionState(error && error.code === 'SESSION_EXPIRED' ? 'expired' : 'error');
    }
  }, [mode, apiBase, role]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const invoke = useCallback(
    async (operationId, params = {}) =>
      invokeOperation({
        operationId,
        params,
        mode,
        apiBase,
        role: session?.role || role,
        idempotencyKey: params.idempotencyKey || null,
        getToken: async () => null,
        onSessionExpired: () => setSessionState('expired'),
      }),
    [mode, apiBase, role, session],
  );

  const setMode = useCallback((next) => {
    const value = next === 'api' ? 'api' : 'mock';
    prefs.setMode(value);
    setModeState(value);
  }, []);

  const setApiBase = useCallback((value) => {
    prefs.setApiBase(value);
    setApiBaseState(prefs.getApiBase());
  }, []);

  const setRole = useCallback((next) => {
    prefs.setRole(next);
    // Language follows the role unless the user has chosen one explicitly.
    prefs.clearLang();
    setRoleState(next);
  }, []);

  const setTheme = useCallback((next) => {
    prefs.setTheme(next);
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const setScenario = useCallback((next) => {
    prefs.setMockScenario(next);
    setScenarioState(next);
  }, []);

  const notifyChange = useCallback(() => setDataVersion((value) => value + 1), []);

  const signOut = useCallback(() => {
    setSession(null);
    setSessionState('expired');
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isMock: mode === 'mock',
      apiBase,
      setApiBase,
      role: session?.role || role,
      demoRole: role,
      setRole,
      scenario,
      setScenario,
      session,
      sessionState,
      reloadSession: loadSession,
      signOut,
      offline,
      invoke,
      dataVersion,
      notifyChange,
      theme,
      setTheme,
      defaultLangForRole,
    }),
    [mode, setMode, apiBase, setApiBase, role, setRole, scenario, setScenario, session, sessionState, loadSession, signOut, offline, invoke, dataVersion, notifyChange, theme, setTheme],
  );

  return <IBMTContext.Provider value={value}>{children}</IBMTContext.Provider>;
}

export function useIBMT() {
  const context = useContext(IBMTContext);
  if (!context) throw new Error('useIBMT must be used inside IBMTProvider');
  return context;
}