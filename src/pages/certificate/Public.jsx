import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, ShieldQuestion } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import Notice from '@/components/ibmt/Notice';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * Public certificate check. Anyone may scan a certificate; the answer is the
 * ward and mtaa plus the registration facts, and never an address.
 */
export default function PublicCertificate() {
  const { certificateNo } = useParams();
  const { lang } = useT();
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
          <p className="ibmt-kicker">Uthibitisho wa cheti</p>
          <h1 className="ibmt-display mt-2 text-navy">Changanua cheti cha usajili</h1>
          <p className="ibmt-lede mt-2">
            Ukurasa huu unathibitisha kuwa cheti kilitolewa na IBMT. Hauonyeshi anwani ya nyumba wala namba ya mita.
          </p>

          <div className="mt-6">
            {state === 'loading' && <p className="ibmt-hint">Inatafuta…</p>}

            {state === 'error' && (
              <Notice tone="caution" title="Hakuna jibu">
                Uthibitisho haukupatikana kwa sasa. Jaribu tena baadaye.
              </Notice>
            )}

            {state === 'ready' && result && !result.found && (
              <div className="rounded-lg border border-dashed border-border bg-card px-5 py-6">
                <div className="flex items-start gap-3">
                  <ShieldQuestion className="mt-0.5 h-5 w-5 text-warning" aria-hidden="true" />
                  <div>
                    <p className="font-heading text-[15px] font-semibold text-navy">Cheti hakijapatikana</p>
                    <p className="ibmt-num mt-1 text-[13px] text-muted-foreground">{certificateNo}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      Hakuna cheti kilichoidhinishwa kwa namba hii. Cheti halali hupewa tu baada ya afisa wa Mtaa
                      kuidhinisha usajili.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {state === 'ready' && result?.found && (
              <section className="ibmt-panel overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream/50 px-5 py-4">
                  <div>
                    <p className="ibmt-kicker">Cheti halali</p>
                    <p className="ibmt-num mt-1 font-heading text-[15px] font-semibold text-navy">{result.certificate_no}</p>
                  </div>
                  <BadgeCheck className="h-6 w-6 text-success" aria-hidden="true" />
                </header>
                <dl className="divide-y divide-border">
                  {[
                    ['Namba ya nyumba', result.unit_ref],
                    ['Kata', result.ward],
                    ['Mtaa', result.mtaa],
                    ['Wilaya', result.district],
                    ['Mmiliki aliyesajiliwa', result.landlord_display],
                    ['Ilithibitishwa', formatDate(result.verified_on, lang)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                      <dt className="text-[12px] font-medium text-muted-foreground">{label}</dt>
                      <dd className="ibmt-num text-[13px] sm:text-right">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <footer className="border-t border-border px-5 py-3">
                  <p className="font-heading text-[12px] font-semibold text-gold-ink">
                    Usajili huu si uthibitisho wa umiliki.
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Registration does not prove ownership.</p>
                </footer>
              </section>
            )}
          </div>

          <div className="mt-6">
            <Notice tone="privacy" title="Kinachoonekana hapa">
              Kata, mtaa, wilaya, namba ya nyumba, tarehe na jina la mmiliki kwa ufupi. Anwani, mita na kodi
              hazionyeshwi kamwe.
            </Notice>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}