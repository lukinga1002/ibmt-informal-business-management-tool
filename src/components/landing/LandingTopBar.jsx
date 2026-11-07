import { Link } from 'react-router-dom';
import { LayoutGrid, Languages, ShieldCheck } from 'lucide-react';
import { LANDING_COPY, pick } from '@/config/products';

const pillButton =
  'flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy';

/** Wordmark, the nav pill, and the way in. */
export default function LandingTopBar({ lang, setLang, onShowProducts }) {
  return (
    <div className="relative z-20 flex items-center gap-2">
      <Link
        to="/"
        aria-label="IBMT"
        className="font-display text-2xl font-bold leading-none tracking-[0.06em] text-primary-foreground sm:text-[26px]"
      >
        IBMT
      </Link>

      <nav
        aria-label={pick(LANDING_COPY.products, lang)}
        className="mx-auto flex items-center gap-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/[0.07] p-1"
      >
        <button type="button" onClick={onShowProducts} className={pillButton}>
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{pick(LANDING_COPY.products, lang)}</span>
        </button>
        <Link to="/verify" className={pillButton} aria-label={pick(LANDING_COPY.verify, lang)}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{pick(LANDING_COPY.verify, lang)}</span>
        </Link>
        <button
          type="button"
          onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}
          aria-label={`${pick(LANDING_COPY.language, lang)}: ${lang.toUpperCase()}`}
          className={pillButton}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="uppercase">{lang}</span>
        </button>
      </nav>

      <Link
        to="/login"
        className="ml-auto flex min-h-[44px] items-center rounded-full border border-primary-foreground/25 px-4 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 sm:ml-0"
      >
        {pick(LANDING_COPY.login, lang)}
      </Link>
    </div>
  );
}