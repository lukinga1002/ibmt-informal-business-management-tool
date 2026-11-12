import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

const CHOICE = 'flex items-center gap-3 rounded-md border border-border px-3 py-2 text-[13px]';
const digits = (value, max) => value.replace(/[^0-9]/g, '').slice(0, max);

/**
 * The tenant's own form, opened from the link the landlord shared. No account:
 * the long code in the link is the only key, and it points at one unit.
 */
export default function TenantJoin() {
  const { t, lang } = useT();
  const { code } = useParams();
  const [unit, setUnit] = useState(null);
  const [landlord, setLandlord] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(null);
  const [form, setForm] = useState({ full_name: '', nida_number: '', rent_amount: '', paid_broker: null, broker_amount: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    callFn('tenantSelfRegister', { action: 'open', code })
      .then((data) => {
        setUnit(data.unit);
        setLandlord(data.landlord_name || '');
        if (data.rent_amount) setForm((prev) => ({ ...prev, rent_amount: String(data.rent_amount) }));
      })
      .catch((err) => setNotFound({ err }))
      .finally(() => setLoading(false));
  }, [code]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    if (form.full_name.trim().length < 3) return setError({ key: 'tenantJoin.errors.name' });
    if (form.nida_number.length !== 20) return setError({ key: 'tenantJoin.errors.nida' });
    if (Number(form.rent_amount) <= 0) return setError({ key: 'tenantJoin.errors.rent' });
    if (form.paid_broker === null) return setError({ key: 'tenantJoin.errors.brokerChoice' });
    if (form.paid_broker && Number(form.broker_amount) <= 0) return setError({ key: 'tenantJoin.errors.brokerAmount' });

    setBusy(true);
    setError(null);
    try {
      const result = await callFn('tenantSelfRegister', {
        action: 'submit',
        code,
        full_name: form.full_name,
        nida_number: form.nida_number,
        rent_amount: Number(form.rent_amount),
        paid_broker: form.paid_broker === true,
        broker_amount: form.paid_broker ? Number(form.broker_amount) : 0,
      });
      setDone(result);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ibmt-page">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-border border-t-navy" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="ibmt-page max-w-xl">
        <Notice tone="caution" title={t('tenantJoin.badLink')}>
          {errorText(notFound)}
        </Notice>
      </div>
    );
  }

  if (done) {
    return (
      <div className="ibmt-page max-w-xl space-y-4">
        <SectionCard title={t('tenantJoin.received')}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
            <div className="text-[13px] leading-relaxed">
              <p className="font-medium">{done.unit_name}</p>
              <p className="ibmt-num text-[11px] text-muted-foreground">{done.unit_ref}</p>
              <p className="mt-2">
                {done.paid_broker
                  ? t('tenantJoin.paidBroker', { amount: Number(done.broker_amount).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-TZ') })
                  : t('tenantJoin.noBroker')}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t('tenantJoin.whoSees')}
              </p>
            </div>
          </div>
        </SectionCard>
        <Notice tone="privacy" title={t('tenantJoin.declarationTitle')}>
          {t('tenantJoin.declarationBody')}
        </Notice>
      </div>
    );
  }

  return (
    <div className="ibmt-page max-w-xl space-y-4">
      <header>
        <p className="ibmt-kicker">{t('tenantJoin.kicker')}</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-navy">{unit.unit_name}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {[unit.street, unit.house_no && t('tenantJoin.house', { no: unit.house_no }), unit.ward, unit.district].filter(Boolean).join(' · ')}
          {landlord ? ` · ${t('tenantJoin.landlord', { name: landlord })}` : ''}
        </p>
      </header>

      <SectionCard title={t('tenantJoin.yourDetails')} description={t('tenantJoin.yourDetailsBody')}>
        <div className="space-y-4">
          <Field label={t('tenantJoin.fullName')} required>
            {(props) => <TextInput {...props} value={form.full_name} onChange={(event) => set({ full_name: event.target.value })} />}
          </Field>

          <Field label={t('tenantJoin.nida')} required hint={t('tenantJoin.nidaHint')}>
            {(props) => (
              <TextInput
                {...props}
                className={`${props.className} ibmt-num`}
                inputMode="numeric"
                value={form.nida_number}
                onChange={(event) => set({ nida_number: digits(event.target.value, 20) })}
              />
            )}
          </Field>

          <Field label={t('tenantJoin.rent')} required>
            {(props) => (
              <TextInput
                {...props}
                className={`${props.className} ibmt-num`}
                inputMode="numeric"
                value={form.rent_amount}
                onChange={(event) => set({ rent_amount: digits(event.target.value, 9) })}
              />
            )}
          </Field>

          <fieldset>
            <legend className="ibmt-label mb-2">{t('tenantJoin.brokerQ')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={CHOICE}>
                <input type="radio" name="paidBroker" checked={form.paid_broker === true} onChange={() => set({ paid_broker: true })} />
                {t('tenantJoin.brokerYes')}
              </label>
              <label className={CHOICE}>
                <input type="radio" name="paidBroker" checked={form.paid_broker === false} onChange={() => set({ paid_broker: false, broker_amount: '' })} />
                {t('tenantJoin.brokerNo')}
              </label>
            </div>
          </fieldset>

          {form.paid_broker === true && (
            <Field label={t('tenantJoin.brokerAmount')} required>
              {(props) => (
                <TextInput
                  {...props}
                  className={`${props.className} ibmt-num`}
                  inputMode="numeric"
                  value={form.broker_amount}
                  onChange={(event) => set({ broker_amount: digits(event.target.value, 9) })}
                />
              )}
            </Field>
          )}

          {error && (
            <p role="alert" className="text-[12px] font-medium text-destructive">
              {errorText(error)}
            </p>
          )}

          <Button
            type="button"
            onClick={submit}
            disabled={busy}
            className="ibmt-tap w-full gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {busy ? t('otpConfirm.sending') : t('tenantJoin.send')}
          </Button>
        </div>
      </SectionCard>

      <Notice tone="privacy">
        {t('tenantJoin.privacy')}
      </Notice>
    </div>
  );
}