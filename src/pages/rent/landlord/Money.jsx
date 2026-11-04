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
import AllocationBreakdown from '@/components/ibmt/AllocationBreakdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

export default function LandlordMoney() {
  const { t, tt, lang } = useT();
  const payments = useIBMTQuery('listRentPayments', { scope: 'landlord', limit: 8 });
  const deposits = useIBMTQuery('listDeposits', { limit: 8 });

  const [paymentId, setPaymentId] = useState(null);
  const selected = (payments.items || []).find((payment) => payment.id === paymentId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.money')}
        lede={t('policy.ibmtHoldsNoFunds')}
        meta={[{ label: t('rent.statusesSeparate') }, { label: t('policy.withholdingDesign') }]}
      />

      <Tabs defaultValue="payments">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="payments" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('nav.pay')}
          </TabsTrigger>
          <TabsTrigger value="deposits" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.deposit')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <SectionCard title={t('nav.pay')} description={t('rent.statusesSeparate')}>
            <DataState query={payments} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <>
                  <DataTable
                    columns={[
                      { key: 'reference', header: t('common.reference'), className: 'ibmt-num font-medium' },
                      { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num' },
                      { key: 'period_months', header: t('rent.period'), render: (row) => t('rent.months', { count: row.period_months }) },
                      { key: 'rent_amount', header: t('rent.rentAmount'), align: 'right', render: (row) => <Money amount={row.rent_amount} /> },
                      { key: 'state', header: t('common.status'), render: (row) => <StatusBadge status={row.state} /> },
                      { key: 'paid_at', header: t('common.date'), className: 'ibmt-num', render: (row) => (row.paid_at ? formatDate(row.paid_at, lang) : '—') },
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
                  {payments.hasMore && (
                    <Button type="button" variant="outline" className="ibmt-tap mt-4 w-full" onClick={payments.loadMore} disabled={payments.loadingMore}>
                      {payments.loadingMore ? t('common.loading') : t('common.loadMore')}
                    </Button>
                  )}
                </>
              )}
            </DataState>
          </SectionCard>
        </TabsContent>

        <TabsContent value="deposits" className="mt-4">
          <SectionCard title={t('rent.deposit')} description={t('policy.depositCustody')}>
            <DataState query={deposits} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
              {() => (
                <DataTable
                  columns={[
                    { key: 'unit_ref', header: t('term.unit'), className: 'ibmt-num font-medium' },
                    { key: 'tenant_name', header: t('term.tenants') },
                    { key: 'amount', header: t('common.amount'), align: 'right', render: (row) => <Money amount={row.amount} /> },
                    { key: 'custody_state', header: t('rent.statusCustody'), render: (row) => <StatusBadge status={row.custody_state} /> },
                    { key: 'checklist_state', header: t('rent.checklist'), render: (row) => <StatusBadge status={row.checklist_state} /> },
                    { key: 'custodian_confirmation_state', header: t('rent.release'), hideBelow: 'lg', render: (row) => <StatusBadge status={row.custodian_confirmation_state} /> },
                  ]}
                  rows={deposits.items}
                />
              )}
            </DataState>
            <Notice tone="caution" className="mt-4">
              {t('policy.checklistNotRelease')}
            </Notice>
          </SectionCard>
        </TabsContent>

      </Tabs>

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