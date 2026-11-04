import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import LeaseQr from './LeaseQr';
import { LEASE_LABEL } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';
import { formatDate, formatDateTime } from '@/lib/format';

const PARTY_LABEL = { landlord: 'Mmiliki', tenant: 'Mpangaji' };

/** The standard bilingual lease as it was saved, clause by clause. */
export default function LeaseDocument({ lease, showQr = false }) {
  const { lang } = useT();
  if (!lease) return null;

  const terms = lease.terms || {};
  const stamp = lease.stamp_duty || {};
  const clauses = terms.clauses || [];
  const label = lease.template_label?.sw || lease.template_label?.en || 'DRAFT - inasubiri ukaguzi wa kisheria';

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
            Template {lease.template_version}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Money
          amount={lease.rent_amount}
          strong
          note={lease.frequency === 'quarterly' ? 'Kila robo mwaka' : 'Kila mwezi'}
        />
        <div className="text-[12px] leading-relaxed text-muted-foreground">
          <p>{lease.unit_ref} · {lease.ward}</p>
          <p className="ibmt-num mt-1">
            {formatDate(lease.start_date, lang)} - {formatDate(lease.end_date, lang)}
          </p>
          {terms.due_day ? <p className="mt-1">Siku ya malipo: {terms.due_day}</p> : null}
        </div>
      </div>

      <div>
        <p className="ibmt-kicker">Masharti ya kawaida</p>
        <ol className="mt-2 space-y-3">
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
        <p className="ibmt-kicker">Sahihi</p>
        <ul className="mt-2 space-y-2">
          {(lease.parties || []).map((party) => (
            <li key={party.party} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0">
              <span className="text-[13px] font-medium">{PARTY_LABEL[party.party] || party.party}</span>
              {party.signed ? (
                <StatusBadge status="confirmed" label={`Imesainiwa ${formatDateTime(party.signed_at, lang)}`} />
              ) : (
                <StatusBadge status="pending" label="Bado kusaini" />
              )}
            </li>
          ))}
        </ul>
      </div>

      <Notice tone="caution" title="Stampu (stamp duty)">
        {stamp.label?.sw || stamp.sw || 'Nafasi tu. Hakuna kiasi kinachokokotolewa au kudaiwa katika hatua hii.'}
      </Notice>

      {showQr && <LeaseQr code={lease.verify_code} />}
    </div>
  );
}