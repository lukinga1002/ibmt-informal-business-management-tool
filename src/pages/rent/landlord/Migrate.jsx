import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput, SelectControl } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import OtpConfirm from '@/components/rent/registration/OtpConfirm';
import { DISCLAIMER } from '@/config/r3';
import { errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

/**
 * Bringing an existing tenancy onto the register. Nothing is renegotiated: the
 * tenant confirms the facts that already apply, and no new lease is created.
 */
export default function LandlordMigrate() {
  const { t, tt } = useT();
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({ unit_id: '', tenant_name: '', tenant_phone: '', rent_amount: '', started_on: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.entities.RentalUnit
      .filter({}, { sort: '-created_date', limit: 50 })
      .then((page) => {
        const items = page.items || [];
        setUnits(items);
        setForm((prev) => ({ ...prev, unit_id: prev.unit_id || items[0]?.id || '' }));
      })
      .catch(() => setUnits([]));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('migrateTenancy', {
        unit_id: form.unit_id,
        tenant_name: form.tenant_name,
        tenant_phone: form.tenant_phone,
        rent_amount: Number(form.rent_amount) || 0,
        started_on: form.started_on,
      });
      setResult(response.data);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('migrate.kicker')}
        title={t('migrate.title')}
        lede={t('migrate.lede')}
        meta={[{ label: t('migrate.noNewLease') }, { label: tt(DISCLAIMER) }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t('migrate.existing')} description={t('registerPage.rentedDesc')}>
          {result ? (
            <div className="space-y-4">
              <Notice tone="positive" title={t('migrate.addedTitle')}>
                <span className="ibmt-num">{result.case_ref}</span> · {t('migrate.addedBody')}
              </Notice>
              <OtpConfirm
                caseId={result.case_id}
                channel="migrated"
                demoCode={result.otp?.code}
                onConfirmed={() => window.location.assign('/rent/landlord/tenancies')}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Field label={t('migrate.unit')}>
                {(props) => (
                  <SelectControl {...props} value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })}>
                    {units.length === 0 && <option value="">{t('migrate.noUnits')}</option>}
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit_ref} · {unit.ward}
                      </option>
                    ))}
                  </SelectControl>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('migrate.tenantName')} required>
                  {(props) => (
                    <TextInput {...props} value={form.tenant_name} onChange={(event) => setForm({ ...form, tenant_name: event.target.value })} />
                  )}
                </Field>
                <Field label={t('migrate.tenantPhone')} required hint={t('wizard.ownerPhoneHint')}>
                  {(props) => (
                    <TextInput
                      {...props}
                      className={`${props.className} ibmt-num`}
                      value={form.tenant_phone}
                      onChange={(event) => setForm({ ...form, tenant_phone: event.target.value })}
                    />
                  )}
                </Field>
                <Field label={t('migrate.currentRent')} required>
                  {(props) => (
                    <TextInput
                      {...props}
                      className={`${props.className} ibmt-num`}
                      inputMode="numeric"
                      value={form.rent_amount}
                      onChange={(event) => setForm({ ...form, rent_amount: event.target.value.replace(/[^0-9]/g, '') })}
                    />
                  )}
                </Field>
                <Field label={t('migrate.started')} required>
                  {(props) => (
                    <TextInput {...props} type="date" value={form.started_on} onChange={(event) => setForm({ ...form, started_on: event.target.value })} />
                  )}
                </Field>
              </div>
              {error && <p role="alert" className="text-[12px] font-medium text-destructive">{errorText(error)}</p>}
              <Button
                type="button"
                className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={submit}
                disabled={busy || !form.unit_id}
              >
                {busy ? t('otpConfirm.sending') : t('migrate.send')}
              </Button>
            </div>
          )}
        </SectionCard>

        <aside className="space-y-4">
          <Notice tone="policy" title={t('migrate.termsTitle')}>
            {t('migrate.termsBody')}
          </Notice>
          <Notice tone="privacy" title={t('wizard.summary.address')}>
            {t('migrate.addressBody')}
          </Notice>
        </aside>
      </div>
    </div>
  );
}