import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import DataTable from '@/components/ibmt/DataTable';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Money from '@/components/ibmt/Money';
import Notice from '@/components/ibmt/Notice';
import UploadField from '@/components/ibmt/UploadField';
import Field, { TextInput, SelectControl, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

const DEMO_AGENTS = [
  { id: 'IBMT-AGT-2026-000044', label: 'Bahari Properties Ltd — licence active' },
  { id: 'IBMT-AGT-2026-000051', label: 'Msimbazi Agency — licence expired' },
];

export default function LandlordPortfolio() {
  const { t, tt, lang } = useT();
  const units = useIBMTQuery('listUnits', { limit: 8 });
  const listings = useIBMTQuery('listListings', { limit: 8 });
  const mandates = useIBMTQuery('listMandates', { limit: 8 });

  const createUnit = useIBMTMutation('createUnit');
  const submitOwnership = useIBMTMutation('submitOwnershipEvidence');
  const createListing = useIBMTMutation('createListing');
  const createMandate = useIBMTMutation('createMandate');

  const [unitForm, setUnitForm] = useState({ ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', monthly_rent: '' });
  const [unitErrors, setUnitErrors] = useState({});
  const [evidenceFor, setEvidenceFor] = useState('');
  const [listingForm, setListingForm] = useState({ unit_id: '', headline: '', marketing_consent: true });
  const [listingErrors, setListingErrors] = useState({});
  const [mandateState, setMandateState] = useState({ agent_id: DEMO_AGENTS[0].id });

  useEffect(() => {
    if (!listingForm.unit_id && units.items.length > 0) {
      setListingForm((prev) => ({ ...prev, unit_id: units.items[0].id }));
    }
  }, [units.items, listingForm.unit_id]);

  const submitUnit = async (event) => {
    event.preventDefault();
    const next = {};
    const rent = Number(unitForm.monthly_rent);
    if (!rent || rent <= 0) next.monthly_rent = t('forms.fixErrors');
    if (!unitForm.mtaa || unitForm.mtaa.trim().length < 3) next.mtaa = t('forms.fixErrors');
    setUnitErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await createUnit.run({ ...unitForm, monthly_rent: rent });
    if (result) {
      setUnitForm({ ward_id: 'Mwananyamala', mtaa: 'Mwananyamala', monthly_rent: '' });
      setEvidenceFor(result.id);
    }
  };

  const submitListing = async (event) => {
    event.preventDefault();
    const next = {};
    if (!listingForm.headline || listingForm.headline.trim().length < 6) next.headline = t('forms.fixErrors');
    setListingErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await createListing.run({ ...listingForm, headline: listingForm.headline.trim() });
    if (result) setListingForm({ unit_id: units.items[0]?.id || '', headline: '', marketing_consent: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.rent')}
        title={t('nav.portfolio')}
        lede={t('policy.unitCompliance')}
        meta={[{ label: t('policy.addressMeterPrivate') }, { label: t('policy.registrationNoOwnership') }]}
      />

      <Tabs defaultValue="units">
        <TabsList className="ibmt-no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="units" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.unitRegister')}
          </TabsTrigger>
          <TabsTrigger value="listings" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('rent.listings')}
          </TabsTrigger>
          <TabsTrigger value="mandates" className="ibmt-tap data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            {t('term.agent')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title={t('rent.unitRegister')} description={t('policy.ownershipVerifiedFirst')}>
              <DataState query={units} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <ul className="space-y-4">
                    {units.items.map((unit) => (
                      <li key={unit.id} className="rounded-md border border-border px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="ibmt-num text-[13px] font-semibold text-navy">{unit.unit_ref}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {unit.mtaa} · {unit.ward_id} · {t('rent.termsVersion')} {unit.version}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={unit.registration_status} />
                            <StatusBadge status={unit.ownership_status} />
                            <StatusBadge status={unit.eligible_for_rent ? 'verified' : 'unverified'} label={unit.eligible_for_rent ? t('rent.eligible') : t('rent.notEligible')} />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                          <Money amount={unit.monthly_rent} note={t('rent.rentAmount')} />
                          <span className="ibmt-hint">{t('policy.addressMeterPrivate')}</span>
                        </div>
                        {unit.verification?.reason && (
                          <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed">
                            {tt(unit.verification.reason)}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Button type="button" variant="outline" size="sm" onClick={() => setEvidenceFor(evidenceFor === unit.id ? '' : unit.id)}>
                            {t('rent.uploadEvidence')}
                          </Button>
                          <span className="ibmt-hint">{t(unit.certificate_note)}</span>
                        </div>
                        {evidenceFor === unit.id && (
                          <div className="mt-3">
                            <UploadField
                              label={t('rent.ownershipEvidence')}
                              hint={t('policy.addressMeterPrivate')}
                              purpose="ownership_evidence"
                              onUploaded={(result) =>
                                submitOwnership.run({ id: unit.id, unit_id: unit.id, evidence_uri: result?.file_id, kind: 'title_deed' })
                              }
                            />
                            <FormStatus mutation={submitOwnership} className="mt-2" />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.unit')} description={t('forms.requiredMark')}>
              <form onSubmit={submitUnit} className="space-y-4" noValidate>
                <Field label={t('term.ward')}>
                  {(props) => (
                    <SelectControl {...props} value={unitForm.ward_id} onChange={(event) => setUnitForm({ ...unitForm, ward_id: event.target.value })}>
                      {['Mwananyamala', 'Kariakoo', 'Ilala'].map((ward) => (
                        <option key={ward} value={ward}>
                          {ward}
                        </option>
                      ))}
                    </SelectControl>
                  )}
                </Field>
                <Field label={t('term.mtaa')} required error={unitErrors.mtaa || createUnit.fieldErrors?.mtaa}>
                  {(props) => <TextInput {...props} value={unitForm.mtaa} onChange={(event) => setUnitForm({ ...unitForm, mtaa: event.target.value })} />}
                </Field>
                <Field label={t('rent.rentAmount')} required error={unitErrors.monthly_rent} hint="TZS">
                  {(props) => (
                    <TextInput {...props} className={`${props.className} ibmt-num`} inputMode="numeric" value={unitForm.monthly_rent} onChange={(event) => setUnitForm({ ...unitForm, monthly_rent: event.target.value.replace(/[^0-9]/g, '') })} />
                  )}
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={createUnit.saving}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {createUnit.saving ? t('common.working') : t('common.add')}
                  </Button>
                  <FormStatus mutation={createUnit} />
                </div>
              </form>
              <Notice tone="privacy" className="mt-4">
                {t('policy.addressMeterPrivate')}
              </Notice>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="listings" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title={t('rent.listings')} description={t('policy.addressesNeverPublic')}>
              <DataState query={listings} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <DataTable
                    columns={[
                      { key: 'headline', header: t('common.details'), className: 'font-medium', render: (row) => tt(row.headline) },
                      { key: 'mtaa', header: t('term.mtaa') },
                      { key: 'monthly_rent', header: t('rent.rentAmount'), align: 'right', render: (row) => <Money amount={row.monthly_rent} /> },
                      { key: 'verified', header: t('rent.ownershipEvidence'), render: (row) => <StatusBadge status={row.verified ? 'verified' : 'unverified'} /> },
                      { key: 'marketing_consent', header: t('common.optional'), render: (row) => <StatusBadge status={row.marketing_consent ? 'active' : 'inactive'} /> },
                      { key: 'listed_at', header: t('common.date'), className: 'ibmt-num', render: (row) => formatDate(row.listed_at, lang) },
                    ]}
                    rows={listings.items}
                  />
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.unit')} description={t('policy.addressesNeverPublic')}>
              <form onSubmit={submitListing} className="space-y-4" noValidate>
                <Field label={t('term.unit')} required error={createListing.fieldErrors?.unit_id}>
                  {(props) => (
                    <SelectControl {...props} value={listingForm.unit_id} onChange={(event) => setListingForm({ ...listingForm, unit_id: event.target.value })}>
                      <option value="">—</option>
                      {units.items.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unit_ref} · {unit.eligible_for_rent ? t('rent.eligible') : t('rent.notEligible')}
                        </option>
                      ))}
                    </SelectControl>
                  )}
                </Field>
                <Field label={t('common.details')} required error={listingErrors.headline}>
                  {(props) => <TextInput {...props} value={listingForm.headline} onChange={(event) => setListingForm({ ...listingForm, headline: event.target.value })} />}
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium">{t('common.optional')}</p>
                    <p className="ibmt-hint">{t('policy.consentSeparate')}</p>
                  </div>
                  <Switch
                    checked={listingForm.marketing_consent}
                    onCheckedChange={(next) => setListingForm({ ...listingForm, marketing_consent: next })}
                    aria-label={t('common.optional')}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={createListing.saving}>
                    {createListing.saving ? t('common.working') : t('common.add')}
                  </Button>
                  <FormStatus mutation={createListing} />
                </div>
              </form>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="mandates" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title={t('term.mandate')} description={t('policy.commissionRule')}>
              <DataState query={mandates} skeleton="table" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
                {() => (
                  <ul className="space-y-3">
                    {mandates.items.map((mandate) => (
                      <li key={mandate.id} className="rounded-md border border-border px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-navy">{mandate.agent_name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={mandate.licence_status} label={`${t('term.licence')}: ${t(`status.${mandate.licence_status}`)}`} />
                            <StatusBadge status={mandate.status} />
                          </div>
                        </div>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {(mandate.scope || []).map((item) => (
                            <li key={item.en} className="rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                              {tt(item)}
                            </li>
                          ))}
                        </ul>
                        {mandate.rejected_reason && <Notice tone="caution" className="mt-3">{t(mandate.rejected_reason)}</Notice>}
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </SectionCard>

            <SectionCard title={t('term.mandate')} description={t('policy.licenceRule')}>
              <Field label={t('term.agent')} hint={t('common.demonstration')}>
                {(props) => (
                  <SelectControl {...props} value={mandateState.agent_id} onChange={(event) => setMandateState({ agent_id: event.target.value })}>
                    {DEMO_AGENTS.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.label}
                      </option>
                    ))}
                  </SelectControl>
                )}
              </Field>
              <Button
                type="button"
                className="ibmt-tap mt-4 gap-2 bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                disabled={createMandate.saving}
                onClick={() => createMandate.run({ agent_id: mandateState.agent_id })}
              >
                {createMandate.saving ? t('common.working') : t('common.add')}
              </Button>
              <FormStatus mutation={createMandate} className="mt-3" />
              {createMandate.status === 'success' && createMandate.result?.status === 'rejected' && (
                <Notice tone="caution" title={t('common.reject')} className="mt-3">
                  {t(createMandate.result.rejected_reason)}
                </Notice>
              )}
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}