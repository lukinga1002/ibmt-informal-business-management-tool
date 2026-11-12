import { useCallback, useEffect, useState } from 'react';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText } from '@/lib/r4';
import { formatDateTime } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

const KINDS = ['deposit', 'repairs', 'entry', 'notice', 'other'];
const STEPS = ['open', 'opened', 'mediation', 'resolved', 'escalated', 'closed', 'evidence_pack'];

/** Disputes: open, Mediation, resolved or escalated. The pack is shared only by the party who owns it. */
export default function DisputePanel({ tenancyId, role = 'tenant' }) {
  const { t, tt, lang } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ kind: 'deposit', body_sw: '' });
  const [packs, setPacks] = useState({});
  const [emails, setEmails] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await callFn('disputeCase', { action: 'list', tenancy_id: tenancyId });
      setRows(data.rows || []);
    } catch (err) {
      setError({ err });
    }
  }, [tenancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await callFn('disputeCase', { action: 'open', tenancy_id: tenancyId, kind: form.kind, body_sw: form.body_sw });
      setForm({ kind: 'deposit', body_sw: '' });
      await load();
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  const buildPack = async (row) => {
    setBusy(true);
    setError(null);
    try {
      const data = await callFn('disputeCase', { action: 'pack', dispute_id: row.dispute_id });
      setPacks((prev) => ({ ...prev, [row.dispute_id]: data.pack }));
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  const share = async (row) => {
    const pack = packs[row.dispute_id];
    if (!pack) return;
    setBusy(true);
    setError(null);
    try {
      const list = String(emails[row.dispute_id] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const data = await callFn('disputeCase', { action: 'share', pack_id: pack.pack_id, emails: list });
      setPacks((prev) => ({ ...prev, [row.dispute_id]: { ...pack, shared_with: data.shared_with } }));
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title={t('dispute.title')} description={t('dispute.description')}>
      <div className="space-y-4">
        {rows.length === 0 ? (
          <Notice tone="neutral">{t('dispute.none')}</Notice>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.dispute_id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {KINDS.includes(row.kind) ? t(`dispute.kind.${row.kind}`) : row.kind}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{row.body?.sw}</p>
                  </div>
                  <StatusBadge status={row.status} label={STEPS.includes(row.status) ? t(`dispute.step.${row.status}`) : row.status} />
                </div>

                <ol className="mt-2 space-y-1">
                  {(row.timeline || []).map((step, index) => (
                    <li key={index} className="ibmt-num text-[11px] text-muted-foreground">
                      {formatDateTime(step.at, lang)} · {STEPS.includes(step.action) ? t(`dispute.step.${step.action}`) : step.action}
                      {step.note ? ` · ${step.note}` : ''}
                    </li>
                  ))}
                </ol>

                {row.resolution_note && <p className="mt-1 text-[12px] text-navy-ink">{t('dispute.decision', { note: tt(row.resolution_note) })}</p>}

                <div className="mt-2 space-y-2">
                  {!packs[row.dispute_id] ? (
                    <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => buildPack(row)} disabled={busy}>
                      {t('dispute.buildPack')}
                    </Button>
                  ) : (
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <p className="text-[12px] font-medium">{t('dispute.packCount', { count: packs[row.dispute_id].count })}</p>
                      <p className="ibmt-hint">{tt(packs[row.dispute_id].note)}</p>
                      <Field label={t('dispute.shareWith')}>
                        {(props) => (
                          <TextInput
                            {...props}
                            value={emails[row.dispute_id] || ''}
                            onChange={(event) => setEmails((prev) => ({ ...prev, [row.dispute_id]: event.target.value }))}
                          />
                        )}
                      </Field>
                      <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => share(row)} disabled={busy}>
                        {t('dispute.share')}
                      </Button>
                      {(packs[row.dispute_id].shared_with || []).length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {t('dispute.sharedWith', { count: packs[row.dispute_id].shared_with.length })}
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
          <Field label={t('dispute.kindLabel')} required>
            {(props) => (
              <SelectControl {...props} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
                {KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`dispute.kind.${value}`)}
                  </option>
                ))}
              </SelectControl>
            )}
          </Field>
          <Field label={t('dispute.describe')} required hint={t('dispute.min10')}>
            {(props) => <TextArea {...props} rows={3} value={form.body_sw} onChange={(event) => setForm({ ...form, body_sw: event.target.value })} />}
          </Field>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-destructive">
              {errorText(error)}
            </p>
          )}

          <Button
            type="button"
            className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={open}
            disabled={busy || form.body_sw.trim().length < 10}
          >
            {busy ? t('otpConfirm.sending') : t('dispute.open')}
          </Button>
          <p className="ibmt-hint">
            {role === 'tenant' ? t('dispute.tenantHint') : t('dispute.landlordHint')}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}