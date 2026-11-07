import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { LANDING_COPY, pick, statusLabel } from '@/config/products';

/**
 * The one action for the selected product. A product that is not live gets a
 * disabled action: it opens nothing and collects nothing.
 */
export default function ActionCard({ product, lang }) {
  const open = product.status === 'live' && product.route;

  return (
    <div className="w-full max-w-[340px] rounded-2xl bg-cream p-3.5 text-navy shadow-[0_22px_50px_-26px_rgba(0,0,0,0.8)]">
      <p className="px-0.5 text-[12px] leading-snug text-navy/70">{pick(product.tagline, lang)}</p>
      <div className="mt-3">
        {open ? (
          <Link
            to={product.route}
            className="group flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            {pick(LANDING_COPY.open, lang)} {product.name}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex min-h-[46px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-gold-ink/40 bg-gold-soft px-4 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-gold-ink"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {statusLabel(product.status, lang)}
          </button>
        )}
      </div>
    </div>
  );
}