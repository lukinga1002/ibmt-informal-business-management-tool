import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import ReasonDialog from '@/components/ibmt/ReasonDialog';
import { Button } from '@/components/ui/button';
import { SelectControl } from '@/components/ibmt/Field';
import { formatDate, formatDateTime } from '@/lib/format';

const FILTERS = ['all', 'submitted', 'in_review', 'queried', 'approved', 'rejected'];

export default function CouncilPermits() {
  const { t, tt, lang } = useT();
  const [status, setStatus] = useState('all');
  const [decision, setDecision] = useState(null);
  const permits = useIBMTQuery('listPermits', { status, limit: 8 });
  const decide = useIBMTMutation('decidePermit');

  const submit = async (reason) => {
    const result = await decide.run({ id: decision.permit.id, decision: decision.kind, reason, version: decision.permit.version });
    if (result) setDecision(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.permits')}
        lede={t('policy.permitVsTax')}
        meta={[{ label: t('common.reasonRequired') }, { label: t('policy.permitVsTax') }]}
      />

      <Notice tone="policy">{t('policy.noAutoEnforcement')}</Notice>

      <SectionCard
        title={t('nav.permits')}
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="permit-status" className="sr-only">
              {t('common.status')}
            </label>
            <SelectControl id="permit-status" className="h-10 w-[190px] text-[13px]" value={status} onChange={(event) => setStatus(event.target.value)}>
              {FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? t('common.all') : t(`status.${value}`)}
                </option>
              ))}
            </SelectControl>
          </div>
        }
      >
        <DataState query={permits} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <ul className="space-y-4">
              {permits.items.map((permit) => (
                <li key={permit.id} className="rounded-md border border-border px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="ibmt-num text-[13px] font-semibold text-navy">{permit.reference}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {tt(permit.venue)} · {permit.ward_id} · {formatDate(permit.event_date, lang)}
                      </p>
                      <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">
                        {t('rent.termsVersion')} {permit.version}
                        {permit.decided_at ? ` · ${formatDateTime(permit.decided_at, lang)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={permit.status} />
                      {permit.fee_amount ? <Money amount={permit.fee_amount} muted /> : null}
                    </div>
                  </div>

                  {permit.decision_reason && (
                    <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed">
                      <span className="font-semibold">{t('common.reason')}: </span>
                      {tt(permit.decision_reason)}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { kind: 'approved', label: t('common.approve') },
                      { kind: 'queried', label: t('common.query') },
                      { kind: 'rejected', label: t('common.reject') },
                    ].map((action) => (
                      <Button key={action.kind} type="button" variant="outline" size="sm" onClick={() => setDecision({ permit, kind: action.kind })}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </SectionCard>

      <ReasonDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
        title={`${t(`common.${decision?.kind === 'approved' ? 'approve' : decision?.kind === 'queried' ? 'query' : 'reject'}`)} — ${decision?.permit?.reference || ''}`}
        description={t('common.reasonRequired')}
        confirmLabel={t('common.confirm')}
        tone={decision?.kind === 'rejected' ? 'danger' : 'default'}
        busy={decide.saving}
        fieldError={decide.fieldErrors?.reason}
        serverError={decide.status === 'error' && !decide.fieldErrors?.reason ? decide.error?.message : null}
        onConfirm={submit}
      />
    </div>
  );
}