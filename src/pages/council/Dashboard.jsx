import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import ReasonDialog from '@/components/ibmt/ReasonDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

export default function CouncilDashboard() {
  const { t, tt, lang } = useT();
  const overview = useIBMTQuery('getCouncilOverview');
  const wardReports = useIBMTQuery('listWardReports', { limit: 6 });
  const fees = useIBMTQuery('getCouncilFees');
  const review = useIBMTMutation('reviewWardReport');
  const exportRequest = useIBMTMutation('requestExport');

  const [decision, setDecision] = useState(null);

  const decide = async (reason) => {
    const result = await review.run({ id: decision.report.id, decision: decision.kind, reason });
    if (result) setDecision(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.dashboard')}
        lede={t('landing.forGovernmentBody')}
        meta={[
          { label: `${t('term.jurisdiction')}: ${(overview.data?.jurisdiction?.wards || []).join(' · ') || '—'}` },
          { label: t('policy.permitVsTax') },
        ]}
      />

      <DataState query={overview} skeleton="cards">
        {(record) => (
          <StatGrid columns={4} items={(record.counters || []).map((counter) => ({ key: counter.key, label: tt(counter.label), value: counter.value }))} />
        )}
      </DataState>

      <Tabs defaultValue="queue">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="queue" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('nav.oversight')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.permit')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.ward')}
          </TabsTrigger>
          <TabsTrigger value="fees" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('common.export')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <SectionCard title={t('nav.oversight')} description={t('policy.noAutoEnforcement')}>
            <DataState query={overview} skeleton="table">
              {(record) => (
                <DataTable
                  columns={[
                    { key: 'kind', header: t('common.details'), render: (row) => t(`nav.${row.kind === 'ward_report' ? 'oversight' : row.kind === 'permit' ? 'permits' : row.kind === 'rating' ? 'receipts' : 'operations'}`) },
                    { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                    { key: 'ward_id', header: t('term.ward') },
                    { key: 'age_days', header: t('common.date'), className: 'ibmt-num', render: (row) => `${row.age_days}d` },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                  ]}
                  rows={record.queue || []}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <SectionCard title={t('term.permit')} description={t('policy.permitVsTax')}>
            <DataState query={overview} skeleton="table">
              {(record) => (
                <DataTable
                  columns={[
                    { key: 'date', header: t('common.date'), className: 'ibmt-num' },
                    { key: 'label', header: t('common.details'), render: (row) => tt(row.label) },
                    { key: 'venue', header: t('term.ward'), render: (row) => `${tt(row.venue)} · ${row.ward_id}` },
                    { key: 'permit_ref', header: t('common.reference'), className: 'ibmt-num' },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                  ]}
                  rows={record.calendar || []}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <SectionCard title={t('term.ward')} description={t('policy.humanReviewOnly')}>
            <DataState query={wardReports} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-4">
                  {wardReports.items.map((report) => (
                    <li key={report.id} className="rounded-md border border-border px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-navy">
                            {report.ward_id} · {report.period}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{tt(report.submitted_by)} · {formatDate(report.submitted_at, lang)}</p>
                        </div>
                        <StatusBadge status={report.status} />
                      </div>
                      {report.flags?.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {report.flags.map((flag) => (
                            <li key={flag.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                              <StatusBadge status="human_review" />
                              {tt(flag.label)} · {flag.automatic_action ? t('common.yes') : t('common.no')}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['approved', 'queried', 'rejected'].map((kind) => (
                          <Button key={kind} type="button" variant="outline" size="sm" onClick={() => setDecision({ report, kind })}>
                            {t(`common.${kind === 'approved' ? 'approve' : kind === 'queried' ? 'query' : 'reject'}`)}
                          </Button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <SectionCard title={t('policy.permitVsTax')} description={t('policy.permitVsTax')}>
              <DataState query={fees} skeleton="cards">
                {(record) => (
                  <>
                    <dl className="mb-4 rounded-md border border-border px-4 py-3">
                      <dt className="ibmt-kicker">{t('term.permit')}</dt>
                      <dd className="mt-1">
                        <Money amount={record.permit_fees} strong />
                      </dd>
                      <p className="ibmt-hint mt-2">{tt(record.tax_note)}</p>
                    </dl>
                    <DataTable
                      dense
                      columns={[
                        { key: 'ward_id', header: t('term.ward') },
                        { key: 'permits', header: t('nav.permits'), className: 'ibmt-num' },
                        { key: 'fees', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.fees} /> },
                      ]}
                      rows={record.by_ward || []}
                    />
                  </>
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('common.export')} description={t('privacy.rightsBody')}>
              <Button
                type="button"
                className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={() => exportRequest.run({ scope: 'council_fee_report' })}
                disabled={exportRequest.saving}
              >
                {exportRequest.saving ? t('common.working') : t('common.export')}
              </Button>
              {exportRequest.status === 'success' && (
                <Notice tone="positive" className="mt-4">
                  {t('privacy.requested')} · <span className="ibmt-num">{exportRequest.result?.export_id}</span>
                </Notice>
              )}
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
        title={`${t('common.reason')} — ${decision?.report?.ward_id || ''}`}
        description={t('common.reasonRequired')}
        confirmLabel={t('common.confirm')}
        busy={review.saving}
        fieldError={review.fieldErrors?.reason}
        serverError={review.status === 'error' && !review.fieldErrors?.reason ? review.error?.message : null}
        onConfirm={decide}
      />
    </div>
  );
}