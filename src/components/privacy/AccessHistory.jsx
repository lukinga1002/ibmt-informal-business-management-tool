import { useT } from '@/i18n/I18nContext';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';

/** Who opened my records, in what role, and why. */
export default function AccessHistory({ rows = [] }) {
  const { tt, lang } = useT();

  return (
    <SectionCard
      title={tt({ en: 'Who accessed my records', sw: 'Nani alifungua kumbukumbu zangu' })}
      description={tt({
        en: 'Every official view of your records is written here with its purpose.',
        sw: 'Kila mtazamo rasmi wa kumbukumbu zako huandikwa hapa pamoja na sababu.',
      })}
    >
      {rows.length === 0 ? (
        <Notice tone="neutral">{tt({ en: 'No one has opened your records yet.', sw: 'Hakuna aliyefungua kumbukumbu zako bado.' })}</Notice>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="py-2 text-[12px] first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{row.actor_role}</span>
                <span className="ibmt-hint">
                  {row.occurred_at ? new Date(row.occurred_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB') : ''}
                </span>
              </div>
              <p className="text-muted-foreground">{row.purpose}</p>
              {row.record_type && <p className="ibmt-hint">{row.record_type}</p>}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}