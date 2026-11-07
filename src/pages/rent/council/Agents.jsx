import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { TextArea } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';

const DECISIONS = [
  { key: 'approve', label: 'Thibitisha', status: 'approved' },
  { key: 'reject', label: 'Kataa', status: 'rejected' },
  { key: 'suspend', label: 'Simamisha', status: 'suspended' },
  { key: 'revoke', label: 'Futa leseni', status: 'revoked' },
];

const LICENCE_LABEL = {
  pending: 'Inasubiri',
  approved: 'Imethibitishwa',
  rejected: 'Imekataliwa',
  suspended: 'Imesimamishwa',
  revoked: 'Imefutwa',
};

const SCOPE_LABEL = { rental: 'Kupangisha', sale: 'Mauzo', both: 'Zote mbili' };

const SCOPE_FILTERS = [
  { value: '', label: 'Zote' },
  { value: 'rental', label: 'Kupangisha' },
  { value: 'sale', label: 'Mauzo' },
  { value: 'both', label: 'Zote mbili' },
];

/** Council desk: approve, reject, suspend or revoke a licence with a reason. */
export default function CouncilAgents() {
  const [rows, setRows] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('');
  const [openId, setOpenId] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await callFn('agentLicence', { action: 'queue', scope: scopeFilter || undefined });
      setRows(data.rows || []);
    } catch (err) {
      setError(fnError(err));
      setRows([]);
    }
  }, [scopeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row, decision) => {
    setBusy(true);
    setError('');
    try {
      await callFn('agentLicence', { action: 'decide', licence_id: row.licence_id, decision, reason });
      setOpenId(null);
      setReason('');
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Halmashauri"
        title="Leseni za mawakala"
        lede="Broker mmoja ana leseni moja kwa kila halmashauri. Kila uamuzi unahitaji sababu isipokuwa kuidhinisha, na unabaki kwenye historia ya usajili."
        meta={[{ label: 'Kusimamisha au kufuta kunamaliza mandate hai' }]}
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <SectionCard
        title="Maombi na usajili"
        description="Zilizowasilishwa katika halmashauri yako."
        actions={SCOPE_FILTERS.map((item) => (
          <Button
            key={item.value || 'all'}
            type="button"
            size="sm"
            variant={scopeFilter === item.value ? 'default' : 'outline'}
            className={scopeFilter === item.value ? 'ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep' : 'ibmt-tap'}
            onClick={() => setScopeFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      >
        {rows === null ? (
          <p className="text-[13px] text-muted-foreground">Inapakia…</p>
        ) : rows.length === 0 ? (
          <Notice tone="neutral">Hakuna ombi la leseni bado.</Notice>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.licence_id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {row.agent_name} · {row.council_name || row.district}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {SCOPE_LABEL[row.scope] || SCOPE_LABEL.rental}
                      <span className="ibmt-num">
                        {row.licence_no ? ` · ${row.licence_no}` : ' · Hakuna namba bado'}
                      </span>
                      {row.decision_reason ? ` · ${row.decision_reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} label={LICENCE_LABEL[row.status] || row.status} />
                    <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => setOpenId(openId === row.licence_id ? null : row.licence_id)}>
                      Amua
                    </Button>
                  </div>
                </div>

                {openId === row.licence_id && (
                  <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 px-3 py-3">
                    <Field label="Sababu" required hint="Inahitajika kwa kukataa, kusimamisha au kufuta">
                      {(props) => <TextArea {...props} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />}
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {DECISIONS.map((item) => (
                        <Button
                          key={item.key}
                          type="button"
                          size="sm"
                          variant={item.key === 'approve' ? 'default' : 'outline'}
                          className={item.key === 'approve' ? 'ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep' : 'ibmt-tap'}
                          onClick={() => decide(row, item.key)}
                          disabled={busy || (item.key !== 'approve' && reason.trim().length < 8)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}