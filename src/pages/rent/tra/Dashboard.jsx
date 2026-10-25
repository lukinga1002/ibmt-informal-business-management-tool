import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import PolicyList from '@/components/ibmt/PolicyList';
import Money from '@/components/ibmt/Money';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate } from '@/lib/format';

export default function RentTraDashboard() {
  const { t, tt, lang } = useT();
  const stats = useIBMTQuery('getRentTraStats');
  const accessLog = useIBMTQuery('getRentAccessLog', { limit: 8 });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('roles.tra')}
        lede={t('rent.withheldRemitted')}
        meta={[
          { label: `Policy ${stats.data?.policy_version || '—'}` },
          { label: t('rent.accessLogging') },
          { label: t('common.notConfirmed') },
        ]}
      />

      <DataState query={stats} skeleton="cards">
        {(record) => (
          <div className="space-y-6">
            <StatGrid
              columns={4}
              items={[
                { key: 'units', label: t('rent.unitStats'), value: String(record.units?.registered ?? '—') },
                { key: 'eligible', label: t('rent.eligible'), value: String(record.units?.eligible ?? '—') },
                { key: 'withheld', label: t('rent.taxWithheld'), value: `TZS ${Number(record.withheld || 0).toLocaleString()}` },
                { key: 'remitted', label: t('status.remitted'), value: `TZS ${Number(record.remitted || 0).toLocaleString()}` },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <SectionCard title={t('rent.withheldRemitted')} description={t('rent.statusesSeparate')}>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={record.trend || []} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="withheld" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name={t('rent.taxWithheld')} />
                      <Bar dataKey="remitted" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name={t('status.remitted')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <div className="space-y-4">
                <SectionCard title={t('rent.stampDuty')}>
                  <dl className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[13px] text-muted-foreground">{t('status.settled')}</dt>
                      <dd><Money amount={record.stamp_duty?.collected} /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[13px] text-muted-foreground">{t('common.total')}</dt>
                      <dd><Money amount={record.stamp_duty?.assessed} /></dd>
                    </div>
                  </dl>
                </SectionCard>

                <SectionCard title={t('rent.exemptions')}>
                  <p className="ibmt-num font-heading text-xl font-semibold text-navy">{record.exemptions?.low_rent_units ?? '—'}</p>
                  <p className="ibmt-hint mt-2">{t(record.exemptions?.note || 'policy.lowRentExemption')}</p>
                </SectionCard>
              </div>
            </div>

            <PolicyList keys={record.notes || []} columns={2} />
          </div>
        )}
      </DataState>

      <SectionCard title={t('rent.accessLogging')} description={tt(stats.data?.access_note)}>
        <DataState query={accessLog} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <>
              <DataTable
                columns={[
                  { key: 'occurred_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.occurred_at, lang) },
                  { key: 'actor_role', header: t('roles.label'), render: (row) => t(`roles.${row.actor_role}`) },
                  { key: 'purpose', header: t('common.reason'), render: (row) => tt(row.purpose) },
                  { key: 'record_type', header: t('common.reference'), hideBelow: 'lg', render: (row) => tt(row.record_type) },
                ]}
                rows={accessLog.items}
              />
              {accessLog.hasMore && (
                <button type="button" onClick={accessLog.loadMore} className="ibmt-tap mt-4 w-full rounded-md border border-border text-[13px] font-medium text-navy">
                  {accessLog.loadingMore ? t('common.loading') : t('common.loadMore')}
                </button>
              )}
            </>
          )}
        </DataState>
        <Notice tone="privacy" className="mt-4">
          {t('policy.tenantDetailsLimit')}
        </Notice>
        <p className="ibmt-hint mt-3">
          {t('rent.unitStats')}: {stats.data?.units?.registered ?? '—'} · {t('status.pending')}: {stats.data?.units?.awaiting_verification ?? '—'}
        </p>
      </SectionCard>
    </div>
  );
}