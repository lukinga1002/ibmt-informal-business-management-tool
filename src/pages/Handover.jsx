import { useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataTable from '@/components/ibmt/DataTable';
import Notice from '@/components/ibmt/Notice';
import { SCREEN_INVENTORY, COMPONENT_INVENTORY } from '@/config/inventory';
import { ROLE_NAV } from '@/config/roleNav';
import {
  AUTH_BEHAVIOUR,
  CONTRACT_VERSION,
  ENV_NAMES,
  ERROR_CODES,
  OPERATIONS,
  PLATFORM_CONSTRAINTS,
  REMAINING_MOCKS,
  UPLOAD_REQUIREMENTS,
} from '@/api/operations';

const TABS = [
  { key: 'scope', labelKey: 'handover.boundary' },
  { key: 'inventory', labelKey: 'handover.routes' },
  { key: 'contract', labelKey: 'handover.contract' },
  { key: 'steps', labelKey: 'handover.assumptions' },
];

function KeyValue({ label, value }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <dt className="ibmt-kicker">{label}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

export default function Handover() {
  const { t } = useT();
  const [tab, setTab] = useState('scope');

  const operations = Object.entries(OPERATIONS).map(([id, spec]) => ({ id, ...spec }));
  const dependents = SCREEN_INVENTORY.filter((screen) => screen.apis.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="ibmt-page">
        <PageHeader
          kicker={t('brand.name')}
          title={t('handover.title')}
          lede={t('handover.lede')}
          meta={[
            { label: `${t('common.notConfirmed')} · ${CONTRACT_VERSION}` },
            { label: `${t('handover.screens')}: ${SCREEN_INVENTORY.length}` },
            { label: `${t('handover.matrix')}: ${operations.length}` },
          ]}
        />

        <Notice tone="caution" className="mt-4">
          {t('handover.enOnly')}
        </Notice>

        <div role="tablist" aria-label={t('handover.title')} className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              role="tab"
              type="button"
              aria-selected={tab === entry.key}
              onClick={() => setTab(entry.key)}
              className={`ibmt-tap -mb-px border-b-2 px-3 text-[13px] font-medium transition-colors ${
                tab === entry.key ? 'border-navy text-navy' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(entry.labelKey)}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {tab === 'scope' && (
            <>
              <SectionCard title={t('handover.boundary')} description={t('handover.boundaryBody')}>
                <dl>
                  {PLATFORM_CONSTRAINTS.map((constraint, index) => (
                    <KeyValue key={index} label={`${t('handover.assumptions')} ${index + 1}`} value={constraint} />
                  ))}
                </dl>
              </SectionCard>
              <SectionCard title={t('handover.mocks')}>
                <ol className="grid gap-2 md:grid-cols-2">
                  {REMAINING_MOCKS.map((item) => (
                    <li key={item} className="border-l-2 border-gold pl-3 text-[13px] leading-relaxed text-navy-ink">
                      {item}
                    </li>
                  ))}
                </ol>
              </SectionCard>
            </>
          )}

          {tab === 'inventory' && (
            <>
              <SectionCard title={t('handover.routes')} description={t('common.notConfirmed')}>
                <DataTable
                  dense
                  columns={[
                    { key: 'path', header: 'Route', className: 'ibmt-num font-medium', render: (row) => row.path },
                    { key: 'scope', header: 'Role', render: (row) => t(`roles.${row.scope}`) },
                    { key: 'purpose', header: 'Purpose' },
                    { key: 'apis', header: 'Operations', hideBelow: 'lg', render: (row) => <span className="ibmt-num text-[11px] text-muted-foreground">{row.apis.join(' · ') || '—'}</span> },
                  ]}
                  rows={SCREEN_INVENTORY}
                />
              </SectionCard>

              <SectionCard title={t('handover.roleMap')}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(ROLE_NAV).map(([role, sections]) => (
                    <div key={role} className="rounded-md border border-border px-4 py-3">
                      <p className="font-heading text-[13px] font-semibold text-navy">{t(`roles.${role}`)}</p>
                      <ul className="mt-2 space-y-1">
                        {sections.flatMap((section) => section.items).map((item) => (
                          <li key={item.to} className="ibmt-num text-[12px] text-muted-foreground">
                            {item.to}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title={t('handover.components')}>
                <DataTable
                  dense
                  columns={[
                    { key: 'name', header: 'Component', className: 'font-medium' },
                    { key: 'where', header: 'Used in' },
                    { key: 'purpose', header: 'Purpose' },
                  ]}
                  rows={COMPONENT_INVENTORY}
                />
              </SectionCard>
            </>
          )}

          {tab === 'contract' && (
            <>
              <SectionCard title={t('handover.contract')} description={`${CONTRACT_VERSION} — ${t('common.notConfirmed')}`}>
                <DataTable
                  dense
                  columns={[
                    { key: 'method', header: 'Method', className: 'ibmt-num' },
                    { key: 'path', header: 'Proposed path', className: 'ibmt-num font-medium' },
                    { key: 'scope', header: 'Role', render: (row) => row.scope.map((role) => (role === '*' ? t('common.all') : t(`roles.${role}`))).join(' · ') },
                    { key: 'idempotent', header: 'Idempotency', hideBelow: 'lg', render: (row) => (row.idempotent ? 'Required' : '—') },
                    { key: 'purpose', header: 'Purpose', hideBelow: 'md' },
                  ]}
                  rows={operations}
                />
              </SectionCard>

              <SectionCard title={t('handover.schema')}>
                <ul className="grid gap-3 md:grid-cols-2">
                  {operations.slice(0, 24).map((operation) => (
                    <li key={operation.id} className="rounded-md border border-border px-3 py-2">
                      <p className="ibmt-num text-[12px] font-semibold text-navy">{operation.method} {operation.path}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {(operation.fields || []).join(' · ') || '—'}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="ibmt-hint mt-3">{t('handover.enOnly')}</p>
              </SectionCard>

              <SectionCard title={t('handover.errors')}>
                <DataTable
                  dense
                  columns={[
                    { key: 'code', header: 'Code', className: 'ibmt-num font-medium' },
                    { key: 'http', header: 'HTTP' },
                    { key: 'body', header: 'Body' },
                    { key: 'frontend', header: 'Frontend behaviour' },
                  ]}
                  rows={ERROR_CODES}
                />
              </SectionCard>
            </>
          )}

          {tab === 'steps' && (
            <>
              <SectionCard title={t('handover.auth')}>
                <dl>
                  {Object.entries(AUTH_BEHAVIOUR).map(([key, value]) => (
                    <KeyValue key={key} label={key} value={value} />
                  ))}
                </dl>
              </SectionCard>

              <SectionCard title={t('handover.uploads')}>
                <dl>
                  {Object.entries(UPLOAD_REQUIREMENTS).map(([key, value]) => (
                    <KeyValue key={key} label={key} value={value} />
                  ))}
                </dl>
              </SectionCard>

              <SectionCard title={t('handover.env')}>
                <DataTable
                  dense
                  columns={[
                    { key: 'name', header: 'Name', className: 'ibmt-num font-medium' },
                    { key: 'where', header: 'Where it lives' },
                    { key: 'note', header: 'Note' },
                  ]}
                  rows={ENV_NAMES}
                />
              </SectionCard>

              <SectionCard title="Source handover" description="How the interface source reaches the backend team.">
                <ul className="space-y-3 text-[13px] leading-relaxed text-foreground">
                  <li>
                    <strong className="font-semibold">Project export.</strong> In the app editor, open More actions and choose Export project
                    as ZIP, then Download ZIP. The archive contains the current saved code, not data, secrets, users or history.
                  </li>
                  <li>
                    <strong className="font-semibold">Two-way repository sync.</strong> Connect a repository from the app dashboard GitHub
                    entry point so changes made here and in the repository stay in step; merge into the main branch and publish here to make
                    it live.
                  </li>
                  <li>
                    <strong className="font-semibold">Restriction to state plainly.</strong> The exported project still depends on this
                    platform to run; self-hosting is not supported. The interface is therefore handed over as source, not as a deployable
                    package.
                  </li>
                  <li>
                    <strong className="font-semibold">What is not in this layer.</strong> No business database, no tax rule, no payment flow,
                    no licence decision and no authoritative audit log. Every business value on screen arrives through the operations above.
                  </li>
                </ul>
              </SectionCard>

              <SectionCard title={t('handover.matrix')} description="Screen to API mapping, as proposed.">
                <DataTable
                  dense
                  columns={[
                    { key: 'path', header: 'Screen', className: 'ibmt-num font-medium' },
                    { key: 'apis', header: 'Required operations', render: (row) => <span className="ibmt-num text-[11px]">{row.apis.join(' · ')}</span> },
                  ]}
                  rows={dependents}
                />
              </SectionCard>
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}