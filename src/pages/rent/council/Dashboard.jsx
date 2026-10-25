import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import ReasonDialog from '@/components/ibmt/ReasonDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatPercent } from '@/lib/format';

export default function RentCouncilDashboard() {
  const { t, tt, lang } = useT();
  const licences = useIBMTQuery('listAgentLicences', { limit: 8 });
  const compliance = useIBMTQuery('listComplianceQueue', { limit: 8 });
  const complaints = useIBMTQuery('listComplaints', { limit: 6 });
  const stats = useIBMTQuery('getAreaStats');
  const decide = useIBMTMutation('decideAgentLicence');
  const [decision, setDecision] = useState(null);

  const submit = async (reason) => {
    const result = await decide.run({ id: decision.licence.agent_id, decision: decision.kind, reason });
    if (result) setDecision(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('roles.council')}
        lede={t('policy.licenceRule')}
        meta={[{ label: t('rent.complianceQueue') }, { label: t('policy.humanReviewOnly') }]}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Notice tone="caution">{t('policy.humanReviewOnly')}</Notice>
        <Notice tone="privacy">{t('policy.addressesNeverPublic')}</Notice>
      </div>

      <Tabs defaultValue="licences">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="licences" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.licensing')}
          </TabsTrigger>
          <TabsTrigger value="compliance" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.complianceQueue')}
          </TabsTrigger>
          <TabsTrigger value="complaints" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.complaint')}
          </TabsTrigger>
          <TabsTrigger value="stats" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.areaStats')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="licences" className="mt-4">
          <SectionCard title={t('rent.licensing')} description={t('policy.licenceRule')}>
            <DataState query={licences} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-3">
                  {licences.items.map((licence) => (
                    <li key={licence.agent_id} className="rounded-md border border-border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-navy">{licence.name}</p>
                          <p className="ibmt-num text-[11px] text-muted-foreground">
                            {licence.licence_number || t('states.emptyTitle')} · {licence.wards?.join(' · ')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={licence.status} />
                          <StatusBadge status={licence.ibmt_business ? 'verified' : 'unverified'} label={licence.ibmt_business ? t('brand.name') : t('status.unverified')} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { kind: 'active', label: t('common.approve') },
                          { kind: 'pending', label: t('common.query') },
                          { kind: 'expired', label: t('common.reject') },
                        ].map((action) => (
                          <Button key={action.kind} type="button" variant="outline" size="sm" onClick={() => setDecision({ licence, kind: action.kind })}>
                            {action.label}
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

        <TabsContent value="compliance" className="mt-4">
          <SectionCard title={t('rent.complianceQueue')} description={t('policy.humanReviewOnly')}>
            <DataState query={compliance} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                    { key: 'flag', header: t('common.reason'), render: (row) => tt(row.flag) },
                    { key: 'raised_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.raised_at, lang) },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                    { key: 'automatic_action', header: t('policy.noAutoEnforcement'), hideBelow: 'lg', render: (row) => (row.automatic_action ? t('common.yes') : t('common.no')) },
                  ]}
                  rows={compliance.items}
                />
              )}
            </DataState>
            <Notice tone="policy" className="mt-4">
              {t('policy.humanReviewOnly')}
            </Notice>
          </SectionCard>
        </TabsContent>

        <TabsContent value="complaints" className="mt-4">
          <SectionCard title={t('term.complaint')} description={t('policy.noAutoPublication')}>
            <DataState query={complaints} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-3">
                  {complaints.items.map((complaint) => (
                    <li key={complaint.id} className="rounded-md border border-border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] font-semibold text-navy">{tt(complaint.subject)}</p>
                        <StatusBadge status={complaint.status} />
                      </div>
                      <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">{complaint.reference} · {formatDate(complaint.filed_at, lang)}</p>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{tt(complaint.body)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <SectionCard title={t('rent.areaStats')} description={tt(stats.data?.note)}>
            <DataState query={stats} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {(record) => (
                <DataTable
                  columns={[
                    { key: 'ward_id', header: t('term.ward'), className: 'font-medium' },
                    { key: 'units', header: t('rent.units'), align: 'right', className: 'ibmt-num' },
                    { key: 'registered_percent', header: t('term.registration'), align: 'right', render: (row) => formatPercent(row.registered_percent, lang) },
                    { key: 'median_rent', header: t('rent.rentAmount'), align: 'right', render: (row) => <Money amount={row.median_rent} /> },
                    { key: 'occupancy_percent', header: t('rent.occupancy'), align: 'right', render: (row) => formatPercent(row.occupancy_percent, lang) },
                  ]}
                  rows={record.wards || []}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
        title={`${t('common.reason')} — ${decision?.licence?.name || ''}`}
        description={t('common.reasonRequired')}
        confirmLabel={t('common.confirm')}
        busy={decide.saving}
        fieldError={decide.fieldErrors?.reason}
        serverError={decide.status === 'error' && !decide.fieldErrors?.reason ? decide.error?.message : null}
        onConfirm={submit}
      />
    </div>
  );
}