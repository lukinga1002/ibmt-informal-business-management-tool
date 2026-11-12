import Stage2PayoutPanel from '@/components/money/Stage2PayoutPanel';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import RegistrationWizard from '@/components/rent/registration/RegistrationWizard';
import AmnestyNotice from '@/components/rent/AmnestyNotice';
import { AMNESTY_NOTICE_ENABLED, DISCLAIMER } from '@/config/r3';
import { useT } from '@/i18n/I18nContext';

/**
 * Landlord registration. Sign-up, consents, property and units, ownership
 * documents — all one claim that a mtaa officer decides.
 */
export default function LandlordRegister() {
  const { t, tt } = useT();
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('registerPage.kicker')}
        title={t('registerPage.title')}
        lede={t('registerPage.lede')}
        meta={[{ label: t('registerPage.fourSteps') }, { label: tt(DISCLAIMER) }]}
      />

      <Stage2PayoutPanel />
      {AMNESTY_NOTICE_ENABLED && <AmnestyNotice />}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title={t('registerPage.newTitle')} description={t('registerPage.privateDocs')}>
          <RegistrationWizard channel="self" />
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard title={t('registerPage.rentedTitle')} description={t('registerPage.rentedDesc')}>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t('registerPage.rentedBody')}
            </p>
            <Link
              to="/rent/landlord/migrate"
              className="ibmt-tap mt-3 inline-flex items-center gap-2 rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
            >
              {t('registerPage.registerExisting')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </SectionCard>

          <Notice tone="policy" title={t('join.done.disclaimerTitle')}>
            {tt(DISCLAIMER)}
          </Notice>

          <Notice tone="privacy" title={t('join.aside.addressTitle')}>
            {t('registerPage.addressBody')}
          </Notice>

          <Notice tone="neutral" title={t('registerPage.helperTitle')}>
            {t('registerPage.helperBody')}
          </Notice>
        </aside>
      </div>
    </div>
  );
}