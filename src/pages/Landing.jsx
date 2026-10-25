import { Link } from 'react-router-dom';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import LandingHero from '@/components/public/LandingHero';
import LandingPrinciples from '@/components/public/LandingPrinciples';
import LandingModules from '@/components/public/LandingModules';
import LandingAudiences from '@/components/public/LandingAudiences';
import LandingSteps from '@/components/public/LandingSteps';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import DemoBadge from '@/components/ibmt/DemoBadge';

export default function Landing() {
  const { t } = useT();
  const { isMock } = useIBMT();

  return (
    <div className="min-h-screen bg-background">
      {isMock && <DemoBadge />}
      <PublicTopBar />
      <main>
        <LandingHero />
        <LandingPrinciples />
        <LandingModules />
        <LandingAudiences />
        <LandingSteps />
        <section className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
          <div className="rounded-lg bg-navy px-6 py-10 text-primary-foreground sm:px-12">
            <h2 className="font-display text-2xl sm:text-3xl">{t('landing.ctaTitle')}</h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-primary-foreground/80">{t('landing.ctaBody')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/operator" className="ibmt-tap inline-flex items-center rounded-md bg-gold px-5 text-sm font-semibold text-navy-deep transition-colors hover:bg-gold/90">
                {t('landing.forOperators')}
              </Link>
              <Link to="/rent/tenant" className="ibmt-tap inline-flex items-center rounded-md border border-primary-foreground/30 px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10">
                {t('landing.forCitizens')}
              </Link>
              <Link to="/verify" className="ibmt-tap inline-flex items-center rounded-md border border-primary-foreground/30 px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10">
                {t('landing.verifyTitle')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}