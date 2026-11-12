import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextArea, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, errorText, newKey, todayIso } from '@/lib/r4';
import { useT } from '@/i18n/I18nContext';

const BLANK = {
  unit_id: '',
  rent_amount: '',
  frequency: 'monthly',
  deposit_months: '1',
  notice_days: '30',
  due_day: '1',
  start_date: todayIso(),
  end_date: '',
  repair_duties: '',
  house_rules: '',
};

/** Builds a standard lease from a verified unit, then hands the landlord its claim code. */
export default function LeaseNew() {
  const { t } = useT();
  const [units, setUnits] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const keyRef = useRef(null);

  useEffect(() => {
    base44.entities.RentalUnit
      .filter({ verification_status: 'verified' }, { sort: '-created_date', limit: 40 })
      .then((page) => {
        const rows = page.items || [];
        setUnits(rows);
        if (rows.length) setForm((prev) => ({ ...prev, unit_id: prev.unit_id || rows[0].id }));
      })
      .catch(() => setUnits([]));
  }, []);

  const payload = () => ({
    unit_id: form.unit_id,
    rent_amount: Number(form.rent_amount) || 0,
    frequency: form.frequency,
    deposit_months: Number(form.deposit_months) || 0,
    notice_days: Number(form.notice_days) || 30,
    due_day: Number(form.due_day) || 1,
    start_date: form.start_date,
    end_date: form.end_date,
    repair_duties: form.repair_duties,
    house_rules: form.house_rules,
  });

  const run = async (mode) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'preview') {
        const data = await callFn('createLease', { ...payload(), preview: true });
        setPreview(data);
      } else {
        if (!keyRef.current) keyRef.current = newKey('lease');
        const data = await callFn('createLease', { ...payload(), idempotency_key: keyRef.current });
        keyRef.current = null;
        setSaved(data);
      }
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  if (units === null) {
    return <p className="text-[13px] text-muted-foreground">{t('leaseNew.loading')}</p>;
  }

  if (saved) {
    return (
      <div className="space-y-6">
        <PageHeader kicker={t('leaseNew.kicker')} title={t('leaseNew.createdTitle')} lede={t('leaseNew.createdLede')} />
        <Notice tone="positive" title={t('leaseNew.leaseRef', { ref: saved.lease_ref || '' })}>
          {t('leaseNew.giveCode')}
          <span className="ibmt-num mt-1 block font-heading text-lg font-semibold text-navy">{saved.claim_code}</span>
          {t('leaseNew.eachSigns')}
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep">
            <Link to={`/rent/lease/${saved.lease_id}`}>{t('leaseNew.openLease')}</Link>
          </Button>
          <Button asChild variant="outline" className="ibmt-tap">
            <Link to="/rent/landlord/leases">{t('leaseNew.allLeases')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!units.length) {
    return (
      <div className="space-y-6">
        <PageHeader kicker={t('leaseNew.kicker')} title={t('leaseNew.kicker')} />
        <Notice tone="caution" title={t('leaseNew.noVerifiedTitle')}>
          {t('leaseNew.noVerifiedBody')}
        </Notice>
        <Button asChild variant="outline" className="ibmt-tap">
          <Link to="/rent/landlord/portfolio">{t('leaseNew.goToUnits')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('leaseNew.kicker')}
        title={t('leaseNew.title')}
        lede={t('leaseNew.lede')}
        meta={[{ label: t('leaseNew.draftLegal') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title={t('leaseNew.details')}>
          <div className="space-y-4">
            <Field label={t('leaseNew.unit')} required>
              {(props) => (
                <SelectControl {...props} value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })}>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_ref} · {unit.ward} · {t(`leaseNew.unitType.${unit.unit_type || 'room'}`)}
                    </option>
                  ))}
                </SelectControl>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('leaseNew.rent')} required>
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
              <Field label={t('leaseNew.frequency')} required>
                {(props) => (
                  <SelectControl {...props} value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })}>
                    <option value="monthly">{t('leaseNew.monthly')}</option>
                    <option value="quarterly">{t('leaseNew.quarterly')}</option>
                  </SelectControl>
                )}
              </Field>
              <Field label={t('leaseNew.deposit')} hint={t('leaseNew.depositHint')}>
                {(props) => (
                  <TextInput
                    {...props}
                    className={`${props.className} ibmt-num`}
                    inputMode="numeric"
                    value={form.deposit_months}
                    onChange={(event) => setForm({ ...form, deposit_months: event.target.value.replace(/[^0-9]/g, '') })}
                  />
                )}
              </Field>
              <Field label={t('leaseNew.dueDay')} hint="1 – 28">
                {(props) => (
                  <TextInput
                    {...props}
                    className={`${props.className} ibmt-num`}
                    inputMode="numeric"
                    value={form.due_day}
                    onChange={(event) => setForm({ ...form, due_day: event.target.value.replace(/[^0-9]/g, '').slice(0, 2) })}
                  />
                )}
              </Field>
              <Field label={t('leaseNew.notice')}>
                {(props) => (
                  <TextInput
                    {...props}
                    className={`${props.className} ibmt-num`}
                    inputMode="numeric"
                    value={form.notice_days}
                    onChange={(event) => setForm({ ...form, notice_days: event.target.value.replace(/[^0-9]/g, '') })}
                  />
                )}
              </Field>
              <Field label={t('leaseNew.start')} required>
                {(props) => (
                  <TextInput {...props} type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
                )}
              </Field>
              <Field label={t('leaseNew.end')} required>
                {(props) => (
                  <TextInput {...props} type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
                )}
              </Field>
            </div>

            <Field label={t('leaseNew.repairs')} hint={t('leaseNew.repairsHint')}>
              {(props) => (
                <TextArea {...props} rows={3} value={form.repair_duties} onChange={(event) => setForm({ ...form, repair_duties: event.target.value })} />
              )}
            </Field>
            <Field label={t('leaseNew.rules')} hint={t('leaseNew.rulesHint')}>
              {(props) => (
                <TextArea {...props} rows={3} value={form.house_rules} onChange={(event) => setForm({ ...form, house_rules: event.target.value })} />
              )}
            </Field>

            {error && (
              <p role="alert" className="text-[12px] font-medium text-destructive">
                {errorText(error)}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="ibmt-tap" onClick={() => run('preview')} disabled={busy}>
                {busy ? t('leaseNew.preparing') : t('leaseNew.showTerms')}
              </Button>
              <Button
                type="button"
                className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                onClick={() => run('save')}
                disabled={busy}
              >
                {busy ? t('leaseNew.saving') : t('leaseNew.save')}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('leaseNew.termsTitle')} description={t('leaseNew.termsBody')}>
          {!preview ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t('leaseNew.termsHint')}
            </p>
          ) : (
            <ol className="space-y-3" aria-label={t('leaseNew.documentText')}>
              {/* Document text: shown exactly as the lease will store it, in both of its languages. */}
              {(preview.terms?.clauses || []).map((clause, index) => (
                <li key={index} className="border-b border-border pb-3 text-[12px] leading-relaxed last:border-b-0">
                  <p lang="sw">{clause.sw}</p>
                  <p lang="en" className="mt-1 text-muted-foreground">
                    {clause.en}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </div>
  );
}