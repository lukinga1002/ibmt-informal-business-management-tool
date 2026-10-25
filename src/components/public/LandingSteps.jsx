import { useT } from '@/i18n/I18nContext';

export default function LandingSteps() {
  const { t } = useT();
  const steps = [1, 2, 3, 4];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-10">
      <h2 className="ibmt-kicker">{t('landing.howTitle')}</h2>
      <ol className="mt-5 grid gap-6 border-t border-border pt-6 md:grid-cols-4">
        {steps.map((step) => (
          <li key={step}>
            <span className="ibmt-num font-display text-2xl text-gold-ink">{String(step).padStart(2, '0')}</span>
            <h3 className="mt-3 font-heading text-[15px] font-semibold text-navy">{t(`landing.step${step}Title`)}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t(`landing.step${step}Body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}