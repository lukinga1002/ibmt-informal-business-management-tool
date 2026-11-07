import ActionCard from './ActionCard';
import ProductCard from './ProductCard';
import ProductHero from './ProductHero';

/**
 * Two layouts, one selection. On a wide screen the cards flank a compact hero,
 * so both get real room; on a phone the hero leads, the cards sit in a pair
 * below it, then the action. Cards are never removed — with two products that
 * would leave one.
 */
export default function HeroStage({ products, selected, lang, onSelect, onMove }) {
  const half = Math.ceil(products.length / 2);
  const left = products.slice(0, half);
  const right = products.slice(half);

  const card = (product) => (
    <ProductCard
      key={product.id}
      product={product}
      selected={product.id === selected.id}
      onSelect={onSelect}
      onMove={onMove}
      lang={lang}
    />
  );

  return (
    <>
      {/* Wide: cards flank the hero */}
      <div className="relative z-10 hidden flex-1 grid-cols-[minmax(0,1fr)_minmax(270px,320px)_minmax(0,1fr)] items-center gap-6 px-6 py-5 lg:grid xl:gap-10 xl:px-10">
        <div className="flex w-full max-w-[288px] flex-col gap-3.5 justify-self-end">
          {left.map(card)}
        </div>

        <div className="flex w-full flex-col items-center">
          <ProductHero product={selected} lang={lang} />
          <div className="mt-4 flex w-full justify-center">
            <ActionCard product={selected} lang={lang} />
          </div>
        </div>

        <div className="flex w-full max-w-[288px] flex-col gap-3.5 justify-self-start">
          {right.map(card)}
        </div>
      </div>

      {/* Narrow: hero first, cards in a pair, then the action */}
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-2 pt-4 lg:hidden">
        <ProductHero product={selected} lang={lang} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {products.map(card)}
        </div>
        <div className="mt-3 flex justify-center">
          <ActionCard product={selected} lang={lang} />
        </div>
      </div>
    </>
  );
}