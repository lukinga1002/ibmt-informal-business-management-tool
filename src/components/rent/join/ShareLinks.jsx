import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/I18nContext';

/**
 * The links a landlord shares with tenants who are already in. One unit, one
 * link: the tenant opens it, writes their own details, and the answer is filed
 * against that unit.
 */
export default function ShareLinks({ units }) {
  const { t } = useT();
  const [copied, setCopied] = useState('');
  const withTenant = units.filter((unit) => unit.tenant_link_code);
  if (!withTenant.length) return null;

  const copy = async (unit) => {
    const link = `${window.location.origin}/rent/tenant/join/${unit.tenant_link_code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(unit.unit_id);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied(`manual:${unit.unit_id}`);
    }
  };

  return (
    <SectionCard
      title={t('shareLinks.title')}
      description={t('shareLinks.description')}
    >
      <ul className="divide-y divide-border">
        {withTenant.map((unit) => {
          const link = `${window.location.origin}/rent/tenant/join/${unit.tenant_link_code}`;
          const manual = copied === `manual:${unit.unit_id}`;
          return (
            <li key={unit.unit_id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{unit.unit_name}</p>
                  <p className="ibmt-num text-[11px] text-muted-foreground">{unit.unit_ref}</p>
                </div>
                <Button type="button" variant="outline" className="ibmt-tap shrink-0 gap-2" onClick={() => copy(unit)}>
                  {copied === unit.unit_id ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied === unit.unit_id ? t('shareLinks.copied') : t('shareLinks.copy')}
                </Button>
              </div>
              <code className="min-w-0 truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-navy">
                {link}
              </code>
              {manual && (
                <p className="text-[11px] text-muted-foreground">{t('shareLinks.copyManually', { link })}</p>
              )}
            </li>
          );
        })}
      </ul>

      <Notice tone="neutral" className="mt-3" title={t('shareLinks.whatTitle')}>
        {t('shareLinks.whatBody')}
      </Notice>
    </SectionCard>
  );
}