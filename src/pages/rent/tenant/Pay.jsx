import { Link } from 'react-router-dom';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import RentWorkspace from '@/components/rent/record/RentWorkspace';
import { Button } from '@/components/ui/button';

/**
 * The tenant records what they paid and confirms the landlord's record. Money
 * moves outside IBMT: nothing here takes a payment or holds funds.
 */
export default function TenantPay() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Kodi ya nyumba"
        title="Rekodi malipo ya kodi"
        lede="Wasilisha kodi uliyolipa, thibitisha rekodi ya mmiliki, na pata risiti yenye namba ya kuthibitisha."
        meta={[{ label: 'Hatua 1: kurekodi tu' }, { label: 'Hakuna ada ya mpangaji' }]}
        actions={
          <Button asChild variant="outline" className="ibmt-tap">
            <Link to="/rent/tenant/lease">Mkataba wangu</Link>
          </Button>
        }
      />

      <Notice tone="privacy" title="Fedha hazipiti IBMT">
        Unalipa mmiliki kwa njia mlivyokubaliana. IBMT inaandika tu kile kilicholipwa na kutoa risiti baada ya upande wa
        pili kuthibitisha.
      </Notice>

      <RentWorkspace role="tenant" />
    </div>
  );
}