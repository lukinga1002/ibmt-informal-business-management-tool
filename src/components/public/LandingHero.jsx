import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import VerifyEntryCard from './VerifyEntryCard';
import Notice from '@/components/ibmt/Notice';

export default function LandingHero() {
  const { t } = useT();
  const { isMock, setRole } = useIBMT();

  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 pb-4 pt-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-10 lg:pt-16">
      <div className="animate-ibmt-rise">
        <p className="ibmt-kicker">{t('landing.kicker')}</p>
        <h1 className="ibmt-display mt-4 max-w-2xl text-navy">{t('landing.title')}</h1>
        <p className="ibmt-lede mt-5 text-[16px]">{t('landing.lede')}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/operator"
            onClick={() => isMock && setRole('operator')}
            className="ibmt-tap inline-flex items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-deep"
          >
            {t('nav.openWorkspace')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/rent"
            className="ibmt-tap inline-flex items-center gap-2 rounded-md border border-navy/25 px-5 text-sm font-semibold text-navy transition-colors hover:bg-navy/[0.04]"
          >
            {t('brand.rent')} · {t('brand.rentLocal')}
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Notice tone="policy">{t('policy.turnoverVsTax')}</Notice>
          <Notice tone="policy">{t('policy.ibmtHoldsNoFunds')}</Notice>
        </div>
      </div>
      <div className="animate-ibmt-rise">
        <VerifyEntryCard />
      </div>
    </section>
  );
}