import { Link } from 'react-router-dom';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import RentWorkspace from '@/components/rent/record/RentWorkspace';
import { Button } from '@/components/ui/button';

/**
 * Landlord money: rent records, confirmations and receipts for the tenancies
 * this landlord holds. IBMT records the money; it never holds it.
 */
export default function LandlordMoney() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Kodi ya nyumba"
        title="Kodi na risiti"
        lede="Andika kodi iliyolipwa, thibitisha rekodi ya mpangaji, na toa risiti. Rekodi hii si risiti ya kodi ya serikali."
        meta={[{ label: 'Hatua 1: kurekodi tu' }, { label: 'IBMT haishiki fedha' }]}
        actions={
          <>
            <Button asChild variant="outline" className="ibmt-tap">
              <Link to="/rent/landlord/leases">Mikataba</Link>
            </Button>
            <Button asChild variant="outline" className="ibmt-tap">
              <Link to="/rent/landlord/tax">Taarifa ya kodi</Link>
            </Button>
          </>
        }
      />

      <Notice tone="policy" title="Risiti inatoka kwa uthibitisho">
        Rekodi unayoiandika mwenyewe haiwezi kuthibitishwa na wewe. Risiti inatolewa pale mpangaji anapothibitisha, na
        namba ya risiti inatolewa wakati huo huo.
      </Notice>

      <RentWorkspace role="landlord" />
    </div>
  );
}