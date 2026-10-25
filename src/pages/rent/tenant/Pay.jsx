import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import AllocationBreakdown from '@/components/ibmt/AllocationBreakdown';
import Field, { TextInput, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ibmt/StatusBadge';

const PRESETS = [
  { rent: '500000', months: '6', new_tenancy: true, label: '500,000 × 6 · new tenancy' },
  { rent: '500000', months: '6', new_tenancy: false, label: '500,000 × 6 · renewal' },
];

/**
 * Paying rent.
 *
 * The tenant is quoted by the backend, pays through the approved partner, and
 * sees four separate statuses. The request carries one idempotency key that is
 * reused if the same payment is retried, so a retry cannot create a second
 * charge. A timeout is reported as unconfirmed.
 */
export default function TenantPay() {
  const { t } = useT();
  const quote = useIBMTMutation('quoteRentPayment');
  const pay = useIBMTMutation('createRentPayment');
  const status = useIBMTMutation('getRentPayment');
  const [form, setForm] = useState({ rent: '500000', months: '6', new_tenancy: 'true' });

  const ask = () =>
    quote.run({
      rent_amount: Number(form.rent),
      period_months: Number(form.months),
      new_tenancy: form.new_tenancy === 'true',
    });

  const payment = quote.result;
  const paid = pay.result ? { ...pay.result, allocation: quote.result?.allocation, period_months: Number(form.months) } : null;
  const shown = status.result || paid;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.pay')}
        lede={t('policy.tenantPaysExact')}
        meta={[{ label: t('policy.ibmtHoldsNoFunds') }, { label: t('forms.idempotency') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <SectionCard title={t('nav.pay')} description={t('policy.tenantPaysExact')}>
          <div className="space-y-4">
            <Field label={t('rent.rentAmount')} hint="TZS">
              {(props) => (
                <TextInput
                  {...props}
                  className={`${props.className} ibmt-num`}
                  inputMode="numeric"
                  value={form.rent}
                  onChange={(event) => setForm({ ...form, rent: event.target.value.replace(/[^0-9]/g, '') })}
                />
              )}
            </Field>
            <Field label={t('rent.period')}>
              {(props) => (
                <TextInput
                  {...props}
                  className={`${props.className} ibmt-num`}
                  inputMode="numeric"
                  value={form.months}
                  onChange={(event) => setForm({ ...form, months: event.target.value.replace(/[^0-9]/g, '') })}
                />
              )}
            </Field>
            <Field label={t('rent.newTenancy')}>
              {(props) => (
                <select
                  id={props.id}
                  className={props.className}
                  value={form.new_tenancy}
                  onChange={(event) => setForm({ ...form, new_tenancy: event.target.value })}
                >
                  <option value="true">{t('rent.newTenancy')}</option>
                  <option value="false">{t('rent.renewal')}</option>
                </select>
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="ibmt-num rounded-sm border border-dashed border-gold-ink/50 px-2 py-1 text-[11px] text-gold-ink hover:bg-gold-soft"
                  onClick={() => setForm({ rent: preset.rent, months: preset.months, new_tenancy: String(preset.new_tenancy) })}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <Button type="button" className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={ask} disabled={quote.saving}>
              {quote.saving ? t('common.working') : t('rent.allocation')}
            </Button>
            <FormStatus mutation={quote} />

            <Notice tone="privacy">{t('policy.noTenantFee')}</Notice>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={t('rent.allocation')} description={t('policy.ibmtHoldsNoFunds')}>
            {quote.status === 'success' && payment ? (
              <>
                <AllocationBreakdown
                  payment={{
                    ...payment,
                    new_tenancy: form.new_tenancy === 'true',
                  }}
                />
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                    disabled={pay.saving || pay.status === 'success'}
                    onClick={() =>
                      pay.run({
                        unit_ref: 'IBMT-UNIT-2026-002310',
                        period_months: Number(form.months),
                        rent_amount: payment.rent_amount,
                        deposit_amount: payment.deposit_amount,
                        new_tenancy: form.new_tenancy === 'true',
                        allocation: payment.allocation,
                      })
                    }
                  >
                    {pay.saving ? t('common.working') : t('common.pay')}
                  </Button>
                  <FormStatus mutation={pay} />
                </div>
                {pay.status === 'error' && pay.error?.code === 'TIMEOUT' && (
                  <Notice tone="caution" title={t('states.errorTitle')} className="mt-4">
                    {t('forms.timeout')}
                    <div className="mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => pay.retry({ unit_ref: 'IBMT-UNIT-2026-002310' })}>
                        {t('common.retry')}
                      </Button>
                    </div>
                  </Notice>
                )}
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-muted-foreground">{t('rent.statusesSeparate')}</p>
            )}
          </SectionCard>

          {paid && (
            <SectionCard title={t('common.status')} description={t('forms.timeout')}>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={shown?.state || 'pending'} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ibmt-tap"
                  disabled={status.saving}
                  onClick={() => status.run({ id: paid.id })}
                >
                  {status.saving ? t('common.working') : t('common.retry')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ibmt-tap"
                  onClick={() => status.run({ id: paid.id, simulate: 'timeout' })}
                >
                  Timeout
                </Button>
              </div>
              <p className="ibmt-num mt-3 text-[12px] text-muted-foreground">{paid.reference}</p>
              <FormStatus mutation={status} />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}