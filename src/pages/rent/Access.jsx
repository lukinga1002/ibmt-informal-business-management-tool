import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PublicTopBar from '@/components/public/PublicTopBar';
import PublicFooter from '@/components/public/PublicFooter';
import EntryCode from '@/components/public/EntryCode';

/**
 * The code step has its own page. Choosing a way in on the rent site lands
 * here, and the workspace opens only after the six digit code is written.
 */
const ENTRIES = {
  landlord: { sw: 'Mwenye Nyumba', en: 'Landlord' },
  tenant: { sw: 'Mpangaji', en: 'Tenant' },
  agent: { sw: 'Wakala', en: 'Agent' },
  mtaa_officer: { sw: 'Afisa wa Mtaa', en: 'Mtaa officer' },
  council: { sw: 'Halmashauri', en: 'Council' },
};

export default function Access() {
  const { entry } = useParams();
  const navigate = useNavigate();
  const meta = ENTRIES[entry];

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />

      <main className="ibmt-page max-w-2xl">
        <Link
          to="/rent"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-[12px] font-semibold text-navy-soft hover:text-gold-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Rudi kwenye lango la upangishaji
        </Link>

        {!meta ? (
          <p className="ibmt-panel mt-4 p-5 text-[13px] text-muted-foreground">
            Lango hili halipo. Chagua njia ya kuingia kwenye ukurasa wa upangishaji.
          </p>
        ) : (
          <>
            <header className="mt-4">
              <p className="ibmt-kicker">Njia ya kuingia</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-navy sm:text-[28px]">
                {meta.sw}
                <span className="ml-2 text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{meta.en}</span>
              </h1>
              <p className="ibmt-lede mt-2">
                Andika msimbo wa uthibitisho unaotumwa kwenye namba ya simu au barua pepe iliyo kwenye akaunti yako. Kodi
                moja hutumika mara moja tu.
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