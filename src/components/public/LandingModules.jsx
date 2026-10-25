import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Building2 } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import Notice from '@/components/ibmt/Notice';

export default function LandingModules() {
  const { t } = useT();

  const modules = [
    {
      id: 'events',
      Icon: CalendarClock,
      title: t('brand.events'),
      pilot: t('landing.eventsPilot'),
      body: t('landing.eventsBody'),
      to: '/operator',
      notices: ['policy.turnoverVsTax', 'policy.permitVsTax', 'policy.expenseEvidence'],
    },
    {
      id: 'rent',
      Icon: Building2,
      title: `${t('brand.rent')} · ${t('brand.rentLocal')}`,
      pilot: t('landing.rentPilot'),
      body: t('landing.rentBody'),
      to: '/rent',
      notices: ['policy.registrationCompulsory', 'policy.registrationNoOwnership', 'policy.ibmtHoldsNoFunds'],
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-10">
      <h2 className="ibmt-kicker">{t('landing.modulesTitle')}</h2>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {modules.map(({ id, Icon, title, pilot, body, to, notices }) => (
          <article key={id} className="ibmt-panel flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy/[0.06] text-navy">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-semibold text-navy">{title}</h3>
                <p className="ibmt-hint">{pilot}</p>
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-navy-ink">{body}</p>
            <ul className="mt-5 space-y-2">
              {notices.map((key) => (
                <li key={key}>
                  <Notice tone="neutral" className="bg-transparent">
                    {t(key)}
                  </Notice>
                </li>
              ))}
            </ul>
            <Link
              to={to}
              className="ibmt-tap mt-6 inline-flex items-center gap-2 self-start rounded-md border border-navy/25 px-4 text-sm font-semibold text-navy transition-colors hover:bg-navy/[0.04]"
            >
              {t('nav.openWorkspace')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}