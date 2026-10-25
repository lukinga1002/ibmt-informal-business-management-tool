import { useT } from '@/i18n/I18nContext';
import Notice from '@/components/ibmt/Notice';

const KEYS = [
  'policy.turnoverVsTax',
  'policy.permitVsTax',
  'policy.expenseEvidence',
  'notices.fiscal',
  'policy.giftsExcluded',
  'policy.noAutoPublication',
  'policy.noSurveillance',
  'policy.humanReviewOnly',
];

const TONES = ['policy', 'policy', 'neutral', 'caution', 'privacy', 'neutral', 'neutral', 'privacy'];

export default function LandingPrinciples() {
  const { t } = useT();

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
      <h2 className="ibmt-kicker">{t('landing.principlesTitle')}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KEYS.map((key, index) => (
          <Notice key={key} tone={TONES[index]}>
            {t(key)}
          </Notice>
        ))}
      </div>
    </section>
  );
}