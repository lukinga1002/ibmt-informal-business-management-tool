import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';

const EXAMPLE = 'IBMT-RCP-2026-004812';

/**
 * Public entry point to verification. A reference is all that is required —
 * never personal data.
 */
export default function VerifyEntryCard() {
  const { t } = useT();
  const { isMock } = useIBMT();
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const value = reference.trim();
    if (value.length < 6) {
      setError(t('verify.privacyNote'));
      return;
    }
    setError('');
    navigate(`/verify?reference=${encodeURIComponent(value)}`);
  };

  return (
    <section className="ibmt-panel p-5 sm:p-7">
      <h2 className="font-heading text-base font-semibold text-navy">{t('landing.verifyTitle')}</h2>
      <p className="ibmt-hint mt-1">{t('landing.verifyLede')}</p>

      <form onSubmit={submit} className="mt-5" noValidate>
        <label htmlFor="verify-reference" className="ibmt-label block">
          {t('verify.reference')}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="verify-reference"
            name="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder={t('landing.verifyPlaceholder')}
            aria-describedby="verify-hint"
            aria-invalid={Boolean(error)}
            autoComplete="off"
            className="ibmt-num ibmt-tap w-full rounded-md border border-input bg-card px-3 text-[15px] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/70"
          />
          <Button type="submit" className="ibmt-tap shrink-0 gap-2 bg-navy px-5 font-semibold text-primary-foreground hover:bg-navy-deep">
            <Search className="h-4 w-4" aria-hidden="true" />
            {t('landing.verifyCta')}
          </Button>
        </div>
        <p id="verify-hint" className="ibmt-hint mt-2">
          {error ? <span className="text-destructive">{error}</span> : t('landing.verifyHint')}
        </p>
      </form>

      {isMock && (
        <button
          type="button"
          onClick={() => setReference(EXAMPLE)}
          className="ibmt-hint mt-3 rounded-sm underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          {EXAMPLE}
        </button>
      )}

      <Notice tone="privacy" className="mt-5">
        {t('verify.privacyNote')}
      </Notice>
    </section>
  );
}