import { useT } from '@/i18n/I18nContext';
import Money, { AmountRow } from './Money';
import StatusBadge from './StatusBadge';
import Notice from './Notice';
import PolicyList from './PolicyList';
import DemoBadge from './DemoBadge';

const STATUS_KEYS = ['payment_confirmation', 'tax_remittance', 'landlord_settlement', 'deposit_custody'];
const STATUS_LABEL = {
  payment_confirmation: 'rent.statusPayment',
  tax_remittance: 'rent.statusTax',
  landlord_settlement: 'rent.statusSettlement',
  deposit_custody: 'rent.statusCustody',
};

/**
 * Allocation of a rent payment, exactly as the backend returns it.
 *
 * The interface never computes tax, commission or settlement, and it never
 * shows remittance as complete because a split was calculated: the four
 * statuses are displayed separately, from their own backend values.
 */
export default function AllocationBreakdown({ payment, showStatements = true, className }) {
  const { t } = useT();
  if (!payment) return null;

  const { allocation, statuses = {}, period_months: months, illustrative } = payment;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-[14px] font-semibold text-navy">{t('rent.allocation')}</h3>
        <span className="ibmt-num rounded-sm border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
          {t('rent.months', { count: months })}
        </span>
        {payment.new_tenancy ? (
          <span className="rounded-sm border border-navy/20 bg-navy/[0.05] px-2 py-1 text-[11px] font-medium text-navy">{t('rent.newTenancy')}</span>
        ) : (
          <span className="rounded-sm border border-gold/50 bg-gold-soft px-2 py-1 text-[11px] font-medium text-gold-ink">{t('rent.renewal')}</span>
        )}
        {illustrative && <DemoBadge variant="chip" />}
      </div>

      <div className="mt-3">
        <AmountRow label={t('rent.rentAmount')} amount={payment.rent_amount} />
        <AmountRow label={t('rent.tax')} amount={allocation?.tax} noteKey="policy.allocationTax" />
        <AmountRow label={t('rent.commission')} amount={allocation?.commission} noteKey="policy.allocationCommission" />
        <AmountRow label={t('rent.settlement')} amount={allocation?.landlord_settlement} noteKey="policy.allocationSettlement" tone="total" />
        {payment.deposit_amount > 0 && <AmountRow label={t('rent.deposit')} amount={payment.deposit_amount} noteKey="policy.depositCustody" />}
        {payment.tenant_total !== undefined && <AmountRow label={t('rent.tenantTotal')} amount={payment.tenant_total} noteKey="policy.tenantPaysExact" tone="total" />}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {STATUS_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
            <span className="text-[12px] font-medium text-muted-foreground">{t(STATUS_LABEL[key])}</span>
            <StatusBadge status={statuses[key] || 'not_connected'} label={t(`status.${statuses[key] || 'not_connected'}`)} />
          </div>
        ))}
      </div>

      <Notice tone="caution" className="mt-4">
        {t('rent.statusesSeparate')}
      </Notice>

      {showStatements && payment.statements && <PolicyList keys={payment.statements} className="mt-4" />}

      {payment.renewal_example && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-3">
          <p className="ibmt-kicker">{t('rent.renewal')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span>{t('rent.commissionZero')}</span>
            <Money amount={payment.renewal_example.landlord_settlement} note={t('rent.settlement')} />
          </div>
        </div>
      )}

      {payment.allocation_note && <p className="ibmt-hint mt-3">{t(payment.allocation_note)}</p>}
    </div>
  );
}