import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import { formatDate } from '@/lib/format';

export default function OperatorDashboard() {
  const { t, tt, lang } = useT();
  const overview = useIBMTQuery('getOperatorOverview');
  const receipts = useIBMTQuery('listReceipts', { limit: 5 });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.dashboard')}
        lede={tt(overview.data?.business?.name) || undefined}
        meta={[
          { label: `${t('term.ward')}: ${overview.data?.business?.ward_id || '—'}` },
          { label: `${t('common.status')}: ${t(`status.${overview.data?.business?.registration_status || 'not_connected'}`)}` },
          { label: `Policy ${overview.data?.policy_version || '—'}` },
        ]}
      />

      <DataState query={overview} skeleton="cards">
        {(record) => (
          <div className="space-y-6">
            <StatGrid
              columns={4}
              items={(record.counters || []).map((counter) => ({
                key: counter.key,
                label: tt(counter.label),
                value: counter.value,
                noteKey: counter.noteKey,
              }))}
            />

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <SectionCard title={t('common.next')} description={t('policy.noAutoEnforcement')}>
                <ul className="space-y-2">
                  {(record.next_actions || []).map((action) => (
                    <li key={action.id}>
                      <Link
                        to={action.to}
                        className="ibmt-tap flex items-center justify-between gap-3 rounded-md border border-border px-4 text-[13px] font-medium text-navy transition-colors hover:bg-muted/50"
                      >
                        {tt(action.label)}
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <div className="space-y-4">
                <Notice tone="policy">{t('policy.turnoverVsTax')}</Notice>
                <Notice tone="policy">{t('policy.permitVsTax')}</Notice>
                <Notice tone="privacy">{t('policy.noAutoPublication')}</Notice>
              </div>
            </div>
          </div>
        )}
      </DataState>

      <SectionCard
        title={t('nav.receipts')}
        description={t('notices.fiscal')}
        actions={
          <Link to="/operator/receipts" className="text-[12px] font-semibold text-navy underline decoration-gold underline-offset-4">
            {t('nav.receipts')}
          </Link>
        }
      >
        <DataState query={receipts} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <DataTable
              columns={[
                { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                { key: 'buyer_name', header: t('roles.consumer') },
                { key: 'issued_on', header: t('verify.issuedOn'), className: 'ibmt-num', render: (row) => formatDate(row.issued_on, lang) },
                { key: 'total', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.total} /> },
                { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
              ]}
              rows={receipts.items}
            />
          )}
        </DataState>
      </SectionCard>
    </div>
  );
}