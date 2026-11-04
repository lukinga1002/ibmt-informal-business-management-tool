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
import { callFn, fnError } from '@/lib/r4';

/** One lease, its clauses, its signatures and the signing step for this side. */
export default function LeaseDetail() {
  const { leaseId } = useParams();
  const [lease, setLease] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await callFn('leaseSignature', { action: 'view', lease_id: leaseId });
      setLease(data);
    } catch (err) {
      setError(fnError(err));
    }
  }, [leaseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="Mkataba" title="Mkataba haupatikani" />
        <Notice tone="danger">{error}</Notice>
        <Button asChild variant="outline" className="ibmt-tap">
          <Link to="/">Rudi nyumbani</Link>
        </Button>
      </div>
    );
  }

  if (!lease) {
    return <p className="text-[13px] text-muted-foreground">Inapakia mkataba…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Mkataba wa kodi"
        title={lease.lease_ref}
        lede={`${lease.unit_ref} · ${lease.ward}`}
        actions={
          <Button asChild variant="outline" className="ibmt-tap">
            <Link to={lease.my_party === 'tenant' ? '/rent/tenant/lease' : '/rent/landlord/leases'}>Mikataba yote</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Mkataba" description="Maneno yaliyohifadhiwa wakati mkataba uliundwa.">
          <LeaseDocument lease={lease} showQr />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Kusaini" description="Kila upande unasaini kwa namba yake mwenyewe.">
            <LeaseSignPanel lease={lease} onUpdated={load} />
          </SectionCard>

          {lease.claim_code && (
            <SectionCard title="Namba ya mpangaji">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Mpe mpangaji namba hii afungue mkataba kutoka akaunti yake. Namba hii inafutwa mara inapotumika.
              </p>
              <p className="ibmt-num mt-2 font-heading text-lg font-semibold text-navy">{lease.claim_code}</p>
            </SectionCard>
          )}

          <Notice tone="privacy" title="Kinachotolewa kwa umma">
            Ukurasa wa QR unaonyesha namba ya mkataba, nyumba, kata na tarehe pekee. Hakuna jina, anwani, namba ya nyumba
            wala mita.
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