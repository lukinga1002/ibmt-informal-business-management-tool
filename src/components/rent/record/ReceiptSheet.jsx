import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeaseQr from '@/components/rent/lease/LeaseQr';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { METHOD_LABEL } from '@/lib/r4';
import { formatDate, formatDateTime } from '@/lib/format';
import { downloadReceiptPdf } from '@/lib/receiptPdf';
import { useT } from '@/i18n/I18nContext';

const ROWS = [
  ['record_reference', 'Namba ya rekodi'],
  ['unit_ref', 'Nyumba'],
  ['period_month', 'Kipindi'],
  ['method', 'Njia ya malipo'],
  ['paid_on', 'Ilipwa tarehe'],
  ['confirmed_by_name', 'Ilithibitishwa na'],
  ['lease_ref', 'Mkataba'],
];

/** The printable receipt. Every figure here came back from the backend. */
export default function ReceiptSheet({ receipt }) {
  const { lang } = useT();
  if (!receipt) return null;

  return (
    <div className="space-y-4">
      <div className="ibmt-sheet space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <p className="ibmt-kicker">Risiti ya kodi ya nyumba</p>
            <p className="ibmt-num mt-1 font-heading text-lg font-semibold text-navy">{receipt.receipt_reference}</p>
            <p className="ibmt-hint mt-1">Imetolewa {formatDateTime(receipt.issued_at, lang)}</p>
          </div>
          <Money amount={receipt.amount} strong note="Kodi iliyothibitishwa" />
        </div>

        <dl className="space-y-2">
          {ROWS.map(([key, label]) => (
            <div key={key} className="flex items-start justify-between gap-4 border-b border-border/70 pb-2 last:border-b-0">
              <dt className="ibmt-kicker shrink-0 pt-0.5">{label}</dt>
              <dd className="ibmt-num min-w-0 text-right text-[13px]">
                {key === 'method'
                  ? METHOD_LABEL[receipt.method] || receipt.method || '—'
                  : key === 'paid_on'
                    ? formatDate(receipt.paid_on, lang)
                    : receipt[key] || '—'}
              </dd>
            </div>
          ))}
          {receipt.mobile_money_ref && (
            <div className="flex items-start justify-between gap-4">
              <dt className="ibmt-kicker shrink-0 pt-0.5">Kumbukumbu ya malipo</dt>
              <dd className="ibmt-num min-w-0 text-right text-[13px]">{receipt.mobile_money_ref}</dd>
            </div>
          )}
          {Number(receipt.deposit_amount) > 0 && (
            <div className="flex items-start justify-between gap-4">
              <dt className="ibmt-kicker shrink-0 pt-0.5">Amana</dt>
              <dd className="min-w-0 text-right">
                <Money amount={receipt.deposit_amount} />
              </dd>
            </div>
          )}
        </dl>

        <LeaseQr code={receipt.qr_url} label="Namba ya risiti" />
        <p className="ibmt-hint">
          Iliyoandikwa na {receipt.entered_by_role || '—'} ({receipt.entered_by_name || '—'}), imethibitishwa na{' '}
          {receipt.confirmed_by_name || '—'}.
        </p>
      </div>

      <Notice tone="privacy">{receipt.disclaimer?.sw || receipt.disclaimer?.en}</Notice>

      <Button
        type="button"
        variant="outline"
        className="ibmt-tap ibmt-no-print w-full gap-2"
        onClick={() => downloadReceiptPdf({ ...receipt, ward: receipt.ward })}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Pakua PDF
      </Button>
    </div>
  );
}