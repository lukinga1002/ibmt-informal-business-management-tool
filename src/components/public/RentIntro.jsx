import { useNavigate } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';
import LandingEntryPoints from './LandingEntryPoints';

/**
 * The first thing on the rent site: what IBMT Rent is, in one statement, and
 * then the four ways in. Nothing asks anyone to sign in here; choosing a way in
 * moves to its own page, where the entry code is written.
 */
export default function RentIntro() {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-10">
      <p className="ibmt-kicker flex items-center gap-2 text-gold-ink">
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-gold" />
        {t('landing.kicker')}
      </p>
      <h1 className="mt-4 max-w-5xl font-display text-[clamp(34px,5vw,66px)] font-bold leading-[1.02] tracking-[-0.01em] text-navy">
        {t('landing.title')}
      </h1>
      <p className="ibmt-lede mt-4 max-w-3xl text-[16px]">{t('landing.lede')}</p>

      <LandingEntryPoints onChoose={(chosen) => navigate(`/rent/access/${chosen.id}`)} />
    </section>
  );
}