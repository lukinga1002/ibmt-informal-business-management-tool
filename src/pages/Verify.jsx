import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTQuery } from '@/api/hooks';
import { useIBMT } from '@/api/IBMTContext';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import DataState from '@/components/ibmt/DataState';
import PageHeader from '@/components/ibmt/PageHeader';
import Notice from '@/components/ibmt/Notice';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ibmt/Field';
import { formatDate } from '@/lib/format';

const KINDS = [
  { key: 'receipt', labelKey: 'verify.tabReceipt', example: 'IBMT-RCP-2026-004812' },
  { key: 'business', labelKey: 'verify.tabBusiness', example: 'IBMT-BIZ-2026-000913' },
  { key: 'lease', labelKey: 'verify.tabLease', example: 'IBMT-LEASE-2026-000271' },
  { key: 'agent', labelKey: 'verify.tabAgent', example: 'IBMT-AGT-2026-000044' },
  { key: 'unit', labelKey: 'verify.tabUnit', example: 'IBMT-UNIT-2026-002310' },
];

export default function Verify() {
  const { t, tt, lang } = useT();
  const { isMock } = useIBMT();
  const [kind, setKind] = useState('receipt');
  const [reference, setReference] = useState('');
  const [submitted, setSubmitted] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('reference');
    const kindFromUrl = params.get('kind');
    if (fromUrl) {
      setReference(fromUrl);
      setSubmitted(fromUrl);
    }
    if (kindFromUrl && KINDS.some((entry) => entry.key === kindFromUrl)) setKind(kindFromUrl);
  }, []);

  const query = useIBMTQuery('verifyRecord', { kind, reference: submitted }, { enabled: Boolean(submitted) });
  const record = query.data;
  const notFound = query.kind === 'ready' && record && record.found === false;

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <PageHeader kicker={t('brand.name')} title={t('verify.title')} lede={t('verify.lede')} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div role="tablist" aria-label={t('verify.reference')} className="flex flex-wrap gap-1 border-b border-border">
              {KINDS.map((entry) => (
                <button
                  key={entry.key}
                  role="tab"
                  type="button"
                  aria-selected={kind === entry.key}
                  onClick={() => {
                    setKind(entry.key);
                    setSubmitted('');
                  }}
                  className={`ibmt-tap -mb-px border-b-2 px-3 text-[13px] font-medium transition-colors ${
                    kind === entry.key ? 'border-navy text-navy' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(entry.labelKey)}
                </button>
              ))}
            </div>

            <form
              className="mt-5 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(reference.trim());
              }}
            >
              <label htmlFor="reference" className="sr-only">
                {t('verify.reference')}
              </label>
              <TextInput
                id="reference"
                className="ibmt-num uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal"
                placeholder={t('landing.verifyPlaceholder')}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                autoComplete="off"
              />
              <Button type="submit" className="ibmt-tap shrink-0 gap-2 bg-navy px-5 font-semibold text-primary-foreground hover:bg-navy-deep">
                <Search className="h-4 w-4" aria-hidden="true" />
                {t('verify.lookUp')}
              </Button>
            </form>

            {isMock && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="ibmt-kicker">{t('common.demonstration')}</span>
                {KINDS.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => {
                      setKind(entry.key);
                      setReference(entry.example);
                      setSubmitted(entry.example);
                    }}
                    className="ibmt-num rounded-sm border border-dashed border-gold-ink/50 px-2 py-1 text-[11px] text-gold-ink hover:bg-gold-soft"
                  >
                    {entry.example}
                  </button>
                ))}
              </div>
            )}

            {submitted && (
              <div className="mt-6">
                {notFound ? (
                  <div role="status" className="rounded-lg border border-dashed border-border bg-card px-5 py-6">
                    <p className="font-heading text-[15px] font-semibold text-navy">{t('verify.notFound')}</p>
                    <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{t('verify.notFoundBody')}</p>
                  </div>
                ) : (
                  <DataState query={query} skeleton="lines" emptyTitle={t('verify.notFound')} emptyBody={t('verify.notFoundBody')}>
                    {() => (
                      <section className="ibmt-panel overflow-hidden">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream/50 px-5 py-4">
                          <div>
                            <p className="ibmt-kicker">{t('verify.found')}</p>
                            <p className="ibmt-num mt-1 font-heading text-[15px] font-semibold text-navy">{record.reference}</p>
                          </div>
                          <div className="text-right">
                            <p className="ibmt-kicker">{t('verify.issuedOn')}</p>
                            <p className="ibmt-num mt-1 text-[13px]">{formatDate(record.issued_on, lang)}</p>
                          </div>
                        </header>
                        <dl className="divide-y divide-border">
                          {record.public_fields?.map((field) => (
                            <div key={field.label.en} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                              <dt className="shrink-0 text-[12px] font-medium text-muted-foreground">{tt(field.label)}</dt>
                              <dd className="text-[13px] text-foreground sm:text-right">{tt(field.value)}</dd>
                            </div>
                          ))}
                        </dl>
                        <footer className="border-t border-border px-5 py-3">
                          <p className="ibmt-hint">
                            {t('verify.verifiedOn')}: {formatDate(record.searched_at, lang)} · {t('verify.module')}: {t(`brand.${record.module}`)}
                          </p>
                        </footer>
                      </section>
                    )}
                  </DataState>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <Notice tone="privacy" title={t('verify.publicScope')}>
              {t('verify.publicScopeBody')}
            </Notice>
            <Notice tone="neutral">{t('verify.privacyNote')}</Notice>
            <Notice tone="caution">{t('verify.rateLimitNote')}</Notice>
            <Notice tone="policy">{t('policy.recordNotFiscal')}</Notice>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}