import { useT } from '@/i18n/I18nContext';
import Notice from '@/components/ibmt/Notice';

/**
 * How the product behaves. Rental-only statements: no custody of money, no tax
 * in this stage, voluntary registration, and human review instead of automation.
 */
const KEYS = [
  'policy.noCustodyStage1',
  'policy.noTaxStage1',
  'policy.registrationVoluntary',
  'policy.humanReviewOnly',
  'policy.noAutoPublication',
  'policy.noSurveillance',
];

const TONES = ['policy', 'policy', 'neutral', 'privacy', 'neutral', 'neutral'];

export default function LandingPrinciples() {
  const { t } = useT();

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
      <h2 className="ibmt-kicker">{t('landing.principlesTitle')}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {KEYS.map((key, index) => (
          <Notice key={key} tone={TONES[index]}>
            {t(key)}
          </Notice>
        ))}
      </div>
    </section>
  );
}