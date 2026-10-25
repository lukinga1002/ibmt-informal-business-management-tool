import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function TraOverview() {
  const { t, tt } = useT();
  const overview = useIBMTQuery('getTraOverview');
  const businesses = useIBMTQuery('listTraBusinesses', { limit: 8 });
  const estimates = useIBMTQuery('getTraEstimates');
  const quality = useIBMTQuery('getTraQuality');
  const exportRequest = useIBMTMutation('requestExport');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.dashboard')}
        lede={t('policy.turnoverVsTax')}
        meta={[
          { label: `Policy ${overview.data?.policy_version || '—'}` },
          { label: t('roles.external') },
        ]}
      />

      <DataState query={overview} skeleton="cards">
        {(record) => (
          <div className="space-y-4">
            <StatGrid columns={3} items={(record.counters || []).map((counter) => ({ key: counter.key, label: tt(counter.label), value: counter.value }))} />
            <Notice tone="policy">{tt(record.projection_note)}</Notice>
          </div>
        )}
      </DataState>

      <Tabs defaultValue="businesses">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="businesses" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('landing.forOperators')}
          </TabsTrigger>
          <TabsTrigger value="estimates" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('common.total')}
          </TabsTrigger>
          <TabsTrigger value="quality" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('common.status')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="businesses" className="mt-4">
          <SectionCard title={t('landing.forOperators')} description={t('policy.tenantDetailsLimit')}>
            <DataState query={businesses} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'name', header: t('brand.full'), className: 'font-medium' },
                    { key: 'category', header: t('common.details'), render: (row) => tt(row.category) },
                    { key: 'ward_id', header: t('term.ward') },
                    { key: 'registration_status', header: t('term.registration'), render: (row) => t(`status.${row.registration_status}`) },
                    { key: 'permitted_fields', header: t('common.export'), hideBelow: 'lg', render: (row) => <span className="ibmt-num text-[11px] text-muted-foreground">{row.permitted_fields.join(' · ')}</span> },
                  ]}
                  rows={businesses.items}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="estimates" className="mt-4">
          <DataState query={estimates} skeleton="cards">
            {(record) => (
              <div className="space-y-4">
                <Notice tone="policy">{tt(record.note)}</Notice>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(record.estimates || []).map((estimate) => (
                    <SectionCard
                      key={estimate.id}
                      title={tt(estimate.label)}
                      actions={<Money amount={estimate.amount} strong />}
                      footer={<span className="ibmt-num">Policy {record.policy_version}</span>}
                    >
                      <p className="text-[12px] leading-relaxed text-muted-foreground">{tt(estimate.rule_text)}</p>
                      <dl className="mt-3 space-y-2">
                        {estimate.inputs?.map((input) => (
                          <div key={input.label.en} className="flex items-start justify-between gap-4 text-[12px]">
                            <dt className="text-muted-foreground">{tt(input.label)}</dt>
                            <dd className="ibmt-num text-right font-medium">{input.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </SectionCard>
                  ))}
                </div>
              </div>
            )}
          </DataState>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <SectionCard title={t('common.status')} description={tt(quality.data?.note)}>
            <DataState query={quality} skeleton="cards">
              {(record) => (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={record.series || []} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="complete_records" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name={t('common.status')} />
                      <Bar dataKey="reviewed" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name={t('nav.oversight')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SectionCard title={t('common.export')} description={t('privacy.rightsBody')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={() => exportRequest.run({ scope: 'tra_aggregate' })}
            disabled={exportRequest.saving}
          >
            {exportRequest.saving ? t('common.working') : t('common.export')}
          </Button>
          {exportRequest.status === 'success' && (
            <Notice tone="positive">
              {t('privacy.requested')} · <span className="ibmt-num">{exportRequest.result?.export_id}</span>
            </Notice>
          )}
        </div>
        <Notice tone="policy" className="mt-4">
          {t('policy.committeeNeverTra')}
        </Notice>
      </SectionCard>
    </div>
  );
}