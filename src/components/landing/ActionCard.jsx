import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { LANDING_COPY, pick, statusLabel } from '@/config/products';

/**
 * One small cream card, one action. A product that is not live gets a disabled
 * action: it opens nothing and collects nothing.
 */
export default function ActionCard({ product, lang }) {
  const open = product.status === 'live' && product.route;

  return (
    <div className="w-full max-w-[290px] rounded-2xl bg-cream p-3 text-navy shadow-lg">
      <p className="px-1 text-[12px] leading-snug text-navy/70">{pick(product.tagline, lang)}</p>
      <div className="mt-2.5 px-1">
        {open ? (
          <Link
            to={product.route}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            {pick(LANDING_COPY.open, lang)} {product.name}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-gold-ink/40 bg-gold-soft px-4 text-[12px] font-semibold text-gold-ink"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {statusLabel(product.status, lang)}
          </button>
        )}
      </div>
    </div>
  );
}