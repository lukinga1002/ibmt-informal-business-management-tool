import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';
import LandingTopBar from '@/components/landing/LandingTopBar';
import HeroStage from '@/components/landing/HeroStage';
import { focusProductCard } from '@/components/landing/focus';
import { DEFAULT_PRODUCT_ID, LANDING_COPY, orderedProducts, pick, statusLabel } from '@/config/products';

/**
 * L1 — the product chooser. IBMT holds many products, so this page no longer
 * speaks for rent alone: it shows every product declared in the config and lets
 * the reader pick one. Everything here comes from `src/config/products.js`.
 */
export default function Landing() {
  const { lang, setLang } = useT();
  const [selectedId, setSelectedId] = useState(
    orderedProducts.some((product) => product.id === DEFAULT_PRODUCT_ID)
      ? DEFAULT_PRODUCT_ID
      : orderedProducts[0]?.id,
  );

  const selected = orderedProducts.find((product) => product.id === selectedId) || orderedProducts[0];

  const focusCard = (id) => requestAnimationFrame(() => focusProductCard(id));

  const move = (direction) => {
    const index = orderedProducts.findIndex((product) => product.id === selectedId);
    const next = orderedProducts[(index + direction + orderedProducts.length) % orderedProducts.length];
    if (!next) return;
    setSelectedId(next.id);
    focusCard(next.id);
  };

  if (!selected) return null;

  return (
    <div className="flex min-h-[calc(100dvh-2.25rem)] flex-col bg-background px-2 pb-1 pt-2 sm:px-4 sm:pt-3">
      <section className="relative flex flex-1 flex-col overflow-hidden rounded-[26px] bg-navy px-3 pb-3 pt-3 text-primary-foreground sm:px-6 sm:pb-4 sm:pt-4">
        <div aria-hidden="true" className="l1-light" />

        <LandingTopBar lang={lang} setLang={setLang} onShowProducts={() => focusCard(selected.id)} />
        <p aria-live="polite" className="sr-only">
          {`${selected.name} — ${statusLabel(selected.status, lang)}`}
        </p>

        <HeroStage
          products={orderedProducts}
          selected={selected}
          lang={lang}
          onSelect={setSelectedId}
          onMove={move}
        />

        <div className="relative z-10 mt-3 text-center">
          <h1 className="font-display text-[clamp(30px,4.4vw,56px)] font-bold leading-[1] tracking-[-0.01em]">
            {pick(LANDING_COPY.headline, lang)}
          </h1>
          <p className="mx-auto mt-1 max-w-xl text-[11px] leading-snug text-primary-foreground/55 sm:text-[12px]">
            {pick(LANDING_COPY.headlineNote, lang)}
          </p>
        </div>
      </section>

      <footer className="flex items-center justify-center gap-4 px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Link to="/privacy" className="inline-flex min-h-[44px] items-center px-2 hover:text-navy-ink">
          {pick(LANDING_COPY.privacy, lang)}
        </Link>
        <Link to="/verify" className="inline-flex min-h-[44px] items-center px-2 hover:text-navy-ink">
          {pick(LANDING_COPY.verify, lang)}
        </Link>
      </footer>
    </div>
  );
}