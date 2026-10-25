import { useT } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';
import { useId } from 'react';

/**
 * Persistent SW/EN switch. Present on every screen, including public ones.
 */
export default function LanguageSwitch({ className, tone = 'navy' }) {
  const { lang, setLang, t } = useT();
  const id = useId();

  const base =
    tone === 'light'
      ? 'border-primary-foreground/25 text-primary-foreground/80'
      : 'border-border text-muted-foreground';
  const active =
    tone === 'light' ? 'bg-primary-foreground text-navy' : 'bg-navy text-primary-foreground';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span id={id} className="ibmt-kicker hidden sm:inline">
        {t('lang.label')}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className={cn('inline-flex items-center overflow-hidden rounded-md border', base)}
      >
        {['sw', 'en'].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className={cn(
              'ibmt-tap-square px-3 text-[13px] font-semibold uppercase tracking-wide transition-colors',
              lang === code ? active : 'hover:bg-muted/60',
            )}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}