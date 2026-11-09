import { Link } from 'react-router-dom';
import { ArrowRight, Building2, House, Landmark, ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';

/**
 * The four ways in. Named in Swahili with the English name beside it, because
 * these are the words people actually use for the roles.
 *
 * Three of them ask for a code sent to the account before the workspace opens;
 * checking a record needs no account at all.
 */
const ENTRIES = [
  { id: 'landlord', sw: 'Mwenye Nyumba', en: 'Landlord', Icon: Building2, bodyKey: 'landing.landlordBody', route: '/rent/landlord' },
  { id: 'tenant', sw: 'Mpangaji', en: 'Tenant', Icon: House, bodyKey: 'landing.tenantBody', route: '/rent/tenant' },
  { id: 'council', sw: 'Halmashauri', en: 'Council', Icon: Landmark, bodyKey: 'landing.councilBody', route: '/rent/council' },
  { id: 'verify', sw: 'Hakiki', en: 'Verify', Icon: ShieldCheck, bodyKey: 'landing.verifyBody', route: '/verify' },
];

const cardClass =
  'ibmt-panel group flex w-full flex-col p-6 text-left transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2';

export default function LandingEntryPoints({ onChoose, activeId }) {
  const { t } = useT();

  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl font-semibold text-navy sm:text-2xl">{t('landing.entryTitle')}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ENTRIES.map((entry) => {
          const { id, sw, en, Icon, bodyKey, route } = entry;
          const body = (
            <>
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
            </>
          );

          if (id === 'verify') {
            return (
              <Link key={id} to={route} className={cardClass}>
                {body}
              </Link>
            );
          }

          return (
            <button
              key={id}
              type="button"
              aria-expanded={activeId === id}
              onClick={() => onChoose?.(entry)}
              className={cardClass}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}