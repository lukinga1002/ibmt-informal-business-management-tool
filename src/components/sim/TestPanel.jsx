import { useT } from '@/i18n/I18nContext';
import SectionCard from '@/components/ibmt/SectionCard';
import AsyncBlock from '@/components/gov/AsyncBlock';
import { Check, X } from 'lucide-react';

/** Every worked example, run on the server, with its expected and actual values. */
export default function TestPanel({ state }) {
  const { tt } = useT();

  return (
    <SectionCard
      title={tt({ en: 'Worked examples', sw: 'Mifano iliyohesabiwa' })}
      description={tt({
        en: 'Run against the engine each time this page opens: the four worked examples, rounding, the ledger balance, the state machine, refunds and masking.',
        sw: 'Hufanywa kwenye injini kila ukurasa unapofunguliwa: mifano minne, kuzungusha, usawa wa daftari, mashine ya hali, marejesho na kuficha taarifa.',
      })}
    >
      <AsyncBlock state={state}>
        {(data) => {
          const rows = [
            ...data.pure.cases.map((item) => ({ ...item, group: tt({ en: 'Split and ledger', sw: 'Mgawanyo na daftari' }) })),
            ...data.signature.cases.map((item) => ({ ...item, group: tt({ en: 'Callback signature', sw: 'Sahihi ya taarifa' }) })),
          ];
          return (
            <div>
              <p className="text-[13px]">
                <span className={data.summary.failed === 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                  {data.summary.passed} / {data.summary.passed + data.summary.failed}
                </span>{' '}
                {tt({ en: 'checks passed', sw: 'vipimo vimepita' })}
              </p>
              <ul className="mt-3 divide-y divide-border">
                {rows.map((row) => {
                  const ok = JSON.stringify(row.expected) === JSON.stringify(row.actual);
                  return (
                    <li key={row.name} className="flex items-start gap-3 py-2">
                      <span className={ok ? 'mt-0.5 text-success' : 'mt-0.5 text-destructive'}>
                        {ok ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">{row.name}</p>
                        <p className="ibmt-hint">{row.group}</p>
                        {!ok && (
                          <p className="ibmt-num mt-1 text-[11px] text-destructive">
                            {tt({ en: 'expected', sw: 'inatarajiwa' })} {JSON.stringify(row.expected)} · {tt({ en: 'got', sw: 'imepatikana' })} {JSON.stringify(row.actual)}
                          </p>
                        )}
                        {row.detail && (
                          <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">
                            {tt({ en: 'debits', sw: 'debiti' })} {row.detail.debits?.toLocaleString('en-US')} = {tt({ en: 'credits', sw: 'krediti' })} {row.detail.credits?.toLocaleString('en-US')}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }}
      </AsyncBlock>
    </SectionCard>
  );
}