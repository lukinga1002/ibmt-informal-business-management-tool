import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Field, { TextInput } from '@/components/ibmt/Field';
import Money from '@/components/ibmt/Money';
import StatusBadge from '@/components/ibmt/StatusBadge';
import ReceiptSheet from './ReceiptSheet';
import { METHOD_LABEL, RECORD_LABEL, callFn, fnError } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * One rent record per block. The party who entered it never confirms it; the
 * other party does, and only then does a receipt exist.
 */
export default function RecordList({ rows = [], myId, onChanged }) {
  const { lang } = useT();
  const [busyId, setBusyId] = useState(null);
  const [disputeId, setDisputeId] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const decide = async (row, action) => {
    setBusyId(row.id);
    setError('');
    try {
      await callFn('rentRecord', { action, id: row.id, reason: action === 'dispute' ? reason : undefined });
      setDisputeId(null);
      setReason('');
      if (onChanged) onChanged();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusyId(null);
    }
  };

  const openReceipt = async (row) => {
    setBusyId(row.id);
    setError('');
    try {
      const data = await callFn('rentRecord', { action: 'receipt', id: row.id });
      setReceipt(data.receipt);
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (!rows.length) {
    return <p className="text-[13px] leading-relaxed text-muted-foreground">Hakuna rekodi ya kodi bado.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      {rows.map((row) => {
        const mine = row.entered_by_id === myId;
        const waiting = row.record_status === 'pending' && mine;
        return (
          <article key={row.id} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="ibmt-num text-[13px] font-medium">{row.reference}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {row.unit_ref} · {row.period_month} · {METHOD_LABEL[row.method] || row.method || '—'}
                  {row.mobile_money_ref ? ` · ${row.mobile_money_ref}` : ''}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Iliandikwa na {row.entered_by_role === 'tenant' ? 'mpangaji' : 'mmiliki'}
                  {row.entered_by_name ? ` (${row.entered_by_name})` : ''} · {formatDate(row.entered_at, lang)}
                </p>
                {row.dispute_reason && (
                  <p className="mt-1 text-[12px] text-destructive">Sababu ya pingamizi: {row.dispute_reason}</p>
                )}
              </div>
              <div className="text-right">
                <Money amount={row.amount} strong />
                <div className="mt-1">
                  <StatusBadge status={row.record_status} label={RECORD_LABEL[row.record_status] || row.record_status} />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {row.record_status === 'confirmed' && row.receipt_reference && (
                <>
                  <span className="ibmt-num rounded-sm border border-dashed border-gold-ink/50 bg-gold-soft px-2 py-1 text-[11px] text-gold-ink">
                    Risiti {row.receipt_reference}
                  </span>
                  <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => openReceipt(row)} disabled={busyId === row.id}>
                    Onyesha risiti
                  </Button>
                </>
              )}

              {row.record_status === 'pending' && !mine && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                    onClick={() => decide(row, 'confirm')}
                    disabled={busyId === row.id}
                  >
                    Thibitisha
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ibmt-tap"
                    onClick={() => setDisputeId(disputeId === row.id ? null : row.id)}
                  >
                    Pinga
                  </Button>
                </>
              )}

              {waiting && <p className="text-[12px] text-muted-foreground">Inasubiri upande wa pili kuthibitisha.</p>}
            </div>

            {disputeId === row.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <Field label="Eleza tatizo" required hint="Angalau herufi 8">
                  {(props) => (
                    <TextInput
                      {...props}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Mfano: kiasi si sahihi, kumbukumbu haipo"
                    />
                  )}
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="ibmt-tap"
                  onClick={() => decide(row, 'dispute')}
                  disabled={busyId === row.id || reason.trim().length < 8}
                >
                  Tuma pingamizi
                </Button>
              </div>
            )}
          </article>
        );
      })}

      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Risiti</DialogTitle>
          </DialogHeader>
          <ReceiptSheet receipt={receipt} />
        </DialogContent>
      </Dialog>
    </div>
  );
}