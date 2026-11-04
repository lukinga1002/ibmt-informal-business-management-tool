import { Link } from 'react-router-dom';
import SectionCard from '@/components/ibmt/SectionCard';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import StatGrid from '@/components/ibmt/StatGrid';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/I18nContext';

const STATUS_LABEL = {
  open: { en: 'Open', sw: 'Wazi' },
  in_review: { en: 'In review', sw: 'Inapitwa' },
  escalated: { en: 'Escalated', sw: 'Imepandishwa' },
};

/** Three queues, each one decided by a person. Nothing is actioned here. */
export default function OversightQueues({ data }) {
  const { tt } = useT();
  const rule = data.rule;

  return (
    <div className="space-y-4">
      <Notice tone="policy">{tt(rule)}</Notice>

      <StatGrid
        columns={3}
        items={[
          { key: 'compliance', label: tt({ en: 'Compliance cases open', sw: 'Kesi za uzingatiaji zilizo wazi' }), value: String(data.compliance.length) },
          { key: 'complaints', label: tt({ en: 'Complaints open', sw: 'Malalamiko yaliyo wazi' }), value: String(data.complaints.length) },
          { key: 'licences', label: tt({ en: 'Agent licences pending', sw: 'Leseni za mawakala zinasubiri' }), value: String(data.licences.pending) },
        ]}
      />

      <SectionCard
        title={tt({ en: 'Compliance review queue', sw: 'Foleni ya mapitio ya uzingatiaji' })}
        description={tt({ en: 'A person reviews every case. No penalty is applied automatically.', sw: 'Mtu hupitia kila kesi. Hakuna adhabu inayotolewa kiotomatiki.' })}
      >
        {data.compliance.length === 0 ? (
          <p className="ibmt-hint">{tt({ en: 'Nothing is waiting for review.', sw: 'Hakuna kinachosubiri mapitio.' })}</p>
        ) : (
          <DataTable
            dense
            rows={data.compliance}
            columns={[
              { key: 'reference', header: tt({ en: 'Subject', sw: 'Kitu' }), className: 'ibmt-num font-medium' },
              { key: 'kind', header: tt({ en: 'Issue', sw: 'Tatizo' }) },
              { key: 'ward', header: tt({ en: 'Ward', sw: 'Kata' }), hideBelow: 'lg' },
              { key: 'age_days', header: tt({ en: 'Age (days)', sw: 'Siku' }), align: 'right', className: 'ibmt-num' },
              { key: 'status', header: tt({ en: 'Status', sw: 'Hali' }), render: (row) => <StatusBadge status={row.status} label={tt(STATUS_LABEL[row.status] || { en: row.status, sw: row.status })} /> },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title={tt({ en: 'Complaints', sw: 'Malalamiko' })}
        description={tt({ en: 'Private to the complainant. Reference and ward only.', sw: 'Ni ya faragha kwa mlalamikaji. Namba na kata pekee.' })}
      >
        {data.complaints.length === 0 ? (
          <p className="ibmt-hint">{tt({ en: 'No complaint is waiting.', sw: 'Hakuna malalamiko yanayosubiri.' })}</p>
        ) : (
          <DataTable
            dense
            rows={data.complaints}
            columns={[
              { key: 'reference', header: tt({ en: 'Reference', sw: 'Namba' }), className: 'ibmt-num font-medium' },
              { key: 'subject_type', header: tt({ en: 'About', sw: 'Kuhusu' }) },
              { key: 'ward', header: tt({ en: 'Ward', sw: 'Kata' }), hideBelow: 'lg' },
              { key: 'age_days', header: tt({ en: 'Age (days)', sw: 'Siku' }), align: 'right', className: 'ibmt-num' },
              { key: 'status', header: tt({ en: 'Status', sw: 'Hali' }), render: (row) => <StatusBadge status={row.status} label={tt(STATUS_LABEL[row.status] || { en: row.status, sw: row.status })} /> },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title={tt({ en: 'Agent licensing', sw: 'Leseni za mawakala' })}
        actions={
          <Button asChild variant="outline" className="ibmt-tap">
            <Link to="/rent/council/agents">{tt({ en: 'Open the licensing desk', sw: 'Fungua dawati la leseni' })}</Link>
          </Button>
        }
      >
        <p className="ibmt-hint">
          {tt({
            en: `${data.licences.pending} awaiting a decision · ${data.licences.approved} approved in this district.`,
            sw: `${data.licences.pending} zinasubiri uamuzi · ${data.licences.approved} zimeidhinishwa katika wilaya hii.`,
          })}
        </p>
      </SectionCard>
    </div>
  );
}