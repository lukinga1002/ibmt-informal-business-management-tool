import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { LEASE_LABEL, callFn, errorText } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * A tenant opens the lease the landlord created with the claim code handed to
 * them, then signs it from their own account.
 */
export default function TenantLease() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [leases, setLeases] = useState(null);

  const load = useCallback(() => {
    base44.entities.Lease
      .filter({}, { sort: '-created_date', limit: 20 })
      .then((page) => setLeases(page.items || []))
      .catch(() => setLeases([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await callFn('leaseSignature', { action: 'claim', code: code.trim() });
      setCode('');
      load();
      navigate(`/rent/lease/${data.lease_id}`);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('myLeases.kicker')}
        title={t('myLeases.title')}
        lede={t('myLeases.lede')}
        meta={[{ label: t('myLeases.activeWhen') }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title={t('myLeases.openTitle')} description={t('myLeases.openBody')}>
          <div className="space-y-4">
            <Field label={t('myLeases.code')} required>
              {(props) => (
                <TextInput
                  {...props}
                  className={`${props.className} ibmt-num`}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="off"
                />
              )}
            </Field>
            {error && (
              <p role="alert" className="text-[12px] font-medium text-destructive">
                {errorText(error)}
              </p>
            )}
            <Button
              type="button"
              className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
              onClick={claim}
              disabled={busy || code.trim().length < 4}
            >
              {busy ? t('myLeases.opening') : t('myLeases.open')}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={t('myLeases.listTitle')} description={t('myLeases.listBody')}>
          {leases === null ? (
            <p className="text-[13px] text-muted-foreground">{t('common.loading')}…</p>
          ) : leases.length === 0 ? (
            <Notice tone="neutral">{t('myLeases.none')}</Notice>
          ) : (
            <ul className="space-y-3">
              {leases.map((lease) => (
                <li key={lease.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="ibmt-num text-[13px] font-medium">{lease.lease_ref}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {lease.unit_ref} · {lease.ward} · {formatDate(lease.start_date, lang)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={lease.status} label={LEASE_LABEL[lease.status] || lease.status} />
                    <Button asChild size="sm" variant="outline" className="ibmt-tap">
                      <Link to={`/rent/lease/${lease.id}`}>{t('common.open')}</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <Notice tone="policy" title={t('myLeases.legalTitle')}>
        {t('myLeases.legalBody')}
      </Notice>
    </div>
  );
}