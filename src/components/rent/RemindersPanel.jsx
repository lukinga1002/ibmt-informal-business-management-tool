import { Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/I18nContext';
import { formatDateTime } from '@/lib/format';

/**
 * Reminders the schedule has produced for this person, plus the SMS preference.
 * Until an SMS gateway is connected every copy stays inside the app.
 */
export default function RemindersPanel({ notifications = [], smsAllowed = true, onToggleSms }) {
  const { tt, lang, t } = useT();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-3">
        <div className="min-w-0">
          <p className="ibmt-label">Kumbukumbu za SMS</p>
          <p className="ibmt-hint mt-1">
            Ukiwa na SMS, kumbukumbu inatumwa kama ujumbe mfupi. Bila hivyo, inabaki ndani ya app.
          </p>
        </div>
        <Switch checked={smsAllowed} onCheckedChange={onToggleSms} aria-label="Kumbukumbu za SMS" />
      </div>

      {notifications.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">Hakuna kumbukumbu bado.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((row) => (
            <li key={row.id} className="border-b border-border pb-3 last:border-b-0">
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-ink" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{tt(row.title)}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{tt(row.body)}</p>
                  <p className="ibmt-num mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(row.created_date, lang)} · {row.sent_via === 'sms' ? 'SMS' : t('common.status') === 'Status' ? 'in-app' : 'ndani ya app'}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}