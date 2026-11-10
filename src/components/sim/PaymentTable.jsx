import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import { STATE_LABEL } from '@/lib/money';
import SectionCard from '@/components/ibmt/SectionCard';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';

/** Simulated payments and the callbacks a real provider would send. */
export default function PaymentTable({ payments = [], onChanged, onCorrect }) {
  const { tt, lang } = useT();
  const [busy, setBusy] = useState('');
  const [check, setCheck] = useState({});
  const [error, setError] = useState('');

  const act = async (payment, payload) => {
    const key = `${payment.id}:${payload.action}:${payload.outcome || ''}`;
    setBusy(key);
    setError('');
    try {
      const result = await callFn('simPayment', { ...payload, payment_id: payment.id });
      if (payload.action === 'status') setCheck((previous) => ({ ...previous, [payment.id]: result }));
      onChanged?.();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'Simulated payments', sw: 'Malipo ya majaribio' })}
      description={tt({
        en: 'Credit is written only when a payment reaches succeeded. Every callback is checked against a separate status call.',
        sw: 'Deni huandikwa tu pale malipo yanapofikia kufanikiwa. Kila taarifa hulinganishwa na ukaguzi tofauti wa hali.',
      })}
    >
      {error && (
        <Notice tone="danger" className="mb-4">{error}</Notice>
      )}

      {payments.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          {tt({ en: 'No simulated payment yet. Start one above.', sw: 'Hakuna malipo ya majaribio bado. Anzisha moja hapo juu.' })}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((payment) => (
            <li key={payment.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="ibmt-num text-[13px] font-semibold">{payment.reference}</p>
                  <p className="ibmt-hint">
                    {tt(payment.stage_label)} · {payment.unit_ref || tt({ en: 'no unit', sw: 'hakuna kitengo' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money amount={payment.tenant_pays} note={tt({ en: 'tenant pays', sw: 'mpangaji hulipa' })} />
                  <span className="rounded-sm border border-border bg-muted/50 px-2 py-1 text-[12px] font-medium">
                    {tt(STATE_LABEL[payment.state] || { en: payment.state, sw: payment.state })}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-[13px]">
                <p>Simulation / Majaribio</p>
                {payment.payout_state==='held_limit'&&<p role="status">Malipo yameshikiliwa kwa kikomo: ongeza akaunti ya benki. / Payout held by wallet limit: add a bank account.</p>}
                {payment.fee_status !== 'in_force' && payment.stage==='stage2_partner' && <p>Ada inayopendekezwa (majaribio) / Proposed fee (simulation)</p>}
                {(payment.split_lines||[]).filter(line=>line.key!=='service_fee'||line.amount>0).map(line=><p key={line.key}>{line.key} · TZS {line.amount.toLocaleString()}</p>)}
                <p>Ada ya huduma ya halmashauri si kodi ya majengo wala kodi ya mapato. / The council service fee is not property rate and not income tax.</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="ibmt-tap bg-navy text-primary-foreground hover:bg-navy-deep"
                  disabled={Boolean(busy) || payment.state === 'succeeded' || payment.state === 'reversed'}
                  onClick={() => act(payment, { action: 'partnerNotify', outcome: 'succeeded' })}
                >
                  {busy === `${payment.id}:partnerNotify:succeeded`
                    ? tt({ en: 'Sending…', sw: 'Inatuma…' })
                    : tt({ en: 'Partner reports success', sw: 'Mshirika atuma mafanikio' })}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ibmt-tap"
                  disabled={Boolean(busy) || payment.state === 'succeeded' || payment.state === 'reversed'}
                  onClick={() => act(payment, { action: 'partnerNotify', outcome: 'failed' })}
                >
                  {tt({ en: 'Partner reports failure', sw: 'Mshirika atuma kushindwa' })}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="ibmt-tap" disabled={Boolean(busy)} onClick={() => act(payment, { action: 'status' })}>
                  {tt({ en: 'Status check', sw: 'Kagua hali' })}
                </Button>
                {onCorrect && payment.state === 'succeeded' && (
                  <Button type="button" size="sm" variant="ghost" className="ibmt-tap" onClick={() => onCorrect(payment)}>
                    {tt({ en: 'Ask for a correction', sw: 'Omba marekebisho' })}
                  </Button>
                )}
              </div>

              {check[payment.id] && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {tt({ en: 'Separate status check', sw: 'Ukaguzi tofauti wa hali' })}:{' '}
                  <span className="font-medium text-foreground">{check[payment.id].provider_check?.status}</span> ·{' '}
                  <span className="ibmt-num">{Number(check[payment.id].provider_check?.amount || 0).toLocaleString('en-US')}</span> ·{' '}
                  {new Date(check[payment.id].provider_check?.checked_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}
                </p>
              )}
              {payment.provider_reference && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {tt({ en: 'Provider reference', sw: 'Namba ya mtoa huduma' })}: <span className="ibmt-num">{payment.provider_reference}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}