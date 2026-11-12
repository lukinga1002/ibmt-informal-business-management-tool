import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, ShieldQuestion } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import Notice from '@/components/ibmt/Notice';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';
import { DISCLAIMER } from '@/config/r3';

/**
 * Public certificate check. Anyone may scan a certificate; the answer is the
 * ward and mtaa plus the registration facts, and never an address.
 */
export default function PublicCertificate() {
  const { certificateNo } = useParams();
  const { t, tt, lang } = useT();
  const [state, setState] = useState('loading');
  const [result, setResult] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke('verifyCertificate', { certificate_no: certificateNo })
      .then((response) => {
        setResult(response.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [certificateNo]);

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <div className="mx-auto max-w-2xl">
          <p className="ibmt-kicker">{t('certPublic.kicker')}</p>
          <h1 className="ibmt-display mt-2 text-navy">{t('certPublic.title')}</h1>
          <p className="ibmt-lede mt-2">{t('certPublic.lede')}</p>

          <div className="mt-6">
            {state === 'loading' && <p className="ibmt-hint">{t('certPublic.searching')}</p>}

            {state === 'error' && (
              <Notice tone="caution" title={t('certPublic.noAnswerTitle')}>
                {t('certPublic.noAnswerBody')}
              </Notice>
            )}

            {state === 'ready' && result && !result.found && (
              <div className="rounded-lg border border-dashed border-border bg-card px-5 py-6">
                <div className="flex items-start gap-3">
                  <ShieldQuestion className="mt-0.5 h-5 w-5 text-warning" aria-hidden="true" />
                  <div>
                    <p className="font-heading text-[15px] font-semibold text-navy">{t('certPublic.notFound')}</p>
                    <p className="ibmt-num mt-1 text-[13px] text-muted-foreground">{certificateNo}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t('certPublic.notFoundBody')}</p>
                  </div>
                </div>
              </div>
            )}

            {state === 'ready' && result?.found && (
              <section className="ibmt-panel overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream/50 px-5 py-4">
                  <div>
                    <p className="ibmt-kicker">{t('certPublic.valid')}</p>
                    <p className="ibmt-num mt-1 font-heading text-[15px] font-semibold text-navy">{result.certificate_no}</p>
                  </div>
                  <BadgeCheck className="h-6 w-6 text-success" aria-hidden="true" />
                </header>
                <dl className="divide-y divide-border">
                  {[
                    ['certPublic.unit', result.unit_ref],
                    ['certPublic.ward', result.ward],
                    ['certPublic.mtaa', result.mtaa],
                    ['certPublic.district', result.district],
                    ['certPublic.owner', result.landlord_display],
                    ['certPublic.verifiedOn', formatDate(result.verified_on, lang)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                      <dt className="text-[12px] font-medium text-muted-foreground">{t(label)}</dt>
                      <dd className="ibmt-num text-[13px] sm:text-right">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <footer className="border-t border-border px-5 py-3">
                  <p className="font-heading text-[12px] font-semibold text-gold-ink">{tt(DISCLAIMER)}</p>
                </footer>
              </section>
            )}
          </div>

          <div className="mt-6">
            <Notice tone="privacy" title={t('certPublic.shownTitle')}>
              {t('certPublic.shownBody')}
            </Notice>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}