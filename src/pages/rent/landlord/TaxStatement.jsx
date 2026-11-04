import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError, todayIso } from '@/lib/r4';

/**
 * Indicative only: the figures come from confirmed rent records and the rule
 * that is in force. Nothing here is a tax assessment or a filing.
 */
export default function LandlordTaxStatement() {
  const [range, setRange] = useState({ from: `${new Date().getFullYear()}-01-01`, to: todayIso() });
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (from, to) => {
    setBusy(true);
    setError('');
    try {
      const result = await callFn('landlordTaxStatement', { from, to });
      setData(result);
    } catch (err) {
      setError(fnError(err));
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
        kicker="Taarifa ya kodi"
        title="Taarifa ya kodi (makadirio)"
        lede="Kodi inayokadiriwa kutoka kwenye rekodi za kodi zilizothibitishwa. Hii si tathmini ya kodi wala malipo."
        actions={
          <Button type="button" variant="outline" className="ibmt-tap ibmt-no-print gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Chapisha
          </Button>
        }
      />

      <SectionCard title="Kipindi" className="ibmt-no-print">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kuanzia">
            {(props) => (
              <TextInput {...props} type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} />
            )}
          </Field>
          <Field label="Hadi">
            {(props) => (
              <TextInput {...props} type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} />
            )}
          </Field>
        </div>
      </SectionCard>

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      {busy && <p className="text-[13px] text-muted-foreground">Inakokotoa…</p>}

      {!busy && data && !statement && (
        <Notice tone="neutral" title="Hakuna kanuni ya kodi">
          {data.note?.sw || 'Hakuna kanuni ya kodi iliyowekwa bado, kwa hiyo hakuna kiasi kinachoonyeshwa.'}
        </Notice>
      )}

      {!busy && statement && (
        <div className="space-y-6">
          <SectionCard
            title={`Taarifa ${statement.from} – ${statement.to}`}
            description={`Rekodi ${statement.records} zilizothibitishwa · miezi ${statement.months}`}
            actions={
              <StatusBadge
                status={data.rule?.placeholder ? 'pending' : 'confirmed'}
                label={data.rule?.placeholder ? 'Kanuni ya majaribio' : 'Kanuni iliyothibitishwa'}
              />
            }
          >
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-[13px] text-muted-foreground">Kodi iliyothibitishwa</dt>
                <dd>
                  <Money amount={statement.gross_rent} strong />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-[13px] text-muted-foreground">Msamaha wa kipindi</dt>
                <dd>
                  <Money amount={statement.exemption_for_period} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-[13px] text-muted-foreground">Kiasi kinachotozwa</dt>
                <dd>
                  <Money amount={statement.taxable_amount} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[13px] font-medium">Kodi inayokadiriwa · {statement.rate_percent}%</dt>
                <dd>
                  <Money amount={statement.indicative_tax} strong />
                </dd>
              </div>
            </dl>
            <p className="ibmt-hint mt-4">{data.method?.sw}</p>
          </SectionCard>

          {data.placeholder_notice && (
            <Notice tone="caution" title="Kanuni ya majaribio">
              {data.placeholder_notice.sw}
            </Notice>
          )}

          <Notice tone="policy">{data.disclaimer?.sw || data.disclaimer?.en}</Notice>
        </div>
      )}
    </div>
  );
}