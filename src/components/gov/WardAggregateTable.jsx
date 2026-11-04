import DataTable from '@/components/ibmt/DataTable';
import Figure from './Figure';
import { useT } from '@/i18n/I18nContext';

/** Verification rate per ward, with every small cell withheld. */
export default function WardAggregateTable({ rows = [], suppression }) {
  const { tt } = useT();
  const label = (suppression && suppression.label) || { en: 'Suppressed', sw: 'Imefichwa' };

  return (
    <DataTable
      rowKey="ward"
      dense
      rows={rows}
      columns={[
        { key: 'ward', header: tt({ en: 'Ward', sw: 'Kata' }), className: 'font-medium' },
        { key: 'units', header: tt({ en: 'Registered units', sw: 'Vitengo vilivyosajiliwa' }), align: 'right', render: (row) => <Figure value={row.units} label={label} /> },
        { key: 'verified', header: tt({ en: 'Verified', sw: 'Zimethibitishwa' }), align: 'right', render: (row) => <Figure value={row.verified} label={label} /> },
        {
          key: 'verification_rate',
          header: tt({ en: 'Verification rate', sw: 'Kiwango cha uthibitisho' }),
          align: 'right',
          render: (row) => <Figure value={row.verification_rate} label={label} suffix={row.verification_rate === null ? '' : '%'} />,
        },
        {
          key: 'estimated_units',
          header: tt({ en: 'Estimated stock', sw: 'Makisio ya nyumba' }),
          align: 'right',
          hideBelow: 'lg',
          render: (row) => <Figure value={row.estimated_units} label={label} />,
        },
      ]}
    />
  );
}