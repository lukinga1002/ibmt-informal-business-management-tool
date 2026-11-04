import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';

/**
 * Only a verified unit can be listed, and the listing carries the area, never
 * the address. The address unlocks for a tenant when they book a viewing.
 */
export default function LandlordListings() {
  const [units, setUnits] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const unitPage = await base44.entities.RentalUnit.filter({ verification_status: 'verified' }, { sort: '-created_date', limit: 50 });
      setUnits(unitPage.items || []);
      const data = await callFn('listingBoard', { action: 'mine' });
      setRows(data.rows || []);
    } catch (err) {
      setError(fnError(err));
      setUnits([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const publish = async (unit) => {
    setBusy(true);
    setError('');
    try {
      await callFn('listingBoard', { action: 'publish', unit_id: unit.id });
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (row, status) => {
    setBusy(true);
    setError('');
    try {
      await callFn('listingBoard', { action: 'status', listing_id: row.listing_id, status });
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const listedUnitIds = new Set(rows.filter((row) => row.status === 'listed').map((row) => row.unit_ref));
  const available = (units || []).filter((unit) => !listedUnitIds.has(unit.unit_ref));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Matangazo"
        title="Matangazo ya nyumba"
        lede="Tangaza nyumba iliyothibitishwa. Umma unaona kata na mtaa pekee; anwani inafunguka baada ya miadi."
        meta={[{ label: 'Hakuna ada ya kuona: mpangaji TZS 0' }]}
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Nyumba zilizothibitishwa" description="Nyumba isiyothibitishwa haiwezi kutangazwa.">
          {units === null ? (
            <p className="text-[13px] text-muted-foreground">Inapakia…</p>
          ) : available.length === 0 ? (
            <Notice tone="neutral">Hakuna nyumba iliyothibitishwa inayosubiri kutangazwa.</Notice>
          ) : (
            <ul className="space-y-3">
              {available.map((unit) => (
                <li key={unit.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{unit.unit_ref}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {unit.ward}
                      {unit.mtaa ? ` · ${unit.mtaa}` : ''} · {unit.unit_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money amount={unit.rent_amount} />
                    <Button type="button" size="sm" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={() => publish(unit)} disabled={busy}>
                      Tangaza
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Matangazo yangu" description="Nini kinaonekana kwa umma.">
          {rows.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Hakuna tangazo bado.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.listing_id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{row.headline?.sw || row.unit_ref}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.ward}
                        {row.mtaa ? ` · ${row.mtaa}` : ''} · umma hauoni anwani
                      </p>
                    </div>
                    <StatusBadge
                      status={row.status}
                      label={row.status === 'listed' ? 'Linatangazwa' : row.status === 'paused' ? 'Limesimamishwa' : row.status === 'let' ? 'Limepangwa' : 'Rasimu'}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.status === 'listed' && (
                      <>
                        <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => setStatus(row, 'paused')} disabled={busy}>
                          Simamisha
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => setStatus(row, 'let')} disabled={busy}>
                          Limepangwa
                        </Button>
                      </>
                    )}
                    {row.status !== 'listed' && (
                      <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => setStatus(row, 'listed')} disabled={busy}>
                        Tangaza tena
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}