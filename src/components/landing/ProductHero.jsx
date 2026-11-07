import { Image } from '@/components/ui/image';
import { pick } from '@/config/products';
import { useEffect, useState } from 'react';

/**
 * The frame: one photo in a compact rounded frame, cross-fading and rising when
 * the selection changes. Only the selected product's image is ever requested.
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
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full max-w-[300px] sm:max-w-[340px]">
        <div aria-hidden="true" className="l1-halo" />
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] shadow-[0_26px_60px_-26px_rgba(0,0,0,0.8)] ring-1 ring-primary-foreground/15">
          {layers.map((layer) => {
            const LayerIcon = layer.product.icon;
            return (
              <div
                key={layer.key}
                aria-hidden={layer.state === 'out' || undefined}
                className={`absolute inset-0 ${layer.state === 'in' ? 'l1-in' : 'l1-out'}`}
              >
                {failed[layer.key] ? (
                  <div className="flex h-full w-full items-center justify-center border border-dashed border-gold/40">
                    <LayerIcon className="h-12 w-12 text-gold" aria-hidden="true" />
                  </div>
                ) : (
                  <Image
                    src={layer.product.hero}
                    alt={`${layer.product.name} — ${pick(layer.product.tagline, lang)}`}
                    fittingType="fill"
                    loading="lazy"
                    onError={() => setFailed((current) => ({ ...current, [layer.key]: true }))}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            );
          })}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-primary-foreground/10"
          />
        </div>
      </div>

      <h2 className="mt-3 font-display text-[clamp(32px,5vw,54px)] font-bold leading-[0.9] tracking-[0.03em] text-primary-foreground">
        {product.name}
      </h2>
    </div>
  );
}