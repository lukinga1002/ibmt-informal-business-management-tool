import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import TenantFeeNote from '@/components/rent/TenantFeeNote';
import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';

/**
 * The landlord names one licensed agent, at or under the commission cap, and
 * signs with a one-time code. The tenant pays nothing.
 */
export default function LandlordMandates() {
  const [units, setUnits] = useState(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ unit_id: '', agent_email: '', fee_amount: '' });
  const [check, setCheck] = useState(null);
  const [otp, setOtp] = useState(null);
  const [code, setCode] = useState('');
  const [mandateId, setMandateId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const unitPage = await base44.entities.RentalUnit.filter({}, { sort: '-created_date', limit: 50 }).catch(() => ({ items: [] }));
    const list = unitPage.items || [];
    setUnits(list);
    setForm((prev) => ({ ...prev, unit_id: prev.unit_id || (list[0] ? list[0].id : '') }));
    try {
      const data = await callFn('agentMandate', { action: 'list' });
      setRows(data.rows || []);
    } catch (err) {
      setError(fnError(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      if (action === 'check') {
        const data = await callFn('agentMandate', { action: 'check', agent_email: form.agent_email });
        setCheck(data);
      } else if (action === 'offer') {
        const data = await callFn('agentMandate', {
          action: 'offer',
          unit_id: form.unit_id,
          agent_email: form.agent_email,
          fee_amount: Number(form.fee_amount) || 0,
        });
        setMandateId(data.mandate_id);
        const challenge = await callFn('agentMandate', { action: 'request_otp', mandate_id: data.mandate_id });
        setOtp(challenge.otp);
      } else if (action === 'sign') {
        await callFn('agentMandate', { action: 'sign', mandate_id: mandateId, code });
        setOtp(null);
        setCode('');
        setMandateId(null);
        setCheck(null);
        setForm({ ...form, agent_email: '', fee_amount: '' });
        await load();
      }
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const end = async (row) => {
    setBusy(true);
    setError('');
    try {
      await callFn('agentMandate', { action: 'end', mandate_id: row.mandate_id, reason: 'landlord_ended' });
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Wakala"
        title="Mandate za wakala"
        lede="Mmiliki huchagua wakala mmoja aliye na leseni, kamisheni isiyozidi kikomo cha sera, na husaini kwa namba ya siri."
        meta={[{ label: 'Wakala asiye na leseni hawezi kuchaguliwa' }]}
        actions={<TenantFeeNote />}
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title="Mpe wakala mandate" description="Anza kwa kuangalia leseni ya wakala.">
          {units === null ? (
            <p className="text-[13px] text-muted-foreground">Inapakia nyumba…</p>
          ) : units.length === 0 ? (
            <Notice tone="neutral">Hakuna nyumba bado. Sajili nyumba kwanza.</Notice>
          ) : (
            <div className="space-y-4">
              <Field label="Nyumba" required>
                {(props) => (
                  <SelectControl {...props} value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })}>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit_ref} · {unit.ward} · {Number(unit.rent_amount || 0).toLocaleString('en-TZ')} TZS
                      </option>
                    ))}
                  </SelectControl>
                )}
              </Field>
              <Field label="Barua pepe ya wakala" required hint="Barua pepe aliyotumia kujisajili IBMT">
                {(props) => (
                  <TextInput {...props} type="email" value={form.agent_email} onChange={(event) => setForm({ ...form, agent_email: event.target.value })} />
                )}
              </Field>

              <Button type="button" variant="outline" className="ibmt-tap" onClick={() => run('check')} disabled={busy || !form.agent_email}>
                Angalia leseni
              </Button>

              {check && (
                <Notice tone={check.licensed ? 'positive' : 'danger'} title={check.licensed ? 'Wakala ana leseni' : 'Wakala hana leseni'}>
                  {check.licensed
                    ? `${check.agent_name || ''} · ${check.licence_no || ''}`
                    : 'Halmashauri haijathibitisha leseni ya akaunti hii. Hauruhusiwi kumtaja.'}
                </Notice>
              )}

              <Field label="Kamisheni (TZS)" required hint="Hulipwa na mmiliki. Mpangaji halipi kitu.">
                {(props) => (
                  <TextInput
                    {...props}
                    className={`${props.className} ibmt-num`}
                    inputMode="numeric"
                    value={form.fee_amount}
                    onChange={(event) => setForm({ ...form, fee_amount: event.target.value.replace(/[^0-9]/g, '') })}
                  />
                )}
              </Field>

              {!otp ? (
                <Button
                  type="button"
                  className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                  onClick={() => run('offer')}
                  disabled={busy || !check?.licensed || !form.fee_amount}
                >
                  {busy ? 'Inatuma…' : 'Pendekeza na tuma namba'}
                </Button>
              ) : (
                <div className="space-y-3 rounded-md border border-border bg-muted/40 px-3 py-3">
                  <p className="ibmt-kicker">Namba ya kusaini</p>
                  <p className="ibmt-num font-heading text-xl font-semibold text-navy">{otp.code}</p>
                  <Field label="Weka namba" required>
                    {(props) => (
                      <TextInput
                        {...props}
                        className={`${props.className} ibmt-num`}
                        inputMode="numeric"
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      />
                    )}
                  </Field>
                  <Button
                    type="button"
                    className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                    onClick={() => run('sign')}
                    disabled={busy || code.length !== 6}
                  >
                    Saini mandate
                  </Button>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Mandate zilizopo" description="Mandate inayofanya kazi inampa wakala ufikiaji wa nyumba hiyo.">
          {rows.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Hakuna mandate bado.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.mandate_id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{row.unit_ref || row.unit_id}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.agent_name} · {row.licence_no || 'leseni haijaonyeshwa'}
                      </p>
                      <div className="mt-1">
                        <Money amount={row.fee_amount} note="Mmiliki hulipa · mpangaji TZS 0" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge
                        status={row.status}
                        label={row.status === 'active' ? 'Inafanya kazi' : row.status === 'offered' ? 'Inasubiri sahihi' : 'Imekwisha'}
                      />
                      {row.status !== 'ended' && (
                        <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => end(row)} disabled={busy}>
                          Maliza
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}