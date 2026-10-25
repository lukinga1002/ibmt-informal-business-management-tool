import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { formatDateTime } from '@/lib/format';

export default function TraAccess() {
  const { t, tt, lang } = useT();
  const access = useIBMTQuery('listAccessHistory', { limit: 10 });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.access')}
        lede={t('privacy.accessHistoryBody')}
        meta={[{ label: t('policy.retentionFromBackend') }]}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Notice tone="privacy">{t('policy.tenantDetailsLimit')}</Notice>
        <Notice tone="privacy">{t('policy.committeeNeverTra')}</Notice>
      </div>

      <SectionCard title={t('privacy.accessHistory')} description={t('privacy.accessHistoryBody')}>
        <DataState query={access} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <>
              <DataTable
                columns={[
                  { key: 'occurred_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDateTime(row.occurred_at, lang) },
                  { key: 'actor_role', header: t('roles.label'), render: (row) => t(`roles.${row.actor_role}`) },
                  { key: 'actor_org', header: t('common.details'), render: (row) => tt(row.actor_org) },
                  { key: 'purpose', header: t('common.reason'), render: (row) => tt(row.purpose) },
                  { key: 'record_type', header: t('common.reference'), hideBelow: 'lg', render: (row) => tt(row.record_type) },
                ]}
                rows={access.items}
              />
              {access.hasMore && (
                <button
                  type="button"
                  onClick={access.loadMore}
                  className="ibmt-tap mt-4 w-full rounded-md border border-border text-[13px] font-medium text-navy"
                >
                  {access.loadingMore ? t('common.loading') : t('common.loadMore')}
                </button>
              )}
            </>
          )}
        </DataState>
      </SectionCard>

      <SectionCard title={t('common.status')} description={t('privacy.noStatutory')}>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="verified" />
          <StatusBadge status="human_review" />
          <StatusBadge status="not_connected" />
        </div>
        <Notice tone="caution" className="mt-4">
          {t('privacy.noStatutory')}
        </Notice>
      </SectionCard>
    </div>
  );
}