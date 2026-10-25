import { CloudOff, RefreshCw } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Shows duplicate-sensitive writes saved on this device while it was offline,
 * and submits them — each with the idempotency key it was created with.
 */
export default function SyncQueueBanner() {
  const { t } = useT();
  const { queue, offline } = useIBMT();

  if (!queue.items.length) return null;

  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold bg-gold-soft/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <CloudOff className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-navy">{t('sync.title')}</p>
          <p className="text-[12px] text-muted-foreground">{t('sync.body', { count: queue.items.length })}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ibmt-tap gap-2"
        onClick={queue.sync}
        disabled={queue.syncing || offline}
      >
        <RefreshCw className={cn('h-4 w-4', queue.syncing && 'animate-spin')} aria-hidden="true" />
        {queue.syncing ? t('sync.syncing') : t('sync.now')}
      </Button>
    </div>
  );
}