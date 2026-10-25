import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Timeline from '@/components/ibmt/Timeline';
import Field, { TextInput, TextArea, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export default function ConsumerCases() {
  const { t, tt, lang } = useT();
  const complaints = useIBMTQuery('listComplaints', { scope: 'mine', limit: 6 });
  const ratings = useIBMTQuery('listRatings', { status: 'awaiting_confirmation', limit: 4 });
  const create = useIBMTMutation('createComplaint');
  const [form, setForm] = useState({ subject: '', body: '', about_ref: '' });
  const [errors, setErrors] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.subject || form.subject.trim().length < 4) next.subject = t('forms.fixErrors');
    if (!form.body || form.body.trim().length < 10) next.body = t('forms.fixErrors');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await create.run({ subject: form.subject.trim(), body: form.body.trim(), about_ref: form.about_ref.trim() || null });
    if (result) setForm({ subject: '', body: '', about_ref: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('term.complaint')}
        lede={t('policy.noAutoPublication')}
        meta={[{ label: t('term.rating') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
                          {complaint.reference} · {complaint.about_ref} · {formatDate(complaint.filed_at, lang)}
                        </p>
                      </div>
                      <StatusBadge status={complaint.status} />
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{tt(complaint.body)}</p>
                    {complaint.replies?.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
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
                    <p className="ibmt-hint mt-3">{t('policy.noAutoPublication')}</p>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={t('term.complaint')} description={t('forms.requiredMark')}>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <Field label={t('common.details')} required error={errors.subject || create.fieldErrors?.subject}>
                {(props) => <TextInput {...props} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />}
              </Field>
              <Field label={t('common.reference')} hint="IBMT-RCP-…">
                {(props) => <TextInput {...props} className={`${props.className} ibmt-num`} value={form.about_ref} onChange={(event) => setForm({ ...form, about_ref: event.target.value })} />}
              </Field>
              <Field label={t('common.notes')} required error={errors.body}>
                {(props) => <TextArea {...props} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />}
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={create.saving}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {create.saving ? t('common.working') : t('common.submit')}
                </Button>
                <FormStatus mutation={create} />
              </div>
            </form>
          </SectionCard>

          <SectionCard title={t('term.rating')} description={t('common.demonstration')}>
            <DataState query={ratings} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-3">
                  {ratings.items.map((rating) => (
                    <li key={rating.id} className="rounded-md border border-border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="ibmt-num text-[13px] font-semibold text-navy">{rating.score}/5</span>
                        <StatusBadge status={rating.moderation_status} />
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{tt(rating.comment)}</p>
                      <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">{rating.receipt_reference}</p>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
            <Notice tone="caution" className="mt-4">
              {t('policy.noAutoPublication')}
            </Notice>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}