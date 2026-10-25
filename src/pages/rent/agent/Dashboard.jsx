import { useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

export default function AgentDashboard() {
  const { t, tt, lang } = useT();
  const profile = useIBMTQuery('getAgentProfile');
  const mandates = useIBMTQuery('listMandates', { limit: 8 });
  const listings = useIBMTQuery('listListings', { limit: 8 });
  const viewings = useIBMTQuery('listViewings', { limit: 8 });
  const commissions = useIBMTQuery('listAgentCommissions', { limit: 8 });
  const [tab, setTab] = useState('mandates');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('tab');
    if (requested) setTab(requested);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('roles.agent')}
        lede={t('policy.licenceRule')}
        meta={[
          { label: profile.data?.licence_number || '—' },
          { label: `${t('term.licence')}: ${t(`status.${profile.data?.licence_status || 'pending'}`)}` },
          { label: `${t('rent.termsVersion')}: ${profile.data?.licence_expires_at ? formatDate(profile.data.licence_expires_at, lang) : '—'}` },
        ]}
      />

      <DataState query={profile} skeleton="cards">
        {(record) => (
          <div className="space-y-4">
            <StatGrid columns={4} items={(record.counters || []).map((counter) => ({ key: counter.key, label: tt(counter.label), value: counter.value }))} />
            <div className="grid gap-3 lg:grid-cols-2">
              <Notice tone="policy">{t(record.licence_note)}</Notice>
              <Notice tone="caution">{t('policy.commissionRule')}</Notice>
            </div>
          </div>
        )}
      </DataState>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="mandates" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.mandate')}
          </TabsTrigger>
          <TabsTrigger value="listings" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.listings')}
          </TabsTrigger>
          <TabsTrigger value="viewings" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.viewing')}
          </TabsTrigger>
          <TabsTrigger value="commissions" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.commission')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mandates" className="mt-4">
          <SectionCard title={t('term.mandate')} description={t('policy.licenceRule')}>
            <DataState query={mandates} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-3">
                  {mandates.items.map((mandate) => (
                    <li key={mandate.id} className="rounded-md border border-border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] font-semibold text-navy">{mandate.agent_name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={mandate.status} />
                          <span className="ibmt-num rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                            {t('term.commission')} ≤ {mandate.commission_cap_percent}%
                          </span>
                        </div>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {(mandate.scope || []).map((item) => (
                          <li key={item.en} className="rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                            {tt(item)}
                          </li>
                        ))}
                      </ul>
                      {mandate.rejected_reason && <Notice tone="caution" className="mt-3">{t(mandate.rejected_reason)}</Notice>}
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="listings" className="mt-4">
          <SectionCard title={t('rent.listings')} description={t('policy.addressesNeverPublic')}>
            <DataState query={listings} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'headline', header: t('common.details'), className: 'font-medium', render: (row) => tt(row.headline) },
                    { key: 'mtaa', header: t('term.mtaa') },
                    { key: 'monthly_rent', header: t('rent.rentAmount'), align: 'right', render: (row) => <Money amount={row.monthly_rent} /> },
                    { key: 'verified', header: t('rent.ownershipEvidence'), render: (row) => <StatusBadge status={row.verified ? 'verified' : 'unverified'} /> },
                    { key: 'viewings_open', header: t('rent.viewing'), render: (row) => <StatusBadge status={row.viewings_open ? 'active' : 'inactive'} /> },
                  ]}
                  rows={listings.items}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="viewings" className="mt-4">
          <SectionCard title={t('rent.viewing')} description={t('policy.noTenantFee')}>
            <DataState query={viewings} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                    { key: 'starts_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.starts_at, lang) },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                    { key: 'fee_amount', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.fee_amount} note={t('rent.freeViewing')} /> },
                  ]}
                  rows={viewings.items}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <SectionCard title={t('term.commission')} description={t('policy.commissionRule')}>
            <DataState query={commissions} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                    { key: 'tenancy_kind', header: t('common.details'), render: (row) => (row.tenancy_kind === 'renewal' ? t('rent.renewal') : t('rent.newTenancy')) },
                    { key: 'amount', header: t('term.commission'), align: 'right', render: (row) => <Money amount={row.amount} note={row.tenancy_kind === 'renewal' ? t('rent.commissionZero') : undefined} /> },
                    { key: 'cap_percent', header: t('rent.scope'), className: 'ibmt-num', render: (row) => `${row.cap_percent}%` },
                    { key: 'state', header: t('common.status'), render: (row) => <StatusBadge status={row.state} /> },
                    { key: 'charged_at', header: t('common.date'), className: 'ibmt-num', render: (row) => (row.charged_at ? formatDate(row.charged_at, lang) : '—') },
                  ]}
                  rows={commissions.items}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}