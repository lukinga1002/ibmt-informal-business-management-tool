import Stage2PayoutPanel from '@/components/money/Stage2PayoutPanel';
import { useT } from '@/i18n/I18nContext';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import { Banknote } from 'lucide-react';

/** Where a landlord changes the number they are paid on. */
export default function LandlordPayouts() {
  const { t } = useT();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('payoutsPage.kicker')}
        title={t('payoutsPage.title')}
        lede={t('payoutsPage.lede')}
        meta={[{ label: t('payoutsPage.simulationOnly'), Icon: Banknote }]}
      />

      <Notice tone="caution" className="mt-5">
        {t('payoutsPage.noProvider')}
      </Notice>

      <div>
        <Stage2PayoutPanel />
      </div>
    </div>
  );
}