import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
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
import Field, { TextInput, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

function DepositDialog({ booking, open, onOpenChange }) {
  const { t } = useT();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const record = useIBMTMutation('recordDeposit');

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError(t('forms.fixErrors'));
      return;
    }
    if (value > (booking?.agreed_total || 0)) {
      setError(t('forms.fixErrors'));
      return;
    }
    setError('');
    const result = await record.run({ id: booking.id, amount: value });
    if (result) {
      setAmount('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('term.deposit')}</DialogTitle>
          <DialogDescription>{t('policy.ibmtHoldsNoFunds')}</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <Field label={t('common.amount')} required error={error || record.fieldErrors?.amount} hint="TZS">
            {(props) => (
              <TextInput {...props} className={`${props.className} ibmt-num`} value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" />
            )}
          </Field>
          <FormStatus mutation={record} className="mt-3" />
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button type="button" variant="outline" className="ibmt-tap" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={submit} disabled={record.saving}>
            {record.saving ? t('common.working') : t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OperatorOperations() {
  const { t, tt, lang } = useT();
  const [depositFor, setDepositFor] = useState(null);
  const [permitForm, setPermitForm] = useState({ event_date: '', venue: '' });
  const [permitErrors, setPermitErrors] = useState({});
  const [replyFor, setReplyFor] = useState(null);
  const [replyBody, setReplyBody] = useState('');

  const bookings = useIBMTQuery('listBookings', { limit: 6 });
  const permits = useIBMTQuery('listPermits', { limit: 6 });
  const complaints = useIBMTQuery('listComplaints', { limit: 6 });
  const submitPermit = useIBMTMutation('submitPermit');
  const reply = useIBMTMutation('replyComplaint');

  const submitPermitForm = async (event) => {
    event.preventDefault();
    const next = {};
    if (!permitForm.event_date) next.event_date = t('forms.fixErrors');
    if (!permitForm.venue || permitForm.venue.trim().length < 3) next.venue = t('forms.fixErrors');
    setPermitErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await submitPermit.run({ event_date: permitForm.event_date, venue: permitForm.venue.trim() });
    if (result) setPermitForm({ event_date: '', venue: '' });
  };

  const sendReply = async () => {
    if (!replyBody || replyBody.trim().length < 6) return;
    const result = await reply.run({ id: replyFor.id, body: replyBody.trim() });
    if (result) {
      setReplyFor(null);
      setReplyBody('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('brand.events')} title={t('nav.operations')} lede={t('landing.forOperatorsBody')} />

      <Tabs defaultValue="bookings">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="bookings" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.booking')}
          </TabsTrigger>
          <TabsTrigger value="permits" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.permit')}
          </TabsTrigger>
          <TabsTrigger value="complaints" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.complaint')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <SectionCard title={t('term.booking')} description={t('policy.ibmtHoldsNoFunds')}>
            <DataState query={bookings} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <>
                  <DataTable
                    columns={[
                      { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                      { key: 'counterparty_name', header: t('roles.consumer') },
                      { key: 'event_date', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.event_date, lang) },
                      { key: 'agreed_total', header: t('common.total'), align: 'right', render: (row) => <Money amount={row.agreed_total} /> },
                      { key: 'deposit', header: t('term.deposit'), align: 'right', render: (row) => <Money amount={row.deposit} /> },
                      { key: 'balance', header: t('rent.rentDue'), align: 'right', render: (row) => <Money amount={row.balance} /> },
                      { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                      {
                        key: 'action',
                        header: '',
                        align: 'right',
                        render: (row) => (
                          <Button type="button" variant="outline" size="sm" onClick={() => setDepositFor(row)}>
                            {t('term.deposit')}
                          </Button>
                        ),
                      },
                    ]}
                    rows={bookings.items}
                  />
                  <div className="mt-4 space-y-3">
                    {bookings.items.map((booking) => (
                      <div key={booking.id} className="rounded-md border border-border px-4 py-3">
                        <p className="text-[12px] font-semibold text-navy">{booking.reference} · {tt(booking.agreed_terms)}</p>
                        <ul className="mt-2 flex flex-wrap gap-3">
                          {(booking.deliverables || []).map((item) => (
                            <li key={item.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                              <StatusBadge status={item.state} />
                              {tt(item.label)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="permits" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title={t('term.permit')}>
              <DataState query={permits} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <DataTable
                    columns={[
                      { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                      { key: 'event_date', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.event_date, lang) },
                      { key: 'venue', header: t('common.details'), render: (row) => tt(row.venue) },
                      { key: 'status', header: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
                      { key: 'decision_reason', header: t('common.reason'), hideBelow: 'lg', render: (row) => (row.decision_reason ? tt(row.decision_reason) : '—') },
                    ]}
                    rows={permits.items}
                  />
                )}
              </DataState>
              <Notice tone="policy" className="mt-4">
                {t('policy.permitVsTax')}
              </Notice>
            </SectionCard>

            <SectionCard title={t('term.permit')} description={t('forms.requiredMark')}>
              <form onSubmit={submitPermitForm} className="space-y-4" noValidate>
                <Field label={t('common.date')} required error={permitErrors.event_date || submitPermit.fieldErrors?.event_date}>
                  {(props) => <TextInput {...props} type="date" value={permitForm.event_date} onChange={(event) => setPermitForm({ ...permitForm, event_date: event.target.value })} />}
                </Field>
                <Field label={t('common.details')} required error={permitErrors.venue}>
                  {(props) => <TextInput {...props} value={permitForm.venue} onChange={(event) => setPermitForm({ ...permitForm, venue: event.target.value })} />}
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={submitPermit.saving}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {submitPermit.saving ? t('common.working') : t('common.submit')}
                  </Button>
                  <FormStatus mutation={submitPermit} />
                </div>
              </form>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="complaints" className="mt-4">
          <SectionCard title={t('term.complaint')} description={t('policy.noAutoPublication')}>
            <DataState query={complaints} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-4">
                  {complaints.items.map((complaint) => (
                    <li key={complaint.id} className="rounded-md border border-border px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-navy">{tt(complaint.subject)}</p>
                          <p className="ibmt-num text-[11px] text-muted-foreground">
                            {complaint.reference} · {formatDate(complaint.filed_at, lang)} · {complaint.visibility}
                          </p>
                        </div>
                        <StatusBadge status={complaint.status} />
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{tt(complaint.body)}</p>
                      {complaint.replies?.length > 0 && (
                        <div className="mt-3">
                          <Timeline
                            dense
                            items={complaint.replies.map((entry) => ({
                              id: entry.id,
                              label: `${tt(entry.by)} — ${tt(entry.body)}`,
                              at: formatDate(entry.at, lang),
                              status: 'success',
                            }))}
                          />
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm" className="ibmt-tap mt-3 gap-2" onClick={() => setReplyFor(complaint)}>
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('common.reply')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <DepositDialog booking={depositFor} open={Boolean(depositFor)} onOpenChange={(open) => !open && setDepositFor(null)} />

      <Dialog open={Boolean(replyFor)} onOpenChange={(open) => !open && setReplyFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.reply')}</DialogTitle>
            <DialogDescription>{t('policy.noAutoPublication')}</DialogDescription>
          </DialogHeader>
          <Field label={t('common.details')} required>
            {(props) => <TextInput {...props} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />}
          </Field>
          <FormStatus mutation={reply} className="mt-2" />
          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setReplyFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={sendReply} disabled={reply.saving}>
              {reply.saving ? t('common.working') : t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}