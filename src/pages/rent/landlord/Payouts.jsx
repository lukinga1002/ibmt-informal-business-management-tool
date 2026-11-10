import Stage2PayoutPanel from '@/components/money/Stage2PayoutPanel';
import { useT } from '@/i18n/I18nContext';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import { Banknote } from 'lucide-react';

/** Where a landlord changes the number they are paid on. */
export default function LandlordPayouts() {
  const { tt } = useT();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tt({ en: 'Money', sw: 'Fedha' })}
        title={tt({ en: 'Payout details', sw: 'Taarifa za malipo' })}
        lede={tt({
          en: 'The number a landlord is paid on can only be changed by confirming a code on the old number, then waiting out the cooling-off period.',
          sw: 'Namba ambayo mmiliki hulipwa inaweza kubadilishwa kwa kuthibitisha namba kwenye ya zamani, kisha kusubiri kipindi cha utulivu.',
        })}
        meta={[{ label: tt({ en: 'Simulation only', sw: 'Majaribio pekee' }), Icon: Banknote }]}
      />

      <Notice tone="caution" className="mt-5">
        {tt({
          en: 'No payment provider is connected. Payout numbers are recorded for the pilot and never used to send money.',
          sw: 'Hakuna mtoa huduma wa malipo aliyeunganishwa. Namba za malipo huhifadhiwa kwa majaribio na hazitumiki kutuma fedha.',
        })}
      </Notice>

      <div>
        <Stage2PayoutPanel />
      </div>
    </div>
  );
}