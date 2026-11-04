import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Module flags. One row in ModuleSettings decides which parked features are
 * served. The interface reads the same flags the backend enforces, so a hidden
 * link and a refused call always agree.
 *
 * Fail closed: no row, no flag, or a flag that is not exactly true reads as off.
 */
export const MODULE_FLAGS = {
  operator: 'operator_module',
  expenses: 'expenses_module',
  consumer: 'consumer_module',
  events: 'events_module',
  permits: 'permits_module',
  tra: 'tra_module',
  wardReports: 'ward_reports_module',
  ratings: 'ratings_module',
  contributions: 'contributions_module',
  propertyManager: 'property_manager_module',
  taxEstimates: 'tax_estimates_module',
};

async function loadModuleSettings() {
  const page = await base44.entities.ModuleSettings.list('-created_date', 1);
  const items = Array.isArray(page) ? page : page?.items || [];
  return items[0] || null;
}

export function useModuleSettings() {
  const query = useQuery({
    queryKey: ['module-settings'],
    queryFn: loadModuleSettings,
    staleTime: 60_000,
  });

  const settings = query.data || null;

  return {
    settings,
    isLoading: query.isLoading,
    isError: query.isError,
    isEnabled: (flag) => Boolean(settings && settings[flag] === true),
    refetch: query.refetch,
  };
}