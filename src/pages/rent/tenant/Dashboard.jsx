import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import PolicyList from '@/components/ibmt/PolicyList';
import TenantFeeNote from '@/components/rent/TenantFeeNote';
import AllocationBreakdown from '@/components/ibmt/AllocationBreakdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';

export default function TenantDashboard() {
  const { t, tt, lang } = useT();
  const tenancies = useIBMTQuery('listTenancies', { scope: 'tenant', limit: 4 });
  const payments = useIBMTQuery('listRentPayments', { scope: 'tenant', limit: 6 });
  const deposits = useIBMTQuery('listDeposits', { limit: 4 });
  const notices = useIBMTQuery('listNotices', { limit: 4 });
  const [paymentId, setPaymentId] = useState(null);
  const selected = (payments.items || []).find((payment) => payment.id === paymentId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.dashboard')}
        lede={t('landing.forCitizensBody')}
        meta={[{ label: t('policy.tenantPaysExact') }, { label: t('policy.depositCustody') }]}
      />

      <div>
        <TenantFeeNote />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Notice tone="policy">{t('policy.ibmtHoldsNoFunds')}</Notice>
        <Notice tone="policy">{t('policy.noTenantFee')}</Notice>
        <Notice tone="caution">{t('policy.checklistNotRelease')}</Notice>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t('term.tenancy')} description={t('policy.oneTenancyOneUnit')}>
          <DataState query={tenancies} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <ul className="space-y-3">
                {tenancies.items.map((tenancy) => (
                  <li key={tenancy.id} className="rounded-md border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="ibmt-num text-[13px] font-semibold text-navy">{tenancy.unit_ref}</p>
                      <StatusBadge status={tenancy.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <dt className="ibmt-kicker">{t('common.date')}</dt>
                        <dd className="ibmt-num mt-1 text-[12px]">{formatDate(tenancy.start_date, lang)}</dd>
                      </div>
                      <div>
                        <dt className="ibmt-kicker">{t('rent.rentDue')}</dt>
                        <dd className="ibmt-num mt-1 text-[12px]">{formatDate(tenancy.paid_through, lang)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <Money amount={tenancy.monthly_rent} note={t('rent.rentAmount')} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </SectionCard>

        <SectionCard title={t('rent.deposit')} description={t('policy.depositCustody')}>
          <DataState query={deposits} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <ul className="space-y-3">
                {deposits.items.map((deposit) => (
                  <li key={deposit.id} className="rounded-md border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="ibmt-num text-[13px] font-semibold text-navy">{deposit.unit_ref}</p>
                      <StatusBadge status={deposit.custody_state} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Money amount={deposit.amount} />
                      <span className="ibmt-hint">{tt(deposit.custodian)}</span>
                    </div>
                    <p className="ibmt-hint mt-2">{t(deposit.note)}</p>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </SectionCard>
      </div>

      <SectionCard title={t('nav.pay')} description={t('policy.tenantPaysExact')}>
        <DataState query={payments} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <DataTable
              columns={[
                { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num' },
                { key: 'period_months', header: t('rent.period'), render: (row) => t('rent.months', { count: row.period_months }) },
                { key: 'tenant_total', header: t('rent.tenantTotal'), align: 'right', render: (row) => <Money amount={row.tenant_total} /> },
                { key: 'state', header: t('common.status'), render: (row) => <StatusBadge status={row.state} /> },
                {
                  key: 'action',
                  header: '',
                  align: 'right',
                  render: (row) => (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPaymentId(row.id)}>
                      {t('rent.allocation')}
                    </Button>
                  ),
                },
              ]}
              rows={payments.items}
            />
          )}
        </DataState>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t('term.notice')} description={t('policy.humanReviewOnly')}>
          <DataState query={notices} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
            {() => (
              <ul className="space-y-3">
                {notices.items.map((notice) => (
                  <li key={notice.id} className="rounded-md border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="ibmt-num text-[12px] font-semibold text-navy">{notice.unit_ref}</p>
                      <StatusBadge status={notice.status} />
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{tt(notice.body)}</p>
                    <p className="ibmt-num mt-2 text-[11px] text-muted-foreground">
                      {t('rent.responseDue')}: {formatDate(notice.response_due, lang)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </SectionCard>

        <PolicyList
          keys={['policy.tenantPaysExact', 'policy.noTenantFee', 'policy.ibmtHoldsNoFunds', 'policy.depositCustody', 'policy.checklistNotRelease']}
        />
      </div>

      <Dialog open={Boolean(paymentId)} onOpenChange={(open) => !open && setPaymentId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="ibmt-num">{selected?.reference || t('states.loadingTitle')}</DialogTitle>
          </DialogHeader>
          <AllocationBreakdown payment={selected} />
        </DialogContent>
      </Dialog>
    </div>
  );
}