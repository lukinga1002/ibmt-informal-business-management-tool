import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import ConsentToggle from '@/components/ibmt/ConsentToggle';
import Timeline from '@/components/ibmt/Timeline';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';

export default function DataRights() {
  const { t, tt, lang } = useT();
  const consents = useIBMTQuery('getConsents');
  const access = useIBMTQuery('listAccessHistory', { limit: 6 });
  const setConsent = useIBMTMutation('setConsent');
  const requestExport = useIBMTMutation('requestExport');

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <PageHeader kicker={t('brand.name')} title={t('privacy.title')} lede={t('privacy.lede')} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <SectionCard title={t('privacy.whatWeHold')} description={t('privacy.whatWeHoldBody')}>
              <Notice tone="privacy">{t('policy.retentionFromBackend')}</Notice>
            </SectionCard>

            <SectionCard
              title={t('privacy.purposes')}
              description={t('policy.consentSeparate')}
              footer={
                setConsent.status === 'success' ? (
                  <span className="text-success">{t('common.save')} · {t('states.successTitle')}</span>
                ) : setConsent.status === 'error' ? (
                  <span className="text-destructive" role="alert">
                    {setConsent.fieldErrors?.consent || setConsent.error?.message || t('states.errorBody')}
                  </span>
                ) : null
              }
            >
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
            </SectionCard>

            <SectionCard title={t('privacy.accessHistory')} description={t('privacy.accessHistoryBody')}>
              <DataState query={access} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <DataTable
                    columns={[
                      { key: 'actor_role', header: t('roles.label'), render: (row) => t(`roles.${row.actor_role}`) },
                      { key: 'purpose', header: t('common.details'), render: (row) => tt(row.purpose) },
                      { key: 'record_type', header: t('common.reference'), render: (row) => tt(row.record_type) },
                      { key: 'occurred_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDateTime(row.occurred_at, lang) },
                    ]}
                    rows={access.items}
                  />
                )}
              </DataState>
            </SectionCard>
          </div>

          <aside className="space-y-6">
            <SectionCard title={t('privacy.rights')} description={t('privacy.rightsBody')}>
              <Button
                type="button"
                className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={() => requestExport.run({ scope: 'own_records' })}
                disabled={requestExport.saving}
              >
                {requestExport.saving ? t('common.working') : t('privacy.requestExport')}
              </Button>
              {requestExport.status === 'success' && (
                <Notice tone="positive" className="mt-4">
                  {t('privacy.requested')} · <span className="ibmt-num">{requestExport.result?.export_id}</span>
                  <span className="mt-1 block text-[11px]">{t('forms.idempotency')}</span>
                </Notice>
              )}
              {requestExport.status === 'error' && (
                <p role="alert" className="mt-3 text-[12px] font-medium text-destructive">
                  {requestExport.error?.message || t('states.errorBody')}
                </p>
              )}
            </SectionCard>

            <SectionCard title={t('privacy.retention')}>
              <Notice tone="caution">{t('privacy.noStatutory')}</Notice>
              <div className="mt-4">
                <Timeline
                  dense
                  items={[
                    { id: 'r1', label: t('privacy.accessHistory'), at: '', status: 'warning', statusKey: 'human_review' },
                    { id: 'r2', label: t('policy.tenantDetailsLimit'), at: '', status: 'success', statusKey: 'verified' },
                    { id: 'r3', label: t('policy.committeeNeverTra'), at: '', status: 'success', statusKey: 'verified' },
                  ]}
                />
              </div>
            </SectionCard>

            <Notice tone="privacy">{t('policy.addressesNeverPublic')}</Notice>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}