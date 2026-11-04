import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { TextArea } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';

/**
 * Anonymise rather than erase: names are replaced, and the records that law or
 * a contract requires are kept with the reason stated.
 */
export default function AccountDeletion({ existing }) {
  const { tt } = useT();
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(existing || null);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await callFn('privacyDesk', { action: 'deleteRequest', confirm, reason });
      setResult(response.request);
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'Close and anonymise my account', sw: 'Funga na ficha jina langu' })}
      description={tt({
        en: 'Your name is replaced in the records this screen may change. What must be kept is listed before you confirm.',
        sw: 'Jina lako hubadilishwa katika kumbukumbu ambazo ukurasa huu unaweza kubadilisha. Kinachopaswa kuhifadhiwa huorodheshwa kabla ya kuthibitisha.',
      })}
    >
      <Notice tone="caution">
        {tt({
          en: 'This replaces your name with a neutral value. It does not delete lease, rent or council records, and it does not close the login itself.',
          sw: 'Hii hubadilisha jina lako na thamani isiyo na jina. Haifuti kumbukumbu za mkataba, kodi au halmashauri, na haifungi kuingia kwenyewe.',
        })}
      </Notice>

      {result ? (
        <div className="mt-4 rounded-md border border-border px-4 py-3">
          <p className="text-[13px] font-medium capitalize">{String(result.status).replace('_', ' ')}</p>
          <p className="ibmt-hint">{result.note}</p>
          {Array.isArray(result.anonymised_fields) && result.anonymised_fields.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[12px] text-muted-foreground">
              {result.anonymised_fields.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {Array.isArray(result.retained) && result.retained.length > 0 && (
            <div className="mt-3">
              <p className="ibmt-kicker">{tt({ en: 'Kept, and why', sw: 'Kilichohifadhiwa, na kwa nini' })}</p>
              <ul className="mt-1 space-y-1 text-[12px] text-muted-foreground">
                {result.retained.map((item) => (
                  <li key={item.what}><span className="font-medium text-foreground">{item.what}</span> — {item.why}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="flex items-start gap-2 text-[13px]">
            <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} className="mt-1 h-4 w-4" />
            {tt({ en: 'I understand what is replaced and what is kept.', sw: 'Naelewa kinachobadilishwa na kinachohifadhiwa.' })}
          </label>
          <Field label={tt({ en: 'Reason (optional)', sw: 'Sababu (si lazima)' })}>
            {({ id, describedBy, invalid }) => (
              <TextArea id={id} describedBy={describedBy} invalid={invalid} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            )}
          </Field>
          <Button type="submit" variant="destructive" className="ibmt-tap" disabled={busy || !confirm}>
            {busy ? tt({ en: 'Working…', sw: 'Inafanya kazi…' }) : tt({ en: 'Anonymise my name', sw: 'Ficha jina langu' })}
          </Button>
        </form>
      )}
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
    </SectionCard>
  );
}