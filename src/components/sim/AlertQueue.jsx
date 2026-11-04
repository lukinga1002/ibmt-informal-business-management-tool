import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Notice from '@/components/ibmt/Notice';
import { ALERT_LABEL } from '@/lib/money';
import { Button } from '@/components/ui/button';

/** Anything that did not match goes here, and a person clears it. */
export default function AlertQueue({ state, onCleared }) {
  const { tt, lang } = useT();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const clear = async (alert) => {
    setBusy(alert.id);
    setError('');
    try {
      await callFn('simPayment', { action: 'clearAlert', id: alert.id, note: 'Reviewed in the simulation screen' });
      onCleared?.();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'Alert queue', sw: 'Foleni ya tahadhari' })}
      description={tt({
        en: 'Signature failures, duplicate references, and any callback that disagrees with the status check land here. Nothing is auto-corrected.',
        sw: 'Kushindwa kwa sahihi, namba zilizorudiwa, na taarifa yoyote isiyolingana na ukaguzi wa hali huja hapa. Hakuna kinachorekebishwa kiotomatiki.',
      })}
    >
      <AsyncBlock state={state}>
        {(data) => (
          <div>
            {error && <Notice tone="danger" className="mb-3">{error}</Notice>}
            {data.count === 0 ? (
              <Notice tone="positive">{tt({ en: 'No open alert.', sw: 'Hakuna tahadhari iliyo wazi.' })}</Notice>
            ) : (
              <ul className="divide-y divide-border">
                {data.alerts.map((alert) => (
                  <li key={alert.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{tt(ALERT_LABEL[alert.kind] || { en: alert.kind, sw: alert.kind })}</p>
                      <p className="ibmt-hint">{alert.detail}</p>
                      {alert.provider_reference && <p className="ibmt-num ibmt-hint">{alert.provider_reference}</p>}
                      <p className="ibmt-hint">{new Date(alert.created_date).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="ibmt-tap" disabled={Boolean(busy)} onClick={() => clear(alert)}>
                      {busy === alert.id ? tt({ en: 'Clearing…', sw: 'Inafuta…' }) : tt({ en: 'Mark reviewed', sw: 'Weka kama imepitiwa' })}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </AsyncBlock>
    </SectionCard>
  );
}