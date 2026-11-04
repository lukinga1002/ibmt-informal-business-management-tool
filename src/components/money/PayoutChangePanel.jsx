import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useFn } from '@/hooks/useFn';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Notice from '@/components/ibmt/Notice';
import Field from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';

/**
 * Changing the number a landlord is paid on: a code goes to the OLD number,
 * then the change waits out a cooling-off period. Simulation only.
 */
export default function PayoutChangePanel() {
  const { tt, lang } = useT();
  const list = useFn('moneyControl', { action: 'list' });
  const [newPhone, setNewPhone] = useState('');
  const [oldPhone, setOldPhone] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(null);
  const [simulationCode, setSimulationCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const request = async (event) => {
    event.preventDefault();
    setBusy('request');
    setError('');
    setMessage('');
    try {
      const response = await callFn('moneyControl', { action: 'payoutRequest', new_phone: newPhone, old_phone: oldPhone });
      setActive(response.change);
      setSimulationCode(response.simulation_code || '');
      setMessage(
        tt({
          en: `A code was sent to the number on file (expires in ${response.otp.ttl_minutes} minutes).`,
          sw: `Namba imetumwa kwa namba iliyopo kwenye kumbukumbu (inaisha baada ya dakika ${response.otp.ttl_minutes}).`,
        }),
      );
      list.reload();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setBusy('verify');
    setError('');
    try {
      const response = await callFn('moneyControl', { action: 'payoutVerify', id: active.id, code });
      setActive(response.change);
      setSimulationCode('');
      setCode('');
      setMessage(
        tt({
          en: `Verified. The change waits ${response.cooling_off_hours} hours before it can take effect.`,
          sw: `Imethibitishwa. Mabadiliko yanasubiri saa ${response.cooling_off_hours} kabla ya kutumika.`,
        }),
      );
      list.reload();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  const activate = async () => {
    setBusy('activate');
    setError('');
    try {
      const response = await callFn('moneyControl', { action: 'payoutActivate', id: active.id });
      setActive(response.change);
      setMessage(tt({ en: 'The new number is now in use.', sw: 'Namba mpya inatumika sasa.' }));
      list.reload();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  const mine = (row) => !active || row.id === active.id;

  return (
    <SectionCard
      title={tt({ en: 'Payout number', sw: 'Namba ya malipo' })}
      description={tt({
        en: 'The code goes to the number already on file, never to the new one, and the change then waits out its cooling-off period.',
        sw: 'Namba hutumwa kwa namba iliyopo kwenye kumbukumbu, kamwe si kwa mpya, kisha mabadiliko yanasubiri kipindi cha utulivu.',
      })}
      actions={<ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    >
      <Notice tone="caution" className="mb-4">
        {tt({ en: 'Simulation: no SMS is sent. The code is shown here so the step can be completed in front of you.', sw: 'Majaribio: hakuna SMS inayotumwa. Namba inaonyeshwa hapa ili hatua ikamilike mbele yako.' })}
      </Notice>

      <form onSubmit={request} className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tt({ en: 'Number currently on file', sw: 'Namba iliyopo kwenye kumbukumbu' })}
          value={oldPhone}
          onChange={(event) => setOldPhone(event.target.value)}
          placeholder="2557XXXXXXXX"
          hint={tt({ en: 'Needed only if no number is recorded against your account.', sw: 'Inahitajika tu kama hakuna namba iliyoandikwa kwenye akaunti yako.' })}
        />
        <Field label={tt({ en: 'New number', sw: 'Namba mpya' })} required value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="2557XXXXXXXX" />
        <div className="sm:col-span-2">
          <Button type="submit" className="ibmt-tap bg-navy text-primary-foreground hover:bg-navy-deep" disabled={busy === 'request' || !newPhone}>
            {busy === 'request' ? tt({ en: 'Sending code…', sw: 'Inatuma namba…' }) : tt({ en: 'Send a code to the old number', sw: 'Tuma namba kwa ya zamani' })}
          </Button>
        </div>
      </form>

      {simulationCode && (
        <Notice tone="policy" className="mt-4">
          {tt({ en: 'Simulation code', sw: 'Namba ya majaribio' })}: <span className="ibmt-num text-[15px] font-semibold">{simulationCode}</span>
        </Notice>
      )}

      {active && active.status === 'otp_sent' && (
        <form onSubmit={verify} className="mt-4 flex flex-wrap items-end gap-3">
          <Field label={tt({ en: 'Enter the code', sw: 'Weka namba' })} value={code} onChange={(event) => setCode(event.target.value)} className="w-40" />
          <Button type="submit" className="ibmt-tap bg-navy text-primary-foreground hover:bg-navy-deep" disabled={busy === 'verify' || code.length < 6}>
            {busy === 'verify' ? tt({ en: 'Checking…', sw: 'Inakagua…' }) : tt({ en: 'Confirm', sw: 'Thibitisha' })}
          </Button>
        </form>
      )}

      {active && (active.status === 'cooling_off' || active.status === 'effective') && (
        <div className="mt-4 rounded-md border border-border px-4 py-3">
          <p className="text-[13px] font-medium capitalize">{active.status.replace('_', ' ')}</p>
          {active.cooling_off_ends_at && (
            <p className="ibmt-hint">
              {tt({ en: 'Takes effect after', sw: 'Inatumika baada ya' })}:{' '}
              {new Date(active.cooling_off_ends_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}
            </p>
          )}
          {active.status === 'cooling_off' && (
            <Button type="button" size="sm" variant="outline" className="ibmt-tap mt-2" disabled={busy === 'activate'} onClick={activate}>
              {busy === 'activate' ? tt({ en: 'Checking…', sw: 'Inakagua…' }) : tt({ en: 'Use the new number now', sw: 'Tumia namba mpya sasa' })}
            </Button>
          )}
        </div>
      )}

      {message && <Notice tone="positive" className="mt-4">{message}</Notice>}
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}

      <div className="mt-6">
        <p className="ibmt-kicker">{tt({ en: 'Your requests', sw: 'Maombi yako' })}</p>
        <AsyncBlock state={list}>
          {(data) => {
            const rows = (data.payouts || []).filter(mine);
            if (rows.length === 0) {
              return <p className="mt-2 text-[12px] text-muted-foreground">{tt({ en: 'No change requested yet.', sw: 'Hakuna mabadiliko yaliyoombwa bado.' })}</p>;
            }
            return (
              <ul className="mt-2 divide-y divide-border">
                {rows.map((row) => (
                  <li key={row.id} className="py-2 text-[12px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="ibmt-num">
                        {row.old_phone_masked} → {row.new_phone_masked}
                      </span>
                      <span className="rounded-sm border border-border bg-muted/50 px-2 py-0.5 text-[11px]">{row.status.replace('_', ' ')}</span>
                    </div>
                    {row.cooling_off_ends_at && (
                      <p className="ibmt-hint">
                        {tt({ en: 'Cooling off until', sw: 'Utulivu hadi' })} {new Date(row.cooling_off_ends_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            );
          }}
        </AsyncBlock>
      </div>
    </SectionCard>
  );
}