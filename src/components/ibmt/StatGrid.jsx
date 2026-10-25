import { useT } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';

/**
 * Counters and figures as the backend returns them. `noteKey` is used where a
 * figure must never be read as something it is not — turnover against tax,
 * permit fees against tax, withheld against paid.
 */
export default function StatGrid({ items = [], columns = 4, className }) {
  const { t } = useT();

  return (
    <dl
      className={cn(
        'grid gap-px overflow-hidden rounded-lg border border-border bg-border',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key || item.label} className="bg-card px-4 py-4">
          <dt className="ibmt-kicker leading-snug">{item.label}</dt>
          <dd className={cn('mt-2 ibmt-num font-heading text-xl font-semibold text-navy', item.tone === 'muted' && 'text-muted-foreground')}>
            {item.value}
          </dd>
          {item.noteKey && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t(item.noteKey)}</p>}
          {item.note && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{item.note}</p>}
        </div>
      ))}
    </dl>
  );
}