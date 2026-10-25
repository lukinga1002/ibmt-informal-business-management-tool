import { useEffect, useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import Timeline from '@/components/ibmt/Timeline';
import Notice from '@/components/ibmt/Notice';
import UploadField from '@/components/ibmt/UploadField';
import Field, { TextInput, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';

const STEP_STATUS = {
  complete: 'success',
  in_review: 'warning',
  pending: 'pending',
  queried: 'warning',
};

export default function OperatorOnboarding() {
  const { t, tt } = useT();
  const profile = useIBMTQuery('getOperatorProfile');
  const save = useIBMTMutation('saveOperatorProfile');
  const [form, setForm] = useState({ trading_name: '', phone: '', category: '' });
  const [errors, setErrors] = useState({});
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    if (profile.data) {
      setForm({
        trading_name: tt(profile.data.trading_name),
        phone: profile.data.phone || '',
        category: tt(profile.data.category),
      });
    }
  }, [profile.data, tt]);

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.trading_name || form.trading_name.trim().length < 3) next.trading_name = t('forms.fixErrors');
    if (form.phone && form.phone.trim().length < 9) next.phone = t('forms.fixErrors');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    save.run({ trading_name: form.trading_name.trim(), phone: form.phone.trim(), category: form.category });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('nav.onboarding')}
        lede={t('landing.forOperatorsBody')}
        meta={[{ label: profile.data?.business_id || '—' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title={t('nav.onboarding')} description={t('forms.requiredMark')}>
          <DataState query={profile} skeleton="lines">
            {() => (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <Field
                  label={t('brand.full')}
                  required
                  error={errors.trading_name || save.fieldErrors?.trading_name}
                  hint={profile.data?.name}
                >
                  {(props) => (
                    <TextInput {...props} value={form.trading_name} onChange={(event) => setForm({ ...form, trading_name: event.target.value })} />
                  )}
                </Field>
                <Field label={t('roles.operator')} hint={profile.data?.council}>
                  {(props) => <TextInput {...props} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />}
                </Field>
                <Field label="Telephone" error={errors.phone}>
                  {(props) => <TextInput {...props} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} inputMode="tel" />}
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" disabled={save.saving}>
                    {save.saving ? t('common.working') : t('common.save')}
                  </Button>
                  <FormStatus mutation={save} successLabel={t('settings.saved')} />
                </div>
              </form>
            )}
          </DataState>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={t('nav.onboarding')} description={t('policy.assistedOnboarding')}>
            <DataState query={profile} skeleton="lines">
              {(record) => (
                <Timeline
                  items={(record.onboarding_steps || []).map((step) => ({
                    id: step.id,
                    label: step.label,
                    statusKey: step.state,
                    status: STEP_STATUS[step.state] || 'pending',
                  }))}
                />
              )}
            </DataState>
          </SectionCard>

          <SectionCard title={t('rent.uploadEvidence')} description={t('policy.proxyRegistration')}>
            <UploadField
              label={t('common.upload')}
              hint={t('common.demonstrationNote')}
              purpose="onboarding_support"
              onUploaded={(result) => setUploads((prev) => [...prev, result])}
            />
            {uploads.length > 0 && (
              <ul className="ibmt-num mt-3 space-y-1 text-[12px] text-muted-foreground">
                {uploads.map((upload) => (
                  <li key={upload.file_id}>{upload.file_id} · {upload.uploaded_at}</li>
                ))}
              </ul>
            )}
            <Notice tone="privacy" className="mt-4">
              {t('policy.addressesNeverPublic')}
            </Notice>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}