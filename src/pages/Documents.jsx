import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import PageHeader from '@/components/ibmt/PageHeader';
import DataState from '@/components/ibmt/DataState';
import DocumentSheet from '@/components/ibmt/DocumentSheet';
import Notice from '@/components/ibmt/Notice';

/*
 * The tax compliance specimen is dormant. No screen shows it and nothing calls
 * getTaxCompliance: it implied TRA had certified a landlord, which is not true
 * of any record in this register. Only the lease and the rent receipt remain.
 */
const TABS = [
  { key: 'lease', labelKey: 'docs.tabLease' },
  { key: 'receipt', labelKey: 'docs.tabReceipt' },
];

export default function Documents() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('lease');
  const query = useIBMTQuery('getDocument', { type: tab });

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <PageHeader kicker={t('brand.rent')} title={t('docs.title')} lede={t('docs.lede')} />

        <div role="tablist" aria-label={t('docs.title')} className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              role="tab"
              type="button"
              aria-selected={tab === entry.key}
              onClick={() => setTab(entry.key)}
              className={`ibmt-tap -mb-px border-b-2 px-3 text-[13px] font-medium transition-colors ${
                tab === entry.key ? 'border-navy text-navy' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(entry.labelKey)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
          <DataState query={query} skeleton="cards">
            {() => <DocumentSheet doc={query.data} lang={lang} />}
          </DataState>
          <aside className="space-y-4">
            <Notice tone="caution" title={t('docs.specimen')}>
              {t('docs.backendNote')}
            </Notice>
            <Notice tone="policy">{t('policy.registrationNoOwnership')}</Notice>
            <Notice tone="privacy">{t('policy.addressesNeverPublic')}</Notice>
            <Notice tone="policy">{t('policy.ibmtHoldsNoFunds')}</Notice>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}