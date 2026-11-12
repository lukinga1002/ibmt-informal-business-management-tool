import { Link } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';

export default function LandlordDashboard() {
  const { t, tt } = useT();
  const overview = useIBMTQuery('getLandlordOverview');
  const units = useIBMTQuery('listUnits', { limit: 6 });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.dashboard')}
        lede={t('landing.rentBody')}
        meta={[
          { label: `${t('term.mtaa')}: ${(overview.data?.jurisdiction?.mtaa || []).join(' · ') || '—'}` },
          { label: `Policy ${overview.data?.policy_version || '—'}` },
        ]}
        actions={
          <Link
            to="/rent/pangisha"
            className="ibmt-tap inline-flex items-center gap-2 rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {t('portfolioDemo.rentOut')}
          </Link>
        }
      />

      <DataState query={overview} skeleton="cards">
        {(record) => (
          <div className="space-y-4">
            <StatGrid columns={3} items={(record.counters || []).map((counter) => ({ key: counter.key, label: tt(counter.label), value: counter.value }))} />
            <Notice tone="caution">{tt(record.arrears_note)}</Notice>
          </div>
        )}
      </DataState>

      <div className="grid gap-3 lg:grid-cols-3">
        <Notice tone="policy">{t('policy.ibmtHoldsNoFunds')}</Notice>
        <Notice tone="policy">{t('policy.ownershipVerifiedFirst')}</Notice>
        <Notice tone="policy">{t('policy.registrationVoluntary')}</Notice>
      </div>

      <SectionCard
        title={t('nav.portfolio')}
        description={t('policy.unitCompliance')}
        actions={
          <Link to="/rent/landlord/portfolio" className="text-[12px] font-semibold text-navy underline decoration-gold underline-offset-4">
            {t('nav.portfolio')}
          </Link>
        }
      >
        <DataState query={units} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <DataTable
              columns={[
                { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                { key: 'mtaa', header: t('term.mtaa') },
                { key: 'monthly_rent', header: t('rent.rentAmount'), align: 'right', render: (row) => <Money amount={row.monthly_rent} /> },
                { key: 'occupancy', header: t('rent.occupancy'), render: (row) => t(`status.${row.occupancy === 'occupied' ? 'active' : 'inactive'}`) },
                { key: 'registration_status', header: t('term.registration'), render: (row) => <StatusBadge status={row.registration_status} /> },
                { key: 'ownership_status', header: t('rent.ownershipEvidence'), render: (row) => <StatusBadge status={row.ownership_status} /> },
                {
                  key: 'eligible_for_rent',
                  header: t('rent.eligible'),
                  hideBelow: 'lg',
                  render: (row) => <StatusBadge status={row.eligible_for_rent ? 'verified' : 'unverified'} />,
                },
              ]}
              rows={units.items}
            />
          )}
        </DataState>
      </SectionCard>
    </div>
  );
}