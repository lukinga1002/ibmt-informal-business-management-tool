import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Money, { AmountRow } from '@/components/ibmt/Money';
import SyncQueueBanner from '@/components/ibmt/SyncQueueBanner';
import Notice from '@/components/ibmt/Notice';
import PolicyList from '@/components/ibmt/PolicyList';
import UploadField from '@/components/ibmt/UploadField';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Field, { TextInput, SelectControl, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

const GRADES = ['all', 'strong', 'moderate', 'weak'];

const GRADE_TONE = { strong: 'success', moderate: 'warning', weak: 'danger' };

export default function OperatorMoney() {
  const { t, tt, lang } = useT();
  const [grade, setGrade] = useState('all');
  const [form, setForm] = useState({ supplier: '', amount: '', incurred_on: '' });
  const [errors, setErrors] = useState({});
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);

  const expenses = useIBMTQuery('listExpenses', { evidence: grade === 'all' ? undefined : grade, limit: 8 });
  const summary = useIBMTQuery('getFinancialSummary');
  const create = useIBMTMutation('createExpense');
  const exportRequest = useIBMTMutation('requestExport');

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.supplier || form.supplier.trim().length < 3) next.supplier = t('forms.fixErrors');
    const amount = Number(form.amount);
    if (!amount || amount <= 0) next.amount = t('forms.fixErrors');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await create.run({
      supplier: form.supplier.trim(),
      amount,
      incurred_on: form.incurred_on || undefined,
      evidence: evidenceUploaded,
    });
    if (result) {
      setForm({ supplier: '', amount: '', incurred_on: '' });
      setEvidenceUploaded(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.money')}
        lede={t('policy.expenseEvidence')}
        meta={[{ label: t('policy.expenseEvidence') }]}
      />

      <SyncQueueBanner />

      <Tabs defaultValue="expenses">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="expenses" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.expense')}
          </TabsTrigger>
          <TabsTrigger value="summary" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('common.total')}
          </TabsTrigger>
          <TabsTrigger value="exports" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('common.export')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard
              title={t('term.expense')}
              actions={
                <div className="flex items-center gap-2">
                  <label htmlFor="grade-filter" className="sr-only">
                    {t('common.filter')}
                  </label>
                  <SelectControl id="grade-filter" className="h-10 w-[170px] text-[13px]" value={grade} onChange={(event) => setGrade(event.target.value)}>
                    {GRADES.map((value) => (
                      <option key={value} value={value}>
                        {value === 'all' ? t('common.all') : value}
                      </option>
                    ))}
                  </SelectControl>
                </div>
              }
            >
              <DataState query={expenses} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <>
                    <DataTable
                      columns={[
                        { key: 'supplier', header: t('common.details'), className: 'font-medium' },
                        { key: 'incurred_on', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.incurred_on, lang) },
                        { key: 'amount', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.amount} /> },
                        { key: 'evidence_grade', header: t('common.evidence'), render: (row) => <StatusBadge status={GRADE_TONE[row.evidence_grade]} label={tt(row.evidence_label)} /> },
                      ]}
                      rows={expenses.items}
                    />
                    {expenses.hasMore && (
                      <Button type="button" variant="outline" className="ibmt-tap mt-4 w-full" onClick={expenses.loadMore} disabled={expenses.loadingMore}>
                        {expenses.loadingMore ? t('common.loading') : t('common.loadMore')}
                      </Button>
                    )}
                  </>
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.expense')} description={t('forms.requiredMark')}>
              <form onSubmit={submit} className="space-y-4" noValidate>
                <Field label={t('common.details')} required error={errors.supplier || create.fieldErrors?.supplier}>
                  {(props) => <TextInput {...props} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} />}
                </Field>
                <Field label={t('common.amount')} required error={errors.amount} hint="TZS">
                  {(props) => (
                    <TextInput {...props} className={`${props.className} ibmt-num`} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" />
                  )}
                </Field>
                <Field label={t('common.date')}>
                  {(props) => <TextInput {...props} type="date" value={form.incurred_on} onChange={(event) => setForm({ ...form, incurred_on: event.target.value })} />}
                </Field>
                <UploadField
                  label={t('common.evidence')}
                  hint={t('policy.expenseEvidence')}
                  purpose="expense_evidence"
                  onUploaded={() => setEvidenceUploaded(true)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={create.saving}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {create.saving ? t('common.working') : t('common.add')}
                  </Button>
                  <FormStatus mutation={create} />
                </div>
              </form>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-6">
          <DataState query={summary} skeleton="cards">
            {(record) => (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <SectionCard title={t('common.total')} description={record.period ? `${formatDate(record.period.from, lang)} — ${formatDate(record.period.to, lang)}` : undefined}>
                  <AmountRow label={t('term.turnover')} amount={record.turnover} noteKey={record.turnover_note} tone="total" />
                  <AmountRow label={t('policy.allocationTax')} amount={record.tax?.amount} note={tt(record.tax?.label)} />
                  <AmountRow label={t('policy.permitVsTax')} amount={record.permit_fees?.amount} note={tt(record.permit_fees?.label)} noteKey={record.permit_fees?.note} />
                </SectionCard>
                <div className="space-y-4">
                  <SectionCard title={t('common.evidence')} description={record.evidence_note ? t(record.evidence_note) : undefined}>
                    <DataTable
                      dense
                      columns={[
                        { key: 'label', header: t('common.status'), render: (row) => tt(row.label) },
                        { key: 'amount', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.amount} /> },
                      ]}
                      rows={record.expense_totals_by_grade || []}
                      rowKey="grade"
                    />
                  </SectionCard>
                  <Notice tone="policy">{t('policy.turnoverVsTax')}</Notice>
                  <Notice tone="policy">{t('policy.permitVsTax')}</Notice>
                  <Notice tone="neutral">{t('policy.expenseEvidence')}</Notice>
                </div>
              </div>
            )}
          </DataState>
        </TabsContent>

        <TabsContent value="exports" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <SectionCard title={t('common.export')} description={t('privacy.rightsBody')}>
              <Button
                type="button"
                className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={() => exportRequest.run({ scope: 'own_records' })}
                disabled={exportRequest.saving}
              >
                {exportRequest.saving ? t('common.working') : t('privacy.requestExport')}
              </Button>
              {exportRequest.status === 'success' && (
                <Notice tone="positive" className="mt-4">
                  {t('privacy.requested')} · <span className="ibmt-num">{exportRequest.result?.export_id}</span>
                  <span className="mt-1 block text-[11px]">{t('forms.idempotency')}</span>
                </Notice>
              )}
              <FormStatus mutation={exportRequest} className="mt-3" />
            </SectionCard>
            <PolicyList keys={['policy.turnoverVsTax', 'policy.noAutoPublication', 'policy.noSurveillance', 'policy.retentionFromBackend']} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}