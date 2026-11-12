import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import LeaseQr from './LeaseQr';
import { LEASE_LABEL } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';
import { formatDate, formatDateTime } from '@/lib/format';


/** The standard bilingual lease as it was saved, clause by clause. */
export default function LeaseDocument({ lease, showQr = false }) {
  const { t, tt, lang } = useT();
  if (!lease) return null;

  const terms = lease.terms || {};
  const stamp = lease.stamp_duty || {};
  const clauses = terms.clauses || [];
  const label = lease.template_label ? tt(lease.template_label) : t('leaseDoc.draftLabel');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={lease.status} label={LEASE_LABEL[lease.status] || lease.status} />
        <span className="ibmt-stamp">{label}</span>
        <span className="ibmt-num rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
          {lease.lease_ref}
        </span>
        {lease.template_version && (
          <span className="ibmt-num rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
            {t('leaseDoc.template', { version: lease.template_version })}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Money
          amount={lease.rent_amount}
          strong
          note={lease.frequency === 'quarterly' ? t('leaseNew.quarterly') : t('leaseNew.monthly')}
        />
        <div className="text-[12px] leading-relaxed text-muted-foreground">
          <p>{lease.unit_ref} · {lease.ward}</p>
          <p className="ibmt-num mt-1">
            {formatDate(lease.start_date, lang)} - {formatDate(lease.end_date, lang)}
          </p>
          {terms.due_day ? <p className="mt-1">{t('leaseDoc.dueDay', { day: terms.due_day })}</p> : null}
        </div>
      </div>

      <div>
        <p className="ibmt-kicker">{t('leaseDoc.standardTerms')}</p>
        {/* Document text: the clauses exactly as saved with the lease, in both of its languages. */}
        <ol className="mt-2 space-y-3" aria-label={t('leaseNew.documentText')}>
          {clauses.map((clause, index) => (
            <li key={`${index}-${clause.en || index}`} className="grid gap-2 border-b border-border pb-3 last:border-b-0 md:grid-cols-2">
              <p lang="en" className="text-[12px] leading-relaxed">
                {index + 1}. {clause.en}
              </p>
              <p lang="sw" className="text-[12px] leading-relaxed text-navy-ink">
                {index + 1}. {clause.sw}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="ibmt-kicker">{t('leaseDoc.signatures')}</p>
        <ul className="mt-2 space-y-2">
          {(lease.parties || []).map((party) => (
            <li key={party.party} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0">
              <span className="text-[13px] font-medium">{t(`leaseDoc.party.${party.party}`)}</span>
              {party.signed ? (
                <StatusBadge status="confirmed" label={t('leaseDoc.signedAt', { when: formatDateTime(party.signed_at, lang) })} />
              ) : (
                <StatusBadge status="pending" label={t('leaseDoc.notSigned')} />
              )}
            </li>
          ))}
        </ul>
      </div>

      <Notice tone="caution" title={t('leaseDoc.stampTitle')}>
        {stamp.label ? tt(stamp.label) : stamp.sw || stamp.en ? tt(stamp) : t('leaseDoc.stampBody')}
      </Notice>

      {showQr && <LeaseQr code={lease.verify_code} />}
    </div>
  );
}