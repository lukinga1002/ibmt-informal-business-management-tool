import { Link } from 'react-router-dom';
import { ArrowRight, HardHat, MapPin } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import { useIBMT } from '@/api/IBMTContext';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import PolicyList from '@/components/ibmt/PolicyList';
import RentIntro from '@/components/public/RentIntro';

// The four main ways in (landlord, tenant, council, verify) live in the intro.
// These are the remaining workspaces: licensed agents and mtaa officers.
const ENTRIES = [
  { to: '/rent/agent', role: 'agent', labelKey: 'roles.agent', Icon: HardHat },
  { to: '/rent/ward', role: 'mtaa_officer', labelKey: 'roles.mtaa_officer', Icon: MapPin },
];

export default function RentHub() {
  const { t, tt } = useT();
  const { isMock, setRole } = useIBMT();
  const policy = useIBMTQuery('getPolicyValues');

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />

      <RentIntro />

      <main className="ibmt-page">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <SectionCard title={t('rent.policyValues')} description={t('policy.policyVersioned')}>
            <DataState query={policy} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {(record) => (
                <DataTable
                  columns={[
                    { key: 'label', header: t('common.details'), className: 'font-medium', render: (row) => tt(row.label) },
                    { key: 'display', header: t('common.amount'), className: 'ibmt-num', align: 'right' },
                    { key: 'rule', header: t('common.reason'), render: (row) => tt(row.rule) },
                  ]}
                  rows={record.values || []}
                  rowKey="key"
                />
              )}
            </DataState>
            <p className="ibmt-hint mt-3">{tt(policy.data?.note)}</p>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title={t('nav.workspace')} description={t('roles.external')}>
              <ul className="space-y-2">
                {ENTRIES.map(({ to, labelKey, Icon, role }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={() => isMock && setRole(role)}
                      className="ibmt-tap flex items-center justify-between gap-3 rounded-md border border-border px-4 text-[13px] font-medium text-navy transition-colors hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                        {t(labelKey)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <PolicyList
              keys={[
                'policy.ibmtHoldsNoFunds',
                'policy.registrationNoOwnership',
                'policy.ownershipVerifiedFirst',
                'policy.oneTenancyOneUnit',
                'policy.tenantPaysExact',
                'policy.commissionRule',
              ]}
            />
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}