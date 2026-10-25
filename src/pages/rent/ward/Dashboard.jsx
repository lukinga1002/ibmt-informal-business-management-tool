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
import { formatDate } from '@/lib/format';

export default function WardDashboard() {
  const { t, tt, lang } = useT();
  const queue = useIBMTQuery('listVerificationQueue', { limit: 8 });
  const mediation = useIBMTQuery('listMediationCases', { limit: 6 });
  const decide = useIBMTMutation('decideOwnership');
  const [decision, setDecision] = useState(null);

  const submit = async (reason) => {
    const result = await decide.run({ id: decision.unit.unit_id, decision: decision.kind, reason });
    if (result) setDecision(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('roles.ward')}
        lede={t('policy.ownershipVerifiedFirst')}
        meta={[{ label: t('term.jurisdiction') }, { label: t('policy.humanReviewOnly') }]}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Notice tone="policy">{t('policy.registrationNoOwnership')}</Notice>
        <Notice tone="caution">{t('policy.humanReviewOnly')}</Notice>
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="queue" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.verificationQueue')}
          </TabsTrigger>
          <TabsTrigger value="mediation" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.mediation')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <SectionCard title={t('rent.verificationQueue')} description={t('policy.addressMeterPrivate')}>
            <DataState query={queue} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-4">
                  {queue.items.map((item) => (
                    <li key={item.unit_id} className="rounded-md border border-border px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="ibmt-num text-[13px] font-semibold text-navy">{item.unit_ref}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.mtaa} · {t('common.date')}: {item.age_days}d
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={item.status} />
                          <Money amount={item.monthly_rent} muted />
                        </div>
                      </div>

                      {item.match_flags?.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {item.match_flags.map((flag) => (
                            <li key={flag.id} className="rounded-md border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[12px] text-warning">
                              {tt(flag.label)} · {flag.automatic_action ? t('common.yes') : t('common.no')}
                            </li>
                          ))}
                        </ul>
                      )}

                      {item.documents?.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {item.documents.map((doc) => (
                            <li key={doc.id} className="rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                              {tt(doc.label)} · {doc.grade}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { kind: 'approve', label: t('common.approve') },
                          { kind: 'query', label: t('common.query') },
                          { kind: 'reject', label: t('common.reject') },
                        ].map((action) => (
                          <Button key={action.kind} type="button" variant="outline" size="sm" onClick={() => setDecision({ unit: item, kind: action.kind })}>
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

        <TabsContent value="mediation" className="mt-4">
          <SectionCard title={t('rent.mediation')} description={t('policy.humanReviewOnly')}>
            <DataState query={mediation} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                    { key: 'filed_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.filed_at, lang) },
                    { key: 'summary', header: t('common.details'), render: (row) => tt(row.summary) },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                  ]}
                  rows={mediation.items}
                />
              )}
            </DataState>
            <Notice tone="policy" className="mt-4">
              {t('policy.noAutoEnforcement')}
            </Notice>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
        title={`${t('common.reason')} — ${decision?.unit?.unit_ref || ''}`}
        description={t('policy.ownershipVerifiedFirst')}
        confirmLabel={t('common.confirm')}
        tone={decision?.kind === 'reject' ? 'danger' : 'default'}
        busy={decide.saving}
        fieldError={decide.fieldErrors?.reason}
        serverError={decide.status === 'error' && !decide.fieldErrors?.reason ? decide.error?.message : null}
        onConfirm={submit}
      />
    </div>
  );
}