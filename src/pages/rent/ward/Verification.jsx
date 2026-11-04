import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flag, ShieldAlert, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DISCLAIMER } from '@/config/r3';

const FILTERS = [
  { key: 'submitted', label: 'Zinasubiri' },
  { key: 'queried', label: 'Zimeulizwa' },
  { key: 'all', label: 'Zote' },
];

/**
 * The mtaa verification queue for this officer's wards. Only their own ward
 * rows arrive at all — the access rule decides that, not this screen.
 */
export default function WardVerification() {
  const [rows, setRows] = useState({ state: 'loading', items: [], error: null });
  const [filter, setFilter] = useState('submitted');
  const [openCase, setOpenCase] = useState('');
  const [decision, setDecision] = useState('approved');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setRows((prev) => ({ ...prev, state: prev.items.length ? 'refreshing' : 'loading' }));
    try {
      const query =
        filter === 'all'
          ? {}
          : { status: filter === 'queried' ? 'queried' : 'submitted' };
      const page = await base44.entities.VerificationCase.filter(query, { sort: '-created_date', limit: 50 });
      setRows({ state: 'ready', items: page.items || [], error: null });
    } catch (err) {
      setRows({ state: 'error', items: [], error: err });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const pending = useMemo(() => rows.items.filter((row) => row.status !== 'approved'), [rows.items]);

  const submitDecision = async (record) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await base44.functions.invoke('decideRegistration', {
        case_id: record.id,
        decision,
        reason,
      });
      const data = response.data || {};
      setMessage(
        decision === 'approved'
          ? `Certificate ${data.certificate_no} imetolewa kwa ${record.unit_ref}.`
          : `Uamuzi umehifadhiwa; mmiliki ataona sababu yako.`,
      );
      setOpenCase('');
      setReason('');
      setDecision('approved');
      load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'The decision was not saved.');
    } finally {
      setBusy(false);
    }
  };

  const query = {
    kind:
      rows.state === 'loading'
        ? 'loading'
        : rows.state === 'error'
          ? 'error'
          : rows.items.length === 0
            ? 'empty'
            : 'ready',
    error: rows.error,
    reload: load,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Uthibitisho wa usajili"
        title="Foleni ya uthibitisho"
        lede="Kagua kila usajili wa kata yako. Kila uamuzi unahitaji sababu, na mmiliki anaiona."
        meta={[{ label: `${pending.length} zinasubiri` }, { label: DISCLAIMER.sw }]}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`ibmt-tap rounded-md border px-3 text-[12px] font-medium ${
              filter === item.key ? 'border-navy bg-navy text-primary-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && <Notice tone="positive">{message}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}

      <DataState query={query} skeleton="lines" emptyTitle="Hakuna usajili unaosubiri" emptyBody="Usajili mpya wa kata yako utaonekana hapa.">
        {() => (
          <ul className="space-y-4">
            {rows.items.map((record) => (
              <li key={record.id} className="ibmt-panel">
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="ibmt-num text-[13px] font-semibold text-navy">{record.unit_ref}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {record.ward} · {record.mtaa} · {record.landlord_name}
                    </p>
                    <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">{record.case_ref}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={record.status} />
                    <span className="rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                      {record.channel === 'self' ? 'Mwenye nyumba' : record.channel === 'migrated' ? 'Tenancy iliyopo' : 'Msaidizi'}
                    </span>
                    {record.duplicate_flag && (
                      <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-warning bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning">
                        <Flag className="h-3 w-3" aria-hidden="true" />
                        Kumbukumbu inayofanana
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border px-5 py-3">
                  <p className="ibmt-hint">
                    Nyaraka: {(record.evidence || []).map((item) => item.kind).join(', ') || '—'}
                    {record.duplicate_note ? ` · ${record.duplicate_note}` : ''}
                  </p>
                  {record.decision_reason && record.status !== 'submitted' && (
                    <p className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px]">
                      Sababu: {record.decision_reason.sw || record.decision_reason.en}
                    </p>
                  )}
                  {record.certificate_no && (
                    <p className="ibmt-num mt-2 text-[12px] text-success">{record.certificate_no}</p>
                  )}
                </div>

                {record.status !== 'approved' && record.status !== 'awaiting_otp' && (
                  <div className="border-t border-border px-5 py-3">
                    {openCase === record.id ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'approved', label: 'Idhinisha', Icon: ShieldCheck },
                            { key: 'queried', label: 'Uliza', Icon: ShieldAlert },
                            { key: 'rejected', label: 'Kataa', Icon: ShieldAlert },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setDecision(item.key)}
                              className={`ibmt-tap inline-flex items-center gap-2 rounded-md border px-3 text-[12px] font-medium ${
                                decision === item.key
                                  ? 'border-navy bg-navy text-primary-foreground'
                                  : 'border-border text-muted-foreground'
                              }`}
                            >
                              <item.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Sababu — mmiliki ataiona (angalau herufi 10)"
                          rows={3}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                            disabled={busy || reason.trim().length < 10}
                            onClick={() => submitDecision(record)}
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            {busy ? 'Inahifadhi…' : 'Hifadhi uamuzi'}
                          </Button>
                          <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setOpenCase('')}>
                            Ghairi
                          </Button>
                          {reason.trim().length > 0 && reason.trim().length < 10 && (
                            <span className="text-[11px] text-destructive">Sababu fupi mno.</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="ibmt-tap"
                        onClick={() => {
                          setOpenCase(record.id);
                          setReason('');
                          setDecision('approved');
                        }}
                      >
                        Amua
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataState>

      <Notice tone="policy" title="Usajili si umiliki">
        {DISCLAIMER.sw} / {DISCLAIMER.en}
      </Notice>
    </div>
  );
}