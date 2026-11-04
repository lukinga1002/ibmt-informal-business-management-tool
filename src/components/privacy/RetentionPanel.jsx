import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';

/** Retention periods and the purge job. Every period here is a placeholder. */
export default function RetentionPanel({ retention, isAdmin = false, onChanged }) {
  const { tt, lang } = useT();
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(retention?.last_result || null);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await callFn('privacyDesk', { action: 'retentionRun', acknowledge_placeholder: acknowledge });
      setResult(response.result);
      onChanged?.();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy(false);
    }
  };

  const periods = retention?.periods || [];

  return (
    <SectionCard
      title={tt({ en: 'Retention', sw: 'Uhifadhi' })}
      description={tt({
        en: 'How long each class of record is kept. These periods are placeholders until a lawyer and the commissioner sign them off.',
        sw: 'Muda ambao kila aina ya kumbukumbu huhifadhiwa. Vipindi hivi ni vya mfano hadi wakili na mkuu wa wilaya wavikubali.',
      })}
    >
      <Notice tone="caution">
        {tt({
          en: 'Placeholder periods. Nothing here is a statutory retention rule.',
          sw: 'Vipindi vya mfano. Hakuna kanuni ya kisheria ya uhifadhi hapa.',
        })}
      </Notice>

      <ul className="mt-4 divide-y divide-border">
        {periods.map((period) => (
          <li key={period.key} className="py-2 text-[12px] first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{tt(period.label || { en: period.key, sw: period.key })}</span>
              <span className="ibmt-num">{period.days} {tt({ en: 'days', sw: 'siku' })}</span>
            </div>
            {period.keeps && <p className="ibmt-hint">{tt(period.keeps)}</p>}
          </li>
        ))}
      </ul>

      {retention?.last_run_at && (
        <p className="ibmt-hint mt-3">
          {tt({ en: 'Last run', sw: 'Utekelezaji wa mwisho' })}: {new Date(retention.last_run_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}
        </p>
      )}
      {result && Array.isArray(result.results) && (
        <ul className="ibmt-num mt-2 space-y-1 text-[11px] text-muted-foreground">
          {result.results.map((row) => (
            <li key={row.key}>{row.entity}: {row.deleted} {tt({ en: 'removed', sw: 'zimeondolewa' })}{row.error ? ` · ${row.error}` : ''}</li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className="mt-4 border-t border-border pt-4">
          <label className="flex items-start gap-2 text-[13px]">
            <input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} className="mt-1 h-4 w-4" />
            {tt({ en: 'I confirm these periods are placeholders and this is a test run.', sw: 'Nathibitisha vipindi hivi ni vya mfano na huu ni utekelezaji wa majaribio.' })}
          </label>
          <Button type="button" variant="outline" className="ibmt-tap mt-3" disabled={busy || !acknowledge} onClick={run}>
            {busy ? tt({ en: 'Running…', sw: 'Inatekeleza…' }) : tt({ en: 'Run the purge job', sw: 'Tekeleza uondoaji' })}
          </Button>
        </div>
      )}
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
    </SectionCard>
  );
}