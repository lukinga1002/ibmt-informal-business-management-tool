import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, MessageSquare } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import Money from '@/components/ibmt/Money';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { callFn, errorText } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

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
  const { t, lang } = useT();
  const [role, setRole] = useState(null);
  const [units, setUnits] = useState([]);
  const [rows, setRows] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const me = await base44.auth.me();
    // The agent role comes from the server's trusted view, never the profile copy.
    const access = await callFn('whoami', {}).catch(() => null);
    const isAgent = access?.role === 'agent';
    setRole(isAgent ? 'agent' : 'landlord');

    const unitRows = isAgent
      ? (await callFn('agentMandate', { action: 'list' })).rows || []
      : (await base44.entities.RentalUnit.filter({ landlord_id: me.id }, { sort: '-created_date', limit: 50 })).items || [];

    setUnits(
      unitRows.map((row) => ({
        unit_id: row.unit_id || row.id,
        unit_ref: row.unit_ref || row.unit_id || row.id,
        unit_name: row.unit_name || '',
        rent_amount: row.rent_amount || row.monthly_rent || 0,
      })),
    );

    const intake = await base44.entities.TenantIntake.filter(
      isAgent ? { agent_id: me.id } : { landlord_id: me.id },
      { sort: '-created_date', limit: 20 },
    );
    setRows(intake.items || []);

    if (!isAgent) {
      const sent = await base44.entities.TenantSelfRegistration.filter(
        { landlord_id: me.id },
        { sort: '-created_date', limit: 20 },
      );
      setSubmissions(sent.items || []);
    }
  }, []);

  useEffect(() => {
    load().catch((err) => setError({ err }));
  }, [load]);

  const submit = async () => {
    if (!form.unit_id || !form.tenant_name.trim() || !form.tenant_phone.trim()) {
      setError({ key: 'pangisha.errors.required' });
      return;
    }
    if (form.nida_number.length !== 20) {
      setError({ key: 'pangisha.errors.nida' });
      return;
    }
    setBusy(true);
    setError(null);
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
      setError({ err });
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
      setError({ key: 'shareLinks.copyManually', vars: { link } });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('portfolioDemo.rentOut')}
        title={t('portfolioDemo.rentOut')}
        lede={t('pangisha.lede')}
        meta={[{ label: role === 'agent' ? t('pangisha.asAgent') : t('pangisha.asOwner') }]}
      />

      <SectionCard title={t('pangisha.linkTitle')} description={t('pangisha.linkBody')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] text-navy">
            {link}
          </code>
          <Button type="button" variant="outline" className="ibmt-tap shrink-0 gap-2" onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? t('shareLinks.copied') : t('shareLinks.copy')}
          </Button>
        </div>
        <Notice tone="policy" className="mt-3">
          {t('pangisha.stillSigns')}
        </Notice>
      </SectionCard>

      <SectionCard title={t('pangisha.tenantTitle')} description={t('pangisha.tenantBody')}>
        {error && (
          <p role="alert" className="mb-3 text-[12px] font-medium text-destructive">
            {errorText(error)}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('leaseNew.unit')} required>
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
                <option value="">{t('pangisha.chooseUnit')}</option>
                {units.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_name ? `${unit.unit_name} · ${unit.unit_ref}` : unit.unit_ref}
                  </option>
                ))}
              </SelectControl>
            )}
          </Field>

          <Field label={t('tenantJoin.nida')} required hint={t('pangisha.nidaHint')}>
            {(props) => (
              <TextInput
                {...props}
                inputMode="numeric"
                value={form.nida_number}
                onChange={(event) => setForm({ ...form, nida_number: digits(event.target.value, 20) })}
              />
            )}
          </Field>

          <Field label={t('migrate.tenantName')} required>
            {(props) => <TextInput {...props} value={form.tenant_name} onChange={(event) => setForm({ ...form, tenant_name: event.target.value })} />}
          </Field>

          <Field label={t('joinForm.phone')} required hint={t('pangisha.phoneHint')}>
            {(props) => (
              <TextInput {...props} inputMode="tel" value={form.tenant_phone} onChange={(event) => setForm({ ...form, tenant_phone: event.target.value })} />
            )}
          </Field>

          <Field label={t('joinRent.monthlyRent')} hint={t('joinRent.wholeNumber')}>
            {(props) => (
              <TextInput
                {...props}
                inputMode="numeric"
                value={form.rent_amount}
                onChange={(event) => setForm({ ...form, rent_amount: event.target.value.replace(/[^0-9]/g, '') })}
              />
            )}
          </Field>

          <Field label={t('leaseNew.start')}>
            {(props) => <TextInput {...props} type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />}
          </Field>

          <Field label={t('pangisha.notes')} hint={t('pangisha.notesHint')} className="sm:col-span-2">
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
          {busy ? t('wardVerify.saving') : t('pangisha.save')}
        </Button>
      </SectionCard>

      {issued && (
        <SectionCard
          title={t('pangisha.sentTitle')}
          description={t('pangisha.sentTo', { name: issued.intake?.tenant_name || '', to: issued.notice?.to || '' })}
          actions={<MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        >
          {/* The message as prepared for the tenant, shown in the language in use. */}
          <div className="rounded-md border border-border bg-muted/30 p-4 text-[13px] leading-relaxed text-navy">
            {lang === 'en' && issued.notice?.text_en ? issued.notice.text_en : issued.notice?.text}
          </div>

          {issued.notice?.state === 'sent' ? (
            <Notice tone="positive" className="mt-3">
              {t('pangisha.sentToPhone')}
            </Notice>
          ) : (
            <Notice tone="caution" className="mt-3" title={t('pangisha.smsNotSentTitle')}>
              {t('pangisha.smsNotSentBody')}
            </Notice>
          )}
        </SectionCard>
      )}

      {role !== 'agent' && submissions.length > 0 && (
        <SectionCard title={t('pangisha.selfTitle')} description={t('pangisha.selfBody')}>
          <ul className="space-y-3">
            {submissions.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{row.full_name}</p>
                  <p className="ibmt-num text-[11px] text-muted-foreground">
                    {row.unit_name || row.unit_ref}
                    {row.nida_masked ? ` · NIDA ${row.nida_masked}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.paid_broker
                      ? t('pangisha.paidBroker', { amount: Number(row.broker_amount || 0).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-TZ') })
                      : t('pangisha.noBroker')}
                  </p>
                </div>
                <Money amount={row.rent_amount} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title={t('pangisha.recordedTitle')} description={t('pangisha.recordedBody')}>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t('pangisha.noneRecorded')}</p>
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
                    {row.start_date ? ` · ${t('pangisha.from', { date: row.start_date })}` : ''}
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