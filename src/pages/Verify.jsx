import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, FileSearch, Landmark, Receipt, ShieldQuestion } from 'lucide-react';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';

const KINDS = [
  { value: 'lease', label: 'Mkataba', hint: 'Namba ya mkataba au namba ya QR', Icon: FileSearch },
  { value: 'receipt', label: 'Risiti', hint: 'Namba ya risiti, mfano IBMT-RCT-2026-000021', Icon: Receipt },
  { value: 'agent', label: 'Wakala', hint: 'Namba ya leseni, mfano IBMT-AGL-2026-0014', Icon: BadgeCheck },
  { value: 'unit', label: 'Nyumba', hint: 'Namba ya nyumba, mfano IBMT-UNIT-2026-002315', Icon: Landmark },
];

const LABEL = {
  lease: 'mkataba',
  receipt: 'risiti',
  agent: 'leseni ya wakala',
  unit: 'usajili wa nyumba',
};

const SCOPE_TEXT = { rental: 'Kupangisha', sale: 'Mauzo', both: 'Kupangisha na mauzo' };

const STATUS_TEXT = {
  signed: 'Imesainiwa na pande zote',
  awaiting_signature: 'Inasubiri sahihi',
  awaiting_tenant: 'Inasubiri mpangaji',
  draft: 'Rasimu',
  terminated: 'Imefungwa',
  amended: 'Imebadilishwa',
  confirmed: 'Imethibitishwa',
  pending: 'Inasubiri uthibitisho',
  disputed: 'Imepingwa',
  approved: 'Imethibitishwa',
  suspended: 'Imesimamishwa',
  revoked: 'Imefutwa',
  rejected: 'Imekataliwa',
  verified: 'Imethibitishwa',
  registered: 'Imeandikwa',
  evidence_pending: 'Inasubiri vielelezo',
  unverified: 'Haijathibitishwa',
};

/**
 * Public checks: a lease, a receipt, an agent licence and a registered unit.
 * Status only. No name, address, house number or phone number is returned, and
 * the lookup is rate limited.
 */
export default function Verify() {
  const [kind, setKind] = useState('lease');
  const [reference, setReference] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await callFn('publicCheck', { kind, reference: reference.trim() });
      setResult(data);
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const active = KINDS.find((item) => item.value === kind);

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <div className="mx-auto max-w-2xl">
          <p className="ibmt-kicker">Ukaguzi wa umma</p>
          <h1 className="ibmt-display mt-2 text-navy">Thibitisha kumbukumbu</h1>
          <p className="ibmt-lede mt-2">
            Angalia mkataba, risiti, leseni ya wakala au usajili wa nyumba. Unapata hali pekee: hakuna jina, anwani wala
            namba ya simu.
          </p>

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
                    setError('');
                  }}
                  className={`ibmt-tap flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[12px] font-medium ${
                    Selected ? 'border-navy bg-navy text-primary-foreground' : 'border-border bg-card text-foreground'
                  }`}
                >
                  <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="ibmt-panel mt-4 space-y-4 px-5 py-5">
            <Field label={`Namba ya ${LABEL[kind]}`} hint={active?.hint} required>
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
                {error}
              </p>
            )}

            <Button
              type="button"
              className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
              onClick={check}
              disabled={busy || !reference.trim()}
            >
              {busy ? 'Inaangalia…' : 'Angalia'}
            </Button>
          </div>

          {result && (
            <div className="mt-4">
              {!result.found ? (
                <Notice tone="danger" title="Hakuna kumbukumbu">
                  Hakuna {LABEL[kind]} inayolingana na namba hiyo. Angalia namba au skana QR tena.
                </Notice>
              ) : (
                <Notice
                  tone={result.valid ? 'positive' : 'caution'}
                  title={result.valid ? 'Ni sahihi' : 'Haijathibitishwa'}
                >
                  <p className="font-medium">{STATUS_TEXT[result.status] || result.status}</p>
                  {result.kind === 'receipt' && result.period_month && <p className="ibmt-num">Kipindi: {result.period_month}</p>}
                  {result.kind === 'agent' && result.council && <p>Halmashauri: {result.council}</p>}
                  {result.kind === 'agent' && result.scope && <p>Usajili: {SCOPE_TEXT[result.scope] || SCOPE_TEXT.rental}</p>}
                  {result.kind === 'lease' && result.template_label && <p>{result.template_label.sw || result.template_label.en}</p>}
                  <p className="mt-2 text-[12px] text-muted-foreground">{result.disclaimer?.sw}</p>
                </Notice>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
            <Link to="/" className="font-medium text-gold-ink underline underline-offset-4">
              Rudi ukurasa wa mwanzo
            </Link>
            <span className="inline-flex items-center gap-1">
              <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
              Ukaguzi umepunguzwa kasi kuzuia uchakuzi wa kumbukumbu.
            </span>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}