import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import { METHOD_LABEL, callFn, fnError, newKey, thisMonth, todayIso } from '@/lib/r4';

/**
 * Entering a rent record. The entry is recorded, not confirmed: the receipt
 * exists only once the other party confirms it.
 */
export default function RecordForm({ tenancies = [], role = 'landlord', onSaved }) {
  const keyRef = useRef(null);
  const [form, setForm] = useState({
    tenancy_id: tenancies[0]?.id || '',
    period_month: thisMonth(),
    amount: tenancies[0]?.rent_amount ? String(tenancies[0].rent_amount) : '',
    paid_on: todayIso(),
    method: 'mobile_money',
    mobile_money_ref: '',
    deposit_amount: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (!form.tenancy_id && tenancies[0]) {
      setForm((prev) => ({
        ...prev,
        tenancy_id: tenancies[0].id,
        amount: tenancies[0].rent_amount ? String(tenancies[0].rent_amount) : prev.amount,
      }));
    }
  }, [tenancies, form.tenancy_id]);

  const pickTenancy = (id) => {
    const tenancy = tenancies.find((row) => row.id === id);
    setForm((prev) => ({ ...prev, tenancy_id: id, amount: tenancy?.rent_amount ? String(tenancy.rent_amount) : prev.amount }));
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    setSaved(null);
    if (!keyRef.current) keyRef.current = newKey('rent-record');
    try {
      const data = await callFn('rentRecord', {
        action: 'enter',
        tenancy_id: form.tenancy_id,
        period_month: form.period_month,
        amount: Number(form.amount) || 0,
        deposit_amount: Number(form.deposit_amount) || 0,
        paid_on: form.paid_on,
        method: form.method,
        mobile_money_ref: form.mobile_money_ref,
        idempotency_key: keyRef.current,
      });
      keyRef.current = null;
      setSaved(data);
      setForm((prev) => ({ ...prev, mobile_money_ref: '', deposit_amount: '' }));
      if (onSaved) onSaved();
    } catch (err) {
      // The key is kept, so pressing the button again cannot record it twice.
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!tenancies.length) {
    return (
      <Notice tone="neutral" title="Hakuna tenancy inayoendelea">
        Rekodi ya kodi inahitaji tenancy iliyo hai. Mkataba unapoanza, tenancy inaundwa na inaonekana hapa.
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Nyumba / tenancy" required>
        {(props) => (
          <SelectControl {...props} value={form.tenancy_id} onChange={(event) => pickTenancy(event.target.value)}>
            {tenancies.map((tenancy) => (
              <option key={tenancy.id} value={tenancy.id}>
                {tenancy.unit_ref} · {tenancy.ward || '—'}
              </option>
            ))}
          </SelectControl>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kodi iliyolipwa (TZS)" required>
          {(props) => (
            <TextInput
              {...props}
              className={`${props.className} ibmt-num`}
              inputMode="numeric"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/[^0-9]/g, '') })}
            />
          )}
        </Field>
        <Field label="Amana (TZS)" hint="Si lazima. Amana si kodi.">
          {(props) => (
            <TextInput
              {...props}
              className={`${props.className} ibmt-num`}
              inputMode="numeric"
              value={form.deposit_amount}
              onChange={(event) => setForm({ ...form, deposit_amount: event.target.value.replace(/[^0-9]/g, '') })}
            />
          )}
        </Field>
        <Field label="Kipindi (mwezi)" required hint="Mfano 2026-11">
          {(props) => (
            <TextInput
              {...props}
              className={`${props.className} ibmt-num`}
              value={form.period_month}
              onChange={(event) => setForm({ ...form, period_month: event.target.value })}
            />
          )}
        </Field>
        <Field label="Ilipwa tarehe" required>
          {(props) => (
            <TextInput {...props} type="date" value={form.paid_on} onChange={(event) => setForm({ ...form, paid_on: event.target.value })} />
          )}
        </Field>
        <Field label="Njia ya malipo" required>
          {(props) => (
            <SelectControl {...props} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
              {Object.entries(METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectControl>
          )}
        </Field>
        <Field
          label="Kumbukumbu ya malipo"
          required={form.method !== 'cash'}
          hint="Namba ya mobile money au benki kama ilivyoandikwa"
        >
          {(props) => (
            <TextInput
              {...props}
              className={`${props.className} ibmt-num`}
              value={form.mobile_money_ref}
              onChange={(event) => setForm({ ...form, mobile_money_ref: event.target.value })}
            />
          )}
        </Field>
      </div>

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      {saved && (
        <Notice tone="positive" title={saved.duplicate ? 'Rekodi hii ilikuwa imeandikwa' : 'Rekodi imeandikwa'}>
          <span className="ibmt-num">{saved.reference}</span> · inasubiri uthibitisho wa upande wa pili. Hakuna risiti bado.
        </Notice>
      )}

      <Button
        type="button"
        className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
        onClick={submit}
        disabled={busy || !form.tenancy_id}
      >
        {busy ? 'Inatuma…' : role === 'tenant' ? 'Wasilisha rekodi ya malipo' : 'Andika rekodi ya kodi'}
      </Button>
    </div>
  );
}