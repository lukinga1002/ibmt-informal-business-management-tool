import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { callFn, fnError } from '@/lib/r4';

const EMPTY = { unit_id: '', tenant_name: '', tenant_phone: '', rent_amount: '', start_date: '', notes: '' };

/**
 * Pangisha: the link a landlord or a licensed agent uses to capture the
 * details of an incoming tenant against one of their units. Nothing is signed
 * and no tenancy is created here; the tenant still confirms on their account.
 */
export default function Pangisha() {
  const [role, setRole] = useState(null);
  const [units, setUnits] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const me = await base44.auth.me();
    const isAgent = (me?.data?.ibmt_role || '') === 'agent';
    setRole(isAgent ? 'agent' : 'landlord');

    const unitRows = isAgent
      ? (await callFn('agentMandate', { action: 'list' })).rows || []
      : (await base44.entities.RentalUnit.filter({ landlord_id: me.id }, { sort: '-created_date', limit: 50 })).items || [];

    setUnits(
      unitRows.map((row) => ({
        unit_id: row.unit_id || row.id,
        unit_ref: row.unit_ref || row.unit_id || row.id,
        rent_amount: row.rent_amount || row.monthly_rent || 0,
        council_id: row.council_id || '',
        district: row.district || '',
        ward: row.ward || '',
      })),
    );

    const intake = await base44.entities.TenantIntake.filter(
      isAgent ? { agent_id: me.id } : { landlord_id: me.id },
      { sort: '-created_date', limit: 20 },
    );
    setRows(intake.items || []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(fnError(err)));
  }, [load]);

  const submit = async () => {
    if (!form.tenant_name.trim() || !form.tenant_phone.trim() || !form.unit_id) {
      setError('Chagua uniti, kisha andika jina na namba ya simu ya mpangaji.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const me = await base44.auth.me();
      const isAgent = role === 'agent';
      const unit = units.find((row) => row.unit_id === form.unit_id) || {};
      await base44.entities.TenantIntake.create({
        unit_id: unit.unit_id || '',
        unit_ref: unit.unit_ref || '',
        landlord_id: isAgent ? null : me.id,
        agent_id: isAgent ? me.id : null,
        entered_by_role: isAgent ? 'agent' : 'landlord',
        tenant_name: form.tenant_name.trim(),
        tenant_phone: form.tenant_phone.trim(),
        rent_amount: Number(form.rent_amount) || 0,
        start_date: form.start_date || null,
        notes: form.notes.trim(),
        council_id: unit.council_id || null,
        district: unit.district || null,
        ward: unit.ward || null,
      });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const link = `${window.location.origin}/rent/pangisha`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Nakili kiungo kwa mkono: ' + link);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Pangisha"
        title="Pangisha"
        lede="Kiungo cha kukusanya taarifa za mpangaji kwa uniti mmoja. Hakuna mkataba unaoundwa hapa."
        meta={[{ label: role === 'agent' ? 'Wakala · mandate zako' : 'Mmiliki · units zako' }]}
      />

      <SectionCard title="Kiungo chako cha Pangisha" description="Tumia kiungo hiki kuingiza taarifa za mpangaji anayeingia.">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] text-navy">
            {link}
          </code>
          <Button type="button" variant="outline" className="ibmt-tap shrink-0 gap-2" onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Imenakiliwa' : 'Nakili kiungo'}
          </Button>
        </div>
        <Notice tone="policy" className="mt-3">
          Mpangaji bado atasaini mkataba na kuthibitisha malipo kwenye akaunti yake mwenyewe. Hapa tunarekodi taarifa tu.
        </Notice>
      </SectionCard>

      <SectionCard title="Taarifa za mpangaji" description="Jaza taarifa za mpangaji anayeingia kwenye uniti.">
        {error && (
          <p role="alert" className="mb-3 text-[12px] font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Uniti" required>
            {(props) => (
              <SelectControl
                {...props}
                value={form.unit_id}
                onChange={(event) => {
                  const unit = units.find((row) => row.unit_id === event.target.value);
                  setForm({
                    ...form,
                    unit_id: event.target.value,
                    rent_amount: unit && unit.rent_amount ? String(unit.rent_amount) : form.rent_amount,
                  });
                }}
              >
                <option value="">Chagua uniti</option>
                {units.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_ref}
                  </option>
                ))}
              </SelectControl>
            )}
          </Field>

          <Field label="Kodi ya mwezi (TZS)" hint="Namba kamili, bila desimali">
            {(props) => (
              <TextInput
                {...props}
                inputMode="numeric"
                value={form.rent_amount}
                onChange={(event) => setForm({ ...form, rent_amount: event.target.value.replace(/[^0-9]/g, '') })}
              />
            )}
          </Field>

          <Field label="Jina la mpangaji" required>
            {(props) => <TextInput {...props} value={form.tenant_name} onChange={(event) => setForm({ ...form, tenant_name: event.target.value })} />}
          </Field>

          <Field label="Namba ya simu" required>
            {(props) => (
              <TextInput {...props} inputMode="tel" value={form.tenant_phone} onChange={(event) => setForm({ ...form, tenant_phone: event.target.value })} />
            )}
          </Field>

          <Field label="Tarehe ya kuanza">
            {(props) => <TextInput {...props} type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />}
          </Field>

          <Field label="Maelezo" hint="Mpangaji anaingia lini, ana watu wangapi">
            {(props) => <TextArea {...props} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />}
          </Field>
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={busy}
          className="ibmt-tap mt-4 w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep sm:w-auto"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Inahifadhi…' : 'Hifadhi taarifa za mpangaji'}
        </Button>
      </SectionCard>

      <SectionCard title="Waliorekodiwa" description="Taarifa zilizokwisha kuingizwa kupitia kiungo hiki.">
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Hakuna mpangaji aliyerekodiwa bado.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{row.tenant_name}</p>
                  <p className="ibmt-num text-[11px] text-muted-foreground">
                    {row.tenant_phone}
                    {row.unit_ref ? ` · ${row.unit_ref}` : ''}
                    {row.start_date ? ` · kuanzia ${row.start_date}` : ''}
                  </p>
                </div>
                <Money amount={row.rent_amount} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}