import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { LEASE_LABEL, callFn, fnError } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * The page the QR on a lease opens. It shows the lease facts and nothing that
 * identifies a person or a home: no names, street, house number, plot or meter.
 */
export default function PublicLease() {
  const { code } = useParams();
  const { lang } = useT();
  const [state, setState] = useState({ loading: true, lease: null, error: '' });

  useEffect(() => {
    let alive = true;
    callFn('leaseSignature', { action: 'public', verify_code: code })
      .then((data) => {
        if (alive) setState({ loading: false, lease: data, error: '' });
      })
      .catch((err) => {
        if (alive) setState({ loading: false, lease: null, error: fnError(err) });
      });
    return () => {
      alive = false;
    };
  }, [code]);

  useEffect(() => {
    if (state.loading || state.lease) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, [state.loading, state.lease]);

  const lease = state.lease;

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        {state.loading ? (
          <p className="text-[13px] text-muted-foreground">Inatafuta mkataba…</p>
        ) : !lease ? (
          <div className="mx-auto max-w-xl space-y-4">
            <h1 className="ibmt-display text-navy">Mkataba haupatikani</h1>
            <Notice tone="danger">
              {state.error || 'Namba hii hailingani na mkataba wowote. Angalia namba au skana QR tena.'}
            </Notice>
            <Link to="/" className="text-[13px] font-medium text-gold-ink underline underline-offset-4">
              Rudi ukurasa wa mwanzo
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <div>
              <p className="ibmt-kicker">Uthibitisho wa mkataba</p>
              <h1 className="ibmt-display mt-1 text-navy">{lease.lease_ref}</h1>
              <p className="ibmt-lede mt-2">
                {lease.unit_ref} · {lease.ward}
              </p>
            </div>

            <div className="ibmt-sheet space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={lease.status} label={LEASE_LABEL[lease.status] || lease.status} />
                <span className="ibmt-stamp">{lease.template_label?.sw || lease.template_label?.en}</span>
              </div>

              <dl className="space-y-2">
                {[
                  ['Kodi', null],
                  ['Mzunguko', lease.frequency === 'quarterly' ? 'Kila robo mwaka' : 'Kila mwezi'],
                  ['Kuanza', formatDate(lease.start_date, lang)],
                  ['Kumaliza', formatDate(lease.end_date, lang)],
                  ['Mmiliki amesaini', lease.landlord_signed ? 'Ndiyo' : 'Bado'],
                  ['Mpangaji amesaini', lease.tenant_signed ? 'Ndiyo' : 'Bado'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-border/70 pb-2 last:border-b-0">
                    <dt className="ibmt-kicker">{label}</dt>
                    <dd className="text-right text-[13px]">{value === null ? <Money amount={lease.rent_amount} /> : value}</dd>
                  </div>
                ))}
              </dl>

              <Notice tone="caution" title="Stampu (stamp duty)">
                {lease.stamp_duty?.label?.sw || lease.stamp_duty?.sw || 'Stampu ya mkataba itathibitishwa. Hakuna kiasi kinachodaiwa hapa.'}
              </Notice>
            </div>

            <Notice tone="policy" title="Ukurasa huu hauthibitishi umiliki">
              Hakuna jina, anwani, namba ya nyumba wala namba ya mita inayoonyeshwa hapa. Ukurasa unathibitisha tu kuwa
              mkataba wenye namba hii umesajiliwa katika IBMT Rent.
            </Notice>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}