import { Link } from 'react-router-dom';
import { ArrowRight, Building2, House, Landmark, ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';

/**
 * The four ways in. Named in Swahili with the English name beside it, because
 * these are the words people actually use for the roles.
 */
const ENTRIES = [
  { id: 'landlord', sw: 'Mwenye Nyumba', en: 'Landlord', Icon: Building2, bodyKey: 'landing.landlordBody', to: '/rent/landlord' },
  { id: 'tenant', sw: 'Mpangaji', en: 'Tenant', Icon: House, bodyKey: 'landing.tenantBody', to: '/rent/tenant' },
  { id: 'council', sw: 'Halmashauri', en: 'Council', Icon: Landmark, bodyKey: 'landing.councilBody', to: '/rent/council' },
  { id: 'verify', sw: 'Hakiki', en: 'Verify', Icon: ShieldCheck, bodyKey: 'landing.verifyBody', to: '/verify' },
];

export default function LandingEntryPoints() {
  const { t } = useT();

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-10">
      <h2 className="ibmt-kicker">{t('landing.entryTitle')}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ENTRIES.map(({ id, sw, en, Icon, bodyKey, to }) => (
          <Link
            key={id}
            to={to}
            className="ibmt-panel group flex flex-col p-6 transition-colors hover:border-gold"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy/[0.06] text-navy transition-colors group-hover:bg-gold-soft group-hover:text-gold-ink">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold text-navy">
              {sw}
              <span className="ml-2 text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{en}</span>
            </h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{t(bodyKey)}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-navy group-hover:text-gold-ink">
              {t('common.open')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}