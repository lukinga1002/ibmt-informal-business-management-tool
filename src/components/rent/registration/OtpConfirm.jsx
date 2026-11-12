import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import { errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

/**
 * Confirmation code hand-off. The code goes to the landlord's or tenant's own
 * phone; whoever is registering on their behalf never receives it.
 */
export default function OtpConfirm({ caseId, caseRef, channel, demoCode, onConfirmed }) {
  const { t } = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('confirmRegistrationOtp', { case_id: caseId, case_ref: caseRef, code });
      if (response.data?.confirmed) {
        onConfirmed?.(response.data);
      } else {
        setError({ key: 'otpConfirm.notAccepted' });
      }
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 text-navy" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-heading text-[15px] font-semibold text-navy">
            {channel === 'migrated' ? t('otpConfirm.tenantTitle') : t('otpConfirm.ownerTitle')}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {channel === 'migrated' ? t('otpConfirm.tenantBody') : t('otpConfirm.ownerBody')}
          </p>
        </div>
      </div>

      {demoCode && (
        <Notice tone="caution" className="mt-3" title={t('otpConfirm.demoTitle')}>
          <span className="ibmt-num text-[15px] font-semibold">{demoCode}</span>
          <span className="ml-2 text-[12px]">{t('otpConfirm.demoBody')}</span>
        </Notice>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <TextInput
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
          placeholder="000000"
          aria-label={t('otpConfirm.code')}
          className="ibmt-num tracking-[0.4em]"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={busy || code.length !== 6}
          className="ibmt-tap shrink-0 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          {busy ? t('otpConfirm.sending') : t('common.confirm')}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-destructive">
          {errorText(error)}
        </p>
      )}
    </div>
  );
}