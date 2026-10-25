import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation } from '@/api/hooks';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import StatusBadge from '@/components/ibmt/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

/**
 * USSD simulator for the rent service: pay rent, balance due, verify receipt,
 * verify agent licence. Session state is held by the mock backend; in API mode
 * the same state machine lives on the real gateway.
 */
export default function Ussd() {
  const { t, tt } = useT();
  const [sessionId] = useState(() => `ussd-${Math.random().toString(36).slice(2, 8)}`);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState([]);
  const [options, setOptions] = useState([]);
  const [ended, setEnded] = useState(false);
  const session = useIBMTMutation('ussdSession');

  const send = async (value) => {
    const payload = await session.run({ sessionId, input: value });
    if (!payload) return;
    setLines((prev) => [...prev, ...(payload.lines || [])]);
    setOptions(payload.options || []);
    if (payload.ended) setEnded(true);
    setInput('');
  };

  const keypad = (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setInput((prev) => (prev + key).slice(0, 12))}
          className="ibmt-tap-square ibmt-num rounded-md border border-border bg-card text-[16px] font-semibold text-navy transition-colors hover:bg-muted"
        >
          {key}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <PageHeader kicker={t('brand.rent')} title={t('ussd.title')} lede={t('ussd.lede')} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="mx-auto w-full max-w-[320px]">
            <div className="rounded-[20px] border border-border bg-navy-deep p-3 shadow-lg">
              <div className="rounded-[14px] bg-cream/95 p-4">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-navy/60">
                  <span>{t('ussd.network')}</span>
                  <span>{t('ussd.cost')}</span>
                </div>
                <div
                  aria-live="polite"
                  className="mt-3 min-h-[190px] max-h-[240px] overflow-y-auto rounded-md border border-navy/15 bg-card p-3 font-mono text-[12px] leading-relaxed text-navy"
                >
                  <p className="font-semibold">{t('ussd.menuTitle')}</p>
                  {lines.length === 0 && <p className="mt-2 text-navy/70">{t('ussd.note')}</p>}
                  {lines.map((line, index) => (
                    <p key={index} className="mt-2">
                      {tt(line.text)}
                    </p>
                  ))}
                  {options.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {options.map((option) => (
                        <li key={option.key}>
                          {option.key}. {tt(option.label)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    aria-label={t('ussd.send')}
                    value={input}
                    onChange={(event) => setInput(event.target.value.replace(/[^0-9*#]/g, ''))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && input) send(input);
                    }}
                    className="ibmt-num ibmt-tap w-full rounded-md border border-navy/20 bg-card px-3 text-[15px]"
                    placeholder="—"
                  />
                  <Button type="button" className="ibmt-tap-square shrink-0 px-0 bg-navy text-primary-foreground" onClick={() => send(input || '')} disabled={session.saving}>
                    {t('ussd.send')}
                  </Button>
                </div>
              </div>
              <div className="mt-3">{keypad}</div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="ibmt-tap flex-1 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => {
                    setLines([]);
                    setOptions([]);
                    setEnded(false);
                    send('');
                  }}
                >
                  {t('ussd.restart')}
                </Button>
              </div>
            </div>
            {ended && <p className="ibmt-hint mt-3 text-center">{t('ussd.sessionNote')}</p>}
          </div>

          <aside className="space-y-4">
            {session.status === 'error' && (
              <Notice tone="danger" title={t('states.errorTitle')}>
                {session.error?.message || t('states.errorBody')}
                <div className="mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => session.retry({ sessionId, input: '' })}>
                    {t('common.retry')}
                  </Button>
                </div>
              </Notice>
            )}
            <Notice tone="caution" title={t('common.demonstration')}>
              {t('ussd.note')}
            </Notice>
            <div className="ibmt-panel px-5 py-4">
              <h2 className="font-heading text-[14px] font-semibold text-navy">{t('rent.ussdMenu')}</h2>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                <li>1 · {t('nav.pay')}</li>
                <li>2 · {t('rent.rentDue')}</li>
                <li>3 · {t('verify.tabReceipt')}</li>
                <li>4 · {t('verify.tabAgent')}</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status="paid" />
                <StatusBadge status="withheld" />
                <StatusBadge status="not_connected" />
              </div>
              <p className={cn('ibmt-hint mt-3')}>{t('rent.statusesSeparate')}</p>
            </div>
            <Notice tone="policy">{t('policy.ibmtHoldsNoFunds')}</Notice>
            <Notice tone="policy">{t('policy.noTenantFee')}</Notice>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}