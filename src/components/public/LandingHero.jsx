import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import VerifyEntryCard from './VerifyEntryCard';
import Notice from '@/components/ibmt/Notice';

/**
 * Rental hero. The Swahili headline is the headline: this product is read in
 * Swahili first, and the English line sits directly under it so the promise is
 * legible to a reviewer in either language.
 */
export default function LandingHero() {
  const { t } = useT();

  return (
    <section className="relative mx-auto grid w-full max-w-[1440px] gap-10 px-4 pb-4 pt-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-10 lg:pt-16">
      <div aria-hidden="true" className="ibmt-glow" />
      <div className="relative z-10 animate-ibmt-rise">
        <p className="ibmt-kicker flex items-center gap-2 text-gold-ink">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-gold" />
          {t('landing.kicker')}
        </p>
        <h1 className="ibmt-hero mt-5 max-w-2xl text-navy">{t('landing.title')}</h1>
        <p className="mt-3 max-w-2xl font-display text-lg text-navy-soft sm:text-xl">{t('landing.titleEn')}</p>
        <p className="ibmt-lede mt-5 text-[16px]">{t('landing.lede')}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/rent"
            className="ibmt-tap inline-flex items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-deep"
          >
            {t('nav.openWorkspace')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/verify"
            className="ibmt-tap inline-flex items-center gap-2 rounded-md border border-navy/25 px-5 text-sm font-semibold text-navy transition-colors hover:bg-navy/[0.04]"
          >
            {t('landing.verifyCta')}
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Notice tone="policy">{t('policy.noCustodyStage1')}</Notice>
          <Notice tone="policy">{t('policy.noTaxStage1')}</Notice>
        </div>
      </div>
      <div className="relative z-10 animate-ibmt-rise">
        <VerifyEntryCard />
      </div>
    </section>
  );
}