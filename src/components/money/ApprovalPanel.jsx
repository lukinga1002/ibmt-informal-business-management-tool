import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useFn } from '@/hooks/useFn';
import { callFn, fnError } from '@/lib/r4';
import SectionCard from '@/components/ibmt/SectionCard';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';

/** Pending money actions and the second person who decides them. */
export default function ApprovalPanel({ onChanged }) {
  const { tt, lang } = useT();
  const approvals = useFn('moneyControl', { action: 'list' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const decide = async (request, decision) => {
    setBusy(`${request.id}:${decision}`);
    setError('');
    try {
      await callFn('moneyControl', { action: 'decide', id: request.id, decision });
      approvals.reload();
      onChanged?.();
    } catch (issue) {
      setError(fnError(issue));
    } finally {
      setBusy('');
    }
  };

  return (
    <SectionCard
      title={tt({ en: 'Approvals', sw: 'Idhini' })}
      description={tt({
        en: 'A request waits here until a different admin decides it. The requester cannot approve their own request.',
        sw: 'Ombi husubiri hapa hadi msimamizi mwingine aamue. Mwombaji hawezi kuidhinisha ombi lake.',
      })}
    >
      <AsyncBlock state={approvals}>
        {(data) => (
          <div>
            {error && <Notice tone="danger" className="mb-3">{error}</Notice>}
            {(data.approvals || []).length === 0 ? (
              <Notice tone="neutral">{tt({ en: 'No money action is waiting for approval.', sw: 'Hakuna hatua ya fedha inayosubiri idhini.' })}</Notice>
            ) : (
              <ul className="divide-y divide-border">
                {data.approvals.map((request) => (
                  <li key={request.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium capitalize">{request.action}</p>
                        <p className="ibmt-hint">
                          {request.payload?.payment_reference || request.payload?.payment_id || '—'} ·{' '}
                          <span className="ibmt-num">{Number(request.payload?.amount || 0).toLocaleString('en-US')}</span>
                        </p>
                        <p className="ibmt-hint">
                          {tt({ en: 'asked by', sw: 'imeombwa na' })} {request.requested_by_name || request.requested_by_id}
                        </p>
                        {request.reason && <p className="mt-1 text-[12px] text-muted-foreground">{request.reason}</p>}
                      </div>
                      <span className="rounded-sm border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium">{request.status}</span>
                    </div>

                    {request.status === 'pending' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="sm" className="ibmt-tap bg-navy text-primary-foreground hover:bg-navy-deep" disabled={Boolean(busy)} onClick={() => decide(request, 'approve')}>
                          {busy === `${request.id}:approve` ? tt({ en: 'Working…', sw: 'Inafanya kazi…' }) : tt({ en: 'Approve', sw: 'Idhinisha' })}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="ibmt-tap" disabled={Boolean(busy)} onClick={() => decide(request, 'reject')}>
                          {tt({ en: 'Reject', sw: 'Kataa' })}
                        </Button>
                      </div>
                    )}

                    {request.status === 'executed' && request.result && (
                      <p className="ibmt-num mt-1 text-[11px] text-success">
                        {tt({ en: 'Executed', sw: 'Imetekelezwa' })}: {JSON.stringify(request.result)}
                      </p>
                    )}
                    {request.executed_at && (
                      <p className="ibmt-hint mt-1">{new Date(request.executed_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </AsyncBlock>
    </SectionCard>
  );
}