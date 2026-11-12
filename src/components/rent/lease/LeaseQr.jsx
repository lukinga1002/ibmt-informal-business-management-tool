import { ExternalLink } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';

/**
 * The QR carries the long verify code only. The public page it opens shows the
 * lease facts and no names, street, house number or meter.
 */
export default function LeaseQr({ code, label }) {
  const { t } = useT();
  if (!code) return null;
  const title = label || t('leaseDoc.qrCheck');
  const target = `${window.location.origin}/lease/${code}`;
  const image = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(target)}`;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <img
        src={image}
        alt={t('leaseDoc.qrAlt')}
        width={112}
        height={112}
        className="rounded-sm border border-border bg-card p-1"
      />
      <div className="min-w-0 flex-1">
        <p className="ibmt-kicker">{title}</p>
        <p className="ibmt-hint mt-1">{t('leaseDoc.qrNote')}</p>
        <a
          href={target}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-gold-ink underline underline-offset-4"
        >
          {title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}