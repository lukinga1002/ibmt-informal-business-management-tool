import { useState } from 'react';
import { Building2, KeyRound, Scale, Settings2 } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import Notice from '@/components/ibmt/Notice';
import { MetaChip } from '@/components/ibmt/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Figure from '@/components/gov/Figure';
import WardRegisterTable from '@/components/gov/WardRegisterTable';
import BuildingRegisterTable from '@/components/gov/BuildingRegisterTable';
import OversightQueues from '@/components/gov/OversightQueues';
import EnforcementSettings from '@/components/gov/EnforcementSettings';
import ExportBar from '@/components/gov/ExportBar';
import { useFn } from '@/hooks/useFn';
import { ENFORCEMENT_LABEL, SUPERSESSION } from '@/lib/gov';
import { useT } from '@/i18n/I18nContext';

const TAB_TRIGGER = 'ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground';

/** Council desk: ward register, building register, review queues, settings. */
export default function RentCouncilDashboard() {
  const { tt } = useT();
  const [tab, setTab] = useState('register');

  const register = useFn('councilDesk', { action: 'register' });
  const buildings = useFn('councilDesk', { action: 'buildings' }, { enabled: tab === 'buildings' });
  const queues = useFn('councilDesk', { action: 'queues' }, { enabled: tab === 'queues' });
  const settings = useFn('councilDesk', { action: 'settings' }, { enabled: tab === 'settings' });

  const council = register.data && register.data.council;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tt({ en: 'IBMT Rent · Council desk', sw: 'IBMT Kodi · Dawati la halmashauri' })}
        title={(council && council.name) || tt({ en: 'Council desk', sw: 'Dawati la halmashauri' })}
        lede={tt({
          en: 'Registered buildings and units by ward, the building register used for property-rates work, and the queues a person decides.',
          sw: 'Majengo na vitengo vilivyosajiliwa kwa kata, rejista ya majengo kwa kazi ya pango, na foleni zinazoamuliwa na mtu.',
        })}
        meta={[
          ...(council ? [{ label: `${council.district} · ${council.region}` }] : []),
          ...(council
            ? [{ label: tt(ENFORCEMENT_LABEL[council.enforcement_mode] || { en: council.enforcement_mode, sw: council.enforcement_mode }) }]
            : []),
        ]}
      >
        <MetaChip Icon={Scale}>{tt({ en: 'Small cells under 5 units suppressed', sw: 'Seli ndogo chini ya vitengo 5 zimefichwa' })}</MetaChip>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="register" className={TAB_TRIGGER}>
            <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {tt({ en: 'Ward register', sw: 'Rejista ya kata' })}
          </TabsTrigger>
          <TabsTrigger value="buildings" className={TAB_TRIGGER}>
            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
            {tt({ en: 'Building register', sw: 'Rejista ya majengo' })}
          </TabsTrigger>
          <TabsTrigger value="queues" className={TAB_TRIGGER}>
            <Scale className="mr-2 h-4 w-4" aria-hidden="true" />
            {tt({ en: 'Review queues', sw: 'Foleni za mapitio' })}
          </TabsTrigger>
          <TabsTrigger value="settings" className={TAB_TRIGGER}>
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {tt({ en: 'Settings', sw: 'Mipangilio' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4 space-y-4">
          <AsyncBlock state={register}>
            {(data) => (
              <>
                <StatGrid
                  columns={4}
                  items={[
                    { key: 'units', label: tt({ en: 'Registered units', sw: 'Vitengo vilivyosajiliwa' }), value: <Figure value={data.totals.units} label={data.suppression.label} /> },
                    { key: 'verified', label: tt({ en: 'Verified', sw: 'Zimethibitishwa' }), value: <Figure value={data.totals.verified} label={data.suppression.label} /> },
                    { key: 'pending', label: tt({ en: 'Awaiting evidence', sw: 'Zinasubiri ushahidi' }), value: <Figure value={data.totals.pending} label={data.suppression.label} /> },
                    {
                      key: 'rate',
                      label: tt({ en: 'Verification rate', sw: 'Kiwango cha uthibitisho' }),
                      value: <Figure value={data.totals.verification_rate} label={data.suppression.label} suffix={data.totals.verification_rate === null ? '' : '%'} />,
                    },
                  ]}
                />

                <SectionCard
                  title={tt({ en: 'Buildings and units by ward', sw: 'Majengo na vitengo kwa kata' })}
                  description={tt({ en: 'Verified against pending, per ward.', sw: 'Zilizothibitishwa dhidi ya zinazosubiri, kwa kata.' })}
                >
                  <WardRegisterTable rows={data.wards} suppression={data.suppression} />
                </SectionCard>

                <Notice tone="privacy">{tt(SUPERSESSION)}</Notice>
              </>
            )}
          </AsyncBlock>
        </TabsContent>

        <TabsContent value="buildings" className="mt-4 space-y-4">
          <AsyncBlock state={buildings}>
            {(data) => (
              <>
                <Notice tone="policy" title={tt({ en: 'Legal basis for this register', sw: 'Msingi wa kisheria wa rejista hii' })}>
                  {tt(data.basis.note)}
                  <span className="mt-2 block text-[12px]">
                    {data.basis.by_law
                      ? tt({
                          en: `By-law in force: ${data.basis.by_law.reference} (effective ${data.basis.by_law.effective_date || 'date not recorded'}). ${data.basis.available_rows} buildings shown in full.`,
                          sw: `Sheria ndogo inatumika: ${data.basis.by_law.reference} (ilianza ${data.basis.by_law.effective_date || 'tarehe haijaandikwa'}). Majengo ${data.basis.available_rows} yanaonyeshwa kikamilifu.`,
                        })
                      : tt({
                          en: `No by-law is in force. ${data.basis.consenting_owners} owner(s) consented to council sharing; ${data.basis.withheld_rows} building(s) withheld.`,
                          sw: `Hakuna sheria ndogo inayotumika. Wamiliki ${data.basis.consenting_owners} wamekubali kushirikisha halmashauri; majengo ${data.basis.withheld_rows} yamefichwa.`,
                        })}
                  </span>
                </Notice>

                <SectionCard
                  title={tt({ en: 'Building register', sw: 'Rejista ya majengo' })}
                  description={tt({
                    en: 'Property-rates work: owner, building, meter number and verification status. The basis is shown on every row.',
                    sw: 'Kazi ya pango: mmiliki, jengo, namba ya mita na hali ya uthibitisho. Msingi unaonyeshwa kwenye kila safu.',
                  })}
                  footer={tt({
                    en: `${data.units_without_building} registered unit(s) are not linked to a building yet.`,
                    sw: `Vitengo ${data.units_without_building} vilivyosajiliwa bado havijaunganishwa na jengo.`,
                  })}
                >
                  <BuildingRegisterTable rows={data.rows} />
                  <div className="mt-4">
                    <ExportBar
                      fn="councilDesk"
                      payload={{ action: 'export', kind: 'buildings' }}
                      label={{ en: 'Export the building register', sw: 'Toa rejista ya majengo' }}
                      note={{
                        en: 'Only rows with a stated basis are exported. Every export is written to the audit log.',
                        sw: 'Safu zenye msingi pekee ndizo zinazotolewa. Kila utoaji huandikwa kwenye kumbukumbu ya ukaguzi.',
                      }}
                    />
                  </div>
                </SectionCard>
              </>
            )}
          </AsyncBlock>
        </TabsContent>

        <TabsContent value="queues" className="mt-4">
          <AsyncBlock state={queues}>{(data) => <OversightQueues data={data} />}</AsyncBlock>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <AsyncBlock state={settings}>
            {(data) => <EnforcementSettings data={data} onSaved={settings.reload} />}
          </AsyncBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}