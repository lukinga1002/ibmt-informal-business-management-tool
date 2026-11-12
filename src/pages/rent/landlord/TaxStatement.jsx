import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText, todayIso } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

/**
 * Indicative only: the figures come from confirmed rent records and the rule
 * that is in force. Nothing here is a tax assessment or a filing.
 */
export default function LandlordTaxStatement() {
  const { t, tt } = useT();
  const [range, setRange] = useState({ from: `${new Date().getFullYear()}-01-01`, to: todayIso() });
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (from, to) => {
    setBusy(true);
    setError(null);
    try {
      const result = await callFn('landlordTaxStatement', { from, to });
      setData(result);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(range.from, range.to);
  }, [load, range.from, range.to]);

  const statement = data?.statement;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('moneyPage.taxStatement')}
        title={t('tax.title')}
        lede={t('tax.lede')}
        actions={
          <Button type="button" variant="outline" className="ibmt-tap ibmt-no-print gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t('common.print')}
          </Button>
        }
      />

      <SectionCard title={t('tax.period')} className="ibmt-no-print">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('tax.from')}>
            {(props) => (
              <TextInput {...props} type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} />
            )}
          </Field>
          <Field label={t('tax.to')}>
            {(props) => (
              <TextInput {...props} type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} />
            )}
          </Field>
        </div>
      </SectionCard>

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {errorText(error)}
        </p>
      )}

      {busy && <p className="text-[13px] text-muted-foreground">{t('tax.calculating')}</p>}

      {!busy && data && !statement && (
        <Notice tone="neutral" title={t('tax.noRuleTitle')}>
          {data.note ? tt(data.note) : t('tax.noRuleBody')}
        </Notice>
      )}

      {!busy && statement && (
        <div className="space-y-6">
          <SectionCard
            title={t('tax.statement', { from: statement.from, to: statement.to })}
            description={t('tax.summary', { records: statement.records, months: statement.months })}
            actions={
              <StatusBadge
                status={data.rule?.placeholder ? 'pending' : 'confirmed'}
                label={data.rule?.placeholder ? t('tax.placeholderRule') : t('tax.confirmedRule')}
              />
            }
          >
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-[13px] text-muted-foreground">{t('receipt.confirmedRent')}</dt>
                <dd>
                  <Money amount={statement.gross_rent} strong />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-[13px] text-muted-foreground">{t('tax.exemption')}</dt>
                <dd>
                  <Money amount={statement.exemption_for_period} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-[13px] text-muted-foreground">{t('tax.taxable')}</dt>
                <dd>
                  <Money amount={statement.taxable_amount} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[13px] font-medium">{t('tax.indicative', { rate: statement.rate_percent })}</dt>
                <dd>
                  <Money amount={statement.indicative_tax} strong />
                </dd>
              </div>
            </dl>
            <p className="ibmt-hint mt-4">{data.method ? tt(data.method) : null}</p>
          </SectionCard>

          {data.placeholder_notice && (
            <Notice tone="caution" title={t('tax.placeholderRule')}>
              {tt(data.placeholder_notice)}
            </Notice>
          )}

          <Notice tone="policy">{data.disclaimer ? tt(data.disclaimer) : null}</Notice>
        </div>
      )}
    </div>
  );
}