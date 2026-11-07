import { Image } from '@/components/ui/image';
import { pick } from '@/config/products';
import { useEffect, useState } from 'react';

/**
 * The framed scene: one photo in a rounded frame on the navy window,
 * cross-fading and rising when the selection changes. Only the selected
 * product's image is ever requested.
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
      <div className="relative h-[clamp(150px,27vh,250px)] w-full sm:h-[clamp(190px,32vh,300px)]">
        <div aria-hidden="true" className="l1-halo" />
        {layers.map((layer) => {
          const LayerIcon = layer.product.icon;
          return (
            <div
              key={layer.key}
              aria-hidden={layer.state === 'out' || undefined}
              className={`absolute inset-0 z-10 ${layer.state === 'in' ? 'l1-in' : 'l1-out'}`}
            >
              {failed[layer.key] ? (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-gold/50">
                  <LayerIcon className="h-16 w-16 text-gold" aria-hidden="true" />
                </div>
              ) : (
                <Image
                  src={layer.product.hero}
                  alt={`${layer.product.name} — ${pick(layer.product.tagline, lang)}`}
                  fittingType="fill"
                  loading="lazy"
                  onError={() => setFailed((current) => ({ ...current, [layer.key]: true }))}
                  className="h-full w-full rounded-2xl object-cover shadow-2xl ring-1 ring-primary-foreground/15"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-2 text-center">
        <h2 className="font-display text-[clamp(36px,6.5vw,72px)] font-bold leading-[0.92] tracking-[0.02em] text-primary-foreground">
          {product.name}
        </h2>
      </div>
    </div>
  );
}