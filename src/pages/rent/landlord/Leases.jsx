import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';
import { LEASE_LABEL } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/** The landlord's leases, newest first, with the state each one reached. */
export default function LandlordLeases() {
  const { lang } = useT();
  const [leases, setLeases] = useState(null);

  useEffect(() => {
    base44.entities.Lease
      .filter({}, { sort: '-created_date', limit: 40 })
      .then((page) => setLeases(page.items || []))
      .catch(() => setLeases([]));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Mikataba ya kodi"
        title="Mikataba"
        lede="Mkataba wa kawaida kwa Kiswahili na Kiingereza, unaosainiwa kwa namba ya siri ya kila upande."
        meta={[{ label: 'Template ya awali, inasubiri ukaguzi wa kisheria' }]}
        actions={
          <Button asChild className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep">
            <Link to="/rent/landlord/lease/new">Mkataba mpya</Link>
          </Button>
        }
      />

      <SectionCard title="Mikataba yangu" description="Mkataba unakuwa hai pale sahihi zote mbili zinapokuwepo.">
        {leases === null ? (
          <p className="text-[13px] text-muted-foreground">Inapakia…</p>
        ) : leases.length === 0 ? (
          <Notice tone="neutral" title="Hakuna mkataba bado">
            Anza mkataba kwa nyumba iliyothibitishwa na afisa wa mtaa. Namba ya mkataba unayompa mpangaji ndiyo
            inayomfunga kwenye mkataba.
          </Notice>
        ) : (
          <ul className="space-y-3">
            {leases.map((lease) => (
              <li
                key={lease.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="ibmt-num text-[13px] font-medium">{lease.lease_ref}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {lease.unit_ref} · {lease.ward} · {formatDate(lease.start_date, lang)} – {formatDate(lease.end_date, lang)}
                  </p>
                  {lease.claim_code && (
                    <p className="ibmt-num mt-1 text-[11px] text-gold-ink">Namba ya mpangaji: {lease.claim_code}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Money amount={lease.rent_amount} />
                  <StatusBadge status={lease.status} label={LEASE_LABEL[lease.status] || lease.status} />
                  <Button asChild size="sm" variant="outline" className="ibmt-tap">
                    <Link to={`/rent/lease/${lease.id}`}>Fungua</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}