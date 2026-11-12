import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Field, { TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import { callFn, errorText } from '@/lib/r4';
import { formatDateTime } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * Each party signs from their own session with a code that is shown to them
 * only. The code is displayed in the app until an SMS gateway is connected.
 */
export default function LeaseSignPanel({ lease, onUpdated }) {
  const { t, lang } = useT();
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await callFn('leaseSignature', { action: 'request', lease_id: lease.lease_id });
      setChallenge({ ...data.otp, id: data.challenge_id });
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  const sign = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await callFn('leaseSignature', {
        action: 'sign',
        lease_id: lease.lease_id,
        challenge_id: challenge && challenge.id,
        code,
      });
      setChallenge(null);
      setCode('');
      if (onUpdated) onUpdated(data);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  if (lease.status === 'signed') {
    return (
      <Notice tone="positive" title={t('leaseSign.signedTitle')}>
        {t('leaseSign.signedBody')}
      </Notice>
    );
  }

  if (lease.i_have_signed) {
    return (
      <Notice tone="policy" title={t('leaseSign.mineTitle')}>
        {t('leaseSign.mineBody')}
      </Notice>
    );
  }

  if (!lease.can_request && !lease.i_have_signed) {
    return (
      <Notice tone="neutral" title={t('leaseSign.notPartyTitle')}>
        {t('leaseSign.notPartyBody')}
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      {!challenge ? (
        <Button type="button" variant="outline" className="ibmt-tap w-full" onClick={request} disabled={busy}>
          {busy ? t('leaseSign.sending') : t('leaseSign.send')}
        </Button>
      ) : (
        <>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
            <p className="ibmt-kicker">{t('leaseSign.yourCode')}</p>
            <p className="ibmt-num mt-1 font-heading text-xl font-semibold text-navy">{challenge.code}</p>
            <p className="ibmt-hint mt-1">
              {t('leaseSign.codeNote', { when: formatDateTime(challenge.expires_at, lang) })}
            </p>
          </div>
          <Field label={t('leaseSign.enterCode')} required>
            {(props) => (
              <TextInput
                {...props}
                className={`${props.className} ibmt-num`}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              />
            )}
          </Field>
          <Button
            type="button"
            className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={sign}
            disabled={busy || code.length !== 6}
          >
            {busy ? t('leaseSign.signing') : t('leaseSign.sign')}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {errorText(error)}
        </p>
      )}
    </div>
  );
}