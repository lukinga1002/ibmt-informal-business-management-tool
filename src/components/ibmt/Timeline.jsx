import { useT } from '@/i18n/I18nContext';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

/**
 * Ordered record of states as the backend reports them. Used for lease
 * signature state, permit decisions and payment statuses.
 */
export default function Timeline({ items = [], className, dense = false }) {
  const { tt } = useT();

  return (
    <ol className={cn('relative space-y-4 border-l border-border pl-5', className)}>
      {items.map((item, index) => (
        <li key={item.id || index} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              'absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background',
              item.status === 'success' ? 'bg-success' : item.status === 'danger' ? 'bg-destructive' : item.status === 'warning' ? 'bg-warning' : 'bg-navy-soft',
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">{tt(item.label)}</p>
            {item.statusKey && <StatusBadge status={item.statusKey} />}
          </div>
          {!dense && item.at && <p className="ibmt-num mt-0.5 text-[11px] text-muted-foreground">{item.at}</p>}
          {item.body && <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{tt(item.body)}</p>}
        </li>
      ))}
    </ol>
  );
}