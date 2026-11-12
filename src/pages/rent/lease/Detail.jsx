import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import LeaseDocument from '@/components/rent/lease/LeaseDocument';
import LeaseSignPanel from '@/components/rent/lease/LeaseSignPanel';
import DepositPanel from '@/components/rent/lease/DepositPanel';
import ConditionPanel from '@/components/rent/lease/ConditionPanel';
import DisputePanel from '@/components/rent/lease/DisputePanel';
import TenantFeeNote from '@/components/rent/TenantFeeNote';
import { Button } from '@/components/ui/button';
import { callFn, errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

/** One lease, its clauses, its signatures and the signing step for this side. */
export default function LeaseDetail() {
  const { t } = useT();
  const { leaseId } = useParams();
  const [lease, setLease] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await callFn('leaseSignature', { action: 'view', lease_id: leaseId });
      setLease(data);
    } catch (err) {
      setError({ err });
    }
  }, [leaseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader kicker={t('leaseDetail.kicker')} title={t('leaseDetail.unavailable')} />
        <Notice tone="danger">{errorText(error)}</Notice>
        <Button asChild variant="outline" className="ibmt-tap">
          <Link to="/">{t('leaseDetail.home')}</Link>
        </Button>
      </div>
    );
  }

  if (!lease) {
    return <p className="text-[13px] text-muted-foreground">{t('leaseDetail.loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('leaseDetail.kicker')}
        title={lease.lease_ref}
        lede={`${lease.unit_ref} · ${lease.ward}`}
        actions={
          <Button asChild variant="outline" className="ibmt-tap">
            <Link to={lease.my_party === 'tenant' ? '/rent/leases' : '/rent/landlord/leases'}>{t('leaseDetail.all')}</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t('leaseDetail.document')} description={t('leaseDetail.documentBody')}>
          <LeaseDocument lease={lease} showQr />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={t('leaseDetail.signing')} description={t('leaseDetail.signingBody')}>
            <LeaseSignPanel lease={lease} onUpdated={load} />
          </SectionCard>

          {lease.claim_code && (
            <SectionCard title={t('leaseDetail.tenantCode')}>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {t('leaseDetail.tenantCodeBody')}
              </p>
              <p className="ibmt-num mt-2 font-heading text-lg font-semibold text-navy">{lease.claim_code}</p>
            </SectionCard>
          )}

          <Notice tone="privacy" title={t('leaseDetail.publicTitle')}>
            {t('leaseDetail.publicBody')}
          </Notice>
        </div>
      </div>

      {lease.my_party === 'tenant' && (
        <div>
          <TenantFeeNote />
        </div>
      )}

      {lease.tenancy_id && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DepositPanel tenancyId={lease.tenancy_id} role={lease.my_party} />
          <ConditionPanel tenancyId={lease.tenancy_id} role={lease.my_party} />
          <div className="lg:col-span-2">
            <DisputePanel tenancyId={lease.tenancy_id} role={lease.my_party} />
          </div>
        </div>
      )}
    </div>
  );
}