import { useState } from 'react';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import StockEstimatesEditor from './StockEstimatesEditor';
import { ENFORCEMENT_LABEL, stamp } from '@/lib/gov';
import { callFn, fnError } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

/** Enforcement and by-law settings, restricted to authorised officials. */
export default function EnforcementSettings({ data, onSaved }) {
  const { tt } = useT();
  const settings = data.settings;
  const [form, setForm] = useState({
    enforcement_mode: settings.enforcement_mode || 'voluntary',
    bylaw_reference: settings.bylaw_reference || '',
    bylaw_effective_date: settings.bylaw_effective_date || '',
    registration_window_days: String(settings.registration_window_days || 0),
    stock_source_note: settings.stock_source_note || '',
    stock_estimates: settings.stock_estimates || [],
    reason: '',
  });
  const [state, setState] = useState({ status: 'idle', error: '', fields: {} });

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const enforced = form.enforcement_mode !== 'voluntary';

  const save = async () => {
    setState({ status: 'saving', error: '', fields: {} });
    try {
      await callFn('councilDesk', {
        action: 'save_settings',
        council_id: data.council.id,
        ...form,
        registration_window_days: Number(form.registration_window_days) || 0,
      });
      setState({ status: 'saved', error: '', fields: {} });
      onSaved();
    } catch (error) {
      const response = error?.response?.data;
      setState({ status: 'error', error: fnError(error), fields: (response && response.fields) || {} });
    }
  };

  return (
    <div className="space-y-4">
      <Notice tone="policy">
        {tt({
          en: 'Only an authorised council official may change these settings. Every change is written to the audit log with what it was and what it became.',
          sw: 'Ni afisa wa halmashauri aliyeidhinishwa pekee anayeweza kubadilisha mipangilio hii. Kila mabadiliko huandikwa kwenye kumbukumbu ya ukaguzi pamoja na hali ya awali na mpya.',
        })}
      </Notice>

      <SectionCard title={tt({ en: 'Enforcement', sw: 'Utekelezaji' })} description={tt({ en: 'A by-law is required before enforcement can be switched on.', sw: 'Sheria ndogo inahitajika kabla ya utekelezaji kuwashwa.' })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tt({ en: 'Enforcement mode', sw: 'Hali ya utekelezaji' })} error={state.fields.enforcement_mode}>
            {(control) => (
              <SelectControl {...control} value={form.enforcement_mode} onChange={(event) => set({ enforcement_mode: event.target.value })}>
                {data.modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {tt(ENFORCEMENT_LABEL[mode] || { en: mode, sw: mode })}
                  </option>
                ))}
              </SelectControl>
            )}
          </Field>

          <Field label={tt({ en: 'Registration window (days)', sw: 'Kipindi cha usajili (siku)' })} hint={enforced ? undefined : tt({ en: 'Only used when enforcement is on.', sw: 'Hutumika pale utekelezaji umewashwa.' })} error={state.fields.registration_window_days}>
            {(control) => (
              <TextInput
                {...control}
                inputMode="numeric"
                disabled={!enforced}
                value={form.registration_window_days}
                onChange={(event) => set({ registration_window_days: event.target.value.replace(/[^0-9]/g, '') })}
              />
            )}
          </Field>

          <Field label={tt({ en: 'By-law reference', sw: 'Kumbukumbu ya sheria ndogo' })} required={enforced} error={state.fields.bylaw_reference}>
            {(control) => (
              <TextInput {...control} value={form.bylaw_reference} onChange={(event) => set({ bylaw_reference: event.target.value })} />
            )}
          </Field>

          <Field label={tt({ en: 'By-law effective date', sw: 'Tarehe ya kuanza kwa sheria ndogo' })} required={enforced} error={state.fields.bylaw_effective_date}>
            {(control) => (
              <TextInput {...control} type="date" value={form.bylaw_effective_date || ''} onChange={(event) => set({ bylaw_effective_date: event.target.value })} />
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title={tt({ en: 'Estimated stock by ward', sw: 'Makisio ya nyumba kwa kata' })}
        description={tt({ en: 'An input with a stated source. Nothing here is calculated, and a figure without a source is never shown.', sw: 'Ni taarifa iliyoingizwa pamoja na chanzo chake. Hakuna kinachohesabiwa hapa, na takwimu isiyo na chanzo haionyeshwi.' })}
      >
        <div className="space-y-4">
          <StockEstimatesEditor rows={form.stock_estimates} onChange={(rows) => set({ stock_estimates: rows })} />
          <Field label={tt({ en: 'What the estimate covers', sw: 'Makisio yanahusu nini' })} error={state.fields.stock_source_note}>
            {(control) => (
              <TextArea {...control} rows={3} value={form.stock_source_note} onChange={(event) => set({ stock_source_note: event.target.value })} />
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={tt({ en: 'Record this change', sw: 'Andika mabadiliko haya' })}>
        <div className="space-y-3">
          <Field label={tt({ en: 'Reason for the change', sw: 'Sababu ya mabadiliko' })} error={state.fields.reason}>
            {(control) => <TextInput {...control} value={form.reason} onChange={(event) => set({ reason: event.target.value })} />}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="ibmt-tap" onClick={save} disabled={state.status === 'saving'}>
              {state.status === 'saving' ? tt({ en: 'Saving', sw: 'Inahifadhi' }) : tt({ en: 'Save settings', sw: 'Hifadhi mipangilio' })}
            </Button>
            {state.status === 'saved' && (
              <p role="status" className="text-[12px] font-medium text-success">
                {tt({ en: 'Saved and written to the audit log.', sw: 'Imehifadhiwa na kuandikwa kwenye kumbukumbu ya ukaguzi.' })}
              </p>
            )}
            {state.status === 'error' && (
              <p role="alert" className="text-[12px] font-medium text-destructive">
                {state.error}
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={tt({ en: 'Change history', sw: 'Historia ya mabadiliko' })} description={tt({ en: 'Who changed what, and when.', sw: 'Nani alibadilisha nini, na lini.' })}>
        {data.audit.length === 0 ? (
          <p className="ibmt-hint">{tt({ en: 'No change has been recorded yet.', sw: 'Hakuna mabadiliko yaliyoandikwa bado.' })}</p>
        ) : (
          <ul className="space-y-3">
            {data.audit.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border px-4 py-3">
                <p className="ibmt-num text-[12px] font-medium text-navy">{stamp(entry.occurred_at)}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {tt({
                    en: `${ENFORCEMENT_LABEL[entry.before?.enforcement_mode]?.en || '—'} → ${ENFORCEMENT_LABEL[entry.after?.enforcement_mode]?.en || '—'} · by ${entry.actor_role || '—'}`,
                    sw: `${ENFORCEMENT_LABEL[entry.before?.enforcement_mode]?.sw || '—'} → ${ENFORCEMENT_LABEL[entry.after?.enforcement_mode]?.sw || '—'} · na ${entry.actor_role || '—'}`,
                  })}
                </p>
                {entry.reason && <p className="mt-1 text-[12px] italic text-muted-foreground">{entry.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}