import { useState } from 'react';
import { Download } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import { downloadJson } from '@/lib/money';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';

/** A copy of everything the register holds about the signed-in person. */
export default function DataExport() {
  const { tt } = useT();
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await callFn('privacyDesk', { action: 'exportData' });
      downloadJson(response.filename, response.payload);
      setCounts(response.counts);
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'Export my data', sw: 'Hamisha data yangu' })}
      description={tt({
        en: 'A file is built from what the register holds about you and downloads straight away. The request itself is recorded.',
        sw: 'Faili huundwa kutoka kile rejista inachohifadhi kukuhusu na hupakuliwa papo hapo. Ombi lenyewe huandikwa.',
      })}
    >
      <Button type="button" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={busy} onClick={run}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {busy ? tt({ en: 'Preparing…', sw: 'Inaandaa…' }) : tt({ en: 'Download my records', sw: 'Pakua kumbukumbu zangu' })}
      </Button>

      {counts && (
        <Notice tone="positive" className="mt-4">
          {tt({ en: 'Downloaded', sw: 'Imepakuliwa' })}:{' '}
          <span className="ibmt-num">
            {counts.units} {tt({ en: 'units', sw: 'vitengo' })} · {counts.leases} {tt({ en: 'leases', sw: 'mikataba' })} ·{' '}
            {counts.rent_records} {tt({ en: 'rent records', sw: 'kumbukumbu za kodi' })} · {counts.simulated_payments}{' '}
            {tt({ en: 'simulated payments', sw: 'malipo ya majaribio' })}
          </span>
        </Notice>
      )}
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
    </SectionCard>
  );
}