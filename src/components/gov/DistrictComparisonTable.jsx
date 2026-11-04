import DataTable from '@/components/ibmt/DataTable';
import Figure from './Figure';
import { useT } from '@/i18n/I18nContext';

/** Districts side by side. A district that has not started says so. */
export default function DistrictComparisonTable({ rows = [], suppression }) {
  const { tt } = useT();
  const label = (suppression && suppression.label) || { en: 'Suppressed', sw: 'Imefichwa' };

  return (
    <DataTable
      rowKey="district"
      dense
      rows={rows}
      columns={[
        { key: 'district', header: tt({ en: 'District', sw: 'Wilaya' }), className: 'font-medium' },
        {
          key: 'status',
          header: tt({ en: 'Status', sw: 'Hali' }),
          render: (row) =>
            row.live ? (
              <span className="text-[12px] text-muted-foreground">{tt({ en: 'Live', sw: 'Inaendelea' })}</span>
            ) : (
              <span className="ibmt-stamp">{tt(row.status_label)}</span>
            ),
        },
        { key: 'units', header: tt({ en: 'Registered', sw: 'Zilizosajiliwa' }), align: 'right', render: (row) => <Figure value={row.units} label={label} /> },
        { key: 'verified', header: tt({ en: 'Verified', sw: 'Zimethibitishwa' }), align: 'right', hideBelow: 'lg', render: (row) => <Figure value={row.verified} label={label} /> },
        {
          key: 'verification_rate',
          header: tt({ en: 'Verification rate', sw: 'Kiwango cha uthibitisho' }),
          align: 'right',
          render: (row) => <Figure value={row.verification_rate} label={label} suffix={row.verification_rate === null ? '' : '%'} />,
        },
        { key: 'active_leases', header: tt({ en: 'Active leases', sw: 'Mikataba inayoendelea' }), align: 'right', render: (row) => <Figure value={row.active_leases} label={label} /> },
        { key: 'disputes_opened', header: tt({ en: 'Disputes opened', sw: 'Migogoro iliyofunguliwa' }), align: 'right', hideBelow: 'lg', render: (row) => <Figure value={row.disputes_opened} label={label} /> },
        { key: 'disputes_resolved', header: tt({ en: 'Resolved', sw: 'Iliyotatuliwa' }), align: 'right', hideBelow: 'lg', render: (row) => <Figure value={row.disputes_resolved} label={label} /> },
        { key: 'agents_licensed', header: tt({ en: 'Agents licensed', sw: 'Mawakala wenye leseni' }), align: 'right', hideBelow: 'lg', render: (row) => <Figure value={row.agents_licensed} label={label} /> },
      ]}
    />
  );
}