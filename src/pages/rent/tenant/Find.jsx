import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import Field, { TextInput } from '@/components/ibmt/Field';
import TenantFeeNote from '@/components/rent/TenantFeeNote';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * Find a home. The board shows the area only. Booking a viewing is free and is
 * the only thing that reveals the exact address to the tenant.
 */
export default function TenantFind() {
  const { lang } = useT();
  const [board, setBoard] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [slot, setSlot] = useState('');
  const [booked, setBooked] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await callFn('listingBoard', { action: 'public' });
      setBoard(data);
    } catch (err) {
      setError(fnError(err));
      setBoard({ rows: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const book = async (row) => {
    setBusy(true);
    setError('');
    try {
      const data = await callFn('listingBoard', { action: 'book_viewing', listing_id: row.listing_id, slot });
      setBooked((prev) => ({ ...prev, [row.listing_id]: data }));
      setOpenId(null);
      setSlot('');
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Tafuta nyumba"
        title="Nyumba zilizothibitishwa"
        lede="Nyumba zilizothibitishwa na afisa wa mtaa. Unaona kata na mtaa; anwani kamili inakuja baada ya kuweka miadi."
        meta={[{ label: 'Hakuna ada ya kuona' }]}
        actions={<TenantFeeNote />}
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      {board?.address_rule && <Notice tone="privacy">{board.address_rule.sw}</Notice>}

      <SectionCard title="Matangazo" description="Eneo pekee hadi miadi ya kuona iwekwe.">
        {board === null ? (
          <p className="text-[13px] text-muted-foreground">Inapakia…</p>
        ) : (board.rows || []).length === 0 ? (
          <Notice tone="neutral">Hakuna nyumba inayotangazwa kwa sasa.</Notice>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(board.rows || []).map((row) => {
              const booking = booked[row.listing_id];
              return (
                <li key={row.listing_id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{row.headline?.sw || row.unit_ref}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {row.ward}
                        {row.mtaa ? ` · ${row.mtaa}` : ''} · {row.district}
                      </p>
                      {row.unit_type && <p className="text-[11px] text-muted-foreground">{row.unit_type}</p>}
                    </div>
                    <Money amount={row.rent_amount} strong note="kwa mwezi" />
                  </div>

                  {row.address_locked && !booking && (
                    <p className="mt-2 text-[11px] text-gold-ink">
                      Anwani imefichwa. Weka miadi ya kuona (bila malipo) kuipata.
                    </p>
                  )}

                  {booking && (
                    <div className="mt-2 rounded-sm border border-dashed border-gold-ink/50 bg-gold-soft px-2 py-2 text-[12px] text-gold-ink">
                      <p className="font-medium">Miadi: {formatDate(booking.slot, lang)}</p>
                      <p className="ibmt-num mt-1">{booking.address || '—'}</p>
                      {booking.tanesco_meter && <p className="ibmt-num">Mita: {booking.tanesco_meter}</p>}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!booking ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ibmt-tap"
                        onClick={() => setOpenId(openId === row.listing_id ? null : row.listing_id)}
                      >
                        Weka miadi ya kuona
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="ibmt-tap">
                        <Link to="/rent/tenant/pay">Rekodi malipo</Link>
                      </Button>
                    )}
                  </div>

                  {openId === row.listing_id && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <Field label="Tarehe na saa" required>
                        {(props) => (
                          <TextInput {...props} type="datetime-local" value={slot} onChange={(event) => setSlot(event.target.value)} />
                        )}
                      </Field>
                      <Button
                        type="button"
                        size="sm"
                        className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                        onClick={() => book(row)}
                        disabled={busy || !slot}
                      >
                        {busy ? 'Inaweka…' : 'Thibitisha miadi (TZS 0)'}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}