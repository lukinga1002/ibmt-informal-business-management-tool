import { useState } from 'react';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

export default function TenantFind() {
  const { t, tt, lang } = useT();
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const listings = useIBMTQuery('listListings', { verified_only: verifiedOnly, limit: 8 });
  const [slotFor, setSlotFor] = useState(null);
  const slots = useIBMTQuery('getViewingSlots', { id: slotFor?.id }, { enabled: Boolean(slotFor) });
  const book = useIBMTMutation('bookViewing');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.find')}
        lede={t('landing.forCitizensBody')}
        meta={[{ label: t('rent.freeViewing') }, { label: t('policy.addressesNeverPublic') }]}
      />

      <Notice tone="policy">{t('policy.noTenantFee')}</Notice>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant={verifiedOnly ? 'default' : 'outline'} className="ibmt-tap" onClick={() => setVerifiedOnly(true)}>
          <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('rent.eligible')}
        </Button>
        <Button type="button" variant={!verifiedOnly ? 'default' : 'outline'} className="ibmt-tap" onClick={() => setVerifiedOnly(false)}>
          {t('common.all')}
        </Button>
      </div>

      <DataState query={listings} skeleton="cards" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
        {() => (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.items.map((listing) => (
              <article key={listing.id} className="ibmt-panel flex flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-heading text-[15px] font-semibold text-navy">{tt(listing.headline)}</h2>
                    <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">
                      {listing.mtaa}, {listing.ward_id} · {listing.unit_ref}
                    </p>
                  </div>
                  <StatusBadge status={listing.verified ? 'verified' : 'unverified'} label={listing.verified ? t('rent.eligible') : t('rent.notEligible')} />
                </div>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {(listing.amenities || []).map((amenity) => (
                    <li key={amenity.en} className="rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                      {tt(amenity)}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <Money amount={listing.monthly_rent} note={t('rent.rentAmount')} strong />
                  <Money amount={listing.deposit} note={t('rent.deposit')} muted />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="ibmt-tap mt-5 gap-2"
                  disabled={!listing.viewings_open}
                  onClick={() => setSlotFor(listing)}
                >
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {listing.viewings_open ? t('rent.bookViewing') : t('status.inactive')}
                </Button>

                {book.status === 'success' && book.result?.listing_id === listing.id && (
                  <p className="mt-3 text-[12px] font-medium text-success">
                    {t('states.successTitle')} · {formatDateTime(book.result.starts_at, lang)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </DataState>

      <Notice tone="privacy" title={t('verify.publicScope')}>
        {t('policy.addressesNeverPublic')}
      </Notice>

      <Dialog open={Boolean(slotFor)} onOpenChange={(open) => !open && setSlotFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('rent.bookViewing')}</DialogTitle>
            <DialogDescription>{t('rent.freeViewing')} — {t('policy.noTenantFee')}</DialogDescription>
          </DialogHeader>
          <DataState query={slots} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <ul className="space-y-2">
                {(slots.data?.items || []).map((slot) => (
                  <li key={slot.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="ibmt-tap w-full justify-between"
                      disabled={book.saving}
                      onClick={() => book.run({ listing_id: slotFor.id, unit_ref: slotFor.unit_ref, starts_at: slot.starts_at })}
                    >
                      <span className="ibmt-num">{formatDateTime(slot.starts_at, lang)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        <Money amount={slot.fee_amount} note={t('rent.freeViewing')} />
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
          {book.status === 'error' && (
            <p role="alert" className="mt-3 text-[12px] font-medium text-destructive">
              {book.error?.message || t('states.errorBody')}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}