import Stage2PayoutPanel from '@/components/money/Stage2PayoutPanel';
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
import { appParams } from '@/lib/app-params';
import { isLocalSimulation, localCouncilChoices, localDefaultCouncil } from '@/lib/localSimulation';
import { callFn, errorText, newKey } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';
import { DISCLAIMER, PILOT_COUNCILS } from '@/config/r3';

const STEPS = ['join.steps.you', 'join.steps.units', 'join.steps.rent'];
/** Version of the registration consent wording shown below; recorded with the language. */
const CONSENT_TEXT_VERSION = 'join-consent-1';
const first = PILOT_COUNCILS[0];

const EMPTY_UNIT = { name: '', rent_amount: '', occupied: false };

/** A Tanzanian number, written either as 07. or as 2557.. */
const isPhone = (value) => /^(0\d{9}|255\d{9})$/.test(String(value || '').replace(/\D/g, ''));

/**
 * A landlord's own way in. One short form creates the units and their reference
 * numbers, so from then on renting a unit out is a pick from a list, never a
 * retyped address. The tenant site is not opened here: tenants are recorded by
 * the landlord or the agent through Pangisha.
 */
export default function RentJoin() {
  const { t, tt, lang } = useT();
  const [councils, setCouncils] = useState(PILOT_COUNCILS);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    landlord_name: '',
    phone: '',
    email: '',
    region: first.region,
    council_id: first.council_id,
    district: first.district,
    ward: first.wards[0],
    street: '',
    house_no: '',
  });
  const [units, setUnits] = useState([{ ...EMPTY_UNIT }]);
  const [sameRent, setSameRent] = useState(true);
  const [allTenants, setAllTenants] = useState(false);
  // Registration consent is recorded on each unit's verification case. The
  // council-sharing choice is optional and starts unticked.
  const [consent, setConsent] = useState({ core: false, council_sharing: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  // One key per filled-in form: a retry after a partial failure resumes the
  // same registration on the server instead of creating a second property.
  const [registrationKey] = useState(() => newKey('reg'));

  useEffect(() => {
    const environment = [import.meta.env.DEV, window.location.href, appParams.appBaseUrl];
    if (!isLocalSimulation(...environment)) return;
    let active = true;
    base44.entities.Council.filter({ code: 'SIM-TEST' })
      .then((page) => {
        if (!active) return;
        const choices = localCouncilChoices(PILOT_COUNCILS, Array.isArray(page) ? page : page.items || [], environment);
        setCouncils(choices);
        // Local data must never default onto a real pilot council's ID: start on
        // the fictional council, carrying its ID, region, district and ward together.
        const fixture = localDefaultCouncil(choices, PILOT_COUNCILS);
        if (fixture) {
          setForm((prev) => ({ ...prev, council_id: fixture.council_id, region: fixture.region, district: fixture.district, ward: fixture.wards[0] }));
        } else {
          setError({ key: 'join.errors.localCouncilMissing' });
        }
      })
      .catch(() => { if (active) setError({ key: 'join.errors.localCouncilLoad' }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    base44.auth
      .me()
      .then((me) =>
        setForm((prev) => ({
          ...prev,
          landlord_name: prev.landlord_name || me.full_name || '',
          email: prev.email || me.email || '',
          phone: prev.phone || (me.data && me.data.phone) || '',
        })),
      )
      .catch((err) => {
        if (err?.status === 401 || err?.response?.status === 401) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        setError({ err });
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
        setError({ key: 'join.errors.profile' });
        return;
      }
      if (!isPhone(form.phone)) {
        setError({ key: 'join.errors.phone' });
        return;
      }
    }
    if (step === 1) {
      const names = units.map((unit) => unit.name.trim().toLowerCase());
      if (names.some((name) => name.length < 2)) {
        setError({ key: 'join.errors.unitName' });
        return;
      }
      if (new Set(names).size !== names.length) {
        setError({ key: 'join.errors.unitDuplicate' });
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
        registration_key: registrationKey,
        landlord_name: form.landlord_name,
        phone: form.phone,
        email: form.email,
        region: form.region,
        district: form.district,
        ward: form.ward,
        council_id: form.council_id,
        street: form.street,
        house_no: form.house_no,
        consent: { core: consent.core, council_sharing: consent.council_sharing, language: lang, text_version: CONSENT_TEXT_VERSION },
        units: units.map((unit) => ({
          name: unit.name,
          rent_amount: Number(unit.rent_amount) || 0,
          occupied: allTenants ? true : Boolean(unit.occupied),
        })),
      });
      setResult(payload);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="ibmt-page space-y-6">
        <PageHeader
          kicker={t('join.done.kicker')}
          title={t('join.done.title')}
          lede={t('join.done.lede', { street: result.landlord.street, house: result.landlord.house_no, ward: result.landlord.ward, district: result.landlord.district })}
        />

        <SectionCard title={t('join.done.refsTitle')} description={t('join.done.refsBody')}>
          <ul className="divide-y divide-border">
            {result.units.map((unit) => (
              <li key={unit.unit_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{unit.unit_name}</p>
                  <p className="ibmt-num text-[11px] text-muted-foreground">{unit.unit_ref}</p>
                </div>
                <div className="text-right">
                  <p className="ibmt-num text-[13px]">{Number(unit.rent_amount).toLocaleString('en-US')} TZS</p>
                  <p className="text-[11px] text-muted-foreground">{unit.occupancy === 'occupied' ? t('join.done.occupied') : t('join.done.vacant')}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <Notice tone="policy" title={t('join.done.nextTitle')}>
          {t('join.done.nextBody', { cases: result.units.map((unit) => unit.case_ref).filter(Boolean).join(', ') || '—' })}
        </Notice>

        <Stage2PayoutPanel />
        <ShareLinks units={result.units} />

        <Notice tone="policy" title={t('join.done.disclaimerTitle')}>
          {tt(DISCLAIMER)}
        </Notice>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep">
            <a href="/rent/pangisha">
              {t('join.done.rentOut')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline" className="ibmt-tap">
            <a href="/rent/landlord/portfolio">{t('join.done.myUnits')}</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ibmt-page">
      <PageHeader
        kicker={t('join.kicker')}
        title={t('join.title')}
        lede={t('join.lede')}
        meta={[{ label: t('join.threeSteps') }, { label: tt(DISCLAIMER) }]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title={t(STEPS[step])}
          description={step === 2 ? t('join.lastStepHint') : t('join.stepHint')}
        >
          <ol className="mb-5 flex flex-wrap gap-2">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={`rounded-sm border px-2 py-1 text-[11px] font-medium ${
                  index === step ? 'border-navy bg-navy text-primary-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {index + 1}. {t(label)}
              </li>
            ))}
          </ol>

          {step === 0 && <JoinProfile form={form} set={set} councils={councils} />}
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
          {step === 2 && (
            <div className="mt-5 space-y-3">
              <label className="flex items-start gap-3 rounded-md border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={consent.core}
                  onChange={(event) => setConsent({ ...consent, core: event.target.checked })}
                  className="mt-1"
                />
                <span className="text-[13px] leading-relaxed">
                  <strong>{t('join.consent.requiredLabel')}</strong> {t('join.consent.core')}
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={consent.council_sharing}
                  onChange={(event) => setConsent({ ...consent, council_sharing: event.target.checked })}
                  className="mt-1"
                />
                <span className="text-[13px] leading-relaxed">
                  <strong>{t('join.consent.optionalLabel')}</strong> {t('join.consent.sharing')}
                </span>
              </label>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-[12px] font-medium text-destructive">
              {errorText(error)}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setStep(step - 1)} disabled={busy}>
                {t('common.back')}
              </Button>
            )}
            {step < 2 && (
              <Button type="button" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={next}>
                {t('common.continue')}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={submit}
                disabled={busy || !consent.core}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {busy ? t('join.submitting') : t('join.submit')}
              </Button>
            )}
          </div>
        </SectionCard>

        <aside className="space-y-4">
          <Notice tone="neutral" title={t('join.aside.unitNameTitle')}>
            {t('join.aside.unitNameBody')}
          </Notice>
          <Notice tone="privacy" title={t('join.aside.addressTitle')}>
            {t('join.aside.addressBody')}
          </Notice>
          <SectionCard title={t('join.aside.registeredTitle')}>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t('join.aside.registeredBody')}
            </p>
            <Link
              to="/rent/pangisha"
              className="ibmt-tap mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-ink hover:underline"
            >
              {t('join.aside.openPangisha')}
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
