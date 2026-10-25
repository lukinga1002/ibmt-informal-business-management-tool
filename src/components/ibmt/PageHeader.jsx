import { Info } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { MetaChip } from './StatusBadge';
import { cn } from '@/lib/utils';

/**
 * Page title block. `meta` carries context the reader needs before the figures:
 * jurisdiction, policy version, pilot scope.
 */
export default function PageHeader({ kicker, title, lede, actions, meta = [], children, className }) {
  const { t } = useT();

  return (
    <header className={cn('border-b border-border pb-6', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {kicker && <p className="ibmt-kicker">{kicker}</p>}
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-navy sm:text-[28px]">{title}</h1>
          {lede && <p className="ibmt-lede mt-2">{lede}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {(meta.length > 0 || children) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {meta.map((item) => (
            <MetaChip key={String(item.label)} Icon={item.Icon || Info}>
              {item.label}
            </MetaChip>
          ))}
          {children}
        </div>
      )}
      {meta.some((item) => item.policyVersion) && (
        <p className="ibmt-hint mt-2">{t('notices.policyVersion')}</p>
      )}
    </header>
  );
}