import DataTable from '@/components/ibmt/DataTable';
import Figure from './Figure';
import { useT } from '@/i18n/I18nContext';

/** Registered units per ward, verified against pending, small cells withheld. */
export default function WardRegisterTable({ rows = [], suppression }) {
  const { tt } = useT();
  const label = (suppression && suppression.label) || { en: 'Suppressed', sw: 'Imefichwa' };

  return (
    <DataTable
      rowKey="ward"
      dense
      rows={rows}
      columns={[
        { key: 'ward', header: tt({ en: 'Ward', sw: 'Kata' }), className: 'font-medium' },
        { key: 'units', header: tt({ en: 'Units', sw: 'Vitengo' }), align: 'right', render: (row) => <Figure value={row.units} label={label} /> },
        { key: 'verified', header: tt({ en: 'Verified', sw: 'Zimethibitishwa' }), align: 'right', render: (row) => <Figure value={row.verified} label={label} /> },
        { key: 'pending', header: tt({ en: 'Pending', sw: 'Zinasubiri' }), align: 'right', hideBelow: 'lg', render: (row) => <Figure value={row.pending} label={label} /> },
        {
          key: 'verification_rate',
          header: tt({ en: 'Verified share', sw: 'Asilimia iliyothibitishwa' }),
          align: 'right',
          render: (row) => <Figure value={row.verification_rate} label={label} suffix={row.verification_rate === null ? '' : '%'} />,
        },
      ]}
    />
  );
}