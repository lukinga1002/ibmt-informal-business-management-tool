import { useCallback, useEffect, useState } from 'react';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

const HOLDERS = ['landlord', 'agent', 'tenant', 'other'];

/**
 * Stage 1 deposit: the amount and who holds it are recorded here. IBMT never
 * holds the money and escrow starts in Stage 2 only.
 */
export default function DepositPanel({ tenancyId, role = 'landlord' }) {
  const { t, tt } = useT();
  const [deposit, setDeposit] = useState(null);
  const [form, setForm] = useState({ amount: '', held_by: 'landlord', held_by_name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await callFn('depositRecord', { action: 'get', tenancy_id: tenancyId });
      setDeposit(data.deposit);
    } catch (err) {
      setError({ err });
    } finally {
      setLoading(false);
    }
  }, [tenancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await callFn('depositRecord', {
        action: 'record',
        tenancy_id: tenancyId,
        amount: Number(form.amount) || 0,
        held_by: form.held_by,
        held_by_name: form.held_by_name,
      });
      setDeposit(data);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title={t('deposit.title')} description={t('deposit.description')}>
      {loading ? (
        <p className="text-[13px] text-muted-foreground">{t('common.loading')}…</p>
      ) : (
        <div className="space-y-4">
          {deposit ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Money amount={deposit.amount} strong note={t('deposit.heldByNote', { who: deposit.held_by_name || t(`deposit.holder.${deposit.held_by}`) })} />
                <StatusBadge status={deposit.status} label={t(`deposit.status.${deposit.status === 'held' ? 'held' : 'other'}`)} />
              </div>
              <Notice tone="privacy" title={t('deposit.notHeldByIbmt')}>
                {deposit.escrow_note ? tt(deposit.escrow_note) : null}
              </Notice>
              <p className="ibmt-hint">{deposit.recorded_by_role === 'tenant' ? t('deposit.recordedByTenant') : t('deposit.recordedByLandlord')}</p>
            </div>
          ) : (
            <Notice tone="neutral">{t('deposit.none')}</Notice>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('deposit.amount')} required>
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
            <Field label={t('deposit.heldBy')} required>
              {(props) => (
                <SelectControl {...props} value={form.held_by} onChange={(event) => setForm({ ...form, held_by: event.target.value })}>
                  {HOLDERS.map((value) => (
                    <option key={value} value={value}>
                      {t(`deposit.holder.${value}`)}
                    </option>
                  ))}
                </SelectControl>
              )}
            </Field>
            <Field label={t('deposit.holderName')} className="sm:col-span-2">
              {(props) => (
                <TextInput {...props} value={form.held_by_name} onChange={(event) => setForm({ ...form, held_by_name: event.target.value })} />
              )}
            </Field>
          </div>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-destructive">
              {errorText(error)}
            </p>
          )}

          <Button
            type="button"
            className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={save}
            disabled={busy || !form.amount}
          >
            {busy ? t('wardVerify.saving') : role === 'tenant' ? t('deposit.recordPaid') : t('deposit.record')}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}