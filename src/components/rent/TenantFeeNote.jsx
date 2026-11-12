import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/I18nContext';

/** The one line every tenant-facing screen carries: a tenant pays nothing. */
export default function TenantFeeNote({ className }) {
  const { t } = useT();
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 rounded-sm border border-dashed border-gold-ink/50 bg-gold-soft px-3 py-2 font-heading text-[12px] font-semibold text-gold-ink',
        className,
      )}
    >
      <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t('parked.tenantFee')}
    </p>
  );
}