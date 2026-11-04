import { fail } from './moneyOps.ts';

/**
 * Module parking.
 *
 * A parked module is switched off in ModuleSettings (one row, key
 * "module-settings"). Every parked backend function asks this helper before it
 * touches data, so a parked feature refuses the call even when it is invoked
 * directly, and not only when its screen is hidden.
 *
 * Fail closed: a missing settings row, or a flag that is not exactly true,
 * counts as off. Nothing here reads a request value — the caller cannot switch
 * a module on for itself.
 */
export const MODULE_FLAGS = [
  'operator_module',
  'expenses_module',
  'consumer_module',
  'events_module',
  'permits_module',
  'tra_module',
  'ward_reports_module',
  'ratings_module',
  'contributions_module',
  'property_manager_module',
  'tax_estimates_module',
];

const SETTINGS_ENTITY = 'ModuleSettings';

export async function getModuleSettings(base44) {
  try {
    const page = await base44.entities[SETTINGS_ENTITY].list('-created_date', 1);
    const items = Array.isArray(page) ? page : page?.items || [];
    return items[0] || null;
  } catch {
    return null;
  }
}

export async function isModuleEnabled(base44, flag) {
  if (!MODULE_FLAGS.includes(flag)) return false;
  const settings = await getModuleSettings(base44);
  return Boolean(settings && settings[flag] === true);
}

/**
 * Returns a refusal Response when the module is parked, or null when the call
 * may continue. Use as: `const blocked = await requireModule(base44, flag); if (blocked) return blocked;`
 */
export async function requireModule(base44, flag) {
  if (!MODULE_FLAGS.includes(flag)) {
    return fail(403, 'MODULE_OFF', 'This service is not available right now.');
  }
  const enabled = await isModuleEnabled(base44, flag);
  if (enabled) return null;
  return fail(403, 'MODULE_OFF', 'This service is not available right now.');
}