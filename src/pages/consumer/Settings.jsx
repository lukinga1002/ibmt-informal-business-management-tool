import { Link } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import Notice from '@/components/ibmt/Notice';
import ConsentToggle from '@/components/ibmt/ConsentToggle';
import { Button } from '@/components/ui/button';

export default function ConsumerSettings() {
  const { t } = useT();
  const consents = useIBMTQuery('getConsents');
  const setConsent = useIBMTMutation('setConsent');
  const exportRequest = useIBMTMutation('requestExport');

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('brand.events')} title={t('nav.settings')} lede={t('settings.sessionBody')} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t('privacy.purposes')} description={t('policy.consentSeparate')}>
          <DataState query={consents} skeleton="lines">
            {(query) => (
              <div>
                {Object.entries(query.record || {}).map(([key, consent]) => (
                  <ConsentToggle
                    key={key}
                    consentKey={key}
                    consent={consent}
                    busy={setConsent.saving}
                    onToggle={(consentKey, granted) => setConsent.run({ key: consentKey, granted })}
                  />
                ))}
              </div>
            )}
          </DataState>
          {setConsent.status === 'error' && (
            <p role="alert" className="mt-3 text-[12px] font-medium text-destructive">
              {setConsent.fieldErrors?.consent || setConsent.error?.message || t('states.errorBody')}
            </p>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={t('common.export')} description={t('privacy.rightsBody')}>
            <Button
              type="button"
              className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
              onClick={() => exportRequest.run({ scope: 'own_records' })}
              disabled={exportRequest.saving}
            >
              {exportRequest.saving ? t('common.working') : t('privacy.requestExport')}
            </Button>
            {exportRequest.status === 'success' && (
              <Notice tone="positive" className="mt-4">
                {t('privacy.requested')} · <span className="ibmt-num">{exportRequest.result?.export_id}</span>
              </Notice>
            )}
          </SectionCard>

          <SectionCard title={t('privacy.accessHistory')}>
            <Link to="/data-rights" className="ibmt-tap flex items-center text-[13px] font-medium text-navy underline decoration-gold underline-offset-4">
              {t('privacy.title')}
            </Link>
            <Notice tone="privacy" className="mt-4">
              {t('policy.addressesNeverPublic')}
            </Notice>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}