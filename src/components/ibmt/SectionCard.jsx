import { cn } from '@/lib/utils';

/**
 * Titled panel used for every grouped block, so rhythm and spacing stay
 * consistent across the product.
 */
export default function SectionCard({ title, description, actions, children, footer, className, bodyClassName, id }) {
  return (
    <section id={id} className={cn('ibmt-panel', className)}>
      {(title || actions) && (
        <header className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="font-heading text-[15px] font-semibold text-navy">{title}</h2>}
            {description && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
      {footer && <footer className="border-t border-border px-5 py-3 text-[12px] text-muted-foreground">{footer}</footer>}
    </section>
  );
}