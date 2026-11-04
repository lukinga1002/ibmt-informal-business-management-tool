import { TriangleAlert } from 'lucide-react';

/**
 * Demo banner. Rendered once, above every route, so no screen can be mistaken
 * for live records. Both languages are always shown on purpose: the warning
 * must be readable whatever the language setting is.
 *
 * Switch off at go-live by setting DEMO_MODE to false in src/lib/demoMode.js.
 */
export default function DemoBanner() {
  return (
    <div className="ibmt-no-print border-b border-gold-ink/30 bg-gold-soft px-3 py-1.5 text-center">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] font-semibold leading-tight text-gold-ink">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>DEMO — taarifa za majaribio tu. Usiweke taarifa halisi.</span>
        <span className="text-gold-ink/70" aria-hidden="true">·</span>
        <span>DEMO — sample data only. Do not enter real information.</span>
      </p>
    </div>
  );
}