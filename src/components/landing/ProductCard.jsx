import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANDING_COPY, pick, statusLabel } from '@/config/products';

/**
 * One product, as a real button. Selected state carries three signals: the gold
 * outline, a check mark, and aria-pressed — never colour alone.
 */
export default function ProductCard({ product, selected, onSelect, onMove, lang, tilt = 0 }) {
  const Icon = product.icon;
  const label = statusLabel(product.status, lang);

  return (
    <div className="l1-float" style={{ '--l1-tilt': `${tilt}deg` }}>
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
          'flex w-full items-center gap-3 rounded-2xl bg-cream px-3.5 py-3 text-left text-navy shadow-lg transition [transition-duration:400ms]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
          selected
            ? 'ring-2 ring-gold ring-offset-2 ring-offset-navy'
            : 'ring-1 ring-navy/10 hover:-translate-y-0.5 hover:shadow-xl',
        )}
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            selected ? 'bg-gold text-navy-deep' : 'bg-navy/[0.07] text-gold-ink',
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[13px] font-bold uppercase tracking-[0.12em]">{product.name}</span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-gold-ink">{label}</span>
        </span>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{pick(LANDING_COPY.selected, lang)}</span>
          </span>
        )}
      </button>
    </div>
  );
}