import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { BASIS_LABEL } from '@/lib/gov';
import { useT } from '@/i18n/I18nContext';

const WITHHELD = { en: 'Withheld: no basis', sw: 'Imefichwa: hakuna msingi' };

/** Owner, building and meter number, only where a basis is shown beside them. */
export default function BuildingRegisterTable({ rows = [] }) {
  const { tt } = useT();

  return (
    <DataTable
      dense
      rows={rows}
      columns={[
        {
          key: 'building',
          header: tt({ en: 'Building', sw: 'Jengo' }),
          render: (row) => (
            <div className="min-w-0">
              <p className="font-medium">{row.building}</p>
              <p className="ibmt-num text-[11px] text-muted-foreground">{row.building_ref}</p>
            </div>
          ),
        },
        { key: 'ward', header: tt({ en: 'Ward', sw: 'Kata' }) },
        {
          key: 'owner',
          header: tt({ en: 'Owner', sw: 'Mmiliki' }),
          render: (row) =>
            row.owner || <span className="text-[12px] italic text-muted-foreground">{tt(WITHHELD)}</span>,
        },
        {
          key: 'meters',
          header: tt({ en: 'Meter numbers', sw: 'Namba za mita' }),
          hideBelow: 'lg',
          render: (row) =>
            row.meters && row.meters.length ? (
              <span className="ibmt-num text-[12px]">{row.meters.join(' · ')}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        { key: 'units', header: tt({ en: 'Units', sw: 'Vitengo' }), align: 'right', className: 'ibmt-num' },
        {
          key: 'verification_status',
          header: tt({ en: 'Verification', sw: 'Uthibitisho' }),
          render: (row) => <StatusBadge status={row.verification_status} />,
        },
        {
          key: 'basis',
          header: tt({ en: 'Basis', sw: 'Msingi' }),
          render: (row) =>
            row.basis ? (
              <span className="ibmt-stamp">{tt(BASIS_LABEL[row.basis])}</span>
            ) : (
              <span className="text-[11px] italic text-muted-foreground">{tt(WITHHELD)}</span>
            ),
        },
      ]}
    />
  );
}