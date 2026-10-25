import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money, { AmountRow } from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import Timeline from '@/components/ibmt/Timeline';
import { TextInput, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export default function ConsumerDashboard() {
  const { t, tt, lang } = useT();
  const bookings = useIBMTQuery('listBookings', { limit: 6 });
  const deposit = useIBMTMutation('recordDeposit');
  const [amounts, setAmounts] = useState({});

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.dashboard')}
        lede={t('landing.forCitizensBody')}
        meta={[{ label: t('policy.recordNotFiscal') }]}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Notice tone="policy">{t('policy.turnoverVsTax')}</Notice>
        <Notice tone="policy">{t('policy.ibmtHoldsNoFunds')}</Notice>
        <Notice tone="privacy">{t('policy.noAutoPublication')}</Notice>
      </div>

      <DataState query={bookings} skeleton="cards" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
        {() => (
          <div className="grid gap-6 lg:grid-cols-2">
            {bookings.items.map((booking) => {
              const record = deposit.status === 'success' && deposit.result?.booking_id === booking.id ? deposit.result : null;
              const currentDeposit = record ? record.deposit : booking.deposit;
              const currentBalance = record ? record.balance : booking.balance;

              return (
                <SectionCard
                  key={booking.id}
                  title={booking.reference}
                  description={tt(booking.counterparty_name)}
                  actions={<StatusBadge status={booking.status} />}
                  footer={
                    <div className="flex flex-wrap items-center gap-3">
                      <label htmlFor={`deposit-${booking.id}`} className="sr-only">
                        {t('term.deposit')}
                      </label>
                      <TextInput
                        id={`deposit-${booking.id}`}
                        className="ibmt-num h-10 w-[150px] text-[13px]"
                        placeholder="TZS"
                        inputMode="numeric"
                        value={amounts[booking.id] || ''}
                        onChange={(event) => setAmounts({ ...amounts, [booking.id]: event.target.value.replace(/[^0-9]/g, '') })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ibmt-tap"
                        disabled={deposit.saving}
                        onClick={() => deposit.run({ id: booking.id, amount: Number(amounts[booking.id] || 0) })}
                      >
                        {t('term.deposit')}
                      </Button>
                      <FormStatus mutation={record ? deposit : { status: 'idle' }} />
                    </div>
                  }
                >
                  <AmountRow label={t('common.total')} amount={booking.agreed_total} />
                  <AmountRow label={t('term.deposit')} amount={currentDeposit} />
                  <AmountRow label={t('rent.rentDue')} amount={currentBalance} tone="total" />
                  <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{tt(booking.agreed_terms)}</p>
                  <div className="mt-4">
                    <Timeline
                      dense
                      items={(booking.deliverables || []).map((item) => ({ id: item.id, label: item.label, statusKey: item.state }))}
                    />
                  </div>
                  <p className="ibmt-num mt-4 text-[11px] text-muted-foreground">
                    {formatDate(booking.event_date, lang)} · {booking.counterparty_ref}
                  </p>
                </SectionCard>
              );
            })}
          </div>
        )}
      </DataState>

      <SectionCard title={t('term.booking')} description={t('policy.ibmtHoldsNoFunds')}>
        <div className="flex flex-wrap items-center gap-3">
          <Money amount={0} note={t('policy.tenantPaysExact')} />
        </div>
        <Notice tone="policy" className="mt-4">
          {t('policy.noTenantFee')}
        </Notice>
      </SectionCard>
    </div>
  );
}