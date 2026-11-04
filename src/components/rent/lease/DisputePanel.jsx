import { useCallback, useEffect, useState } from 'react';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';
import { formatDateTime } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

const KINDS = [
  { value: 'deposit', label: 'Amana' },
  { value: 'repairs', label: 'Matengenezo' },
  { value: 'entry', label: 'Kuingia nyumbani' },
  { value: 'notice', label: 'Taarifa' },
  { value: 'other', label: 'Nyingine' },
];

const STATUS_LABEL = {
  open: 'Wazi',
  mediation: 'Upatanisho wa mtaa',
  resolved: 'Imetatuliwa',
  escalated: 'Imepandishwa',
  closed: 'Imefungwa',
};

/** Disputes: open, Mediation, resolved or escalated. The pack is shared only by the party who owns it. */
export default function DisputePanel({ tenancyId, role = 'tenant' }) {
  const { lang } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ kind: 'deposit', body_sw: '' });
  const [packs, setPacks] = useState({});
  const [emails, setEmails] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await callFn('disputeCase', { action: 'list', tenancy_id: tenancyId });
      setRows(data.rows || []);
    } catch (err) {
      setError(fnError(err));
    }
  }, [tenancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async () => {
    setBusy(true);
    setError('');
    try {
      await callFn('disputeCase', { action: 'open', tenancy_id: tenancyId, kind: form.kind, body_sw: form.body_sw });
      setForm({ kind: 'deposit', body_sw: '' });
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const buildPack = async (row) => {
    setBusy(true);
    setError('');
    try {
      const data = await callFn('disputeCase', { action: 'pack', dispute_id: row.dispute_id });
      setPacks((prev) => ({ ...prev, [row.dispute_id]: data.pack }));
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const share = async (row) => {
    const pack = packs[row.dispute_id];
    if (!pack) return;
    setBusy(true);
    setError('');
    try {
      const list = String(emails[row.dispute_id] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const data = await callFn('disputeCase', { action: 'share', pack_id: pack.pack_id, emails: list });
      setPacks((prev) => ({ ...prev, [row.dispute_id]: { ...pack, shared_with: data.shared_with } }));
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Migogoro" description="Hatua: wazi, upatanisho wa mtaa, kutatuliwa au kupandishwa.">
      <div className="space-y-4">
        {rows.length === 0 ? (
          <Notice tone="neutral">Hakuna mgogoro kwenye tenancy hii.</Notice>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.dispute_id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {KINDS.find((item) => item.value === row.kind)?.label || row.kind}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{row.body?.sw}</p>
                  </div>
                  <StatusBadge status={row.status} label={STATUS_LABEL[row.status] || row.status} />
                </div>

                <ol className="mt-2 space-y-1">
                  {(row.timeline || []).map((step, index) => (
                    <li key={index} className="ibmt-num text-[11px] text-muted-foreground">
                      {formatDateTime(step.at, lang)} · {step.action}
                      {step.note ? ` · ${step.note}` : ''}
                    </li>
                  ))}
                </ol>

                {row.resolution_note?.sw && <p className="mt-1 text-[12px] text-navy-ink">Uamuzi: {row.resolution_note.sw}</p>}

                <div className="mt-2 space-y-2">
                  {!packs[row.dispute_id] ? (
                    <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => buildPack(row)} disabled={busy}>
                      Tengeneza pakiti ya ushahidi
                    </Button>
                  ) : (
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <p className="text-[12px] font-medium">{packs[row.dispute_id].count} nyaraka kwenye pakiti</p>
                      <p className="ibmt-hint">{packs[row.dispute_id].note.sw}</p>
                      <Field label="Shiriki na (barua pepe, tenganisha kwa koma)">
                        {(props) => (
                          <TextInput
                            {...props}
                            value={emails[row.dispute_id] || ''}
                            onChange={(event) => setEmails((prev) => ({ ...prev, [row.dispute_id]: event.target.value }))}
                          />
                        )}
                      </Field>
                      <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => share(row)} disabled={busy}>
                        Shiriki pakiti
                      </Button>
                      {(packs[row.dispute_id].shared_with || []).length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Imeshirikiwa na {packs[row.dispute_id].shared_with.length} akaunti.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <Field label="Aina ya mgogoro" required>
            {(props) => (
              <SelectControl {...props} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
                {KINDS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectControl>
            )}
          </Field>
          <Field label="Eleza tatizo" required hint="Angalau herufi 10">
            {(props) => <TextArea {...props} rows={3} value={form.body_sw} onChange={(event) => setForm({ ...form, body_sw: event.target.value })} />}
          </Field>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-destructive">
              {error}
            </p>
          )}

          <Button
            type="button"
            className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={open}
            disabled={busy || form.body_sw.trim().length < 10}
          >
            {busy ? 'Inatuma…' : 'Fungua mgogoro'}
          </Button>
          <p className="ibmt-hint">
            {role === 'tenant'
              ? 'Mtaa wako unaweza kuitisha upatanisho. Hakuna malipo yanayohitajika.'
              : 'Mgogoro unaweza kupandishwa kwa wilaya kama hautatatuliwa.'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}