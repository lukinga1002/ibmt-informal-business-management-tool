import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import { useIBMT } from '@/api/IBMTContext';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import Timeline from '@/components/ibmt/Timeline';
import DemoBadge from '@/components/ibmt/DemoBadge';
import Field, { TextInput, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { SelectControl } from '@/components/ibmt/Field';
import { formatDate, formatDateTime } from '@/lib/format';

export default function TenantLease() {
  const { t, tt, lang } = useT();
  const { isMock } = useIBMT();
  const tenancies = useIBMTQuery('listTenancies', { status: 'active', limit: 5 });
  const [leaseId, setLeaseId] = useState('lse-1');
  const lease = useIBMTQuery('getLease', { id: leaseId }, { enabled: Boolean(leaseId) });
  const challenge = useIBMTMutation('requestLeaseSignature');
  const sign = useIBMTMutation('signLease');
  const [otp, setOtp] = useState('');

  const record = lease.data;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.lease')}
        lede={t('rent.reviewTerms')}
        meta={[{ label: t('rent.languagePair') }, { label: t('policy.registrationNoOwnership') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <SectionCard
            title={t('rent.parties')}
            description={t('rent.reviewTerms')}
            actions={
              <label htmlFor="lease-select" className="sr-only">
                {t('nav.lease')}
              </label>
            }
          >
            <SelectControl id="lease-select" className="ibmt-tap" value={leaseId} onChange={(event) => setLeaseId(event.target.value)}>
              {tenancies.items.map((tenancy) =>
                tenancy.lease_id ? (
                  <option key={tenancy.id} value={tenancy.lease_id}>
                    {tenancy.unit_ref} · {tenancy.tenant_name}
                  </option>
                ) : null,
              )}
              <option value="lse-1">IBMT-UNIT-2026-002310</option>
              <option value="lse-2">IBMT-UNIT-2026-002313</option>
            </SelectControl>

            <DataState query={lease} skeleton="lines" className="mt-4">
              {(data) => (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={data.signature_state === 'success' ? 'confirmed' : data.signature_state === 'invalidated' ? 'rejected' : 'pending'} label={`${t('rent.signatureChallenge')}: ${data.signature_state}`} />
                    <StatusBadge status={data.stamp_duty_state === 'assessed' ? 'verified' : 'pending'} label={`${t('rent.stampState')}: ${data.stamp_duty_state}`} />
                    <StatusBadge status={data.activation_state === 'active' ? 'active' : 'pending'} label={`${t('rent.activation')}: ${data.activation_state}`} />
                    <span className="ibmt-num rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                      {t('rent.termsVersion')} {data.terms_version}
                    </span>
                  </div>

                  <Timeline
                    items={data.parties.map((party) => ({
                      id: party.ref,
                      label: `${tt(party.role)} — ${party.name}`,
                      at: party.signed_at ? formatDateTime(party.signed_at, lang) : t('status.pending'),
                      status: party.signed ? 'success' : 'pending',
                      statusKey: party.signed ? 'confirmed' : 'awaiting_confirmation',
                    }))}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Money amount={data.terms?.monthly_rent} note={t('rent.rentAmount')} strong />
                    <Money amount={data.terms?.deposit} note={t('rent.deposit')} />
                  </div>

                  <div className="space-y-2">
                    <p className="ibmt-kicker">{t('rent.leaseTerms')}</p>
                    <ol className="space-y-3">
                      {(data.terms?.clauses || []).map((clause, index) => (
                        <li key={clause.en} className="grid gap-2 border-b border-border pb-3 last:border-b-0 md:grid-cols-2">
                          <p lang="en" className="text-[12px] leading-relaxed">
                            {index + 1}. {clause.en}
                          </p>
                          <p lang="sw" className="text-[12px] leading-relaxed text-navy-ink">
                            {index + 1}. {clause.sw}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {data.changed_after_signature && (
                    <Notice tone="danger" title={t('states.conflictTitle')}>
                      {t('states.staleRecord')} — {t('rent.reviewTerms')}
                    </Notice>
                  )}
                </div>
              )}
            </DataState>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title={t('rent.leaseSign')} description={t('forms.idempotency')}>
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="ibmt-tap w-full"
                disabled={challenge.saving}
                onClick={() => challenge.run({ id: leaseId, party: 'tenant' })}
              >
                {challenge.saving ? t('common.working') : t('rent.signatureChallenge')}
              </Button>

              {challenge.status === 'success' && (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
                  <p className="ibmt-num text-[12px]">{challenge.result?.challenge_id}</p>
                  <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">
                    {t('rent.responseDue')}: {formatDateTime(challenge.result?.expires_at, lang)} · {challenge.result?.attempts_remaining} {t('common.optional')}
                  </p>
                  {isMock && challenge.result?.demonstration_code && (
                    <p className="ibmt-num mt-2 flex flex-wrap items-center gap-2 text-[12px] text-gold-ink">
                      <DemoBadge variant="chip" />
                      {challenge.result.demonstration_code}
                    </p>
                  )}
                </div>
              )}

              <Field
                label={t('term.otp')}
                required
                error={sign.fieldErrors?.otp}
                hint={t('rent.mutualCode')}
              >
                {(props) => (
                  <TextInput
                    {...props}
                    className={`${props.className} ibmt-num`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  />
                )}
              </Field>

              <Button
                type="button"
                className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                disabled={sign.saving}
                onClick={async () => {
                  const result = await sign.run({ id: leaseId, otp });
                  if (result) {
                    setOtp('');
                    lease.reload();
                  }
                }}
              >
                {sign.saving ? t('common.working') : t('common.sign')}
              </Button>

              <FormStatus mutation={sign} />
            </div>
          </SectionCard>

          <SectionCard title={t('rent.stampState')} description={t('policy.policyVersioned')}>
            <DataTableLike leaseId={leaseId} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function DataTableLike({ leaseId }) {
  const { t } = useT();
  const assessment = useIBMTQuery('getStampDutyAssessment', { id: leaseId }, { enabled: Boolean(leaseId) });

  return (
    <DataState query={assessment} skeleton="lines">
      {(record) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={record.state === 'assessed' ? 'verified' : 'pending'} label={`${t('rent.stampState')}: ${record.state}`} />
            {record.assessed_amount ? <Money amount={record.assessed_amount} /> : null}
          </div>
          <p className="ibmt-hint">{record.rule ? (typeof record.rule === 'string' ? t(record.rule) : record.rule.en) : ''}</p>
          <p className="ibmt-num text-[11px] text-muted-foreground">
            {record.assessed_at ? formatDate(record.assessed_at) : ''} · Policy {record.policy_version}
          </p>
        </div>
      )}
    </DataState>
  );
}