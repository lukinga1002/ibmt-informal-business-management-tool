import { Link } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';

const LINKS = [
  { to: '/verify', labelKey: 'nav.verify' },
  { to: '/ussd', labelKey: 'nav.ussd' },
  { to: '/documents', labelKey: 'nav.documents' },
  { to: '/data-rights', labelKey: 'nav.dataRights' },
  { to: '/handover', labelKey: 'nav.handover' },
];

export default function PublicFooter() {
  const { t } = useT();

  return (
    <footer className="mt-16 border-t border-border bg-cream/40">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-10">
        <div>
          <p className="font-display text-lg text-navy">{t('brand.full')}</p>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{t('landing.footnote')}</p>
          <p className="mt-4 max-w-xl rounded-md border border-dashed border-gold/60 bg-gold-soft/60 px-3 py-2 text-[12px] text-gold-ink">
            {t('common.nativeReview')}
          </p>
        </div>
        <nav aria-label={t('nav.menu')} className="grid grid-cols-2 gap-x-6 gap-y-1 sm:max-w-sm">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="ibmt-tap flex items-center text-[13px] font-medium text-navy-ink underline-offset-4 hover:underline"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:px-6 lg:px-10">
        {t('brand.name')} · {t('brand.events')} · {t('brand.rent')} ({t('brand.rentLocal')})
      </div>
    </footer>
  );
}