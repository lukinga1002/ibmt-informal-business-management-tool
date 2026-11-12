import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';
import { DISCLAIMER } from '@/config/r3';

/**
 * The registration certificate. It carries the ward and mtaa only — never the
 * address or the meter — and states on its face that registration is not proof
 * of ownership.
 */
export default function RegistrationCertificate() {
  const { caseId } = useParams();
  const { t, tt, lang } = useT();
  const [record, setRecord] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    base44.entities.VerificationCase
      .get(caseId)
      .then((row) => {
        setRecord(row);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [caseId]);

  if (state === 'loading') {
    return <p className="ibmt-hint">{t('common.loading')}…</p>;
  }
  if (state === 'error' || !record) {
    return <Notice tone="caution">{t('certOwn.notVisible')}</Notice>;
  }

  if (record.status !== 'approved') {
    return (
      <div className="space-y-4">
        <SectionCard title={t('certOwn.registration', { unit: record.unit_ref })} description={record.case_ref}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={record.status} />
            <span className="text-[12px] text-muted-foreground">
              {record.ward} · {record.mtaa}
            </span>
          </div>
          {record.decision_reason && (
            <div className="mt-4">
              <p className="ibmt-kicker">{t('certOwn.officerReason')}</p>
              <p className="mt-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-[13px] leading-relaxed">
                {tt(record.decision_reason)}
              </p>
            </div>
          )}
          <Notice tone="policy" className="mt-4">
            {t('certOwn.onlyAfterApproval')} {tt(DISCLAIMER)}
          </Notice>
        </SectionCard>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/cert/${record.certificate_no}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="space-y-4">
      <div className="ibmt-no-print flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="ibmt-tap gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          {t('common.print')}
        </Button>
        <span className="ibmt-hint">{t('certOwn.scanHint')}</span>
      </div>

      {/* i18n-document-start: the certificate keeps its fixed bilingual wording whatever the screen language */}
      <article className="ibmt-sheet" lang="sw">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="ibmt-kicker">Jamhuri ya Muungano wa Tanzania</p>
            <h1 className="mt-1 font-heading text-xl font-semibold text-navy">Cheti cha Usajili wa Nyumba</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">Registration certificate · IBMT Rent</p>
          </div>
          <img src={qrSrc} alt={`QR: ${record.certificate_no}`} className="h-[110px] w-[110px]" />
        </header>

        <dl className="mt-4 divide-y divide-border text-[13px]">
          {[
            ['Namba ya cheti · Certificate no.', record.certificate_no],
            ['Namba ya nyumba · Unit ref', record.unit_ref],
            ['Kata · Ward', record.ward],
            ['Mtaa · Mtaa', record.mtaa],
            ['Wilaya · District', record.district],
            ['Mmiliki aliyesajiliwa · Registered holder', record.landlord_name],
            ['Ilithibitishwa · Verified on', formatDate(record.certificate_issued_at, lang)],
            ['Afisa · Officer', record.decided_by_name],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="ibmt-num font-medium sm:text-right">{value || '—'}</dd>
            </div>
          ))}
        </dl>

        <footer className="mt-5 rounded-md border border-dashed border-gold bg-gold-soft/50 px-4 py-3">
          <p className="font-heading text-[13px] font-semibold text-gold-ink">
            Usajili huu si uthibitisho wa umiliki.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-gold-ink">
            Registration does not prove ownership. Nyaraka za umiliki zinabaki kwa mmiliki na halmashauri.
          </p>
        </footer>
      </article>
      {/* i18n-document-end */}

      <Notice tone="privacy">
        {t('certOwn.privacy')}
      </Notice>
    </div>
  );
}