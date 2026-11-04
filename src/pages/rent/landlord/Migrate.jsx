import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput, SelectControl } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import OtpConfirm from '@/components/rent/registration/OtpConfirm';
import { DISCLAIMER } from '@/config/r3';

/**
 * Bringing an existing tenancy onto the register. Nothing is renegotiated: the
 * tenant confirms the facts that already apply, and no new lease is created.
 */
export default function LandlordMigrate() {
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({ unit_id: '', tenant_name: '', tenant_phone: '', rent_amount: '', started_on: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.RentalUnit
      .filter({}, { sort: '-created_date', limit: 50 })
      .then((page) => {
        const items = page.items || [];
        setUnits(items);
        setForm((prev) => ({ ...prev, unit_id: prev.unit_id || items[0]?.id || '' }));
      })
      .catch(() => setUnits([]));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await base44.functions.invoke('migrateTenancy', {
        unit_id: form.unit_id,
        tenant_name: form.tenant_name,
        tenant_phone: form.tenant_phone,
        rent_amount: Number(form.rent_amount) || 0,
        started_on: form.started_on,
      });
      setResult(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'The tenancy was not registered.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Usajili wa tenancy iliyopo"
        title="Sajili mpangaji aliyepo"
        lede="Masharti yanabaki kama yalivyo. Mkataba wa kawaida unatumika tu pale tenancy hii inapohuishwa upya."
        meta={[{ label: 'Hakuna mkataba mpya' }, { label: DISCLAIMER.sw }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Taarifa zilizopo" description="Mpangaji anathibitisha kwa namba ya siri.">
          {result ? (
            <div className="space-y-4">
              <Notice tone="positive" title="Tenancy imeingizwa kwenye rejista">
                <span className="ibmt-num">{result.case_ref}</span> · masharti hayakubadilishwa · hakuna mkataba mpya
                ulioandaliwa.
              </Notice>
              <OtpConfirm
                caseId={result.case_id}
                channel="migrated"
                demoCode={result.otp?.code}
                onConfirmed={() => window.location.assign('/rent/landlord/tenancies')}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Nyumba / chumba">
                {(props) => (
                  <SelectControl {...props} value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })}>
                    {units.length === 0 && <option value="">Hakuna nyumba iliyosajiliwa</option>}
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit_ref} · {unit.ward}
                      </option>
                    ))}
                  </SelectControl>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jina la mpangaji" required>
                  {(props) => (
                    <TextInput {...props} value={form.tenant_name} onChange={(event) => setForm({ ...form, tenant_name: event.target.value })} />
                  )}
                </Field>
                <Field label="Simu ya mpangaji" required hint="Namba ya siri inatumwa hapa">
                  {(props) => (
                    <TextInput
                      {...props}
                      className={`${props.className} ibmt-num`}
                      value={form.tenant_phone}
                      onChange={(event) => setForm({ ...form, tenant_phone: event.target.value })}
                    />
                  )}
                </Field>
                <Field label="Kodi ya sasa (TZS)" required>
                  {(props) => (
                    <TextInput
                      {...props}
                      className={`${props.className} ibmt-num`}
                      inputMode="numeric"
                      value={form.rent_amount}
                      onChange={(event) => setForm({ ...form, rent_amount: event.target.value.replace(/[^0-9]/g, '') })}
                    />
                  )}
                </Field>
                <Field label="Ilianza lini" required>
                  {(props) => (
                    <TextInput {...props} type="date" value={form.started_on} onChange={(event) => setForm({ ...form, started_on: event.target.value })} />
                  )}
                </Field>
              </div>
              {error && <p role="alert" className="text-[12px] font-medium text-destructive">{error}</p>}
              <Button
                type="button"
                className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={submit}
                disabled={busy || !form.unit_id}
              >
                {busy ? 'Inatuma…' : 'Tuma kwa mpangaji'}
              </Button>
            </div>
          )}
        </SectionCard>

        <aside className="space-y-4">
          <Notice tone="policy" title="Masharti hayabadiliki">
            Kodi, tarehe na masharti mengine yanabaki kama yalivyo. Mkataba wa kawaida unakuja tu kwenye uhushishaji
            (renewal).
          </Notice>
          <Notice tone="privacy" title="Anwani">
            Anwani kamili haionyeshwi kwenye cheti; ni kata na mtaa pekee.
          </Notice>
        </aside>
      </div>
    </div>
  );
}