import { base44 } from '@/api/base44Client';
import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useFn } from '@/hooks/useFn';
import SectionCard from '@/components/ibmt/SectionCard';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import Field, { SelectControl } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { SPLIT_LABEL } from '@/lib/money';

/** The split, computed on the server from rates, never in the browser. */
export default function SplitPanel({ onStart, busy = false }) {
  const { tt } = useT();
  const [rentTotal, setRentTotal] = useState(3000000);
  const [months, setMonths] = useState(6);
  const [monthlyRent, setMonthlyRent] = useState(500000);
  const [deposit, setDeposit] = useState(0);
  const [newTenancy, setNewTenancy] = useState(true);
  const [tenancyId,setTenancyId]=useState('');
  const [councils,setCouncils] = useState([]);
  const [councilId,setCouncilId] = useState('');
  const [error,setError] = useState('');
  useEffect(()=>{
    base44.entities.Council.list('name',500).then(page=>setCouncils(Array.isArray(page)?page:page.items || []))
      .catch(()=>setError('Imeshindikana kupakia halmashauri / Could not load councils'));
  },[]);

  const quote = useFn('simPayment', {
    action: 'quote',
    rent_total: rentTotal,
    months,
    monthly_rent: monthlyRent,
    new_tenancy: newTenancy,
    deposit_amount: deposit,
    council_id: councilId,
    tenancy_id: tenancyId,
  });

  return (
    <SectionCard
      title={tt({ en: 'Split engine', sw: 'Injini ya mgawanyo' })}
      description={tt({
        en: 'Simulation / Majaribio: council service fee, agent commission, partner charge and landlord remainder. Every remainder from rounding goes to the landlord.',
        sw: 'Simulation / Majaribio: ada ya halmashauri, kamisheni ya wakala, ada ya mshirika na salio la mmiliki. Salio lolote la kuzungusha huenda kwa mmiliki.',
      })}
      actions={<Calculator className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tt({ en: 'Rent for the period (TZS)', sw: 'Kodi ya kipindi (TZS)' })} type="number" min="1" value={rentTotal} onChange={(event) => setRentTotal(Number(event.target.value))} />
        <Field label={tt({ en: 'Months covered', sw: 'Miezi' })} type="number" min="1" value={months} onChange={(event) => setMonths(Number(event.target.value))} />
        <Field label={tt({ en: 'Monthly rent (TZS)', sw: 'Kodi ya mwezi (TZS)' })} type="number" min="1" value={monthlyRent} onChange={(event) => setMonthlyRent(Number(event.target.value))} />
        <Field label={tt({ en: 'Deposit on the first payment (TZS)', sw: 'Amana kwenye malipo ya kwanza (TZS)' })} type="number" min="0" value={deposit} onChange={(event) => setDeposit(Number(event.target.value))} hint={tt({ en: 'Ignored on a renewal.', sw: 'Haizingatiwi kwenye upya.' })} />
        <Field label={tt({en:'Council',sw:'Halmashauri'})}>
          {props=><SelectControl {...props} value={councilId} onChange={e=>setCouncilId(e.target.value)}>
            <option value="">Hatua 1 / Record only</option>
            {councils.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectControl>}
        </Field>
        <Field label="Rejea ya tenancy / Registered tenancy ID" value={tenancyId} onChange={e=>setTenancyId(e.target.value)} />
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={newTenancy} onChange={(event) => setNewTenancy(event.target.checked)} className="h-4 w-4" />
            {tt({ en: 'New tenancy (agent commission applies)', sw: 'Upangaji mpya (kamisheni inatumika)' })}
          </label>

        </div>
      </div>

      <div className="mt-6">
        <AsyncBlock state={quote}>
          {(data) => (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-md border border-border">
                {data.split.runs && data.fee_status === 'proposed' && <p>Ada inayopendekezwa (majaribio) / Proposed fee (simulation)</p>}
                {!data.split.runs && (
                  <p className="border-b border-border bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground">
                    {tt(data.split.note)}
                  </p>
                )}
                {data.split.lines.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                    {tt({ en: 'No split runs at this stage.', sw: 'Hakuna mgawanyo katika hatua hii.' })}
                  </p>
                ) : (
                  data.split.lines.map((line) => (
                    <div key={line.key} className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
                      <div>
                        <p className="text-[13px] font-medium">{tt(SPLIT_LABEL[line.key] || { en: line.key, sw: line.key })}</p>
                        <p className="ibmt-hint">{line.basis}</p>
                      </div>
                      <Money amount={line.amount} strong={line.key === 'landlord_remainder'} />
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-3">
                <div className="rounded-md border border-navy/20 bg-navy/[0.03] px-4 py-3">
                  <p className="ibmt-kicker">{tt({ en: 'Tenant pays exactly', sw: 'Mpangaji hulipa kwa hakika' })}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <Money amount={data.split.tenant_pays} strong />
                    <span className="text-[11px] text-muted-foreground">
                      {tt({ en: 'rent plus deposit', sw: 'kodi pamoja na amana' })}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    {tt({ en: 'Never a fee, a viewing charge or a commission.', sw: 'Kamwe si ada, malipo ya kuona, wala kamisheni.' })}
                  </p>
                </div>
                <Notice tone="privacy">
                  {tt({ en: 'Rates used:', sw: 'Viwango vilivyotumika:' })}{' '}
                  <span className="ibmt-num">
                    Partner / Mshirika {((data.rates_used.partner_charge_rate || 0) * 100).toFixed(2)}%
                  </span>
                  <span className="mt-1 block text-[11px]">{data.rates_source} · {data.policy_version || '—'}</span>
                </Notice>
                <p className={data.split.balanced ? 'text-[12px] font-medium text-success' : 'text-[12px] font-medium text-destructive'}>
                  {data.split.balanced
                    ? tt({ en: 'The lines add up to the rent.', sw: 'Mistari inajumlisha hadi kodi.' })
                    : tt({ en: 'The lines do not add up. Nothing may be written.', sw: 'Mistari haijumlishi. Hakuna kinachoweza kuandikwa.' })}
                </p>
              </div>
            </div>
          )}
        </AsyncBlock>
      </div>

      {onStart && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button
            type="button"
            className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            disabled={busy}
            onClick={() => onStart({ rent_total: rentTotal, months, monthly_rent: monthlyRent, new_tenancy: newTenancy, deposit_amount: deposit, council_id: councilId, tenancy_id: tenancyId })}
          >
            {busy ? tt({ en: 'Starting…', sw: 'Inaanza…' }) : tt({ en: 'Start a simulated payment', sw: 'Anzisha malipo ya majaribio' })}
          </Button>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {tt({ en: 'This creates a simulated payment in the initiated state. No money moves.', sw: 'Hii huunda malipo ya majaribio katika hali ya kuanza. Hakuna fedha zinazohamia.' })}
          </p>
        </div>
      )}
    </SectionCard>
  );
}