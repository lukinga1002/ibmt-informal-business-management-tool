import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';

/**
 * Asking for a refund or a reversal. The request is not the action: a second
 * person has to approve it, and the person who asked can never approve.
 */
export default function CorrectionPanel({ payments = [], onChanged }) {
  const { tt } = useT();
  const [kind, setKind] = useState('refund');
  const [paymentId, setPaymentId] = useState(payments[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult('');
    try {
      const response = await callFn('moneyControl', {
        action: 'request',
        kind,
        payment_id: paymentId,
        amount: kind === 'refund' ? Number(amount) : undefined,
        reason,
      });
      setResult(response.request?.id || '');
      setReason('');
      setAmount('');
      onChanged?.();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'Corrections', sw: 'Marekebisho' })}
      description={tt({
        en: 'A refund can never exceed what was paid. A reversal mirrors the original entries. Both need a second person.',
        sw: 'Marejesho hayawezi kuzidi kilicholipwa. Kurudisha huakisi kumbukumbu za awali. Vyote vinahitaji mtu wa pili.',
      })}
    >
      <Notice tone="policy" className="mb-4">
        {tt({
          en: 'Two people: the person who asks for a money action can never be the one who approves it.',
          sw: 'Watu wawili: anayeomba hatua ya fedha hawezi kuwa ndiye anayeidhinisha.',
        })}
      </Notice>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={tt({ en: 'Action', sw: 'Hatua' })}>
          {({ id, className }) => (
            <SelectControl id={id} className={className} value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="refund">{tt({ en: 'Refund (up to what was paid)', sw: 'Marejesho (hadi kilicholipwa)' })}</option>
              <option value="reverse">{tt({ en: 'Reverse the whole payment', sw: 'Rudisha malipo yote' })}</option>
            </SelectControl>
          )}
        </Field>

        <Field label={tt({ en: 'Simulated payment', sw: 'Malipo ya majaribio' })}>
          {({ id, className }) => (
            <SelectControl id={id} className={className} value={paymentId} onChange={(event) => setPaymentId(event.target.value)}>
              <option value="">{tt({ en: 'Choose a payment', sw: 'Chagua malipo' })}</option>
              {payments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.reference} · {Number(payment.tenant_pays).toLocaleString('en-US')}
                </option>
              ))}
            </SelectControl>
          )}
        </Field>

        {kind === 'refund' && (
          <Field
            label={tt({ en: 'Refund amount (TZS)', sw: 'Kiasi cha kurejesha (TZS)' })}
            type="number"
            min="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            hint={tt({ en: 'Never more than the amount paid.', sw: 'Kamwe si zaidi ya kilicholipwa.' })}
          />
        )}

        <Field label={tt({ en: 'Reason (required)', sw: 'Sababu (inahitajika)' })} className={kind === 'refund' ? '' : 'sm:col-span-2'}>
          {({ id, describedBy, invalid }) => (
            <TextArea id={id} describedBy={describedBy} invalid={invalid} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
          )}
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" className="ibmt-tap bg-navy text-primary-foreground hover:bg-navy-deep" disabled={busy || !paymentId || !reason}>
            {busy ? tt({ en: 'Sending…', sw: 'Inatuma…' }) : tt({ en: 'Ask a second person to approve', sw: 'Omba mtu wa pili aidhinisha' })}
          </Button>
        </div>
      </form>

      {result && (
        <Notice tone="positive" className="mt-4">
          {tt({ en: 'Request created. Nothing has been credited or refunded yet.', sw: 'Ombi limeundwa. Hakuna kilichorejeshwa bado.' })}{' '}
          <span className="ibmt-num">{result}</span>
        </Notice>
      )}
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
    </SectionCard>
  );
}