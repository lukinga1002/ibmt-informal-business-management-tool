import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import TenantFeeNote from '@/components/rent/TenantFeeNote';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';

const LICENCE_LABEL = {
  pending: 'Inasubiri halmashauri',
  approved: 'Imethibitishwa',
  rejected: 'Imekataliwa',
  suspended: 'Imesimamishwa',
  revoked: 'Imefutwa',
};

const DISTRICTS = ['Kinondoni', 'Ubungo', 'Ilala', 'Temeke', 'Kigamboni', 'Bagamoyo', 'Kisarawe'];

/** The agent's own workspace: licence, mandates and the commission owed to them. */
export default function AgentDashboard() {
  const [licence, setLicence] = useState(null);
  const [mandates, setMandates] = useState([]);
  const [commission, setCommission] = useState(null);
  const [form, setForm] = useState({ district: 'Kinondoni', ward: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [licenceData, mandateData, commissionData] = await Promise.all([
        callFn('agentLicence', { action: 'mine' }),
        callFn('agentMandate', { action: 'list' }),
        callFn('agentCommission', { action: 'list' }),
      ]);
      setLicence(licenceData.current || null);
      setMandates(mandateData.rows || []);
      setCommission(commissionData);
    } catch (err) {
      setError(fnError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      await callFn('agentLicence', { action: 'apply', district: form.district, ward: form.ward, notes: form.notes });
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const totals = commission?.totals || { owed: 0, paid: 0, renewals: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Wakala wa nyumba"
        title="Wakala"
        lede="Leseni yako, mandate zilizosainiwa na kamisheni inayodaiwa na mmiliki."
        meta={[{ label: 'Kamisheni hulipwa na mmiliki' }]}
        actions={<TenantFeeNote />}
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
          ) : licence ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={licence.status} label={LICENCE_LABEL[licence.status] || licence.status} />
                {licence.licence_no && <span className="ibmt-num text-[12px] text-muted-foreground">{licence.licence_no}</span>}
              </div>
              <p className="text-[12px] text-muted-foreground">
                {licence.district}
                {licence.decision_reason ? ` · ${licence.decision_reason}` : ''}
              </p>
              {licence.status !== 'approved' && (
                <Notice tone="caution" title="Hauwezi kupendekezwa bila leseni">
                  Mmiliki hawezi kukutaja kwenye mandate hadi leseni yako ithibitishwe.
                </Notice>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Notice tone="neutral" title="Hakuna leseni bado">
                Wasilisha ombi. Halmashauri ya wilaya inaamua, na leseni inatolewa ikiwa imethibitishwa.
              </Notice>
              <Field label="Wilaya" required>
                {(props) => (
                  <SelectControl {...props} value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}>
                    {DISTRICTS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </SelectControl>
                )}
              </Field>
              <Field label="Kata">
                {(props) => <TextInput {...props} value={form.ward} onChange={(event) => setForm({ ...form, ward: event.target.value })} />}
              </Field>
              <Field label="Maelezo" hint="Uzoefu, eneo unaofanyia kazi">
                {(props) => <TextArea {...props} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />}
              </Field>
              <Button type="button" className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={apply} disabled={busy}>
                {busy ? 'Inawasilisha…' : 'Wasilisha ombi la leseni'}
              </Button>
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