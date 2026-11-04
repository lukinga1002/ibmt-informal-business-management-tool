import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import SectionCard from '@/components/ibmt/SectionCard';
import RecordForm from './RecordForm';
import RecordList from './RecordList';
import ArrearsPanel from './ArrearsPanel';
import RemindersPanel from '@/components/rent/RemindersPanel';
import { callFn } from '@/lib/r4';

/**
 * The rent workspace shared by the landlord and the tenant: enter a record,
 * decide the other party's record, see arrears and reminders. The backend
 * decides what each side may see; this screen only renders it.
 */
export default function RentWorkspace({ role = 'landlord', footer = null }) {
  const [state, setState] = useState({
    loading: true,
    tenancies: [],
    records: [],
    arrears: null,
    notifications: [],
    me: null,
  });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      const empty = { items: [] };
      const [tenancyPage, recordPage, notificationPage] = await Promise.all([
        base44.entities.Tenancy
          .filter({ status: { $in: ['active', 'pending'] } }, { sort: '-created_date', limit: 30 })
          .catch(() => empty),
        base44.entities.RentPayment.filter({}, { sort: '-created_date', limit: 20 }).catch(() => empty),
        base44.entities.Notification.filter({}, { sort: '-created_date', limit: 8 }).catch(() => empty),
      ]);
      let arrears = null;
      try {
        arrears = await callFn('rentRecord', { action: 'arrears' });
      } catch {
        arrears = null;
      }
      setState({
        loading: false,
        tenancies: tenancyPage.items || [],
        records: recordPage.items || [],
        notifications: notificationPage.items || [],
        arrears,
        me,
      });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Data haikupatikana.');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const smsAllowed = state.me?.data?.sms_rent_reminders !== false;

  const toggleSms = async (next) => {
    await base44.auth.updateMe({ data: { ...(state.me?.data || {}), sms_rent_reminders: next } });
    setState((prev) => ({ ...prev, me: { ...prev.me, data: { ...(prev.me?.data || {}), sms_rent_reminders: next } } }));
  };

  if (state.loading) {
    return <p className="text-[13px] text-muted-foreground">Inapakia…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <SectionCard
            title={role === 'tenant' ? 'Wasilisha malipo yako' : 'Andika rekodi ya kodi'}
            description="Rekodi inaingizwa na upande mmoja; upande wa pili unathibitisha. Risiti inatoka baada ya uthibitisho."
          >
            <RecordForm tenancies={state.tenancies} role={role} onSaved={load} />
          </SectionCard>

          <SectionCard
            title="Rekodi za kodi"
            description="Kila rekodi ina hali yake. Risiti inatolewa pale uthibitisho unapofanyika."
          >
            <RecordList rows={state.records} myId={state.me?.id} onChanged={load} />
          </SectionCard>

          {footer}
        </div>

        <div className="space-y-6">
          <SectionCard title="Deni la kodi" description="Vipindi sita vya karibuni">
            <ArrearsPanel arrears={state.arrears} />
          </SectionCard>

          <SectionCard title="Kumbukumbu" description="Siku 7 na siku 1 kabla ya kodi inayostahili">
            <RemindersPanel notifications={state.notifications} smsAllowed={smsAllowed} onToggleSms={toggleSms} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}