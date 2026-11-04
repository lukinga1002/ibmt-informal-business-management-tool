/**
 * Interface preferences only.
 *
 * Nothing here is an authoritative business record. Mode, language, theme,
 * demonstration role and the IBMT API base URL are presentation settings kept
 * on this device. The external IBMT backend owns sessions, roles and records.
 *
 * The API base URL is a runtime setting rather than a build-time variable,
 * because the platform does not document arbitrary VITE_* variables in a
 * deployed frontend build. Never store credentials here.
 */

const KEYS = {
  mode: 'ibmt.pref.mode',
  lang: 'ibmt.pref.lang',
  role: 'ibmt.pref.role',
  theme: 'ibmt.pref.theme',
  apiBase: 'ibmt.pref.apiBase',
  mockScenario: 'ibmt.pref.mockScenario',
};

export const DEFAULT_API_BASE = 'https://api.ibmt.go.tz/v2';

/**
 * Swahili first is the rule for the rental pilot: landlords, tenants, agents and
 * mtaa officers read Swahili. Government oversight desks read English first.
 */
const EN_FIRST = ['council_official', 'district_commissioner', 'regional_commissioner', 'tra_admin', 'admin'];

export function defaultLangForRole(role) {
  return EN_FIRST.includes(role) ? 'en' : 'sw';
}

function read(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — preferences simply do not persist */
  }
}

export const prefs = {
  // The pilot reads the platform backend with seeded records. Demonstration
  // fixtures are never the default, and no screen may present them as live.
  getMode: () => {
    const value = read(KEYS.mode, 'platform');
    return ['api', 'platform'].includes(value) ? value : 'platform';
  },
  setMode: (mode) => write(KEYS.mode, ['api', 'platform'].includes(mode) ? mode : 'platform'),

  getLang: () => {
    const value = read(KEYS.lang, null);
    return value === 'sw' || value === 'en' ? value : defaultLangForRole(prefs.getRole());
  },
  setLang: (lang) => write(KEYS.lang, lang === 'sw' ? 'sw' : 'en'),
  clearLang: () => write(KEYS.lang, null),

  getRole: () => read(KEYS.role, 'public'),
  setRole: (role) => write(KEYS.role, role),

  getTheme: () => (read(KEYS.theme, 'light') === 'dark' ? 'dark' : 'light'),
  setTheme: (theme) => write(KEYS.theme, theme === 'dark' ? 'dark' : 'light'),

  getApiBase: () => read(KEYS.apiBase, DEFAULT_API_BASE),
  setApiBase: (url) => write(KEYS.apiBase, (url || '').trim() || DEFAULT_API_BASE),

  /** Demonstration-only scenario switch used by the mock adapter. */
  getMockScenario: () => read(KEYS.mockScenario, 'happy'),
  setMockScenario: (scenario) => write(KEYS.mockScenario, scenario || 'happy'),
};

export const PREF_KEYS = KEYS;