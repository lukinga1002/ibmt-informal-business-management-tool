import { Link } from 'react-router-dom';
import { LayoutGrid, Languages, ShieldCheck } from 'lucide-react';
import { LANDING_COPY, pick } from '@/config/products';

const pillButton =
  'flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy';

/** Wordmark, the nav pill, and the way in. */
export default function LandingTopBar({ lang, setLang, onShowProducts }) {
  return (
    <div className="flex items-center gap-2">
      <Link to="/" aria-label="IBMT" className="flex shrink-0 items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold leading-none tracking-[0.08em] text-primary-foreground sm:text-[27px]">
          IBMT
        </span>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
      </Link>

      <nav
        aria-label={pick(LANDING_COPY.products, lang)}
        className="mx-auto flex items-center gap-0.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.06] p-0.5 backdrop-blur-sm"
      >
        <button type="button" onClick={onShowProducts} className={pillButton}>
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{pick(LANDING_COPY.products, lang)}</span>
        </button>
        <Link to="/verify" className={pillButton} aria-label={pick(LANDING_COPY.verify, lang)}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{pick(LANDING_COPY.verify, lang)}</span>
        </Link>
        <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-primary-foreground/15" />
        <button
          type="button"
          onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}
          aria-label={`${pick(LANDING_COPY.language, lang)}: ${lang.toUpperCase()}`}
          className={pillButton}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span>{lang}</span>
        </button>
      </nav>

      <Link
        to="/login"
        className="ml-auto flex min-h-[40px] shrink-0 items-center rounded-full border border-primary-foreground/25 px-4 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:border-gold hover:bg-primary-foreground/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy sm:ml-0"
      >
        {pick(LANDING_COPY.login, lang)}
      </Link>
    </div>
  );
}