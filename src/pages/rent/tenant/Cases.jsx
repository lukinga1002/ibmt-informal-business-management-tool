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
import ConsentToggle from '@/components/ibmt/ConsentToggle';
import Field, { TextInput, TextArea, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

const CHECKLIST = [
  { id: 'walls', label: { en: 'Walls and ceiling', sw: 'Kuta na dari' } },
  { id: 'plumbing', label: { en: 'Plumbing', sw: 'Mabomba' } },
  { id: 'locks', label: { en: 'Window locks', sw: 'Kufunga madirisha' } },
  { id: 'roof', label: { en: 'Roof', sw: 'Paa' } },
];

export default function TenantCases() {
  const { t, tt, lang } = useT();
  const notices = useIBMTQuery('listNotices', { limit: 6 });
  const disputes = useIBMTQuery('listDisputes', { limit: 6 });
  const deposits = useIBMTQuery('listDeposits', { limit: 4 });
  const pack = useIBMTQuery('previewEvidencePack');
  const consents = useIBMTQuery('getConsents');

  const createDispute = useIBMTMutation('createDispute');
  const createCondition = useIBMTMutation('createConditionReport');
  const agreeCondition = useIBMTMutation('agreeConditionReport');
  const exportPack = useIBMTMutation('exportEvidencePack');
  const setConsent = useIBMTMutation('setConsent');

  const [disputeForm, setDisputeForm] = useState({ unit_ref: '', kind: 'deposit', summary: '' });
  const [disputeErrors, setDisputeErrors] = useState({});
  const [selected, setSelected] = useState([]);

  const submitDispute = async (event) => {
    event.preventDefault();
    const next = {};
    if (!disputeForm.unit_ref) next.unit_ref = t('forms.fixErrors');
    if (!disputeForm.summary || disputeForm.summary.trim().length < 8) next.summary = t('forms.fixErrors');
    setDisputeErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await createDispute.run({ ...disputeForm, summary: disputeForm.summary.trim() });
    if (result) setDisputeForm({ unit_ref: '', kind: 'deposit', summary: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.evidence')}
        lede={t('policy.checklistNotRelease')}
        meta={[{ label: t('policy.mutualRelease') }, { label: t('policy.humanReviewOnly') }]}
      />

      <Tabs defaultValue="deposits">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="deposits" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.deposit')}
          </TabsTrigger>
          <TabsTrigger value="notices" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.notice')}
          </TabsTrigger>
          <TabsTrigger value="disputes" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.dispute')}
          </TabsTrigger>
          <TabsTrigger value="pack" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.evidencePack')}
          </TabsTrigger>
          <TabsTrigger value="consent" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.consent')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="mt-4 space-y-6">
          <DataState query={deposits} skeleton="cards" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <div className="grid gap-6 lg:grid-cols-2">
                {deposits.items.map((deposit) => (
                  <SectionCard
                    key={deposit.id}
                    title={deposit.unit_ref}
                    description={tt(deposit.custodian)}
                    actions={<StatusBadge status={deposit.custody_state} />}
                    footer={<span className="ibmt-hint">{t('policy.checklistNotRelease')}</span>}
                  >
                    <Money amount={deposit.amount} strong note={t('rent.deposit')} />
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <dt className="ibmt-kicker">{t('rent.checklist')}</dt>
                        <dd className="mt-1 text-[12px]">{t(`status.${deposit.checklist_state}`)}</dd>
                      </div>
                      <div>
                        <dt className="ibmt-kicker">{t('rent.mutualCode')}</dt>
                        <dd className="mt-1 text-[12px]">
                          {t('roles.tenant')}: {deposit.release_codes?.tenant ? t('common.yes') : t('common.no')} · {t('term.landlord')}: {deposit.release_codes?.landlord ? t('common.yes') : t('common.no')}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={agreeCondition.saving}
                        onClick={() => agreeCondition.run({ id: 'cr-2', agreement_state: 'satisfied' })}
                      >
                        {t('rent.agree')}
                      </Button>
                    </div>
                    <FormStatus mutation={agreeCondition.status === 'error' ? agreeCondition : createCondition} className="mt-2" />
                  </SectionCard>
                ))}
              </div>
            )}
          </DataState>
        </TabsContent>

        <TabsContent value="notices" className="mt-4">
          <SectionCard title={t('term.notice')} description={t('policy.humanReviewOnly')}>
            <DataState query={notices} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <ul className="space-y-3">
                  {notices.items.map((notice) => (
                    <li key={notice.id} className="rounded-md border border-border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="ibmt-num text-[12px] font-semibold text-navy">{notice.unit_ref} · {t(`term.${notice.kind === 'landlord_notification' ? 'notice' : notice.kind}`)}</p>
                        <StatusBadge status={notice.status} />
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{tt(notice.body)}</p>
                      <p className="ibmt-num mt-2 text-[11px] text-muted-foreground">
                        {t('rent.responseDue')}: {formatDate(notice.response_due, lang)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="disputes" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title={t('term.dispute')} description={t('policy.humanReviewOnly')}>
              <DataState query={disputes} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <ul className="space-y-3">
                    {disputes.items.map((dispute) => (
                      <li key={dispute.id} className="rounded-md border border-border px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="ibmt-num text-[12px] font-semibold text-navy">{dispute.unit_ref} · {dispute.kind}</p>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={dispute.status} />
                            <StatusBadge status={dispute.mediation_state === 'in_review' ? 'in_review' : 'pending'} label={`${t('term.mediation')}: ${dispute.mediation_state}`} />
                          </div>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{tt(dispute.summary)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.dispute')} description={t('forms.requiredMark')}>
              <form onSubmit={submitDispute} className="space-y-4" noValidate>
                <Field label={t('term.unit')} required error={disputeErrors.unit_ref}>
                  {(props) => <TextInput {...props} className={`${props.className} ibmt-num`} value={disputeForm.unit_ref} onChange={(event) => setDisputeForm({ ...disputeForm, unit_ref: event.target.value.toUpperCase() })} />}
                </Field>
                <Field label={t('common.details')} required error={disputeErrors.summary}>
                  {(props) => <TextArea {...props} value={disputeForm.summary} onChange={(event) => setDisputeForm({ ...disputeForm, summary: event.target.value })} />}
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={createDispute.saving}>
                    {createDispute.saving ? t('common.working') : t('common.submit')}
                  </Button>
                  <FormStatus mutation={createDispute} />
                </div>
              </form>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="pack" className="mt-4">
          <SectionCard title={t('rent.evidencePack')} description={tt(pack.data?.note)}>
            <DataState query={pack} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <>
                  <p className="ibmt-kicker">{t('rent.selectItems')}</p>
                  <ul className="mt-3 space-y-3">
                    {(pack.data?.items || []).map((item) => (
                      <li key={item.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-b-0">
                        <Checkbox
                          id={`pack-${item.id}`}
                          checked={selected.includes(item.id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) => (checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                          }
                        />
                        <label htmlFor={`pack-${item.id}`} className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium">{tt(item.label)}</span>
                          <span className="ibmt-num mt-0.5 block text-[11px] text-muted-foreground">
                            {item.period} {item.sensitive ? `· ${t('privacy.title')}` : ''}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                      disabled={exportPack.saving || selected.length === 0}
                      onClick={() => exportPack.run({ items: selected })}
                    >
                      {exportPack.saving ? t('common.working') : t('common.export')}
                    </Button>
                    <FormStatus mutation={exportPack} />
                  </div>
                  {exportPack.status === 'success' && (
                    <Notice tone="positive" className="mt-4">
                      {t('privacy.requested')} · <span className="ibmt-num">{exportPack.result?.export_id}</span>
                    </Notice>
                  )}
                </>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="consent" className="mt-4">
          <SectionCard title={t('privacy.purposes')} description={t('policy.consentSeparate')}>
            <DataState query={consents} skeleton="lines">
              {(query) => (
                <div>
                  {Object.entries(query.record || {}).map(([key, consent]) => (
                    <ConsentToggle
                      key={key}
                      consentKey={key}
                      consent={consent}
                      busy={setConsent.saving}
                      onToggle={(consentKey, granted) => setConsent.run({ key: consentKey, granted })}
                    />
                  ))}
                </div>
              )}
            </DataState>
            {setConsent.status === 'error' && (
              <p role="alert" className="mt-3 text-[12px] font-medium text-destructive">
                {setConsent.fieldErrors?.consent || setConsent.error?.message || t('states.errorBody')}
              </p>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <DataTable
        columns={[{ key: 'label', header: t('common.status') }]}
        rows={[]}
        caption={t('common.nativeReview')}
      />
    </div>
  );
}