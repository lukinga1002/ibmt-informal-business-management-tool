import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import RegistrationWizard from '@/components/rent/registration/RegistrationWizard';
import { DISCLAIMER } from '@/config/r3';

/**
 * Assisted and proxy registration. The helper files everything, then hands the
 * phone back: the landlord confirms with a code and only then does the claim
 * reach the mtaa officer.
 */
export default function AssistedRegister() {
  const params = new URLSearchParams(window.location.search);
  const channel = params.get('channel') === 'proxy' ? 'proxy' : 'assisted';
  const landlordId = params.get('landlord_id') || '';
  const landlordName = params.get('landlord_name') || '';

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={channel === 'proxy' ? 'Usajili kwa mwakilishi' : 'Usajili kwa msaada'}
        title={channel === 'proxy' ? 'Sajili kwa niaba ya mmiliki' : 'Msaidie mmiliki kusajili'}
        lede="Wewe unajaza; mmiliki anathibitisha kwa namba ya siri kwenye simu yake. Hatuwezi kuidhinisha usajili kwa niaba yake."
        meta={[{ label: DISCLAIMER.sw }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title={channel === 'proxy' ? 'Taarifa za mmiliki' : 'Taarifa za nyumba'}
          description="Nyaraka zinahifadhiwa kwa faragha."
        >
          <RegistrationWizard channel={channel} landlordId={landlordId} landlordName={landlordName} />
        </SectionCard>

        <aside className="space-y-4">
          <Notice tone="caution" title="Namba ya siri">
            Namba ya siri inatumwa kwa simu ya mmiliki. Msaidizi haipati na hawezi kuidhinisha mwenyewe.
          </Notice>
          <Notice tone="policy">{DISCLAIMER.sw} / {DISCLAIMER.en}</Notice>
          <Notice tone="neutral" title="Wakili au mtu wa familia">
            Kama unafanya hivi kwa niaba ya mmiliki aliye mbali au marehemu, tumia njia ya mwakilishi na uweke
            barua ya uthibitisho.
          </Notice>
        </aside>
      </div>
    </div>
  );
}