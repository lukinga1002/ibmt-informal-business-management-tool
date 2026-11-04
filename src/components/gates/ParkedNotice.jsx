import { PowerOff } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';

/**
 * Shown instead of a parked feature, so a direct URL never reaches the screen.
 * Both languages are shown: the pilot must be readable to whoever opens the
 * link, whatever their language setting.
 */
export default function ParkedNotice({ flag }) {
  const { lang } = useT();

  const primary = lang === 'sw' ? 'Huduma hii haipatikani kwa sasa.' : 'This service is not available right now.';
  const secondary = lang === 'sw' ? 'This service is not available right now.' : 'Huduma hii haipatikani kwa sasa.';
  const note =
    lang === 'sw'
      ? 'Imezimwa kwa majaribio haya ya nyumba za kupangisha. Hakuna taarifa iliyoharibiwa.'
      : 'It is switched off for this rental pilot. No record has been changed or lost.';

  return (
    <section className="mx-auto w-full max-w-xl py-10">
      <div className="ibmt-panel px-6 py-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-gold-soft text-gold-ink">
          <PowerOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{primary}</h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">{secondary}</p>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{note}</p>
        {flag && <p className="ibmt-num mt-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{flag}</p>}
      </div>
    </section>
  );
}