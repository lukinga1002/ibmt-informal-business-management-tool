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
import Field, { TextInput, TextArea, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

const CHECKLIST = [
  { id: 'walls', label: { en: 'Walls and ceiling', sw: 'Kuta na dari' } },
  { id: 'plumbing', label: { en: 'Plumbing', sw: 'Mabomba' } },
  { id: 'locks', label: { en: 'Window locks', sw: 'Kufunga madirisha' } },
];

export default function LandlordCases() {
  const { t, tt, lang } = useT();
  const disputes = useIBMTQuery('listDisputes', { limit: 8 });
  const deposits = useIBMTQuery('listDeposits', { limit: 6 });
  const createDispute = useIBMTMutation('createDispute');
  const createCondition = useIBMTMutation('createConditionReport');
  const [form, setForm] = useState({ unit_ref: '', kind: 'arrears', summary: '' });
  const [errors, setErrors] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.unit_ref) next.unit_ref = t('forms.fixErrors');
    if (!form.summary || form.summary.trim().length < 8) next.summary = t('forms.fixErrors');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await createDispute.run({ ...form, summary: form.summary.trim() });
    if (result) setForm({ unit_ref: '', kind: 'arrears', summary: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.cases')}
        lede={t('policy.noAutoEnforcement')}
        meta={[{ label: t('rent.checklist') }, { label: t('policy.humanReviewOnly') }]}
      />

      <Notice tone="policy">{t('policy.noAutoEnforcement')}</Notice>

      <Tabs defaultValue="disputes">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="disputes" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.dispute')}
          </TabsTrigger>
          <TabsTrigger value="conditions" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.conditionReport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title={t('term.dispute')} description={t('policy.humanReviewOnly')}>
              <DataState query={disputes} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <DataTable
                    columns={[
                      { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                      { key: 'kind', header: t('common.details'), render: (row) => t(`term.${row.kind === 'arrears' ? 'notice' : row.kind}`) },
                      { key: 'raised_by', header: t('roles.label'), render: (row) => tt(row.raised_by) },
                      { key: 'filed_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.filed_at, lang) },
                      { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                      { key: 'mediation_state', header: t('term.mediation'), render: (row) => <StatusBadge status={row.mediation_state === 'in_review' ? 'in_review' : 'pending'} label={row.mediation_state} /> },
                    ]}
                    rows={disputes.items}
                  />
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.dispute')} description={t('forms.requiredMark')}>
              <form onSubmit={submit} className="space-y-4" noValidate>
                <Field label={t('term.unit')} required error={errors.unit_ref}>
                  {(props) => (
                    <TextInput
                      {...props}
                      className={`${props.className} ibmt-num`}
                      value={form.unit_ref}
                      onChange={(event) => setForm({ ...form, unit_ref: event.target.value.toUpperCase() })}
                    />
                  )}
                </Field>
                <Field label={t('common.details')} required error={errors.summary}>
                  {(props) => <TextArea {...props} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />}
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={createDispute.saving}>
                    {createDispute.saving ? t('common.working') : t('common.submit')}
                  </Button>
                  <FormStatus mutation={createDispute} />
                </div>
              </form>
              <Notice tone="policy" className="mt-4">
                {t('policy.humanReviewOnly')}
              </Notice>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="conditions" className="mt-4">
          <SectionCard title={t('term.conditionReport')} description={t('policy.checklistNotRelease')}>
            <DataState query={deposits} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-4">
                  {deposits.items.map((deposit) => (
                    <li key={deposit.id} className="rounded-md border border-border px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="ibmt-num text-[13px] font-semibold text-navy">{deposit.unit_ref}</p>
                          <p className="text-[11px] text-muted-foreground">{deposit.tenant_name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={deposit.checklist_state} />
                          <StatusBadge status={deposit.custody_state} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Money amount={deposit.amount} note={t('rent.deposit')} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={createCondition.saving}
                          onClick={() =>
                            createCondition.run({
                              deposit_id: deposit.id,
                              phase: 'move_out',
                              items: CHECKLIST.map((item) => ({ id: item.id, label: item.label, state: { en: 'Good', sw: 'Nzuri' } })),
                            })
                          }
                        >
                          {t('rent.checklist')}
                        </Button>
                        <span className="ibmt-hint">{t('policy.checklistNotRelease')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
            <FormStatus mutation={createCondition} className="mt-3" />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}