import CouncilTermsPanel from '@/components/sim/CouncilTermsPanel';
import Stage2CouncilPanel from '@/components/sim/Stage2CouncilPanel';
import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useFn } from '@/hooks/useFn';
import { callFn, fnError, newKey } from '@/lib/r4';
import { SIM_NOTICE } from '@/lib/money';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import AsyncBlock from '@/components/gov/AsyncBlock';
import SplitPanel from '@/components/sim/SplitPanel';
import PaymentTable from '@/components/sim/PaymentTable';
import LedgerPanel from '@/components/sim/LedgerPanel';
import TestPanel from '@/components/sim/TestPanel';
import AlertQueue from '@/components/sim/AlertQueue';
import CorrectionPanel from '@/components/money/CorrectionPanel';
import ApprovalPanel from '@/components/money/ApprovalPanel';

/**
 * Simulation workspace for stages 2 and 3. No provider is connected: this
 * screen exists to prove the arithmetic, the ledger and the controls.
 */
export default function MoneyEngine() {
  const { tt } = useT();
  const ledger = useFn('simPayment', { action: 'ledger' });
  const alerts = useFn('simPayment', { action: 'alerts' });
  const tests = useFn('simPayment', { action: 'selfTest' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async (form) => {
    setBusy(true);
    setError('');
    try {
      await callFn('simPayment', { action: 'initiate', ...form, idempotency_key: newKey('r7') });
      ledger.reload();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy(false);
    }
  };

  const payments = ledger.data?.payments || [];
  const succeeded = payments.filter((payment) => payment.state === 'succeeded');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tt({ en: 'Money engine', sw: 'Injini ya fedha' })}
        title={tt({ en: 'Stage 2 — simulation', sw: 'Hatua 2 — majaribio' })}
        lede={tt({
          en: 'The split, the payment states, the ledger and the callback rules, running end to end with a mock partner.',
          sw: 'Mgawanyo, hali za malipo, daftari na kanuni za taarifa, vikifanya kazi kwa mshirika wa kubuni.',
        })}
        meta={[
          { label: tt({ en: 'Simulation only', sw: 'Majaribio pekee' }), Icon: FlaskConical },
          { label: tt({ en: 'Whole TZS, no decimals', sw: 'TZS nzima, bila desimali' }), Icon: FlaskConical },
        ]}
      />

      <Notice tone="caution" className="mt-5" title={tt({ en: 'Simulation', sw: 'Majaribio' })}>
        {tt(SIM_NOTICE)}
      </Notice>

      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}

      <div className="space-y-6">
        <CouncilTermsPanel admin />
        <Stage2CouncilPanel admin />
        <SplitPanel onStart={start} busy={busy} />

        <AsyncBlock state={ledger}>
          {(data) => (
            <div className="space-y-6">
              <PaymentTable payments={data.payments} onChanged={ledger.reload} />
              <LedgerPanel entries={data.entries} totals={data.totals} />
            </div>
          )}
        </AsyncBlock>

        <div className="grid gap-6 lg:grid-cols-2">
          <CorrectionPanel payments={succeeded} onChanged={ledger.reload} />
          <ApprovalPanel onChanged={ledger.reload} />
        </div>

        <AlertQueue state={alerts} onCleared={alerts.reload} />
        <TestPanel state={tests} />
      </div>
    </div>
  );
}