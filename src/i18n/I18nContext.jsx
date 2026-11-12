import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { prefs } from '@/lib/prefs';
import { RESOURCES, interpolate } from './translate';

const I18nContext = createContext(null);

function lookup(resource, path) {
  return path.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), resource);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => prefs.getLang());

  const setLang = useCallback((next) => {
    const value = next === 'sw' ? 'sw' : 'en';
    prefs.setLang(value);
    setLangState(value);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
    // The browser tab title follows the chosen language too.
    const full = lookup(RESOURCES[lang], 'brand.full') || lookup(RESOURCES.en, 'brand.full');
    if (full) document.title = `IBMT — ${full}`;
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      // Dynamic record values can arrive as undefined or as a bilingual
      // {en, sw} object; neither is a translation key, so render them safely.
      if (key === null || key === undefined) return '';
      if (typeof key !== 'string') return key[lang] || key.en || '';
      // Swahili first, then English, then the key itself — a missing string is
      // never rendered as a blank space.
      const value = lookup(RESOURCES[lang], key) ?? lookup(RESOURCES.en, key);
      if (typeof value !== 'string') return key;
      return interpolate(value, vars);
    },
    [lang],
  );

  /**
   * Bilingual record content (names, descriptions, notices) travels with each
   * mock/API record as { en, sw }. tt() picks the active language.
   */
  const tt = useCallback(
    (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      return value[lang] || value.en || '';
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, tt, isSwahili: lang === 'sw' }),
    [lang, setLang, t, tt],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useT must be used inside I18nProvider');
  return context;
}