import en from './en.json';
import sw from './sw.json';
import { prefs } from '@/lib/prefs';

/**
 * The one translation lookup, for components (through I18nContext) and for
 * plain modules such as error formatting and label tables. A missing key falls
 * back to English and then to the key itself, never to a blank.
 */
export const RESOURCES = { en, sw };

export function currentLang() {
  return prefs.getLang() === 'sw' ? 'sw' : 'en';
}

function lookup(resource, path) {
  return path.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), resource);
}

export function hasKey(key, lang = currentLang()) {
  return typeof lookup(RESOURCES[lang], key) === 'string';
}

export function interpolate(text, vars) {
  if (!vars) return text;
  return Object.keys(vars).reduce((out, name) => out.replace(new RegExp(`\{${name}\}`, 'g'), String(vars[name])), text);
}

export function translate(key, vars, lang = currentLang()) {
  const value = lookup(RESOURCES[lang], key) ?? lookup(RESOURCES.en, key);
  return typeof value === 'string' ? interpolate(value, vars) : key;
}

/**
 * A label table whose values are translation keys. Reading a property returns
 * the text in the language in use at that moment, so existing `LABEL[status]`
 * call sites follow the language switch on the next render.
 */
export function labelTable(keys) {
  return new Proxy(keys, {
    get(target, prop) {
      if (typeof prop !== 'string' || !(prop in target)) return undefined;
      return translate(target[prop]);
    },
  });
}

/** Pick the active language from a server value carried as { sw, en }. */
export function pick(value, lang = currentLang()) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.en ?? '';
}
