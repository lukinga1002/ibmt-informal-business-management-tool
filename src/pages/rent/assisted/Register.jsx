import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import RegistrationWizard from '@/components/rent/registration/RegistrationWizard';
import { DISCLAIMER } from '@/config/r3';
import { useT } from '@/i18n/I18nContext';

/**
 * Assisted and proxy registration. The helper files everything, then hands the
 * phone back: the landlord confirms with a code and only then does the claim
 * reach the mtaa officer.
 */
export default function AssistedRegister() {
  const { t, tt } = useT();
  const params = new URLSearchParams(window.location.search);
  const channel = params.get('channel') === 'proxy' ? 'proxy' : 'assisted';
  const landlordId = params.get('landlord_id') || '';
  const landlordName = params.get('landlord_name') || '';

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={channel === 'proxy' ? t('registerPage.proxyKicker') : t('registerPage.assistedKicker')}
        title={channel === 'proxy' ? t('registerPage.proxyTitle') : t('registerPage.assistedTitle')}
        lede={t('registerPage.assistedLede')}
        meta={[{ label: tt(DISCLAIMER) }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title={channel === 'proxy' ? t('registerPage.ownerDetails') : t('registerPage.houseDetails')}
          description={t('registerPage.privateDocs')}
        >
          <RegistrationWizard channel={channel} landlordId={landlordId} landlordName={landlordName} />
        </SectionCard>

        <aside className="space-y-4">
          <Notice tone="caution" title={t('registerPage.codeTitle')}>
            {t('registerPage.codeBody')}
          </Notice>
          <Notice tone="policy">{tt(DISCLAIMER)}</Notice>
          <Notice tone="neutral" title={t('registerPage.proxyTitleNote')}>
            {t('registerPage.proxyBody')}
          </Notice>
        </aside>
      </div>
    </div>
  );
}