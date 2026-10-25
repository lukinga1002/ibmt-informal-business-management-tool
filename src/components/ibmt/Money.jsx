import { useT } from '@/i18n/I18nContext';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Money display. The amount always arrives from the integration layer; nothing
 * on screen is calculated here. A `note` states the source or the policy the
 * figure depends on.
 */
export default function Money({ amount, currency = 'TZS', note, noteKey, strong = false, muted = false, className, signed = false }) {
  const { t, lang } = useT();
  const value = Number(amount ?? 0);
  const display = formatAmount(value, currency, lang);

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span
        className={cn(
          'ibmt-num',
          strong ? 'font-heading text-[17px] font-semibold' : 'text-[14px]',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {signed && value > 0 ? '+ ' : ''}
        {display}
      </span>
      {(note || noteKey) && <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{noteKey ? t(noteKey) : note}</span>}
    </span>
  );
}

/** A single labelled figure, used inside tables and summaries. */
export function AmountRow({ label, amount, currency, note, noteKey, tone = 'default' }) {
  const { t } = useT();
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        {(note || noteKey) && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{noteKey ? t(noteKey) : note}</p>}
      </div>
      <div className="shrink-0 text-right">
        <Money amount={amount} currency={currency} strong={tone === 'total'} muted={tone === 'muted'} />
      </div>
    </div>
  );
}