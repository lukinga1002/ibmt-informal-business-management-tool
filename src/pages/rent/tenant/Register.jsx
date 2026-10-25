import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Timeline from '@/components/ibmt/Timeline';
import Field, { TextInput, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { daysUntil, formatDateTime } from '@/lib/format';

/**
 * Tenant-initiated registration.
 *
 * A claim is not ownership verification and not a penalty: the landlord is
 * notified, a backend-defined response window runs, and council review follows
 * only after it expires.
 */
export default function TenantRegister() {
  const { t, tt, lang } = useT();
  const claim = useIBMTQuery('getTenantRegistration');
  const submit = useIBMTMutation('submitTenantRegistration');
  const units = useIBMTQuery('listListings', { limit: 8 });
  const [unitRef, setUnitRef] = useState('');
  const [error, setError] = useState('');

  const remaining = daysUntil(claim.data?.response_due);

  const send = async () => {
    if (!unitRef) {
      setError(t('forms.fixErrors'));
      return;
    }
    setError('');
    const result = await submit.run({ unit_ref: unitRef });
    if (result) claim.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.register')}
        lede={t('policy.humanReviewOnly')}
        meta={[{ label: t('policy.registrationNoOwnership') }, { label: t('policy.amnestyForward') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t('rent.registerClaim')} description={tt(claim.data?.note)}>
          <DataState query={claim} skeleton="lines">
            {(record) => (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={record.state === 'awaiting_landlord' ? 'pending' : record.state} />
                  <span className="ibmt-num text-[12px] text-muted-foreground">{record.claim_id}</span>
                </div>

                <Timeline
                  items={[
                    { id: 'r1', label: t('rent.registerClaim'), at: record.unit_ref, status: 'success', statusKey: 'submitted' },
                    {
                      id: 'r2',
                      label: t('rent.landlordNotified'),
                      at: record.landlord_notified_at ? formatDateTime(record.landlord_notified_at, lang) : t('status.pending'),
                      status: record.landlord_notified_at ? 'success' : 'pending',
                      statusKey: record.landlord_notified_at ? 'confirmed' : 'pending',
                    },
                    {
                      id: 'r3',
                      label: t('rent.responseDue'),
                      at: record.response_due ? `${formatDateTime(record.response_due, lang)}${remaining !== null ? ` · ${remaining}d` : ''}` : t('status.pending'),
                      status: remaining !== null && remaining < 0 ? 'danger' : 'warning',
                      statusKey: remaining !== null && remaining < 0 ? 'overdue' : 'due',
                    },
                    {
                      id: 'r4',
                      label: t('rent.councilReview'),
                      at: record.council_review_state,
                      status: 'pending',
                      statusKey: 'pending',
                    },
                  ]}
                />

                <div className="rounded-md border border-border px-4 py-3">
                  <p className="ibmt-kicker">{t('term.unit')}</p>
                  <p className="ibmt-num mt-1 text-[13px] font-medium">{record.unit_ref}</p>
                  <p className="ibmt-hint mt-2">{t('policy.addressesNeverPublic')}</p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <Field label={t('term.unit')} error={error} className="min-w-[220px] flex-1">
                    {(props) => (
                      <TextInput
                        {...props}
                        className={`${props.className} ibmt-num`}
                        placeholder="IBMT-UNIT-2026-002315"
                        value={unitRef}
                        onChange={(event) => setUnitRef(event.target.value.toUpperCase())}
                      />
                    )}
                  </Field>
                  <Button type="button" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={send} disabled={submit.saving}>
                    {submit.saving ? t('common.working') : t('common.submit')}
                  </Button>
                  <FormStatus mutation={submit} />
                </div>

                {units.items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {units.items.map((listing) => (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => setUnitRef(listing.unit_ref)}
                        className="ibmt-num rounded-sm border border-dashed border-gold-ink/50 px-2 py-1 text-[11px] text-gold-ink hover:bg-gold-soft"
                      >
                        {listing.unit_ref}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DataState>
        </SectionCard>

        <div className="space-y-4">
          <Notice tone="policy">{t('policy.amnestyForward')}</Notice>
          <Notice tone="caution">{t('policy.registrationWindow')}</Notice>
          <Notice tone="policy">{t('policy.assistedOnboarding')}</Notice>
          <Notice tone="policy">{t('policy.proxyRegistration')}</Notice>
          <Notice tone="policy">{t('policy.migration')}</Notice>
          <Notice tone="privacy">{t('policy.humanReviewOnly')}</Notice>
        </div>
      </div>
    </div>
  );
}