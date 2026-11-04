import DataTable from '@/components/ibmt/DataTable';
import Figure from './Figure';
import { useT } from '@/i18n/I18nContext';

/** Six months of movement. A month with fewer than five units is withheld. */
export default function TrendTable({ rows = [], suppression, showLeases = false }) {
  const { tt } = useT();
  const label = (suppression && suppression.label) || { en: 'Suppressed', sw: 'Imefichwa' };

  const columns = [
    { key: 'month', header: tt({ en: 'Month', sw: 'Mwezi' }), className: 'ibmt-num font-medium' },
    { key: 'registered_units', header: tt({ en: 'Units registered', sw: 'Vitengo vilivyosajiliwa' }), align: 'right', render: (row) => <Figure value={row.registered_units} label={label} /> },
  ];

  if (showLeases) {
    columns.push({
      key: 'leases_signed',
      header: tt({ en: 'Leases started', sw: 'Mikataba iliyoanza' }),
      align: 'right',
      render: (row) => <Figure value={row.leases_signed} label={label} />,
    });
  }

  return <DataTable rowKey="month" dense rows={rows} columns={columns} />;
}