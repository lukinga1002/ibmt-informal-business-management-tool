import { FlaskConical } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';

/**
 * Unmissable marker that the screen is running on fictional fixtures.
 * Rendered whenever the integration layer resolves to mock mode.
 */
export default function DemoBadge({ variant = 'bar', className }) {
  const { t } = useT();

  if (variant === 'chip') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border border-dashed border-gold-ink/60 bg-gold-soft px-2 py-1 font-heading text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-ink',
          className,
        )}
      >
        <FlaskConical className="h-3 w-3" aria-hidden="true" />
        {t('common.demonstration')}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'ibmt-no-print border-b border-dashed border-gold/70 bg-gold-soft/70 px-4 py-2 text-center text-[12px] text-gold-ink sm:px-6',
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <strong className="font-semibold">{t('common.demonstration')}</strong>
        <span className="hidden sm:inline">— {t('common.demonstrationNote')}</span>
      </span>
    </div>
  );
}