import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, MessageSquare } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { callFn, fnError } from '@/lib/r4';

const EMPTY = { unit_id: '', tenant_name: '', tenant_phone: '', nida_number: '', rent_amount: '', start_date: '', notes: '' };

const digits = (value, max) => value.replace(/[^0-9]/g, '').slice(0, max);

const maskNida = (value) => {
  const text = String(value || '');
  return text.length > 4 ? `${'*'.repeat(text.length - 4)}${text.slice(-4)}` : text;
};

/**
 * Pangisha: the link a landlord or a licensed agent uses to capture an incoming
 * tenant against one of their units. The tenant's NIDA number is required, and
 * recording them issues the notice that names the council, the house and its
 * owner — and states that the signed contract is between tenant and landlord,
 * which the government does not enforce. Nothing is signed here.
 */
export default function Pangisha() {
  const [role, setRole] = useState(null);
  const [units, setUnits] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState(null);
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
    if (!form.unit_id || !form.tenant_name.trim() || !form.tenant_phone.trim()) {
      setError('Chagua uniti, kisha andika jina na namba ya simu ya mpangaji.');
      return;
    }
    if (form.nida_number.length !== 20) {
      setError('Namba ya NIDA ina tarakimu 20. Hakikisha umeandika tarakimu zote.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await callFn('tenantIntake', {
        action: 'create',
        unit_id: form.unit_id,
        tenant_name: form.tenant_name,
        tenant_phone: form.tenant_phone,
        nida_number: form.nida_number,
        rent_amount: form.rent_amount,
        start_date: form.start_date,
        notes: form.notes,
      });
      setIssued(result);
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
          Mpangaji bado atasaini mkataba na mwenye nyumba. Hapa tunarekodi taarifa tu, na kumtumia taarifa ya usajili.
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

          <Field label="Namba ya NIDA" required hint="Tarakimu 20 kutoka kitambulisho cha NIDA cha mpangaji">
            {(props) => (
              <TextInput
                {...props}
                inputMode="numeric"
                value={form.nida_number}
                onChange={(event) => setForm({ ...form, nida_number: digits(event.target.value, 20) })}
              />
            )}
          </Field>

          <Field label="Jina la mpangaji" required>
            {(props) => <TextInput {...props} value={form.tenant_name} onChange={(event) => setForm({ ...form, tenant_name: event.target.value })} />}
          </Field>

          <Field label="Namba ya simu" required hint="Taarifa ya usajili inatumwa kwa namba hii">
            {(props) => (
              <TextInput {...props} inputMode="tel" value={form.tenant_phone} onChange={(event) => setForm({ ...form, tenant_phone: event.target.value })} />
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

          <Field label="Tarehe ya kuanza">
            {(props) => <TextInput {...props} type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />}
          </Field>

          <Field label="Maelezo" hint="Mpangaji anaingia lini, ana watu wangapi" className="sm:col-span-2">
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
          {busy ? 'Inahifadhi…' : 'Hifadhi na mtumie mpangaji taarifa'}
        </Button>
      </SectionCard>

      {issued && (
        <SectionCard
          title="Taarifa iliyotumwa"
          description={`Kwa ${issued.intake?.tenant_name} · ${issued.notice?.to || ''}`}
          actions={<MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        >
          <div className="rounded-md border border-border bg-muted/30 p-4 text-[13px] leading-relaxed text-navy">
            {issued.notice?.text}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{issued.notice?.text_en}</p>

          {issued.notice?.state === 'sent' ? (
            <Notice tone="positive" className="mt-3">
              Taarifa imetumwa kwa simu ya mpangaji.
            </Notice>
          ) : (
            <Notice tone="caution" className="mt-3" title="SMS haijatumwa bado">
              Ujumbe umeandaliwa na kuhifadhiwa. Njia ya kutuma SMS haijaunganishwa, kwa hiyo hakuna ujumbe uliotoka
              kwenye mfumo. Ujumbe huu utatumwa mara njia ya SMS itakapowekwa.
            </Notice>
          )}
        </SectionCard>
      )}

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
                    {row.nida_number ? ` · NIDA ${maskNida(row.nida_number)}` : ''}
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