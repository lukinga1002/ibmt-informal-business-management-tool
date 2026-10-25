import { Link } from 'react-router-dom';
import { Building2, Landmark, Users } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';

export default function LandingAudiences() {
  const { t } = useT();

  const audiences = [
    { id: 'business', Icon: Users, title: t('landing.forOperators'), body: t('landing.forOperatorsBody'), links: [{ to: '/operator', label: t('nav.dashboard') }, { to: '/operator/receipts', label: t('nav.receipts') }] },
    { id: 'citizens', Icon: Building2, title: t('landing.forCitizens'), body: t('landing.forCitizensBody'), links: [{ to: '/rent/tenant', label: t('nav.pay') }, { to: '/verify', label: t('nav.verify') }, { to: '/ussd', label: t('nav.ussd') }] },
    { id: 'government', Icon: Landmark, title: t('landing.forGovernment'), body: t('landing.forGovernmentBody'), links: [{ to: '/council', label: t('nav.dashboard') }, { to: '/tra', label: t('brand.name') + ' · TRA' }] },
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-10">
      <h2 className="ibmt-kicker">{t('landing.audienceTitle')}</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {audiences.map(({ id, Icon, title, body, links }) => (
          <article key={id} className="ibmt-panel flex flex-col p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-soft text-gold-ink">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-heading text-base font-semibold text-navy">{title}</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
              {links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-[13px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}