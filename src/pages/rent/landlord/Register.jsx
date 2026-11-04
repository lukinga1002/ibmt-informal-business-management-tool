import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import RegistrationWizard from '@/components/rent/registration/RegistrationWizard';
import AmnestyNotice from '@/components/rent/AmnestyNotice';
import { AMNESTY_NOTICE_ENABLED, DISCLAIMER } from '@/config/r3';

/**
 * Landlord registration. Sign-up, consents, property and units, ownership
 * documents — all one claim that a mtaa officer decides.
 */
export default function LandlordRegister() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Usajili wa nyumba"
        title="Sajili nyumba na vyumba"
        lede="Taarifa zinaenda kwa afisa wa Mtaa wa eneo lako. Usajili unathibitisha kuwa nyumba imesajiliwa, si kwamba wewe ndiye mmiliki."
        meta={[{ label: 'Hatua 4' }, { label: DISCLAIMER.sw }]}
      />

      {AMNESTY_NOTICE_ENABLED && <AmnestyNotice />}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Usajili mpya" description="Nyaraka zote zinahifadhiwa kwa faragha.">
          <RegistrationWizard channel="self" />
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard title="Nyumba uliyokwisha ipangisha" description="Mpangaji anathibitisha kwa namba ya siri.">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Kama nyumba ina mpangaji sasa, usisimue mkataba mpya. Ingiza taarifa zilizopo; masharti yanabaki
              kama yalivyo.
            </p>
            <Link
              to="/rent/landlord/migrate"
              className="ibmt-tap mt-3 inline-flex items-center gap-2 rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
            >
              Sajili tenancy iliyopo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </SectionCard>

          <Notice tone="policy" title="Usajili si umiliki">
            {DISCLAIMER.sw} / {DISCLAIMER.en}
          </Notice>

          <Notice tone="privacy" title="Anwani na mita">
            Anwani kamili na namba ya mita hazionyeshwi kwa umma. Zinaonekana kwa afisa wa Mtaa pekee.
          </Notice>

          <Notice tone="neutral" title="Msaidizi">
            Wakala aliyeidhinishwa anaweza kusajili kwa niaba yako; wewe unathibitisha kwa namba ya siri.
          </Notice>
        </aside>
      </div>
    </div>
  );
}