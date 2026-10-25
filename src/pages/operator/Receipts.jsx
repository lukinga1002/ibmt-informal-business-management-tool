import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money, { AmountRow } from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput, SelectControl, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, formatDateTime } from '@/lib/format';

const STATUS_FILTERS = ['all', 'draft', 'awaiting_confirmation', 'confirmed'];

export default function OperatorReceipts() {
  const { t, tt, lang } = useT();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ buyer_name: '', total: '', line: '' });
  const [errors, setErrors] = useState({});

  const list = useIBMTQuery('listReceipts', { status, q, limit: 8 });
  const detail = useIBMTQuery('getReceipt', { id: selectedId }, { enabled: Boolean(selectedId) });
  const create = useIBMTMutation('createReceipt');
  const issue = useIBMTMutation('issueReceipt');
  const confirm = useIBMTMutation('confirmReceipt');

  const submitNew = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.buyer_name || form.buyer_name.trim().length < 3) next.buyer_name = t('forms.fixErrors');
    const total = Number(form.total);
    if (!total || total <= 0) next.total = t('forms.fixErrors');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await create.run({
      buyer_name: form.buyer_name.trim(),
      total,
      lines: form.line ? [{ label: { en: form.line, sw: form.line }, amount: total }] : [],
    });
    if (result) {
      setForm({ buyer_name: '', total: '', line: '' });
      setSelectedId(result.id);
    }
  };

  const record = detail.data;
  const conflict = confirm.error?.kind === 'conflict' || issue.error?.kind === 'conflict';

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.receipts')}
        lede={t('notices.fiscal')}
        meta={[{ label: t('policy.turnoverVsTax') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title={t('nav.receipts')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="receipt-search" className="sr-only">
                {t('common.search')}
              </label>
              <TextInput
                id="receipt-search"
                className="h-10 w-[180px] text-[13px]"
                placeholder={t('common.search')}
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
              <label htmlFor="receipt-status" className="sr-only">
                {t('common.status')}
              </label>
              <SelectControl id="receipt-status" className="h-10 w-[190px] text-[13px]" value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {value === 'all' ? t('common.all') : t(`status.${value}`)}
                  </option>
                ))}
              </SelectControl>
            </div>
          }
        >
          <DataState query={list} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <>
                <DataTable
                  columns={[
                    { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                    { key: 'buyer_name', header: t('roles.consumer') },
                    { key: 'issued_on', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.issued_on, lang) },
                    { key: 'total', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.total} /> },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                    {
                      key: 'action',
                      header: '',
                      align: 'right',
                      render: (row) => (
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId(row.id)}>
                          {t('common.view')}
                        </Button>
                      ),
                    },
                  ]}
                  rows={list.items}
                />
                {list.hasMore && (
                  <Button type="button" variant="outline" className="ibmt-tap mt-4 w-full" onClick={list.loadMore} disabled={list.loadingMore}>
                    {list.loadingMore ? t('common.loading') : t('common.loadMore')}
                  </Button>
                )}
              </>
            )}
          </DataState>
        </SectionCard>

        <SectionCard title={t('nav.receipts')} description={t('landing.forOperatorsBody')}>
          <form onSubmit={submitNew} className="space-y-4" noValidate>
            <Field label={t('roles.consumer')} required error={errors.buyer_name || create.fieldErrors?.buyer_name}>
              {(props) => <TextInput {...props} value={form.buyer_name} onChange={(event) => setForm({ ...form, buyer_name: event.target.value })} />}
            </Field>
            <Field label={t('common.amount')} required error={errors.total || create.fieldErrors?.total} hint="TZS">
              {(props) => (
                <TextInput {...props} className={`${props.className} ibmt-num`} value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" />
              )}
            </Field>
            <Field label={`${t('common.details')} (${t('common.optional')})`}>
              {(props) => <TextInput {...props} value={form.line} onChange={(event) => setForm({ ...form, line: event.target.value })} />}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={create.saving}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {create.saving ? t('common.working') : t('common.add')}
              </Button>
              <FormStatus mutation={create} successLabel={t('states.successTitle')} />
            </div>
          </form>
          <Notice tone="caution" className="mt-4">
            {t('notices.fiscal')}
          </Notice>
          <Notice tone="policy" className="mt-3">
            {t('policy.turnoverVsTax')}
          </Notice>
        </SectionCard>
      </div>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="ibmt-num">{record?.reference || t('states.loadingTitle')}</DialogTitle>
          </DialogHeader>
          <DataState query={detail} skeleton="lines">
            {(item) => (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={item.status} />
                  <StatusBadge status={item.buyer_confirmation} />
                  <span className="ibmt-num text-[12px] text-muted-foreground">
                    {t('rent.termsVersion')} {item.version}
                  </span>
                </div>

                <AmountRow label={t('common.total')} amount={item.total} tone="total" />
                <ul className="space-y-2">
                  {(item.lines || []).map((line) => (
                    <li key={line.label.en} className="flex items-center justify-between gap-4 text-[13px]">
                      <span>{tt(line.label)}</span>
                      <Money amount={line.amount} />
                    </li>
                  ))}
                </ul>

                <Notice tone="policy">{t('notices.fiscal')}</Notice>
                {item.fiscal_status === 'fiscal' && <Notice tone="positive">{t('policy.fiscalConfirmed')}</Notice>}
                {item.confirmed_at && (
                  <p className="ibmt-num text-[12px] text-muted-foreground">
                    {t('states.successTitle')}: {formatDateTime(item.confirmed_at, lang)}
                  </p>
                )}

                {conflict && (
                  <Notice tone="danger" title={t('states.conflictTitle')}>
                    {t('states.conflictBody')}
                    <div className="mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={detail.reload}>
                        {t('states.reload')}
                      </Button>
                    </div>
                  </Notice>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {item.status === 'draft' && (
                    <Button
                      type="button"
                      className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                      onClick={() => issue.run({ id: item.id })}
                      disabled={issue.saving}
                    >
                      {issue.saving ? t('common.working') : t('common.submit')}
                    </Button>
                  )}
                  {item.status === 'awaiting_confirmation' && (
                    <Button
                      type="button"
                      className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                      onClick={() => confirm.run({ id: item.id, version: item.version })}
                      disabled={confirm.saving}
                    >
                      {confirm.saving ? t('common.working') : t('common.confirm')}
                    </Button>
                  )}
                  <FormStatus mutation={conflict ? { status: 'idle' } : confirm.status === 'error' ? confirm : issue} />
                </div>

                <div>
                  <p className="ibmt-kicker">{t('common.evidence')}</p>
                  {item.evidence?.length ? (
                    <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                      {item.evidence.map((evidence) => (
                        <li key={evidence.id}>{tt(evidence.label)} · {evidence.grade}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12px] text-muted-foreground">{t('states.emptyBody')}</p>
                  )}
                </div>
              </div>
            )}
          </DataState>
        </DialogContent>
      </Dialog>
    </div>
  );
}