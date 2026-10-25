import { useT } from '@/i18n/I18nContext';
import { statusMeta, toneClass } from '@/lib/status';
import { cn } from '@/lib/utils';

/**
 * Status is always a word plus an icon plus a tone — never colour alone.
 */
export default function StatusBadge({ status, label, className }) {
  const { t } = useT();
  const { Icon, tone } = statusMeta(status);
  const text = label || t(`status.${status}`);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-1 text-[12px] font-medium',
        toneClass(tone),
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
}

/** Small labelled chip used for policy versions, wards and references. */
export function MetaChip({ Icon, children, className }) {
  return (
    <span className={cn('ibmt-num inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground', className)}>
      {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}