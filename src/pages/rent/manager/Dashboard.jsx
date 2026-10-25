import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { formatDate } from '@/lib/format';

/**
 * A property manager sees only the assets and actions granted by an active
 * delegated mandate, and the landlord being represented is shown on every
 * record.
 */
export default function ManagerDashboard() {
  const { t, tt, lang } = useT();
  const scope = useIBMTQuery('getManagerScope');
  const units = useIBMTQuery('listUnits', { limit: 8 });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('roles.manager')}
        lede={tt(scope.data?.note) || undefined}
        meta={[{ label: t('rent.scope') }, { label: t('rent.representing') }]}
      />

      <Notice tone="privacy">{t('policy.consentSeparate')}</Notice>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title={t('term.mandate')} description={t('rent.scope')}>
          <DataState query={scope} skeleton="cards" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {(record) => (
              <ul className="space-y-4">
                {(record.mandates || []).map((mandate) => (
                  <li key={mandate.mandate_id} className="rounded-md border border-border px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="ibmt-kicker">{t('rent.representing')}</p>
                        <p className="mt-1 text-[13px] font-semibold text-navy">{tt(mandate.landlord_display)}</p>
                        <p className="ibmt-num text-[11px] text-muted-foreground">{mandate.landlord_ref}</p>
                      </div>
                      <StatusBadge status={mandate.status} />
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="ibmt-kicker">{t('rent.scope')}</p>
                        <ul className="mt-2 space-y-1">
                          {(mandate.scope || []).map((item) => (
                            <li key={item.en} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                              <StatusBadge status="approved" />
                              {tt(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="ibmt-kicker">{t('rent.notGranted')}</p>
                        <ul className="mt-2 space-y-1">
                          {(mandate.not_granted || []).map((item) => (
                            <li key={item.en} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                              <StatusBadge status="rejected" />
                              {tt(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="ibmt-num mt-3 text-[11px] text-muted-foreground">
                      {t('rent.responseDue')}: {formatDate(mandate.expires_at, lang)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </SectionCard>

        <SectionCard title={t('rent.unitRegister')} description={t('policy.ownershipVerifiedFirst')}>
          <DataState query={units} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <ul className="space-y-3">
                {units.items.map((unit) => (
                  <li key={unit.id} className="rounded-md border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="ibmt-num text-[12px] font-semibold text-navy">{unit.unit_ref}</p>
                      <StatusBadge status={unit.registration_status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Money amount={unit.monthly_rent} />
                      <span className="ibmt-hint">{unit.mtaa}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
          <Notice tone="policy" className="mt-4">
            {t('policy.ibmtHoldsNoFunds')}
          </Notice>
        </SectionCard>
      </div>
    </div>
  );
}