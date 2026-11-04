import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import Notice from '@/components/ibmt/Notice';
import { MetaChip } from '@/components/ibmt/StatusBadge';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Figure from '@/components/gov/Figure';
import DistrictComparisonTable from '@/components/gov/DistrictComparisonTable';
import TrendTable from '@/components/gov/TrendTable';
import ExportBar from '@/components/gov/ExportBar';
import { useFn } from '@/hooks/useFn';
import { SUPERSESSION } from '@/lib/gov';
import { useT } from '@/i18n/I18nContext';

/** Regional commissioner: the same aggregates, compared across districts. */
export default function RentRegionDashboard() {
  const { tt } = useT();
  const query = useFn('govAggregates', { action: 'region' });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tt({ en: 'IBMT Rent · Oversight', sw: 'IBMT Kodi · Uangalizi' })}
        title={tt({ en: 'Regional commissioner', sw: 'Mkuu wa Mkoa' })}
        lede={tt({
          en: 'One table across the districts of the region. A district that has not started says so instead of showing a zero.',
          sw: 'Jedwali moja kwa wilaya zote za mkoa. Wilaya ambayo haijaanza inasema hivyo badala ya kuonyesha sifuri.',
        })}
      />

      <AsyncBlock state={query}>
        {(data) => (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <MetaChip>{data.jurisdiction.region}</MetaChip>
              <MetaChip>
                {tt({
                  en: `${data.totals.districts_live} of ${data.totals.districts_total} districts live`,
                  sw: `Wilaya ${data.totals.districts_live} kati ya ${data.totals.districts_total} zinaendelea`,
                })}
              </MetaChip>
              <MetaChip>{tt({ en: 'Aggregates only', sw: 'Jumla pekee' })}</MetaChip>
            </div>

            <StatGrid
              columns={4}
              items={[
                { key: 'units', label: tt({ en: 'Registered units', sw: 'Vitengo vilivyosajiliwa' }), value: <Figure value={data.totals.units} label={data.suppression.label} /> },
                { key: 'verified', label: tt({ en: 'Verification rate', sw: 'Kiwango cha uthibitisho' }), value: <Figure value={data.totals.verification_rate} label={data.suppression.label} suffix={data.totals.verification_rate === null ? '' : '%'} /> },
                { key: 'leases', label: tt({ en: 'Active leases', sw: 'Mikataba inayoendelea' }), value: <Figure value={data.totals.active_leases} label={data.suppression.label} /> },
                { key: 'agents', label: tt({ en: 'Agents licensed', sw: 'Mawakala wenye leseni' }), value: <Figure value={data.totals.agents_licensed} label={data.suppression.label} /> },
                { key: 'disputes', label: tt({ en: 'Disputes opened', sw: 'Migogoro iliyofunguliwa' }), value: <Figure value={data.totals.disputes_opened} label={data.suppression.label} /> },
                { key: 'resolved', label: tt({ en: 'Disputes resolved', sw: 'Migogoro iliyotatuliwa' }), value: <Figure value={data.totals.disputes_resolved} label={data.suppression.label} /> },
                { key: 'estimated', label: tt({ en: 'Estimated stock', sw: 'Makisio ya nyumba' }), value: <Figure value={data.totals.estimated_units} label={data.suppression.label} /> },
              ]}
            />

            <SectionCard
              title={tt({ en: 'Districts compared', sw: 'Wilaya zikilinganishwa' })}
              description={tt({ en: 'Registration, verification, tenancies, disputes and licensed agents for every district in the region.', sw: 'Usajili, uthibitisho, mikataba, migogoro na mawakala wenye leseni kwa kila wilaya ya mkoa.' })}
            >
              <DistrictComparisonTable rows={data.districts} suppression={data.suppression} />
            </SectionCard>

            {data.not_started.length > 0 && (
              <Notice tone="caution" title={tt({ en: 'Not started', sw: 'Bado haijaanza' })}>
                {tt({
                  en: `No rental unit is registered yet in: ${data.not_started.join(', ')}. These districts are excluded from the regional totals.`,
                  sw: `Hakuna kitengo cha kodi kilichosajiliwa bado katika: ${data.not_started.join(', ')}. Wilaya hizi hazijajumuishwa kwenye jumla ya mkoa.`,
                })}
              </Notice>
            )}

            <SectionCard title={tt({ en: 'Trend by month', sw: 'Mwenendo kwa mwezi' })}>
              <TrendTable rows={data.trend} suppression={data.suppression} />
            </SectionCard>

            <SectionCard>
              <ExportBar
                fn="govAggregates"
                payload={{ action: 'export', scope: 'region' }}
                label={{ en: 'Export the regional sheet', sw: 'Toa karatasi ya mkoa' }}
                note={data.export_note}
              />
            </SectionCard>

            <Notice tone="privacy">{tt(SUPERSESSION)}</Notice>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}