import { useState } from 'react';
import { CheckCircle2, FileUp, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import Field, { TextInput, SelectControl } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import { DISCLAIMER, EVIDENCE_OPTIONS, PILOT_COUNCILS, councilForWard } from '@/config/r3';
import OtpConfirm from './OtpConfirm';

const STEPS = ['Mahali na nyumba', 'Nyaraka', 'Ridhaa', 'Tuma'];

/**
 * One registration form for every channel: the landlord alone, an authorised
 * helper, or a proxy. A helper can never approve anything — only the mtaa
 * officer decides, and the landlord confirms by code first.
 */
export default function RegistrationWizard({ channel = 'self', landlordId = '', landlordName = '', onDone }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    ward: 'Sinza',
    mtaa: '',
    address: '',
    tanesco_meter: '',
    unit_type: 'house',
    bedrooms: '2',
    rent_amount: '',
    occupancy: 'vacant',
    landlord_name: landlordName,
    landlord_phone: '',
    helper_licence: '',
    helper_relation: '',
  });
  const [consent, setConsent] = useState({ core: false, council_sharing: true });

  const council = councilForWard(form.ward);
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const addDocument = async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setUploads((prev) => [...prev, { kind, uri: file_uri, label: file.name }]);
    } catch (err) {
      setError(err.message || 'The document could not be uploaded.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await base44.functions.invoke('registerUnit', {
        channel,
        ward: form.ward,
        mtaa: form.mtaa,
        district: council.district,
        council_id: council.council_id,
        address: form.address,
        tanesco_meter: form.tanesco_meter,
        unit_type: form.unit_type,
        bedrooms: Number(form.bedrooms) || 0,
        rent_amount: Number(form.rent_amount) || 0,
        occupancy: form.occupancy,
        landlord_name: form.landlord_name,
        landlord_phone: form.landlord_phone,
        landlord_id: channel === 'self' ? '' : landlordId,
        helper_licence: form.helper_licence,
        helper_relation: form.helper_relation,
        evidence: uploads,
        consent: { core: consent.core, council_sharing: consent.council_sharing },
      });
      setResult(response.data);
      onDone?.(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
            <div>
              <h3 className="font-heading text-[15px] font-semibold text-navy">Usajili umepokelewa</h3>
              <p className="ibmt-num mt-1 text-[13px]">{result.case_ref}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Unit {result.unit_ref} · inasubiri afisa wa Mtaa. Hakuna uthibitisho wa umiliki unaotolewa hapa.
              </p>
            </div>
          </div>
        </div>

        {result.duplicate?.flagged && (
          <Notice tone="caution" title="Taarifa hii imetumwa kwa afisa wa Mtaa">
            {result.duplicate.note} — Registration is not blocked and not rejected: the Mtaa officer reviews both
            records.
          </Notice>
        )}

        {result.otp?.required && !result.otp?.code && (
          <Notice tone="policy">The landlord received a code on their own phone. The helper does not see it.</Notice>
        )}

        {result.otp?.required && (
          <OtpConfirm
            caseId={result.case_id}
            channel={channel}
            demoCode={result.otp.code}
            onConfirmed={() => window.location.assign('/rent/landlord/portfolio')}
          />
        )}

        <Notice tone="privacy">
          {DISCLAIMER.sw} / {DISCLAIMER.en}
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2">
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

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kata · Ward">
            {(props) => (
              <SelectControl {...props} value={form.ward} onChange={(event) => set({ ward: event.target.value })}>
                {PILOT_COUNCILS.map((item) => (
                  <optgroup key={item.council_id} label={item.name}>
                    {item.wards.map((ward) => (
                      <option key={ward} value={ward}>
                        {ward}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectControl>
            )}
          </Field>
          <Field label="Mtaa">
            {(props) => <TextInput {...props} value={form.mtaa} onChange={(event) => set({ mtaa: event.target.value })} />}
          </Field>
          <Field label="Anwani ya makazi" required>
            {(props) => (
              <TextInput
                {...props}
                value={form.address}
                onChange={(event) => set({ address: event.target.value })}
                placeholder="Mtaa, nyumba, alama"
              />
            )}
          </Field>
          <Field label="Namba ya mita ya TANESCO">
            {(props) => (
              <TextInput
                {...props}
                className={`${props.className} ibmt-num`}
                value={form.tanesco_meter}
                onChange={(event) => set({ tanesco_meter: event.target.value })}
              />
            )}
          </Field>
          <Field label="Aina ya nyumba">
            {(props) => (
              <SelectControl {...props} value={form.unit_type} onChange={(event) => set({ unit_type: event.target.value })}>
                <option value="room">Chumba</option>
                <option value="flat">Fleti</option>
                <option value="house">Nyumba</option>
                <option value="shop">Duka</option>
              </SelectControl>
            )}
          </Field>
          <Field label="Kodi ya mwezi (TZS)" required>
            {(props) => (
              <TextInput
                {...props}
                className={`${props.className} ibmt-num`}
                inputMode="numeric"
                value={form.rent_amount}
                onChange={(event) => set({ rent_amount: event.target.value.replace(/[^0-9]/g, '') })}
              />
            )}
          </Field>
          {channel !== 'self' && (
            <>
              <Field label="Jina la mmiliki" required>
                {(props) => (
                  <TextInput {...props} value={form.landlord_name} onChange={(event) => set({ landlord_name: event.target.value })} />
                )}
              </Field>
              <Field label="Simu ya mmiliki" required hint="Namba ya siri inatumwa hapa">
                {(props) => (
                  <TextInput
                    {...props}
                    className={`${props.className} ibmt-num`}
                    value={form.landlord_phone}
                    onChange={(event) => set({ landlord_phone: event.target.value })}
                  />
                )}
              </Field>
              <Field label={channel === 'proxy' ? 'Uhusiano na mmiliki' : 'Namba ya leseni ya wakala'}>
                {(props) => (
                  <TextInput
                    {...props}
                    value={channel === 'proxy' ? form.helper_relation : form.helper_licence}
                    onChange={(event) =>
                      set(channel === 'proxy' ? { helper_relation: event.target.value } : { helper_licence: event.target.value })
                    }
                  />
                )}
              </Field>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          {EVIDENCE_OPTIONS.map((option) => {
            const added = uploads.filter((item) => item.kind === option.kind);
            return (
              <div key={option.kind} className="rounded-md border border-border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium">
                      {option.sw} <span className="text-muted-foreground">· {option.en}</span>
                    </p>
                    {added.length > 0 && (
                      <p className="mt-1 text-[11px] text-success">
                        {added.length} nyaraka · {added.map((item) => item.label).join(', ')} (stored privately)
                      </p>
                    )}
                  </div>
                  <label className="ibmt-tap inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-[12px] font-medium">
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                    Ongeza
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(event) => addDocument(event, option.kind)}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          <p className="ibmt-hint">Angalau hati moja inahitajika. Nyaraka zinahifadhiwa kwa faragha.</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={consent.core}
              onChange={(event) => setConsent({ ...consent, core: event.target.checked })}
              className="mt-1"
            />
            <span className="text-[13px] leading-relaxed">
              <strong>Lazima:</strong> nakubali taarifa za nyumba hii zihifadhiwe na IBMT kwa ajili ya usajili.
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
              <strong>Hiari:</strong> nakubali halmashauri ya {council.name} ionee taarifa hizi kwa ufuatiliaji.
            </span>
          </label>
          <Notice tone="privacy">
            {DISCLAIMER.sw} / {DISCLAIMER.en}
          </Notice>
        </div>
      )}

      {step === 3 && (
        <dl className="divide-y divide-border rounded-md border border-border text-[13px]">
          {[
            ['Kata', form.ward],
            ['Mtaa', form.mtaa],
            ['Anwani', form.address],
            ['Mita', form.tanesco_meter || '—'],
            ['Kodi', `${Number(form.rent_amount || 0).toLocaleString('en-US')} TZS`],
            ['Nyaraka', `${uploads.length}`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="ibmt-num text-right">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {step > 0 && (
          <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setStep(step - 1)}>
            Rudi
          </Button>
        )}
        {step < 3 && (
          <Button
            type="button"
            className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && uploads.length === 0}
          >
            Endelea
          </Button>
        )}
        {step === 3 && (
          <Button
            type="button"
            className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={submit}
            disabled={busy || !consent.core}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Inatuma…' : 'Tuma kwa afisa wa Mtaa'}
          </Button>
        )}
      </div>
    </div>
  );
}