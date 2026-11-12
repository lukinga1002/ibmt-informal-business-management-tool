import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, FileSearch, Landmark, Receipt, ShieldQuestion } from 'lucide-react';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

const KINDS = [
  { value: 'lease', Icon: FileSearch },
  { value: 'receipt', Icon: Receipt },
  { value: 'agent', Icon: BadgeCheck },
  { value: 'unit', Icon: Landmark },
];

const SCOPES = ['rental', 'sale', 'both'];
const STATUSES = ['signed', 'awaiting_signature', 'awaiting_tenant', 'draft', 'terminated', 'amended', 'confirmed', 'pending', 'disputed', 'approved', 'suspended', 'revoked', 'rejected', 'verified', 'registered', 'evidence_pending', 'unverified'];

/**
 * Public checks: a lease, a receipt, an agent licence and a registered unit.
 * Status only. No name, address, house number or phone number is returned, and
 * the lookup is rate limited.
 */
export default function Verify() {
  const { t, tt } = useT();
  const [kind, setKind] = useState('lease');
  const [reference, setReference] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const check = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await callFn('publicCheck', { kind, reference: reference.trim() });
      setResult(data);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <div className="mx-auto max-w-2xl">
          <p className="ibmt-kicker">{t('verifyPublic.kicker')}</p>
          <h1 className="ibmt-display mt-2 text-navy">{t('verifyPublic.title')}</h1>
          <p className="ibmt-lede mt-2">{t('verifyPublic.lede')}</p>

          <div className="mt-6 grid gap-2 sm:grid-cols-4">
            {KINDS.map((item) => {
              const Selected = item.value === kind;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setKind(item.value);
                    setResult(null);
                    setError(null);
                  }}
                  className={`ibmt-tap flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[12px] font-medium ${
                    Selected ? 'border-navy bg-navy text-primary-foreground' : 'border-border bg-card text-foreground'
                  }`}
                >
                  <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t(`verifyPublic.kind.${item.value}`)}
                </button>
              );
            })}
          </div>

          <div className="ibmt-panel mt-4 space-y-4 px-5 py-5">
            <Field label={t(`verifyPublic.number.${kind}`)} hint={t(`verifyPublic.hint.${kind}`)} required>
              {(props) => (
                <TextInput
                  {...props}
                  className={`${props.className} ibmt-num`}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  autoComplete="off"
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="text-[12px] font-medium text-destructive">
                {errorText(error)}
              </p>
            )}

            <Button
              type="button"
              className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
              onClick={check}
              disabled={busy || !reference.trim()}
            >
              {busy ? t('verifyPublic.checking') : t('verifyPublic.check')}
            </Button>
          </div>

          {result && (
            <div className="mt-4">
              {!result.found ? (
                <Notice tone="danger" title={t('verifyPublic.noneTitle')}>
                  {t(`verifyPublic.none.${kind}`)}
                </Notice>
              ) : (
                <Notice
                  tone={result.valid ? 'positive' : 'caution'}
                  title={result.valid ? t('verifyPublic.valid') : t('verifyPublic.notVerified')}
                >
                  <p className="font-medium">{STATUSES.includes(result.status) ? t(`verifyPublic.status.${result.status}`) : result.status}</p>
                  {result.kind === 'receipt' && result.period_month && <p className="ibmt-num">{t('verifyPublic.period', { period: result.period_month })}</p>}
                  {result.kind === 'agent' && result.council && <p>{t('verifyPublic.council', { council: result.council })}</p>}
                  {result.kind === 'agent' && result.scope && <p>{t('verifyPublic.scope', { scope: t(`verifyPublic.scopes.${SCOPES.includes(result.scope) ? result.scope : 'rental'}`) })}</p>}
                  {result.kind === 'lease' && result.template_label && <p>{tt(result.template_label)}</p>}
                  <p className="mt-2 text-[12px] text-muted-foreground">{result.disclaimer ? tt(result.disclaimer) : null}</p>
                </Notice>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
            <Link to="/" className="font-medium text-gold-ink underline underline-offset-4">
              {t('leasePublic.home')}
            </Link>
            <span className="inline-flex items-center gap-1">
              <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
              {t('verifyPublic.rateLimited')}
            </span>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}