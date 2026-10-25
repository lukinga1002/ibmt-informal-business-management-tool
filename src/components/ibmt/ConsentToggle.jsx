import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';

/**
 * One consent, one control.
 *
 * Mandatory processing is shown as mandatory and cannot be withdrawn here;
 * optional listing marketing, credit use and lender sharing are separate and
 * withdrawable independently.
 */
export default function ConsentToggle({ consentKey, consent, onToggle, busy, className }) {
  const { t, tt } = useT();
  const mandatory = Boolean(consent?.mandatory);
  const granted = Boolean(consent?.granted);

  return (
    <div className={cn('flex items-start gap-4 border-b border-border py-4 last:border-b-0', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-foreground">{tt(consent?.label)}</p>
          <span
            className={cn(
              'rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              mandatory ? 'border-navy/25 bg-navy/[0.06] text-navy' : 'border-gold/50 bg-gold-soft text-gold-ink',
            )}
          >
            {mandatory ? t('common.required') : t('common.optional')}
          </span>
        </div>
        {consent?.note && <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{tt(consent.note)}</p>}
        {!mandatory && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{t('privacy.withdraw')}</p>}
      </div>
      <div className="shrink-0 pt-0.5">
        <Switch
          checked={granted}
          disabled={mandatory || busy}
          onCheckedChange={(next) => onToggle(consentKey, next)}
          aria-label={tt(consent?.label)}
        />
        <p className="mt-2 text-right text-[11px] font-medium text-muted-foreground">
          {granted ? t('common.yes') : t('common.no')}
        </p>
      </div>
    </div>
  );
}