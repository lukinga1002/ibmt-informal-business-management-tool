import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANDING_COPY, pick, statusLabel } from '@/config/products';

/**
 * One product, as a real button. Selected state carries three signals: the gold
 * outline, a check mark, and aria-pressed — never colour alone.
 */
export default function ProductCard({ product, selected, onSelect, onMove, lang }) {
  const Icon = product.icon;
  const live = product.status === 'live';
  const label = statusLabel(product.status, lang);

  return (
    <button
      type="button"
      data-product-card={product.id}
      aria-pressed={selected}
      onClick={() => onSelect(product.id)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          onMove(1);
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          onMove(-1);
        }
      }}
      className={cn(
        'group relative flex min-h-[84px] w-full items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3.5 text-left',
        'bg-cream text-navy shadow-[0_18px_40px_-22px_rgba(0,0,0,0.75)] ring-1 transition [transition-duration:320ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
        selected
          ? 'ring-2 ring-gold'
          : 'ring-primary-foreground/10 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-22px_rgba(0,0,0,0.85)]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-[3px] transition-colors',
          selected ? 'bg-gold' : 'bg-transparent',
        )}
      />

      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          selected ? 'bg-navy text-gold' : 'bg-navy/[0.06] text-navy/70 group-hover:bg-navy/[0.1]',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-display text-[19px] font-semibold leading-none tracking-[0.05em]">
          {product.name}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy/60">
          <span
            aria-hidden="true"
            className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-success' : 'bg-gold-ink')}
          />
          {label}
        </span>
      </span>

      {selected ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{pick(LANDING_COPY.selected, lang)}</span>
        </span>
      ) : (
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-navy/25 transition-transform group-hover:translate-x-0.5 group-hover:text-navy/50"
        />
      )}
    </button>
  );
}