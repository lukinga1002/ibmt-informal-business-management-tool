import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';

/**
 * The code step between choosing a workspace and opening it. The code goes only
 * to the phone number or email already on the account, and it is the same
 * account the platform signed in: this screen never asks for a password and
 * never creates a session.
 */
export default function EntryCode({ entry, onOpened, onBack }) {
  const { t } = useT();
  const { user } = useAuth();
  const [step, setStep] = useState({ status: 'idle' });
  const [channel, setChannel] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reasonText = {
    expired: t('landing.accessExpired'),
    locked: t('landing.accessRate'),
    too_many_attempts: t('landing.accessRate'),
    mismatch: t('landing.accessRefused'),
    already_used: t('landing.accessExpired'),
    rate_limited: t('landing.accessRate'),
    no_phone: t('landing.accessNoPhone'),
    email_failed: t('landing.accessFailed'),
    code: t('landing.accessRefused'),
  };

  const send = useCallback(
    async (nextChannel) => {
      if (!user) return;
      setBusy(true);
      setError('');
      try {
        const response = await base44.functions.invoke('portalAccess', {
          action: 'send',
          entry: entry.id,
          channel: nextChannel || null,
        });
        const data = response.data || {};
        if (!data.ok) {
          setStep({ status: 'blocked', data });
          return;
        }
        setChannel(data.channel);
        setCode('');
        setStep({ status: 'sent', data });
      } catch (err) {
        setError(err?.response?.data?.message || err.message || t('landing.accessFailed'));
      } finally {
        setBusy(false);
      }
    },
    [entry.id, user, t],
  );

  useEffect(() => {
    if (user) send(null);
  }, [user, send]);

  const verify = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await base44.functions.invoke('portalAccess', {
        action: 'verify',
        entry: entry.id,
        challenge_id: step.data?.challenge_id,
        code,
      });
      const data = response.data || {};
      if (data.ok) {
        onOpened?.(data.route || entry.route);
        return;
      }
      setError(reasonText[data.reason] || t('landing.accessRefused'));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t('landing.accessRefused'));
    } finally {
      setBusy(false);
    }
  };

  const shell = (children) => (
    <div className="ibmt-panel mt-6 p-5 sm:p-6" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gold-soft text-gold-ink">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[15px] font-semibold text-navy">{t('landing.accessTitle')}</h3>
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 text-[12px] font-semibold text-navy-soft hover:text-gold-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t('landing.accessBack')}
      </button>
    </div>
  );

  if (!user) {
    return shell(
      <>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t('landing.accessSignIn')}</p>
        <Link
          to="/login?returnTo=/rent"
          className="ibmt-tap mt-3 inline-flex items-center rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          {t('landing.accessSignInCta')}
        </Link>
      </>,
    );
  }

  if (step.status === 'blocked') {
    const data = step.data || {};
    if (data.reason === 'role') {
      return shell(
        <>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {t('landing.accessRole', { role: t(`roles.${data.registered_role || 'public'}`) })}
          </p>
          {data.route && (
            <Link
              to={data.route}
              className="ibmt-tap mt-3 inline-flex items-center rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
            >
              {t('landing.accessOpenRole')}
            </Link>
          )}
        </>,
      );
    }
    return shell(
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {reasonText[data.reason] || t('landing.accessFailed')}
      </p>,
    );
  }

  if (step.status !== 'sent') {
    return shell(
      <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t('landing.accessSending')}
      </p>,
    );
  }

  const data = step.data;

  return shell(
    <>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {data.channel === 'phone'
          ? t('landing.accessSentPhone', { to: data.to })
          : t('landing.accessSentEmail', { to: data.to })}
      </p>
      <p className="ibmt-hint mt-1">{t('landing.accessExpires', { minutes: data.expires_minutes })}</p>

      {data.demo_code && (
        <Notice tone="caution" className="mt-3" title={t('landing.accessDemoTitle')}>
          <span className="ibmt-num text-[15px] font-semibold">{data.demo_code}</span>
          <span className="ml-2 text-[12px]">{t('landing.accessDemo')}</span>
        </Notice>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <TextInput
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
          placeholder="000000"
          aria-label={t('landing.accessCode')}
          className="ibmt-num tracking-[0.4em]"
        />
        <Button
          type="button"
          onClick={verify}
          disabled={busy || code.length !== 6}
          className="ibmt-tap shrink-0 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {t('landing.accessVerify')}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={() => send(channel)}
          disabled={busy}
          className="inline-flex min-h-[40px] items-center text-[12px] font-semibold text-navy-soft hover:text-gold-ink disabled:opacity-50"
        >
          {t('landing.accessResend')}
        </button>
        <button
          type="button"
          onClick={() => send(channel === 'phone' ? 'email' : 'phone')}
          disabled={busy}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-[12px] font-semibold text-navy-soft hover:text-gold-ink disabled:opacity-50"
        >
          <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {channel === 'phone' ? t('landing.accessUseEmail') : t('landing.accessUsePhone')}
        </button>
      </div>

      <p className="ibmt-hint mt-2">{t('landing.accessNote')}</p>
    </>,
  );
}