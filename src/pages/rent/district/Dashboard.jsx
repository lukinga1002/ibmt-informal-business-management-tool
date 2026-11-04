import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatGrid from '@/components/ibmt/StatGrid';
import Notice from '@/components/ibmt/Notice';
import { MetaChip } from '@/components/ibmt/StatusBadge';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Figure from '@/components/gov/Figure';
import WardAggregateTable from '@/components/gov/WardAggregateTable';
import TrendTable from '@/components/gov/TrendTable';
import ExportBar from '@/components/gov/ExportBar';
import { useFn } from '@/hooks/useFn';
import { SUPERSESSION } from '@/lib/gov';
import { useT } from '@/i18n/I18nContext';

/** District commissioner: aggregates for one district, nothing individual. */
export default function RentDistrictDashboard() {
  const { tt } = useT();
  const query = useFn('govAggregates', { action: 'district' });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tt({ en: 'IBMT Rent · Oversight', sw: 'IBMT Kodi · Uangalizi' })}
        title={tt({ en: 'District commissioner', sw: 'Mkuu wa Wilaya' })}
        lede={tt({
          en: 'Aggregate position of the district: registration against estimated stock, verification, tenancies, disputes, agents and the trend by month.',
          sw: 'Msimamo wa jumla wa wilaya: usajili dhidi ya makisio ya nyumba, uthibitisho, mikataba, migogoro, mawakala na mwenendo kwa mwezi.',
        })}
      />

      <AsyncBlock state={query}>
        {(data) => (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <MetaChip>{data.jurisdiction.district}</MetaChip>
              {data.jurisdiction.region && <MetaChip>{data.jurisdiction.region}</MetaChip>}
              <MetaChip>{tt({ en: 'Aggregates only', sw: 'Jumla pekee' })}</MetaChip>
            </div>

            {!data.live ? (
              <Notice tone="caution" title={tt(data.status_label)}>
                {tt({
                  en: 'No rental unit has been registered in this district yet, so no figure is shown.',
                  sw: 'Hakuna kitengo cha kodi kilichosajiliwa katika wilaya hii bado, kwa hiyo hakuna takwimu inayoonyeshwa.',
                })}
              </Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { key: 'units', label: tt({ en: 'Registered units', sw: 'Vitengo vilivyosajiliwa' }), value: <Figure value={data.units} label={data.suppression.label} /> },
                    { key: 'verified', label: tt({ en: 'Verification rate', sw: 'Kiwango cha uthibitisho' }), value: <Figure value={data.verification_rate} label={data.suppression.label} suffix={data.verification_rate === null ? '' : '%'} /> },
                    { key: 'estimated', label: tt({ en: 'Estimated stock', sw: 'Makisio ya nyumba' }), value: <Figure value={data.estimated_units} label={data.suppression.label} /> },
                    { key: 'leases', label: tt({ en: 'Active leases', sw: 'Mikataba inayoendelea' }), value: <Figure value={data.active_leases} label={data.suppression.label} /> },
                    { key: 'disputes', label: tt({ en: 'Disputes opened', sw: 'Migogoro iliyofunguliwa' }), value: <Figure value={data.disputes_opened} label={data.suppression.label} /> },
                    { key: 'resolved', label: tt({ en: 'Disputes resolved', sw: 'Migogoro iliyotatuliwa' }), value: <Figure value={data.disputes_resolved} label={data.suppression.label} /> },
                    { key: 'agents', label: tt({ en: 'Agents licensed', sw: 'Mawakala wenye leseni' }), value: <Figure value={data.agents_licensed} label={data.suppression.label} /> },
                  ]}
                />

                <SectionCard
                  title={tt({ en: 'Verification rate by ward', sw: 'Kiwango cha uthibitisho kwa kata' })}
                  description={tt({ en: 'Registered units, verified units and the estimated stock the ward office reported.', sw: 'Vitengo vilivyosajiliwa, vilivyothibitishwa na makisio ya nyumba yaliyoripotiwa na ofisi ya kata.' })}
                >
                  <WardAggregateTable rows={data.wards} suppression={data.suppression} />
                </SectionCard>

                <SectionCard
                  title={tt({ en: 'Estimated stock', sw: 'Makisio ya nyumba' })}
                  description={tt({ en: 'An input with a stated source, never a figure this system invented.', sw: 'Taarifa iliyoingizwa pamoja na chanzo chake, si takwimu iliyobuniwa na mfumo huu.' })}
                >
                  <p className="text-[13px] leading-relaxed">
                    {data.estimated_units === null
                      ? tt({ en: 'No estimate has been entered for this district yet.', sw: 'Hakuna makisio yaliyoingizwa kwa wilaya hii bado.' })
                      : tt({
                          en: `${Number(data.estimated_units).toLocaleString('en-US')} estimated rental units. Source: ${data.stock_source || 'not stated'}.`,
                          sw: `Vitengo ${Number(data.estimated_units).toLocaleString('en-US')} vinavyokadiriwa. Chanzo: ${data.stock_source || 'hakijatajwa'}.`,
                        })}
                  </p>
                  {data.stock_source_note && <p className="ibmt-hint mt-2">{data.stock_source_note}</p>}
                  {data.stock_wards_without_source.length > 0 && (
                    <p className="ibmt-hint mt-2">
                      {tt({
                        en: `No source figure yet for: ${data.stock_wards_without_source.join(', ')}.`,
                        sw: `Hakuna takwimu ya chanzo bado kwa: ${data.stock_wards_without_source.join(', ')}.`,
                      })}
                    </p>
                  )}
                </SectionCard>

                <SectionCard title={tt({ en: 'Trend by month', sw: 'Mwenendo kwa mwezi' })}>
                  <TrendTable rows={data.trend} suppression={data.suppression} showLeases />
                </SectionCard>

                <SectionCard>
                  <ExportBar
                    fn="govAggregates"
                    payload={{ action: 'export', scope: 'district' }}
                    label={{ en: 'Export the district sheet', sw: 'Toa karatasi ya wilaya' }}
                    note={data.export_note}
                  />
                </SectionCard>
              </>
            )}

            <Notice tone="privacy">{tt(SUPERSESSION)}</Notice>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}