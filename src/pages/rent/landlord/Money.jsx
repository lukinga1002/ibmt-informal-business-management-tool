import { Link } from 'react-router-dom';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import RentWorkspace from '@/components/rent/record/RentWorkspace';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/I18nContext';

/**
 * Landlord money: rent records, confirmations and receipts for the tenancies
 * this landlord holds. IBMT records the money; it never holds it.
 */
export default function LandlordMoney() {
  const { t } = useT();
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('moneyPage.kicker')}
        title={t('moneyPage.title')}
        lede={t('moneyPage.lede')}
        meta={[{ label: t('moneyPage.stage1') }, { label: t('moneyPage.noFunds') }]}
        actions={
          <>
            <Button asChild variant="outline" className="ibmt-tap">
              <Link to="/rent/landlord/leases">{t('leases.title')}</Link>
            </Button>
            <Button asChild variant="outline" className="ibmt-tap">
              <Link to="/rent/landlord/tax">{t('moneyPage.taxStatement')}</Link>
            </Button>
          </>
        }
      />

      <Notice tone="policy" title={t('moneyPage.receiptTitle')}>
        {t('moneyPage.receiptBody')}
      </Notice>

      <RentWorkspace role="landlord" />
    </div>
  );
}