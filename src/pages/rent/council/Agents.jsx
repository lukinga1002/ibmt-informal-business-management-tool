import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { TextArea } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

const DECISIONS = ['approve', 'reject', 'suspend', 'revoke'];
const STATUSES = ['pending', 'approved', 'rejected', 'suspended', 'revoked'];
const SCOPES = ['rental', 'sale', 'both'];
const SCOPE_FILTERS = ['', 'rental', 'sale', 'both'];

/** Council desk: approve, reject, suspend or revoke a licence with a reason. */
export default function CouncilAgents() {
  const { t } = useT();
  const [rows, setRows] = useState(null);
  const [council, setCouncil] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('');
  const [openId, setOpenId] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await callFn('agentLicence', { action: 'queue', scope: scopeFilter || undefined });
      setRows(data.rows || []);
      setCouncil(data.council || null);
    } catch (err) {
      setError({ err });
      setRows([]);
    }
  }, [scopeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row, decision) => {
    setBusy(true);
    setError(null);
    try {
      await callFn('agentLicence', { action: 'decide', licence_id: row.licence_id, decision, reason });
      setOpenId(null);
      setReason('');
      await load();
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('entry.role.council')}
        title={t('agentLicences.title')}
        lede={t('agentLicences.lede')}
        meta={[{ label: t('agentLicences.endsMandates') }]}
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {errorText(error)}
        </p>
      )}

      <SectionCard
        title={t('agentLicences.queueTitle')}
        description={council?.name ? t('agentLicences.submittedIn', { council: council.name }) : t('agentLicences.submittedInYours')}
        actions={SCOPE_FILTERS.map((value) => (
          <Button
            key={value || 'all'}
            type="button"
            size="sm"
            variant={scopeFilter === value ? 'default' : 'outline'}
            className={scopeFilter === value ? 'ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep' : 'ibmt-tap'}
            onClick={() => setScopeFilter(value)}
          >
            {value ? t(`agentLicences.scope.${value}`) : t('common.all')}
          </Button>
        ))}
      >
        {rows === null ? (
          <p className="text-[13px] text-muted-foreground">{t('common.loading')}…</p>
        ) : rows.length === 0 ? (
          <Notice tone="neutral">{t('agentLicences.none')}</Notice>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.licence_id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {row.agent_name} · {row.council_name || row.district}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.business_name || t('agentLicences.individual')}
                      <span className="ibmt-num">{row.agent_phone ? ` · ${row.agent_phone}` : ''}</span>
                      <span className="ibmt-num">{row.nida_number ? ` · NIDA ${row.nida_number}` : ''}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t(`agentLicences.scope.${SCOPES.includes(row.scope) ? row.scope : 'rental'}`)}
                      <span className="ibmt-num">
                        {row.licence_no ? ` · ${row.licence_no}` : ` · ${t('agentLicences.noNumber')}`}
                      </span>
                      {row.decision_reason ? ` · ${row.decision_reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} label={STATUSES.includes(row.status) ? t(`agentLicences.status.${row.status}`) : row.status} />
                    <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => setOpenId(openId === row.licence_id ? null : row.licence_id)}>
                      {t('wardVerify.decide')}
                    </Button>
                  </div>
                </div>

                {openId === row.licence_id && (
                  <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 px-3 py-3">
                    <Field label={t('common.reason')} required hint={t('agentLicences.reasonHint')}>
                      {(props) => <TextArea {...props} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />}
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {DECISIONS.map((key) => (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={key === 'approve' ? 'default' : 'outline'}
                          className={key === 'approve' ? 'ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep' : 'ibmt-tap'}
                          onClick={() => decide(row, key)}
                          disabled={busy || (key !== 'approve' && reason.trim().length < 8)}
                        >
                          {t(`agentLicences.decision.${key}`)}
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