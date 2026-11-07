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
    <div className="flex min-h-[calc(100dvh-2.25rem)] flex-col bg-background p-2 sm:p-3">
      <section className="relative flex flex-1 flex-col overflow-hidden rounded-[26px] bg-navy text-primary-foreground shadow-[0_30px_80px_-45px_rgba(27,42,74,0.9)]">
        <div aria-hidden="true" className="l1-light" />
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
        />

        <div className="relative z-20 px-3 pt-3 sm:px-6 sm:pt-4">
          <LandingTopBar lang={lang} setLang={setLang} onShowProducts={() => focusCard(selected.id)} />
        </div>
        <p aria-live="polite" className="sr-only">
          {`${selected.name} — ${statusLabel(selected.status, lang)}`}
        </p>

        <header className="relative z-20 mt-5 px-5 text-center sm:mt-7">
          <p className="flex items-center justify-center gap-2.5 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-gold/90">
            <span aria-hidden="true" className="h-px w-6 bg-gold/45" />
            {pick(LANDING_COPY.products, lang)}
            <span aria-hidden="true" className="h-px w-6 bg-gold/45" />
          </p>
          <h1 className="mx-auto mt-2.5 max-w-[20ch] font-display text-[clamp(32px,4.4vw,58px)] font-bold leading-[0.98] tracking-[-0.005em]">
            {pick(LANDING_COPY.headline, lang)}
          </h1>
          <p className="mx-auto mt-2 max-w-[30rem] text-[11.5px] leading-relaxed text-primary-foreground/55 sm:text-[12px]">
            {pick(LANDING_COPY.headlineNote, lang)}
          </p>
        </header>

        <HeroStage
          products={orderedProducts}
          selected={selected}
          lang={lang}
          onSelect={setSelectedId}
          onMove={move}
        />

        <div className="relative z-20 mt-auto px-4 pb-3 sm:px-6">
          <div className="flex flex-col items-center gap-1 border-t border-primary-foreground/10 pt-2.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/40 sm:flex-row sm:justify-between">
            <span>IBMT · Tanzania</span>
            <span className="flex items-center gap-4">
              <Link to="/privacy" className="inline-flex min-h-[40px] items-center hover:text-gold">
                {pick(LANDING_COPY.privacy, lang)}
              </Link>
              <Link to="/verify" className="inline-flex min-h-[40px] items-center hover:text-gold">
                {pick(LANDING_COPY.verify, lang)}
              </Link>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}