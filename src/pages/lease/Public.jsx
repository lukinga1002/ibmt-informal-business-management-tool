import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { LEASE_LABEL, callFn, errorText } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * The page the QR on a lease opens. It shows the lease facts and nothing that
 * identifies a person or a home: no names, street, house number, plot or meter.
 */
export default function PublicLease() {
  const { code } = useParams();
  const { t, tt, lang } = useT();
  const [state, setState] = useState({ loading: true, lease: null, error: null });

  useEffect(() => {
    let alive = true;
    callFn('leaseSignature', { action: 'public', verify_code: code })
      .then((data) => {
        if (alive) setState({ loading: false, lease: data, error: null });
      })
      .catch((err) => {
        if (alive) setState({ loading: false, lease: null, error: { err } });
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
          <p className="text-[13px] text-muted-foreground">{t('leasePublic.searching')}</p>
        ) : !lease ? (
          <div className="mx-auto max-w-xl space-y-4">
            <h1 className="ibmt-display text-navy">{t('leaseDetail.unavailable')}</h1>
            <Notice tone="danger">
              {state.error ? errorText(state.error) : t('leasePublic.noMatch')}
            </Notice>
            <Link to="/" className="text-[13px] font-medium text-gold-ink underline underline-offset-4">
              {t('leasePublic.home')}
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <div>
              <p className="ibmt-kicker">{t('leasePublic.kicker')}</p>
              <h1 className="ibmt-display mt-1 text-navy">{lease.lease_ref}</h1>
              <p className="ibmt-lede mt-2">
                {lease.unit_ref} · {lease.ward}
              </p>
            </div>

            <div className="ibmt-sheet space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={lease.status} label={LEASE_LABEL[lease.status] || lease.status} />
                <span className="ibmt-stamp">{lease.template_label ? tt(lease.template_label) : ''}</span>
              </div>

              <dl className="space-y-2">
                {[
                  ['leasePublic.rent', null],
                  ['leaseNew.frequency', lease.frequency === 'quarterly' ? t('leaseNew.quarterly') : t('leaseNew.monthly')],
                  ['leaseNew.start', formatDate(lease.start_date, lang)],
                  ['leaseNew.end', formatDate(lease.end_date, lang)],
                  ['leasePublic.landlordSigned', lease.landlord_signed ? t('common.yes') : t('leasePublic.notYet')],
                  ['leasePublic.tenantSigned', lease.tenant_signed ? t('common.yes') : t('leasePublic.notYet')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-border/70 pb-2 last:border-b-0">
                    <dt className="ibmt-kicker">{t(label)}</dt>
                    <dd className="text-right text-[13px]">{value === null ? <Money amount={lease.rent_amount} /> : value}</dd>
                  </div>
                ))}
              </dl>

              <Notice tone="caution" title={t('leaseDoc.stampTitle')}>
                {lease.stamp_duty?.label ? tt(lease.stamp_duty.label) : lease.stamp_duty?.sw || lease.stamp_duty?.en ? tt(lease.stamp_duty) : t('leasePublic.stampBody')}
              </Notice>
            </div>

            <Notice tone="policy" title={t('leasePublic.notOwnershipTitle')}>
              {t('leasePublic.notOwnershipBody')}
            </Notice>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}