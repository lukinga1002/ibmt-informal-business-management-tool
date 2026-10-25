import { CloudOff, Lock, RefreshCw, Server, ShieldAlert, TriangleAlert, WifiOff } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ICONS = {
  offline: WifiOff,
  error: Server,
  permission: Lock,
  session: ShieldAlert,
  conflict: TriangleAlert,
  validation: TriangleAlert,
  rate_limited: CloudOff,
  not_found: CloudOff,
};

const SKEletons = {
  lines: (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  ),
  cards: (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((card) => (
        <div key={card} className="h-28 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  ),
  table: (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-12 animate-pulse rounded-md bg-muted/70" />
      ))}
    </div>
  ),
};

function StateBlock({ kind, title, body, onRetry, retryLabel, actions, className, compact }) {
  const Icon = ICONS[kind] || Server;

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-card/60 px-5 py-6',
        compact && 'py-4',
        className,
      )}
    >
      <span className="flex items-center gap-2 text-navy">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="font-heading text-[14px] font-semibold">{title}</span>
      </span>
      {body && <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">{body}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry} className="ibmt-tap gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}

/**
 * Renders every required screen state from the real answer of the integration
 * layer: loading, empty, error, offline, permission denied, session ended,
 * stale record. Nothing is turned into a success.
 */
export default function DataState({
  query,
  skeleton = 'lines',
  emptyTitle,
  emptyBody,
  emptyAction,
  loadingLabel,
  className,
  compact = false,
  children,
}) {
  const { t } = useT();
  const kind = query?.kind;

  if (kind === 'loading' || kind === 'idle') {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="ibmt-kicker">{loadingLabel || t('states.loadingTitle')}</p>
        {SKEletons[skeleton] || SKEletons.lines}
      </div>
    );
  }

  if (kind === 'empty') {
    return (
      <StateBlock
        kind="not_found"
        title={emptyTitle || t('states.emptyTitle')}
        body={emptyBody || t('states.emptyBody')}
        actions={emptyAction}
        className={className}
        compact={compact}
      />
    );
  }

  if (kind !== 'ready') {
    const keys = query?.error?.stateKeys || { title: 'states.errorTitle', body: 'states.errorBody', retry: true };
    return (
      <StateBlock
        kind={kind}
        title={t(keys.title)}
        body={
          query?.error?.message && kind === 'error'
            ? `${t(keys.body)} ${query.error.message}`
            : t(keys.body)
        }
        onRetry={keys.retry ? query.reload : null}
        retryLabel={t('common.retry')}
        actions={kind === 'session' ? query.onSessionAction : null}
        className={className}
        compact={compact}
      />
    );
  }

  return <div className={className}>{typeof children === 'function' ? children(query) : children}</div>;
}

export { StateBlock };