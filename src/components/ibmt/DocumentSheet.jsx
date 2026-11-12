import { Printer } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

/**
 * Document specimen on a sheet, with the bilingual wording visible in both
 * languages. Final documents and eligibility come from the backend; a specimen
 * is always stamped as a specimen and never presented as issued.
 */
export default function DocumentSheet({ doc, lang, className }) {
  const { t, tt } = useT();
  if (!doc) return null;

  const stamp = (
    <span className="ibmt-stamp shrink-0" role="note">
      {t('docs.specimen')}
    </span>
  );

  return (
    <article className={className}>
      <div className="ibmt-no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="ibmt-hint">{t('docs.backendNote')}</p>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          {t('common.print')}
        </Button>
      </div>

      <div className="ibmt-sheet ibmt-specimen">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="ibmt-kicker">{t('brand.name')}</p>
            <h2 className="mt-1 font-display text-xl text-navy">{tt(doc.title)}</h2>
          </div>
          {stamp}
        </header>

        {doc.kind === 'lease' && (
          <div className="mt-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              {doc.parties?.map((party) => (
                <div key={party.ref} className="rounded-md border border-border bg-card/60 px-3 py-2">
                  <dt className="ibmt-kicker">{tt(party.role)}</dt>
                  <dd className="mt-1 text-[13px] font-medium">{party.name}</dd>
                  <dd className="ibmt-num text-[11px] text-muted-foreground">{party.ref}</dd>
                </div>
              ))}
            </dl>
            <p className="ibmt-num mt-4 text-[11px] text-muted-foreground">
              {t('rent.termsVersion')}: {doc.terms_version} · {t('rent.languagePair')}
            </p>
            <ol className="mt-4 space-y-4">
              {doc.clauses?.map((clause, index) => (
                <li key={index} className="grid gap-3 border-b border-border pb-4 last:border-b-0 md:grid-cols-2">
                  <p lang="en" className="text-[13px] leading-relaxed">{clause.en}</p>
                  <p lang="sw" className="text-[13px] leading-relaxed text-navy-ink">{clause.sw}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {doc.kind === 'receipt' && (
          <div className="mt-5">
            <p className="ibmt-num text-[12px] text-muted-foreground">
              {doc.reference} · {formatDate(doc.issued_on, lang)}
            </p>
            <dl className="mt-4">
              {doc.lines?.map((line) => (
                <div key={line.label.en} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
                  <dt className="text-[13px]">{tt(line.label)}</dt>
                  <dd className="ibmt-num text-[13px] font-semibold">{line.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-dashed border-gold/60 pt-4 text-[12px] leading-relaxed text-gold-ink">{tt(doc.statement)}</p>
          </div>
        )}

        {doc.kind === 'tax' && (
          <div className="mt-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="ibmt-kicker">{t('term.landlord')}</dt>
                <dd className="mt-1 text-[13px] font-medium">{doc.holder}</dd>
              </div>
              <div>
                <dt className="ibmt-kicker">{t('docs.tabTax')}</dt>
                <dd className="ibmt-num mt-1 text-[13px] font-medium">{doc.certificate_id}</dd>
              </div>
              <div>
                <dt className="ibmt-kicker">{t('verify.issuedOn')}</dt>
                <dd className="ibmt-num mt-1 text-[13px]">{formatDate(doc.issued_on, lang)}</dd>
              </div>
              <div>
                <dt className="ibmt-kicker">{t('parked.validUntil')}</dt>
                <dd className="ibmt-num mt-1 text-[13px]">{formatDate(doc.valid_until, lang)}</dd>
              </div>
            </dl>
            <ul className="mt-5 space-y-3">
              {doc.statements?.map((statement) => (
                <li key={statement.en} className="border-l-2 border-gold pl-3 text-[12px] leading-relaxed text-navy-ink">
                  {tt(statement)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="ibmt-hint mt-3 text-center">{t('docs.printHint')}</p>
    </article>
  );
}