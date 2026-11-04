import { useModuleSettings } from '@/api/modules';
import ParkedNotice from './ParkedNotice';

/**
 * Route-level parking. Wraps a parked screen so that opening its address
 * directly renders the notice instead of the feature. The same flag is
 * enforced again in the backend function, so this is the interface half of a
 * two-sided switch.
 */
export default function ModuleGate({ flag, children }) {
  const { isEnabled, isLoading } = useModuleSettings();

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-border border-t-navy" />
      </div>
    );
  }

  if (!isEnabled(flag)) return <ParkedNotice flag={flag} />;

  return children;
}