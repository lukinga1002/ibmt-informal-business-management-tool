import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

/** Four separate choices. None is bundled with another, and each can be withdrawn. */
export default function ConsentPanel({ purposes = [], onChanged }) {
  const { tt, lang } = useT();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const toggle = async (purpose) => {
    setBusy(purpose.key);
    setError('');
    try {
      await callFn('privacyDesk', { action: 'setConsent', purpose: purpose.key, granted: !purpose.granted });
      onChanged?.();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'My choices', sw: 'Maamuzi yangu' })}
      description={tt({
        en: 'Each purpose is separate. Turning one off never turns another off, and a refusal is recorded with its date.',
        sw: 'Kila lengo ni tofauti. Kuzima moja hakuzimi lingine, na kukataa huandikwa pamoja na tarehe.',
      })}
    >
      {error && <Notice tone="danger" className="mb-3">{error}</Notice>}
      <ul className="divide-y divide-border">
        {purposes.map((purpose) => (
          <li key={purpose.key} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[13px] font-medium">
                <span className={purpose.granted ? 'text-success' : 'text-muted-foreground'}>
                  {purpose.granted ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                </span>
                {tt(purpose.label)}
              </p>
              <p className="ibmt-hint">{tt(purpose.detail)}</p>
              <p className="ibmt-hint">
                {purpose.granted
                  ? tt({ en: 'On', sw: 'Imewashwa' })
                  : tt({ en: 'Off', sw: 'Imezimwa' })}
                {purpose.withdrawn_at && ` · ${tt({ en: 'withdrawn', sw: 'imeondolewa' })} ${new Date(purpose.withdrawn_at).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}`}
                {purpose.version && ` · ${purpose.version}`}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={purpose.granted ? 'outline' : 'default'}
              className="ibmt-tap"
              disabled={Boolean(busy) || purpose.required}
              onClick={() => toggle(purpose)}
            >
              {purpose.required
                ? tt({ en: 'Required', sw: 'Inahitajika' })
                : busy === purpose.key
                  ? tt({ en: 'Saving…', sw: 'Inahifadhi…' })
                  : purpose.granted
                    ? tt({ en: 'Withdraw', sw: 'Ondoa' })
                    : tt({ en: 'Allow', sw: 'Ruhusu' })}
            </Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}