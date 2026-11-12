import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import EntryCode from '@/components/public/EntryCode';
import { useT } from '@/i18n/I18nContext';

/**
 * The code step has its own page. Choosing a way in on the rent site lands
 * here, and the workspace opens only after the six digit code is written.
 */
const ENTRIES = ['landlord', 'tenant', 'agent', 'mtaa_officer', 'council'];

export default function Access() {
  const { entry } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const meta = ENTRIES.includes(entry);

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />

      <main className="ibmt-page max-w-2xl">
        <Link
          to="/rent"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-[12px] font-semibold text-navy-soft hover:text-gold-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('entry.back')}
        </Link>

        {!meta ? (
          <p className="ibmt-panel mt-4 p-5 text-[13px] text-muted-foreground">
            {t('entry.unknown')}
          </p>
        ) : (
          <>
            <header className="mt-4">
              <p className="ibmt-kicker">{t('entry.kicker')}</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-navy sm:text-[28px]">
                {t(`entry.role.${entry}`)}
              </h1>
              <p className="ibmt-lede mt-2">
                {t('entry.lede')}
              </p>
            </header>

            <EntryCode
              entry={{ id: entry }}
              onOpened={(route) => navigate(route, { replace: true })}
              onBack={() => navigate('/rent')}
            />
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}