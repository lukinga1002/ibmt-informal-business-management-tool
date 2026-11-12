import { PowerOff } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';

/**
 * Shown instead of a parked feature, so a direct URL never reaches the screen.
 * In the selected language only; the language switch is always on screen.
 */
export default function ParkedNotice({ flag }) {
  const { t } = useT();

  return (
    <section className="mx-auto w-full max-w-xl py-10">
      <div className="ibmt-panel px-6 py-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-gold-soft text-gold-ink">
          <PowerOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('parked.title')}</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{t('parked.note')}</p>
        {flag && <p className="ibmt-num mt-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{flag}</p>}
      </div>
    </section>
  );
}