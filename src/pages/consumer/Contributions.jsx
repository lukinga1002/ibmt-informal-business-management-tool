import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import PolicyList from '@/components/ibmt/PolicyList';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { formatDate } from '@/lib/format';

/**
 * Private committee contribution and vendor-payment ledger.
 *
 * Contributions are gifts: they are excluded from business turnover and from
 * every TRA view, and this screen is never exposed to TRA.
 */
export default function ConsumerContributions() {
  const { t, tt, lang } = useT();
  const ledger = useIBMTQuery('listCommitteeLedger');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.contributions')}
        lede={t('policy.giftsExcluded')}
        meta={[{ label: t('policy.committeeNeverTra') }]}
      />

      <Notice tone="privacy" title={t('policy.giftsExcluded')}>
        {t('policy.giftsExcluded')}
      </Notice>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <SectionCard title={t('nav.contributions')} description={t('policy.committeeNeverTra')}>
          <DataState query={ledger} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {(record) => (
              <DataTable
                columns={[
                  { key: 'counterparty', header: t('common.details'), className: 'font-medium', render: (row) => tt(row.counterparty) },
                  { key: 'kind', header: t('common.status'), render: (row) => <StatusBadge status={row.kind === 'contribution_in' ? 'confirmed' : 'settled'} label={row.kind === 'contribution_in' ? t('term.committee') : t('common.pay')} /> },
                  { key: 'occurred_on', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.occurred_on, lang) },
                  { key: 'amount', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.amount} /> },
                ]}
                rows={record.items}
              />
            )}
          </DataState>
        </SectionCard>

        <div className="space-y-4">
          <PolicyList
            keys={['policy.giftsExcluded', 'policy.committeeNeverTra', 'policy.turnoverVsTax', 'policy.consentSeparate']}
          />
          <Notice tone="privacy">{t('policy.retentionFromBackend')}</Notice>
        </div>
      </div>
    </div>
  );
}