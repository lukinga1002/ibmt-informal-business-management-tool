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
import { callFn, errorText } from '@/lib/r4';
import { labelTable } from '@/i18n/translate';
import { useT } from '@/i18n/I18nContext';
import { base44 } from '@/api/base44Client';
import { REGIONS } from '@/config/r3';

const LICENCE_LABEL = labelTable({
  pending: 'agentDash.pendingCouncil',
  approved: 'agentLicences.status.approved',
  rejected: 'agentLicences.status.rejected',
  suspended: 'agentLicences.status.suspended',
  revoked: 'agentLicences.status.revoked',
});

const SCOPE_LABEL = labelTable({ rental: 'agentLicences.scope.rental', sale: 'agentLicences.scope.sale', both: 'agentDash.scopeBoth' });
const SCOPES = ['rental', 'sale', 'both'];
const OPEN_STATUS = ['pending', 'approved', 'suspended'];

/** The agent's own workspace: licence, mandates and the commission owed to them. */
export default function AgentDashboard() {
  const { t, lang } = useT();
  const [licences, setLicences] = useState([]);
  const [councils, setCouncils] = useState([]);
  const [mandates, setMandates] = useState([]);
  const [commission, setCommission] = useState(null);
  const [form, setForm] = useState({
    agent_name: '',
    agent_phone: '',
    agent_email: '',
    nida_number: '',
    business_name: '',
    region: REGIONS[0].region,
    district: REGIONS[0].districts[0],
    scope: 'rental',
    ward: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
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
      if (me) {
        setForm((prev) => ({
          ...prev,
          agent_name: prev.agent_name || me.full_name || '',
          agent_email: prev.agent_email || me.email || '',
          agent_phone: prev.agent_phone || (me.data && me.data.phone) || '',
        }));
      }
    } catch (err) {
      setError({ err });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const districts = REGIONS.find((item) => item.region === form.region)?.districts || REGIONS[0].districts;

  const apply = async () => {
    if (form.agent_name.trim().length < 3) return setError({ key: 'agentDash.errors.name' });
    if (!/^(0\d{9}|255\d{9})$/.test(form.agent_phone.replace(/\D/g, ''))) {
      return setError({ key: 'agentDash.errors.phone' });
    }
    if (form.nida_number.length !== 20) return setError({ key: 'tenantJoin.errors.nida' });
    setBusy(true);
    setError(null);
    try {
      await callFn('agentLicence', {
        action: 'apply',
        agent_name: form.agent_name,
        agent_phone: form.agent_phone,
        agent_email: form.agent_email,
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
      setError({ err });
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
        kicker={t('agentDash.kicker')}
        title={t('entry.role.agent')}
        lede={t('agentDash.lede')}
        meta={[{ label: t('agentDash.ownerPays') }]}
        actions={
          <>
            <Link
              to="/rent/pangisha"
              className="ibmt-tap inline-flex items-center gap-2 rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground hover:bg-navy-deep"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t('portfolioDemo.rentOut')}
            </Link>
            <TenantFeeNote />
          </>
        }
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {errorText(error)}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SectionCard title={t('agentDash.licence')} description={t('agentDash.licenceBody')}>
          {loading ? (
            <p className="text-[13px] text-muted-foreground">{t('agentDash.loading')}</p>
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
                <Notice tone="caution" title={t('agentDash.needLicenceTitle')}>
                  {t('agentDash.needLicenceBody')}
                </Notice>
              )}

              {openInDistrict ? (
                <Notice tone="neutral" title={t('agentDash.openTitle')}>
                  {t('agentDash.openBody')}
                </Notice>
              ) : (
                <>
                  <Field label={t('agentDash.name')} required>
                    {(props) => (
                      <TextInput {...props} value={form.agent_name} onChange={(event) => setForm({ ...form, agent_name: event.target.value })} />
                    )}
                  </Field>
                  <Field label={t('joinForm.phone')} required hint={t('joinForm.phoneHint')}>
                    {(props) => (
                      <TextInput
                        {...props}
                        className={`${props.className} ibmt-num`}
                        inputMode="tel"
                        value={form.agent_phone}
                        onChange={(event) => setForm({ ...form, agent_phone: event.target.value.replace(/[^0-9+]/g, '').slice(0, 13) })}
                      />
                    )}
                  </Field>
                  <Field label={t('joinForm.email')} hint={t('agentDash.emailHint')}>
                    {(props) => (
                      <TextInput
                        {...props}
                        type="email"
                        value={form.agent_email}
                        onChange={(event) => setForm({ ...form, agent_email: event.target.value })}
                      />
                    )}
                  </Field>
                  <Field label={t('tenantJoin.nida')} required hint={t('agentDash.nidaHint')}>
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
                  <Field label={t('agentDash.business')} hint={t('agentDash.businessHint')}>
                    {(props) => (
                      <TextInput {...props} value={form.business_name} onChange={(event) => setForm({ ...form, business_name: event.target.value })} />
                    )}
                  </Field>
                  <Field label={t('joinForm.region')} required>
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
                  <Field label={t('agentDash.district')} required>
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
                  <Field label={t('agentDash.scope')} required hint={t('agentDash.scopeHint')}>
                    {(props) => (
                      <SelectControl {...props} value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })}>
                        {SCOPES.map((value) => (
                          <option key={value} value={value}>
                            {SCOPE_LABEL[value]}
                          </option>
                        ))}
                      </SelectControl>
                    )}
                  </Field>
                  {enforcedCouncil && (
                    <Notice tone="policy" title={t('agentDash.mandatoryTitle')}>
                      {enforcedCouncil.bylaw_reference
                        ? t('agentDash.bylaw', { ref: enforcedCouncil.bylaw_reference })
                        : t('agentDash.mandatoryBody')}
                    </Notice>
                  )}
                  <Field label={t('joinForm.ward')}>
                    {(props) => <TextInput {...props} value={form.ward} onChange={(event) => setForm({ ...form, ward: event.target.value })} />}
                  </Field>
                  <Field label={t('pangisha.notes')} hint={t('agentDash.notesHint')}>
                    {(props) => <TextArea {...props} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />}
                  </Field>
                  <Button type="button" className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={apply} disabled={busy}>
                    {busy ? t('agentDash.submitting') : t('agentDash.submit')}
                  </Button>
                </>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title={t('agentDash.commission')} description={t('agentDash.commissionBody')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="ibmt-kicker">{t('agentDash.owed')}</p>
              <Money amount={totals.owed} strong />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="ibmt-kicker">{t('agentDash.paid')}</p>
              <Money amount={totals.paid} strong />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="ibmt-kicker">{t('agentDash.renewals')}</p>
              <p className="ibmt-num font-heading text-[17px] font-semibold">{totals.renewals}</p>
              <p className="text-[11px] text-muted-foreground">{t('agentDash.renewalZero')}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(commission?.rows || []).slice(0, 6).map((row) => (
              <li key={row.commission_id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{row.unit_ref || '—'}</p>
                  <p className="text-[11px] text-muted-foreground">{row.kind === 'renewal' ? t('agentDash.renewalRow') : t('agentDash.newTenancy')}</p>
                </div>
                <Money amount={row.amount} />
              </li>
            ))}
            {!(commission?.rows || []).length && <p className="text-[13px] text-muted-foreground">{t('agentDash.noCommission')}</p>}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title={t('agentDash.myMandates')} description={t('agentDash.myMandatesBody')}>
        {mandates.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t('mandates.none')}</p>
        ) : (
          <ul className="space-y-3">
            {mandates.map((row) => (
              <li key={row.mandate_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    {row.unit_ref || row.unit_id} · {row.agent_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('agentDash.mandateFee', { amount: Number(row.fee_amount || 0).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-TZ') })}
                    {row.starts_on ? ` · ${t('pangisha.from', { date: row.starts_on })}` : ''}
                  </p>
                </div>
                <StatusBadge status={row.status} label={t(`mandates.status.${row.status === 'active' || row.status === 'offered' ? row.status : 'ended'}`)} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}