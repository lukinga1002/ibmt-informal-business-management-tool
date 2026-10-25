import { Link } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';

/**
 * IBMT wordmark: a navy monogram with the product name set in the display face.
 */
export default function BrandMark({ compact = false, to = '/', tone = 'navy' }) {
  const { t } = useT();
  const text = tone === 'light' ? 'text-primary-foreground' : 'text-navy';
  const sub = tone === 'light' ? 'text-primary-foreground/70' : 'text-muted-foreground';

  return (
    <Link to={to} className="group inline-flex items-center gap-3 rounded-md py-1">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-navy font-display text-lg leading-none text-gold ring-1 ring-inset ring-gold/40"
      >
        I
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-heading text-[15px] font-semibold tracking-[0.02em] ${text}`}>
          {t('brand.name')}
        </span>
        {!compact && (
          <span className={`mt-1 text-[11px] tracking-wide ${sub}`}>{t('brand.tagline')}</span>
        )}
      </span>
    </Link>
  );
}