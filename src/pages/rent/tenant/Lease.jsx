import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { LEASE_LABEL, callFn, fnError } from '@/lib/r4';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

/**
 * A tenant opens the lease the landlord created with the claim code handed to
 * them, then signs it from their own account.
 */
export default function TenantLease() {
  const { lang } = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    try {
      const data = await callFn('leaseSignature', { action: 'claim', code: code.trim() });
      setCode('');
      load();
      navigate(`/rent/lease/${data.lease_id}`);
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Mkataba wa kodi"
        title="Mkataba wangu"
        lede="Fungua mkataba kwa namba uliyopewa na mmiliki, kisha usaini kwa namba yako mwenyewe."
        meta={[{ label: 'Mkataba unakuwa hai baada ya sahihi zote mbili' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Fungua mkataba" description="Namba ya mkataba inakuja kwa mmiliki au wakala.">
          <div className="space-y-4">
            <Field label="Namba ya mkataba" required>
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
                {error}
              </p>
            )}
            <Button
              type="button"
              className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
              onClick={claim}
              disabled={busy || code.trim().length < 4}
            >
              {busy ? 'Inafungua…' : 'Fungua mkataba'}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Mikataba yangu" description="Mkataba mmoja kwa nyumba moja inayoendelea.">
          {leases === null ? (
            <p className="text-[13px] text-muted-foreground">Inapakia…</p>
          ) : leases.length === 0 ? (
            <Notice tone="neutral">Hakuna mkataba uliofunguliwa bado.</Notice>
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
                      <Link to={`/rent/lease/${lease.id}`}>Fungua</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <Notice tone="policy" title="Ukaguzi wa kisheria">
        Maneno ya mkataba ni template ya kawaida ya awali. Yanasubiri ukaguzi wa kisheria kabla ya kutumika kama mkataba
        rasmi wa kisheria.
      </Notice>
    </div>
  );
}