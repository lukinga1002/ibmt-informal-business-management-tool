import { useEffect, useState } from 'react';
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
import Timeline from '@/components/ibmt/Timeline';
import Field, { TextInput, SelectControl, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

export default function LandlordTenancies() {
  const { t, tt, lang } = useT();
  const tenancies = useIBMTQuery('listTenancies', { limit: 8 });
  const notices = useIBMTQuery('listNotices', { limit: 8 });
  const [leaseId, setLeaseId] = useState(null);
  const lease = useIBMTQuery('getLease', { id: leaseId }, { enabled: Boolean(leaseId) });
  const updateLease = useIBMTMutation('updateLease');
  const issueNotice = useIBMTMutation('issueNotice');

  const [rentForm, setRentForm] = useState({ monthly_rent: '' });
  const [noticeForm, setNoticeForm] = useState({ unit_ref: '', kind: 'renewal', body: '' });
  const [noticeErrors, setNoticeErrors] = useState({});

  useEffect(() => {
    if (lease.data) setRentForm({ monthly_rent: String(lease.data.terms?.monthly_rent || '') });
  }, [lease.data]);

  const submitNotice = async (event) => {
    event.preventDefault();
    const next = {};
    if (!noticeForm.unit_ref) next.unit_ref = t('forms.fixErrors');
    if (!noticeForm.body || noticeForm.body.trim().length < 8) next.body = t('forms.fixErrors');
    setNoticeErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await issueNotice.run({ unit_ref: noticeForm.unit_ref, kind: noticeForm.kind, body: noticeForm.body.trim() });
    if (result) setNoticeForm({ unit_ref: '', kind: 'renewal', body: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.tenancies')}
        lede={t('policy.oneTenancyOneUnit')}
        meta={[{ label: t('policy.migration') }, { label: t('policy.withholdingDesign') }]}
      />

      <Tabs defaultValue="tenancies">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="tenancies" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.tenancy')}
          </TabsTrigger>
          <TabsTrigger value="notices" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.notice')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenancies" className="mt-4 space-y-6">
          <SectionCard title={t('term.tenancy')} description={t('policy.oneTenancyOneUnit')}>
            <DataState query={tenancies} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                    { key: 'tenant_name', header: t('term.tenants'), render: (row) => row.tenant_name || t('states.emptyTitle') },
                    { key: 'start_date', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.start_date, lang) },
                    { key: 'paid_through', header: t('rent.rentDue'), className: 'ibmt-num', render: (row) => formatDate(row.paid_through, lang) },
                    { key: 'monthly_rent', header: t('rent.rentAmount'), align: 'right', render: (row) => <Money amount={row.monthly_rent} /> },
                    { key: 'legacy', header: t('rent.migration'), render: (row) => <StatusBadge status={row.legacy ? 'in_review' : 'active'} label={row.legacy ? t('rent.migration') : t('status.active')} /> },
                    { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                    {
                      key: 'action',
                      header: '',
                      align: 'right',
                      render: (row) =>
                        row.lease_id ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => setLeaseId(row.lease_id)}>
                            {t('common.view')}
                          </Button>
                        ) : null,
                    },
                  ]}
                  rows={tenancies.items}
                />
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notices" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title={t('term.notice')} description={t('policy.withholdingDesign')}>
              <DataState query={notices} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <ul className="space-y-3">
                    {notices.items.map((notice) => (
                      <li key={notice.id} className="rounded-md border border-border px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="ibmt-num text-[13px] font-semibold text-navy">
                            {notice.unit_ref} · {t(`term.${notice.kind === 'landlord_notification' ? 'notice' : notice.kind}`)}
                          </p>
                          <StatusBadge status={notice.status} />
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{tt(notice.body)}</p>
                        <p className="ibmt-num mt-2 text-[11px] text-muted-foreground">
                          {formatDate(notice.issued_at, lang)} → {t('rent.responseDue')} {formatDate(notice.response_due, lang)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.notice')} description={t('policy.humanReviewOnly')}>
              <form onSubmit={submitNotice} className="space-y-4" noValidate>
                <Field label={t('term.unit')} required error={noticeErrors.unit_ref}>
                  {(props) => (
                    <SelectControl {...props} value={noticeForm.unit_ref} onChange={(event) => setNoticeForm({ ...noticeForm, unit_ref: event.target.value })}>
                      <option value="">—</option>
                      {tenancies.items.map((tenancy) => (
                        <option key={tenancy.id} value={tenancy.unit_ref}>
                          {tenancy.unit_ref}
                        </option>
                      ))}
                    </SelectControl>
                  )}
                </Field>
                <Field label={t('common.status')}>
                  {(props) => (
                    <SelectControl {...props} value={noticeForm.kind} onChange={(event) => setNoticeForm({ ...noticeForm, kind: event.target.value })}>
                      <option value="renewal">{t('rent.renewal')}</option>
                      <option value="rent_due">{t('rent.rentDue')}</option>
                    </SelectControl>
                  )}
                </Field>
                <Field label={t('common.details')} required error={noticeErrors.body}>
                  {(props) => <TextInput {...props} value={noticeForm.body} onChange={(event) => setNoticeForm({ ...noticeForm, body: event.target.value })} />}
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={issueNotice.saving}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {issueNotice.saving ? t('common.working') : t('common.submit')}
                  </Button>
                  <FormStatus mutation={issueNotice} />
                </div>
              </form>
              <Notice tone="policy" className="mt-4">
                {t('policy.humanReviewOnly')}
              </Notice>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(leaseId)} onOpenChange={(open) => !open && setLeaseId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="ibmt-num">{lease.data?.unit_ref || t('states.loadingTitle')}</DialogTitle>
          </DialogHeader>
          <DataState query={lease} skeleton="lines">
            {(record) => (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={record.signature_state === 'success' ? 'confirmed' : record.signature_state === 'invalidated' ? 'rejected' : 'pending'} label={`${t('rent.signatureChallenge')}: ${record.signature_state}`} />
                  <StatusBadge status={record.stamp_duty_state === 'assessed' ? 'verified' : 'pending'} label={`${t('rent.stampState')}: ${record.stamp_duty_state}`} />
                  <StatusBadge status={record.activation_state === 'active' ? 'active' : 'pending'} label={`${t('rent.activation')}: ${record.activation_state}`} />
                </div>

                <AmountRow label={t('rent.rentAmount')} amount={record.terms?.monthly_rent} />
                <AmountRow label={t('rent.deposit')} amount={record.terms?.deposit} noteKey="policy.depositCustody" />
                <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                  <p className="text-[13px] font-medium">{t('rent.period')}</p>
                  <p className="ibmt-num text-[13px]">
                    {t('rent.months', { count: record.terms?.term_months })} · {t('rent.advanceMonths')}: {record.terms?.advance_months}
                  </p>
                </div>

                <div>
                  <p className="ibmt-kicker">{t('rent.parties')}</p>
                  <Timeline
                    dense
                    items={record.parties.map((party) => ({
                      id: party.ref,
                      label: `${tt(party.role)} — ${party.name}`,
                      at: party.signed_at ? formatDate(party.signed_at, lang) : t('common.no'),
                      status: party.signed ? 'success' : 'pending',
                      statusKey: party.signed ? 'confirmed' : 'awaiting_confirmation',
                    }))}
                  />
                </div>

                {record.changed_after_signature && (
                  <Notice tone="danger" title={t('states.conflictTitle')}>
                    {t('policy.policyVersioned')}
                  </Notice>
                )}

                <div className="flex flex-wrap items-end gap-3">
                  <Field label={t('rent.rentAmount')} className="w-[190px]">
                    {(props) => (
                      <TextInput {...props} className={`${props.className} ibmt-num`} inputMode="numeric" value={rentForm.monthly_rent} onChange={(event) => setRentForm({ monthly_rent: event.target.value.replace(/[^0-9]/g, '') })} />
                    )}
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    className="ibmt-tap"
                    disabled={updateLease.saving}
                    onClick={() => updateLease.run({ id: record.id, terms: { monthly_rent: Number(rentForm.monthly_rent) } })}
                  >
                    {updateLease.saving ? t('common.working') : t('common.update')}
                  </Button>
                  <FormStatus mutation={updateLease} />
                </div>

                <Notice tone="caution">{t('rent.reviewTerms')}</Notice>
                <ul className="space-y-2">
                  {(record.terms?.clauses || []).map((clause) => (
                    <li key={clause.en} className="border-l-2 border-gold pl-3 text-[12px] leading-relaxed text-navy-ink">
                      {tt(clause)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DataState>
        </DialogContent>
      </Dialog>
    </div>
  );
}