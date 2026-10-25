import { RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import { Button } from '@/components/ui/button';

/**
 * Connection and session banners.
 *
 * A dropped connection is stated plainly: nothing is claimed as submitted while
 * the connection is down. An ended session stops the work rather than
 * re-authenticating silently.
 */
export default function StateBanner() {
  const { t } = useT();
  const { offline, sessionState, reloadSession, isMock, role } = useIBMT();

  if (offline) {
    return (
      <div role="status" className="ibmt-no-print flex items-start gap-2 border-b border-warning/30 bg-warning/[0.08] px-4 py-2 text-[12px] text-warning sm:px-6">
        <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">{t('states.offlineTitle')}</strong> — {t('states.offlineBody')}
        </span>
      </div>
    );
  }

  if (sessionState === 'expired') {
    return (
      <div role="alert" className="ibmt-no-print flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/[0.06] px-4 py-2 text-[12px] text-destructive sm:px-6">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <strong className="font-semibold">{t('states.sessionTitle')}</strong> — {t('states.sessionBody')}
        </span>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={reloadSession}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {isMock ? t('roles.switch') : t('common.retry')}
        </Button>
      </div>
    );
  }

  if (sessionState === 'error') {
    return (
      <div role="alert" className="ibmt-no-print flex flex-wrap items-center gap-3 border-b border-border bg-muted px-4 py-2 text-[12px] text-muted-foreground sm:px-6">
        <span className="min-w-0 flex-1">
          {t('settings.session')}: {t('settings.signedOut')}
          {isMock ? ` · ${t('roles.label')}: ${role}` : ''}
        </span>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={reloadSession}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return null;
}