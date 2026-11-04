import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/i18n/I18nContext';
import { useFn } from '@/hooks/useFn';
import PageHeader from '@/components/ibmt/PageHeader';
import AsyncBlock from '@/components/gov/AsyncBlock';
import Notice from '@/components/ibmt/Notice';
import ConsentPanel from '@/components/privacy/ConsentPanel';
import AccessHistory from '@/components/privacy/AccessHistory';
import DataExport from '@/components/privacy/DataExport';
import AccountDeletion from '@/components/privacy/AccountDeletion';
import RetentionPanel from '@/components/privacy/RetentionPanel';

/**
 * The privacy centre: export, choices, access history, anonymisation and the
 * retention job. Everything is answered by the server, not by a local copy.
 */
export default function PrivacyCentre() {
  const { tt } = useT();
  const { user, isLoadingAuth } = useAuth();
  const summary = useFn('privacyDesk', { action: 'summary' }, { enabled: Boolean(user) });
  const isAdmin = user?.role === 'admin';

  if (!isLoadingAuth && !user) return <Navigate to="/login" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tt({ en: 'Privacy', sw: 'Faragha' })}
        title={tt({ en: 'My records and my choices', sw: 'Kumbukumbu zangu na maamuzi yangu' })}
        lede={tt({
          en: 'See what is held, copy it out, change one choice at a time, see who looked, and close your name off the register.',
          sw: 'Ona kinachohifadhiwa, kihamishe, badilisha uamuzi mmoja kwa wakati, ona nani alitazama, na ficha jina lako kwenye rejista.',
        })}
      />

      <AsyncBlock state={summary}>
        {(data) => (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <ConsentPanel purposes={data.purposes} onChanged={summary.reload} />
              <AccessHistory rows={data.access} />
              <AccountDeletion existing={data.deletion_request} />
            </div>
            <aside className="space-y-6">
              <section className="ibmt-panel px-5 py-4">
                <p className="ibmt-kicker">{tt({ en: 'Held about me', sw: 'Kinachohifadhiwa kunihusu' })}</p>
                <ul className="mt-2 space-y-1 text-[12px]">
                  <li>{tt({ en: 'Name', sw: 'Jina' })}: <span className="font-medium">{data.profile.full_name || '—'}</span></li>
                  <li>{tt({ en: 'E-mail', sw: 'Barua pepe' })}: <span className="ibmt-num">{data.profile.email_masked}</span></li>
                  <li>{tt({ en: 'Phone', sw: 'Simu' })}: <span className="ibmt-num">{data.profile.phone_masked || '—'}</span></li>
                  <li>{tt({ en: 'ID number', sw: 'Namba ya kitambulisho' })}: <span className="ibmt-num">{data.profile.id_number_masked || '—'}</span></li>
                </ul>
                <p className="ibmt-hint mt-2">
                  {tt({ en: 'Masked on screen: the full number is never sent to the browser.', sw: 'Imefichwa hapa: namba kamili haitumwi kwenye kivinjari.' })}
                </p>
              </section>

              <DataExport />
              <RetentionPanel retention={data.retention} isAdmin={isAdmin} onChanged={summary.reload} />
              <Notice tone="privacy">
                {tt({
                  en: 'No full phone number, ID number or e-mail address is written to a log or put in a web address.',
                  sw: 'Hakuna namba kamili ya simu, kitambulisho au barua pepe inayoandikwa kwenye kumbukumbu au kuwekwa kwenye anwani ya wavuti.',
                })}
              </Notice>
            </aside>
          </div>
        )}
      </AsyncBlock>
    </div>
  );
}