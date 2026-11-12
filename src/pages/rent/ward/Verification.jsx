import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flag, ShieldAlert, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DISCLAIMER } from '@/config/r3';
import { errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

const FILTERS = [
  { key: 'submitted', label: 'wardVerify.filter.submitted' },
  { key: 'queried', label: 'wardVerify.filter.queried' },
  { key: 'all', label: 'wardVerify.filter.all' },
];

/**
 * The mtaa verification queue for this officer's wards. Only their own ward
 * rows arrive at all — the access rule decides that, not this screen.
 */
export default function WardVerification() {
  const { t, tt } = useT();
  const [rows, setRows] = useState({ state: 'loading', items: [], error: null });
  const [filter, setFilter] = useState('submitted');
  const [openCase, setOpenCase] = useState('');
  const [decision, setDecision] = useState('approved');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

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
  }, [filter]);

  const pending = useMemo(() => rows.items.filter((row) => row.status !== 'approved'), [rows.items]);

  const submitDecision = async (record) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await base44.functions.invoke('decideRegistration', {
        case_id: record.id,
        decision,
        reason,
      });
      const data = response.data || {};
      setMessage(
        decision === 'approved'
          ? { key: 'wardVerify.certificateIssued', vars: { certificate: data.certificate_no, unit: record.unit_ref } }
          : { key: 'wardVerify.decisionSaved' },
      );
      setOpenCase('');
      setReason('');
      setDecision('approved');
      load();
    } catch (err) {
      setError({ err });
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
        kicker={t('wardVerify.kicker')}
        title={t('wardVerify.title')}
        lede={t('wardVerify.lede')}
        meta={[{ label: t('wardVerify.waiting', { count: pending.length }) }, { label: tt(DISCLAIMER) }]}
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
            {t(item.label)}
          </button>
        ))}
      </div>

      {message && <Notice tone="positive">{errorText(message)}</Notice>}
      {error && <Notice tone="danger">{errorText(error)}</Notice>}

      <DataState query={query} skeleton="lines" emptyTitle={t('wardVerify.emptyTitle')} emptyBody={t('wardVerify.emptyBody')}>
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
                      {t(`wardVerify.channel.${record.channel === 'self' || record.channel === 'migrated' ? record.channel : 'helper'}`)}
                    </span>
                    {record.duplicate_flag && (
                      <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-warning bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning">
                        <Flag className="h-3 w-3" aria-hidden="true" />
                        {t('wardVerify.duplicate')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border px-5 py-3">
                  <p className="ibmt-hint">
                    {t('wardVerify.documents', { list: (record.evidence || []).map((item) => t(`wardVerify.evidence.${item.kind}`)).join(', ') || '—' })}
                    {record.duplicate_flag ? ` · ${t('wardVerify.duplicateNote')}` : ''}
                  </p>
                  {record.decision_reason && record.status !== 'submitted' && (
                    <p className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px]">
                      {t('wardVerify.reason', { reason: tt(record.decision_reason) })}
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
                            { key: 'approved', label: 'common.approve', Icon: ShieldCheck },
                            { key: 'queried', label: 'common.query', Icon: ShieldAlert },
                            { key: 'rejected', label: 'common.reject', Icon: ShieldAlert },
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
                              {t(item.label)}
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder={t('wardVerify.reasonPlaceholder')}
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
                            {busy ? t('wardVerify.saving') : t('wardVerify.save')}
                          </Button>
                          <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setOpenCase('')}>
                            {t('common.cancel')}
                          </Button>
                          {reason.trim().length > 0 && reason.trim().length < 10 && (
                            <span className="text-[11px] text-destructive">{t('wardVerify.reasonShort')}</span>
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
                        {t('wardVerify.decide')}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataState>

      <Notice tone="policy" title={t('join.done.disclaimerTitle')}>
        {tt(DISCLAIMER)}
      </Notice>
    </div>
  );
}