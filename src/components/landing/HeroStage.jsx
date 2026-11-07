import ActionCard from './ActionCard';
import ProductCard from './ProductCard';
import ProductHero from './ProductHero';

/**
 * Two layouts, one selection. On a wide screen the cards flank the hero; on a
 * phone the hero comes first, then a swipeable row of the same cards, then the
 * action. Cards are never removed — with two products that would leave one.
 */
export default function HeroStage({ products, selected, lang, onSelect, onMove }) {
  const half = Math.ceil(products.length / 2);
  const left = products.slice(0, half);
  const right = products.slice(half);

  const card = (product, index) => (
    <ProductCard
      key={product.id}
      product={product}
      selected={product.id === selected.id}
      onSelect={onSelect}
      onMove={onMove}
      lang={lang}
      tilt={index % 2 === 0 ? -4 : 4}
    />
  );

  return (
    <>
      {/* Wide: cards flank the hero */}
      <div className="relative z-10 hidden flex-1 grid-cols-[minmax(170px,1fr)_minmax(0,1.7fr)_minmax(170px,1fr)] items-center gap-6 lg:grid xl:gap-10">
        <div className="flex flex-col gap-4">
          {left.map((product, index) => (
            <div key={product.id} className={index % 2 === 0 ? 'xl:-translate-x-2' : 'xl:translate-x-2'}>
              {card(product, index)}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <ProductHero product={selected} lang={lang} />
          <div className="mt-4 flex w-full justify-center">
            <ActionCard product={selected} lang={lang} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {right.map((product, index) => (
            <div key={product.id} className={index % 2 === 0 ? 'xl:translate-x-2' : 'xl:-translate-x-2'}>
              {card(product, half + index)}
            </div>
          ))}
        </div>
      </div>

      {/* Narrow: hero first, cards beneath, then the action */}
      <div className="relative z-10 mt-3 flex flex-1 flex-col lg:hidden">
        <ProductHero product={selected} lang={lang} />
        <div className="l1-rail -mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {products.map((product, index) => (
            <div key={product.id} className="w-[172px] shrink-0 snap-center">
              {card(product, index)}
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <ActionCard product={selected} lang={lang} />
        </div>
      </div>
    </>
  );
}