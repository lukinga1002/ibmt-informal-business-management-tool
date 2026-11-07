import { Image } from '@/components/ui/image';
import { LANDING_COPY, pick } from '@/config/products';
import { useEffect, useState } from 'react';

/**
 * The framed scene: one object on a mound, cross-fading and rising when the
 * selection changes. Only the selected product's image is ever requested.
 */
export default function ProductHero({ product, lang }) {
  const [layers, setLayers] = useState([{ key: product.id, product, state: 'in' }]);
  const [failed, setFailed] = useState({});

  useEffect(() => {
    setLayers((current) => {
      if (current[current.length - 1]?.key === product.id) return current;
      return [...current.map((layer) => ({ ...layer, state: 'out' })), { key: product.id, product, state: 'in' }];
    });
    const timer = setTimeout(() => setLayers((current) => current.slice(-1)), 420);
    return () => clearTimeout(timer);
  }, [product]);

  return (
    <div className="w-full">
      <div className="relative h-[clamp(140px,25vh,230px)] w-full sm:h-[clamp(170px,29vh,270px)]">
        <div aria-hidden="true" className="l1-halo" />
        <div aria-hidden="true" className="l1-mound" />
        {layers.map((layer) => {
          const LayerIcon = layer.product.icon;
          return (
            <div
              key={layer.key}
              aria-hidden={layer.state === 'out' || undefined}
              className={`absolute inset-x-0 bottom-0 top-0 z-10 flex items-end justify-center ${
                layer.state === 'in' ? 'l1-in' : 'l1-out'
              }`}
            >
              {failed[layer.key] ? (
                <div className="mb-4 flex h-[68%] w-[68%] items-center justify-center rounded-2xl border border-dashed border-gold/50">
                  <LayerIcon className="h-16 w-16 text-gold" aria-hidden="true" />
                </div>
              ) : (
                <Image
                  src={layer.product.hero}
                  alt={`${layer.product.name} — ${pick(LANDING_COPY.imagePlaceholder, lang)}`}
                  fittingType="fit"
                  loading="lazy"
                  onError={() => setFailed((current) => ({ ...current, [layer.key]: true }))}
                  className="h-full w-auto max-w-full object-contain drop-shadow-2xl"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative z-10 -mt-1 text-center">
        <h2 className="font-display text-[clamp(36px,6.5vw,72px)] font-bold leading-[0.92] tracking-[0.02em] text-primary-foreground">
          {product.name}
        </h2>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary-foreground/45">
          {pick(LANDING_COPY.imagePlaceholder, lang)}
        </p>
      </div>
    </div>
  );
}