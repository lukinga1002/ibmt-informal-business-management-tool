import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';
import JoinProfile from '@/components/rent/join/JoinProfile';
import JoinUnits from '@/components/rent/join/JoinUnits';
import JoinRent from '@/components/rent/join/JoinRent';
import ShareLinks from '@/components/rent/join/ShareLinks';
import { base44 } from '@/api/base44Client';
import { callFn, fnError } from '@/lib/r4';
import { DISCLAIMER, PILOT_COUNCILS } from '@/config/r3';

const STEPS = ['Wewe na nyumba', 'Uniti zako', 'Kodi na wapangaji'];
const first = PILOT_COUNCILS[0];

const EMPTY_UNIT = { name: '', rent_amount: '', occupied: false };

/**
 * A landlord's own way in. One short form creates the units and their reference
 * numbers, so from then on renting a unit out is a pick from a list, never a
 * retyped address. The tenant site is not opened here: tenants are recorded by
 * the landlord or the agent through Pangisha.
 */
export default function RentJoin() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    landlord_name: '',
    council_id: first.council_id,
    district: first.district,
    ward: first.wards[0],
    street: '',
    house_no: '',
  });
  const [units, setUnits] = useState([{ ...EMPTY_UNIT }]);
  const [sameRent, setSameRent] = useState(true);
  const [allTenants, setAllTenants] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then((me) => setForm((prev) => ({ ...prev, landlord_name: prev.landlord_name || me.full_name || '' })))
      .catch((err) => {
        if (err?.status === 401 || err?.response?.status === 401) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        setError(err?.message || 'Haikuweza kuthibitisha akaunti yako.');
      })
      .finally(() => setBusy(false));
  }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const patchUnit = (index, patch) => setUnits((prev) => prev.map((unit, i) => (i === index ? { ...unit, ...patch } : unit)));

  const setCount = (count) =>
    setUnits((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push({ ...EMPTY_UNIT, rent_amount: sameRent ? prev[0]?.rent_amount || '' : '' });
      return next;
    });

  const applySameRent = (value) => setUnits((prev) => prev.map((unit) => ({ ...unit, rent_amount: value })));
  const applyAllTenants = (value) => {
    setAllTenants(value);
    if (value) setUnits((prev) => prev.map((unit) => ({ ...unit, occupied: true })));
  };
  const toggleSameRent = (value) => {
    setSameRent(value);
    if (value) setUnits((prev) => prev.map((unit) => ({ ...unit, rent_amount: prev[0]?.rent_amount || '' })));
  };

  const next = () => {
    setError('');
    if (step === 0) {
      if (form.landlord_name.trim().length < 3 || form.street.trim().length < 2 || !form.house_no.trim()) {
        setError('Jaza jina lako, jina la mtaa na namba ya nyumba.');
        return;
      }
    }
    if (step === 1) {
      const names = units.map((unit) => unit.name.trim().toLowerCase());
      if (names.some((name) => name.length < 2)) {
        setError('Kila uniti linahitaji jina. Tumia jina unalolitambua.');
        return;
      }
      if (new Set(names).size !== names.length) {
        setError('Unit mbili haziwezi kuwa na jina moja. Badilisha moja.');
        return;
      }
    }
    setStep(step + 1);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = await callFn('landlordRegister', {
        landlord_name: form.landlord_name,
        district: form.district,
        ward: form.ward,
        council_id: form.council_id,
        street: form.street,
        house_no: form.house_no,
        units: units.map((unit) => ({
          name: unit.name,
          rent_amount: Number(unit.rent_amount) || 0,
          occupied: allTenants ? true : Boolean(unit.occupied),
        })),
      });
      setResult(payload);
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="ibmt-page space-y-6">
        <PageHeader
          kicker="Usajili umekamilika"
          title="Uniti zako zimesajiliwa"
          lede={`${result.landlord.street}, nyumba ${result.landlord.house_no} · ${result.landlord.ward}, ${result.landlord.district}`}
        />

        <SectionCard title="Namba za kumbukumbu" description="Kila uniti lina namba yake. Hizi ndizo utakazotumia unapopangisha.">
          <ul className="divide-y divide-border">
            {result.units.map((unit) => (
              <li key={unit.unit_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{unit.unit_name}</p>
                  <p className="ibmt-num text-[11px] text-muted-foreground">{unit.unit_ref}</p>
                </div>
                <div className="text-right">
                  <p className="ibmt-num text-[13px]">{Number(unit.rent_amount).toLocaleString('en-US')} TZS</p>
                  <p className="text-[11px] text-muted-foreground">{unit.occupancy === 'occupied' ? 'Ina mpangaji' : 'Haina mpangaji'}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <ShareLinks units={result.units} />

        <Notice tone="policy" title="Usajili si umiliki">
          {DISCLAIMER.sw} / {DISCLAIMER.en}
        </Notice>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep">
            <a href="/rent/pangisha">
              Pangisha kwa uniti hizi
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline" className="ibmt-tap">
            <a href="/rent/landlord/portfolio">Ona uniti zangu</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ibmt-page">
      <PageHeader
        kicker="Usajili wa mwenye nyumba"
        title="Jisajili na uniti zako"
        lede="Taarifa moja inatosha: wewe, nyumba, na uniti zote ulizonazo. Kila uniti linapata namba yake ya kumbukumbu."
        meta={[{ label: 'Hatua 3' }, { label: DISCLAIMER.sw }]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title={STEPS[step]}
          description={step === 2 ? 'Maswali mawili, kisha tuma.' : 'Hatua moja kwa wakati.'}
        >
          <ol className="mb-5 flex flex-wrap gap-2">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={`rounded-sm border px-2 py-1 text-[11px] font-medium ${
                  index === step ? 'border-navy bg-navy text-primary-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {index + 1}. {label}
              </li>
            ))}
          </ol>

          {step === 0 && <JoinProfile form={form} set={set} />}
          {step === 1 && <JoinUnits units={units} onCount={setCount} onRename={(index, name) => patchUnit(index, { name })} />}
          {step === 2 && (
            <JoinRent
              units={units}
              sameRent={sameRent}
              allTenants={allTenants}
              onSameRent={toggleSameRent}
              onAllRent={applySameRent}
              onAllTenants={applyAllTenants}
              onUnitRent={(index, value) => patchUnit(index, { rent_amount: value })}
              onUnitOccupied={(index, value) => patchUnit(index, { occupied: value })}
            />
          )}

          {error && (
            <p role="alert" className="mt-4 text-[12px] font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setStep(step - 1)} disabled={busy}>
                Rudi
              </Button>
            )}
            {step < 2 && (
              <Button type="button" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={next}>
                Endelea
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={submit}
                disabled={busy}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {busy ? 'Inasajili…' : 'Sajili uniti zangu'}
              </Button>
            )}
          </div>
        </SectionCard>

        <aside className="space-y-4">
          <Notice tone="neutral" title="Kwa nini jina la uniti?">
            Mpangaji anaporekodiwa, unachagua jina la uniti — si kuandika nyumba upya. Jina moja, mpangaji mmoja.
          </Notice>
          <Notice tone="privacy" title="Anwani na mita">
            Anwani kamili haionyeshwi kwa umma. Inaonekana kwa afisa wa Mtaa na kwa wewe pekee.
          </Notice>
          <SectionCard title="Tayari umesajiliwa?">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Kama uniti zako zimeshajisajili, nenda moja kwa moja kwenye Pangisha.
            </p>
            <Link
              to="/rent/pangisha"
              className="ibmt-tap mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-ink hover:underline"
            >
              Fungua Pangisha
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}