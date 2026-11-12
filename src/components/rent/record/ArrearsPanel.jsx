import Money from '@/components/ibmt/Money';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import { ARREARS_LABEL } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

const TONE = { paid: 'confirmed', unpaid: 'unpaid', pending_confirmation: 'pending', disputed: 'disputed', not_due: 'not_due' };

/** Expected rent, confirmed rent and what is still outstanding, kept apart. */
export default function ArrearsPanel({ arrears }) {
  const { t, lang } = useT();
  if (!arrears || !arrears.rows) return null;

  const rows = arrears.rows.filter((row) => row.state !== 'not_due');

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
          <p className="ibmt-kicker">{t('receipt.due')}</p>
          <Money amount={arrears.totals?.due || 0} strong note={t('receipt.dueNote')} />
        </div>
        <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
          <p className="ibmt-kicker">{t('receipt.confirmed')}</p>
          <Money amount={arrears.totals?.confirmed || 0} strong note={t('receipt.confirmedNote')} />
        </div>
        <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
          <p className="ibmt-kicker">{t('receipt.outstanding')}</p>
          <Money amount={arrears.totals?.outstanding || 0} strong note={t('receipt.outstandingNote')} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Notice tone="positive">{t('receipt.noArrears')}</Notice>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={`${row.tenancy_id}-${row.period_month}`}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium">
                  {row.unit_ref} · {row.period_month}
                </p>
                <p className="ibmt-num text-[11px] text-muted-foreground">{t('receipt.dueOn', { date: formatDate(row.due_on, lang) })}</p>
              </div>
              <div className="flex items-center gap-3">
                <Money amount={row.expected} />
                <span className="ibmt-num text-[11px] text-muted-foreground">
                  {t('receipt.confirmedAmount', { amount: Number(row.confirmed || 0).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-TZ') })}
                </span>
                <StatusBadge status={TONE[row.state] || 'pending'} label={ARREARS_LABEL[row.state] || row.state} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}