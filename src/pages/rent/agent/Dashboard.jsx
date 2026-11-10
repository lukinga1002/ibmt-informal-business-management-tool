import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import TenantFeeNote from '@/components/rent/TenantFeeNote';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';
import { base44 } from '@/api/base44Client';
import { REGIONS } from '@/config/r3';

const LICENCE_LABEL = {
  pending: 'Inasubiri halmashauri',
  approved: 'Imethibitishwa',
  rejected: 'Imekataliwa',
  suspended: 'Imesimamishwa',
  revoked: 'Imefutwa',
};

const SCOPE_LABEL = { rental: 'Kupangisha', sale: 'Mauzo', both: 'Kupangisha na mauzo' };
const SCOPES = [
  { value: 'rental', label: 'Kupangisha' },
  { value: 'sale', label: 'Mauzo' },
  { value: 'both', label: 'Zote mbili' },
];
const OPEN_STATUS = ['pending', 'approved', 'suspended'];

/** The agent's own workspace: licence, mandates and the commission owed to them. */
export default function AgentDashboard() {
  const [licences, setLicences] = useState([]);
  const [councils, setCouncils] = useState([]);
  const [mandates, setMandates] = useState([]);
  const [commission, setCommission] = useState(null);
  const [form, setForm] = useState({
    agent_name: '',
    nida_number: '',
    business_name: '',
    region: REGIONS[0].region,
    district: REGIONS[0].districts[0],
    scope: 'rental',
    ward: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [licenceData, mandateData, commissionData, councilData] = await Promise.all([
        callFn('agentLicence', { action: 'mine' }),
        callFn('agentMandate', { action: 'list' }),
        callFn('agentCommission', { action: 'list' }),
        base44.entities.Council.list({ sort: 'district', limit: 50 }).catch(() => ({ items: [] })),
      ]);
      setLicences(licenceData.rows || []);
      setMandates(mandateData.rows || []);
      setCommission(commissionData);
      setCouncils(councilData.items || []);

      const me = await base44.auth.me().catch(() => null);
      if (me?.full_name) setForm((prev) => ({ ...prev, agent_name: prev.agent_name || me.full_name }));
    } catch (err) {
      setError(fnError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const districts = REGIONS.find((item) => item.region === form.region)?.districts || REGIONS[0].districts;

  const apply = async () => {
    if (form.agent_name.trim().length < 3) return setError('Andika jina la broker.');
    if (form.nida_number.length !== 20) return setError('Namba ya NIDA ina tarakimu 20.');
    setBusy(true);
    setError('');
    try {
      await callFn('agentLicence', {
        action: 'apply',
        agent_name: form.agent_name,
        nida_number: form.nida_number,
        business_name: form.business_name,
        region: form.region,
        district: form.district,
        scope: form.scope,
        ward: form.ward,
        notes: form.notes,
      });
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const totals = commission?.totals || { owed: 0, paid: 0, renewals: 0 };
  const openInDistrict = licences.find((row) => row.district === form.district && OPEN_STATUS.includes(row.status)) || null;
  const enforcedCouncil =
    councils.find((row) => row.district === form.district && row.enforcement_mode && row.enforcement_mode !== 'voluntary') || null;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Wakala wa nyumba"
        title="Wakala"
        lede="Leseni yako, mandate zilizosainiwa na kamisheni inayodaiwa na mmiliki."
        meta={[{ label: 'Kamisheni hulipwa na mmiliki' }]}
        actions={
          <>
            <Link
              to="/rent/pangisha"
              className="ibmt-tap inline-flex items-center gap-2 rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Pangisha
            </Link>
            <TenantFeeNote />
          </>
        }
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SectionCard title="Leseni" description="Halmashauri inaamua; kila uamuzi una sababu na tarehe.">
          {loading ? (
            <p className="text-[13px] text-muted-foreground">Inapakia…</p>
          ) : (
            <div className="space-y-4">
              {licences.length > 0 && (
                <ul className="space-y-3">
                  {licences.map((row) => (
                    <li key={row.licence_id} className="border-b border-border pb-3 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={row.status} label={LICENCE_LABEL[row.status] || row.status} />
                        <span className="text-[12px] font-medium">{row.council_name || row.district}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {SCOPE_LABEL[row.scope] || row.scope}
                        {row.licence_no ? ` · ${row.licence_no}` : ''}
                        {row.decision_reason ? ` · ${row.decision_reason}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {licences.some((row) => row.status !== 'approved') && (
                <Notice tone="caution" title="Hauwezi kupendekezwa bila leseni">
                  Mmiliki hawezi kukutaja kwenye mandate hadi leseni yako katika halmashauri hiyo ithibitishwe.
                </Notice>
              )}

              {openInDistrict ? (
                <Notice tone="neutral" title="Una ombi au leseni katika wilaya hii">
                  Kila broker ana leseni moja kwa kila halmashauri. Chagua wilaya nyingine kama unataka kusajiliwa huko.
                </Notice>
              ) : (
                <>
                  <Field label="Jina la broker" required>
                    {(props) => (
                      <TextInput {...props} value={form.agent_name} onChange={(event) => setForm({ ...form, agent_name: event.target.value })} />
                    )}
                  </Field>
                  <Field label="Namba ya NIDA" required hint="Tarakimu 20 kutoka kitambulisho cha broker">
                    {(props) => (
                      <TextInput
                        {...props}
                        className={`${props.className} ibmt-num`}
                        inputMode="numeric"
                        value={form.nida_number}
                        onChange={(event) => setForm({ ...form, nida_number: event.target.value.replace(/[^0-9]/g, '').slice(0, 20) })}
                      />
                    )}
                  </Field>
                  <Field label="Jina la biashara" hint="Kama lipo. Broker anaweza kufanya kazi kwa jina lake mwenyewe.">
                    {(props) => (
                      <TextInput {...props} value={form.business_name} onChange={(event) => setForm({ ...form, business_name: event.target.value })} />
                    )}
                  </Field>
                  <Field label="Mkoa" required>
                    {(props) => (
                      <SelectControl
                        {...props}
                        value={form.region}
                        onChange={(event) => {
                          const next = REGIONS.find((item) => item.region === event.target.value) || REGIONS[0];
                          setForm({ ...form, region: next.region, district: next.districts[0] });
                        }}
                      >
                        {REGIONS.map((item) => (
                          <option key={item.region} value={item.region}>
                            {item.region}
                          </option>
                        ))}
                      </SelectControl>
                    )}
                  </Field>
                  <Field label="Wilaya" required>
                    {(props) => (
                      <SelectControl {...props} value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}>
                        {districts.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </SelectControl>
                    )}
                  </Field>
                  <Field label="Aina ya usajili" required hint="Usajili wa mauzo pekee haukupi mandate ya upangishaji">
                    {(props) => (
                      <SelectControl {...props} value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })}>
                        {SCOPES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </SelectControl>
                    )}
                  </Field>
                  {enforcedCouncil && (
                    <Notice tone="policy" title="Usajili wa mawakala ni wa lazima katika halmashauri hii">
                      {enforcedCouncil.bylaw_reference
                        ? `Halmashauri inatumia sheria ndogo ${enforcedCouncil.bylaw_reference}.`
                        : 'Halmashauri imeamua kuwa kila broker asajiliwe kabla ya kufanya kazi.'}
                    </Notice>
                  )}
                  <Field label="Kata">
                    {(props) => <TextInput {...props} value={form.ward} onChange={(event) => setForm({ ...form, ward: event.target.value })} />}
                  </Field>
                  <Field label="Maelezo" hint="Uzoefu, eneo unaofanyia kazi">
                    {(props) => <TextArea {...props} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />}
                  </Field>
                  <Button type="button" className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={apply} disabled={busy}>
                    {busy ? 'Inawasilisha…' : 'Wasilisha ombi la usajili'}
                  </Button>
                </>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Kamisheni" description="Inadaiwa na mmiliki. Mpangaji halipi kitu.">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="ibmt-kicker">Inadaiwa</p>
              <Money amount={totals.owed} strong />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="ibmt-kicker">Imelipwa</p>
              <Money amount={totals.paid} strong />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="ibmt-kicker">Marudio</p>
              <p className="ibmt-num font-heading text-[17px] font-semibold">{totals.renewals}</p>
              <p className="text-[11px] text-muted-foreground">Kamisheni: TZS 0</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(commission?.rows || []).slice(0, 6).map((row) => (
              <li key={row.commission_id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{row.unit_ref || '—'}</p>
                  <p className="text-[11px] text-muted-foreground">{row.kind === 'renewal' ? 'Marudio · hakuna kamisheni' : 'Tenancy mpya'}</p>
                </div>
                <Money amount={row.amount} />
              </li>
            ))}
            {!(commission?.rows || []).length && <p className="text-[13px] text-muted-foreground">Hakuna kamisheni bado.</p>}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Mandate zangu" description="Mandate inakuwa hai baada ya mmiliki kusaini kwa namba ya siri.">
        {mandates.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Hakuna mandate bado.</p>
        ) : (
          <ul className="space-y-3">
            {mandates.map((row) => (
              <li key={row.mandate_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    {row.unit_ref || row.unit_id} · {row.agent_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Kamisheni {Number(row.fee_amount || 0).toLocaleString('en-TZ')} TZS (mmiliki) · mpangaji TZS 0
                    {row.starts_on ? ` · kuanzia ${row.starts_on}` : ''}
                  </p>
                </div>
                <StatusBadge status={row.status} label={row.status === 'active' ? 'Inafanya kazi' : row.status === 'offered' ? 'Inasubiri sahihi' : 'Imekwisha'} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}