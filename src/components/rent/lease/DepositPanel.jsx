import { useCallback, useEffect, useState } from 'react';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';

const HOLDERS = [
  { value: 'landlord', label: 'Mmiliki' },
  { value: 'agent', label: 'Wakala' },
  { value: 'tenant', label: 'Mpangaji' },
  { value: 'other', label: 'Mtu mwingine' },
];

/**
 * Stage 1 deposit: the amount and who holds it are recorded here. IBMT never
 * holds the money and escrow starts in Stage 2 only.
 */
export default function DepositPanel({ tenancyId, role = 'landlord' }) {
  const [deposit, setDeposit] = useState(null);
  const [form, setForm] = useState({ amount: '', held_by: 'landlord', held_by_name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await callFn('depositRecord', { action: 'get', tenancy_id: tenancyId });
      setDeposit(data.deposit);
    } catch (err) {
      setError(fnError(err));
    } finally {
      setLoading(false);
    }
  }, [tenancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError('');
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
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Amana" description="Kiasi na nani anayeishikilia. Hakuna escrow katika Hatua ya 1.">
      {loading ? (
        <p className="text-[13px] text-muted-foreground">Inapakia…</p>
      ) : (
        <div className="space-y-4">
          {deposit ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Money amount={deposit.amount} strong note={`Inashikiliwa na: ${deposit.held_by_name || deposit.held_by}`} />
                <StatusBadge status={deposit.status} label={deposit.status === 'held' ? 'Inashikiliwa' : deposit.status} />
              </div>
              <Notice tone="privacy" title="IBMT haishikilii pesa hii.">
                {deposit.escrow_note?.sw}
              </Notice>
              <p className="ibmt-hint">Imeandikwa na {deposit.recorded_by_role === 'tenant' ? 'mpangaji' : 'mmiliki'}.</p>
            </div>
          ) : (
            <Notice tone="neutral">Amana haijaandikwa bado.</Notice>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kiasi (TZS)" required>
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
            <Field label="Inashikiliwa na" required>
              {(props) => (
                <SelectControl {...props} value={form.held_by} onChange={(event) => setForm({ ...form, held_by: event.target.value })}>
                  {HOLDERS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </SelectControl>
              )}
            </Field>
            <Field label="Jina la anayeshikilia" className="sm:col-span-2">
              {(props) => (
                <TextInput {...props} value={form.held_by_name} onChange={(event) => setForm({ ...form, held_by_name: event.target.value })} />
              )}
            </Field>
          </div>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-destructive">
              {error}
            </p>
          )}

          <Button
            type="button"
            className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={save}
            disabled={busy || !form.amount}
          >
            {busy ? 'Inahifadhi…' : role === 'tenant' ? 'Rekodi amana niliyolipa' : 'Rekodi amana'}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}