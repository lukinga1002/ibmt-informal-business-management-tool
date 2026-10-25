import { Link } from 'react-router-dom';
import { ArrowRight, Building2, HardHat, Landmark, MapPin, Table2, UserCheck, Users } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import PolicyList from '@/components/ibmt/PolicyList';

const ENTRIES = [
  { to: '/rent/landlord', labelKey: 'roles.landlord', Icon: Building2 },
  { to: '/rent/tenant', labelKey: 'roles.tenant', Icon: Users },
  { to: '/rent/agent', labelKey: 'roles.agent', Icon: HardHat },
  { to: '/rent/manager', labelKey: 'roles.manager', Icon: UserCheck },
  { to: '/rent/ward', labelKey: 'roles.ward', Icon: MapPin },
  { to: '/rent/council', labelKey: 'roles.council', Icon: Landmark },
  { to: '/rent/tra', labelKey: 'roles.tra', Icon: Table2 },
];

export default function RentHub() {
  const { t, tt } = useT();
  const policy = useIBMTQuery('getPolicyValues');
  const amnesty = useIBMTQuery('getAmnestyNotice');

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <PageHeader
          kicker={`${t('brand.rent')} · ${t('brand.rentLocal')}`}
          title={t('landing.rentBody')}
          lede={t('landing.rentPilot')}
          meta={[
            { label: `Policy ${policy.data?.version || '—'}` },
            { label: t('policy.registrationCompulsory') },
          ]}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <SectionCard title={t('rent.policyValues')} description={t('policy.policyVersioned')}>
              <DataState query={policy} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {(record) => (
                  <DataTable
                    columns={[
                      { key: 'label', header: t('common.details'), className: 'font-medium', render: (row) => tt(row.label) },
                      { key: 'display', header: t('common.amount'), className: 'ibmt-num', align: 'right' },
                      { key: 'rule', header: t('common.reason'), render: (row) => tt(row.rule) },
                    ]}
                    rows={record.values || []}
                    rowKey="key"
                  />
                )}
              </DataState>
              <p className="ibmt-hint mt-3">{tt(policy.data?.note)}</p>
            </SectionCard>

            <SectionCard title={t('rent.amnesty')}>
              <DataState query={amnesty} skeleton="lines">
                {(record) => (
                  <div className="space-y-3">
                    <DataTable
                      dense
                      columns={[
                        { key: 'label', header: t('common.details') },
                        { key: 'value', header: t('common.status'), className: 'ibmt-num text-right' },
                      ]}
                      rows={[
                        { id: 'a1', label: t('rent.amnesty'), value: record.amnesty_forward_only ? t('common.yes') : t('common.no') },
                        { id: 'a2', label: t('rent.registrationWindow'), value: `${record.registration_window_days} d${record.window_placeholder ? ' (placeholder)' : ''}` },
                        { id: 'a3', label: t('rent.assisted'), value: record.assisted_onboarding ? t('common.yes') : t('common.no') },
                        { id: 'a4', label: t('rent.proxy'), value: record.proxy_registration ? t('common.yes') : t('common.no') },
                        { id: 'a5', label: t('rent.migration'), value: record.migration_preserves_terms ? t('common.yes') : t('common.no') },
                      ]}
                    />
                    <Notice tone="caution">{t(record.note)}</Notice>
                  </div>
                )}
              </DataState>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title={t('nav.workspace')} description={t('roles.external')}>
              <ul className="space-y-2">
                {ENTRIES.map(({ to, labelKey, Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="ibmt-tap flex items-center justify-between gap-3 rounded-md border border-border px-4 text-[13px] font-medium text-navy transition-colors hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                        {t(labelKey)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <PolicyList
              keys={[
                'policy.ibmtHoldsNoFunds',
                'policy.registrationNoOwnership',
                'policy.ownershipVerifiedFirst',
                'policy.oneTenancyOneUnit',
                'policy.tenantPaysExact',
                'policy.commissionRule',
              ]}
            />
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}