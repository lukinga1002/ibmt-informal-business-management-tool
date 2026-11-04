import { useT } from '@/i18n/I18nContext';
import SectionCard from '@/components/ibmt/SectionCard';
import Notice from '@/components/ibmt/Notice';
import { ACCOUNT_LABEL } from '@/lib/money';

/** The append-only ledger: a correction is a new mirror entry, never an edit. */
export default function LedgerPanel({ entries = [], totals }) {
  const { tt, lang } = useT();
  const balanced = totals ? totals.balanced : true;

  return (
    <SectionCard
      title={tt({ en: 'Ledger', sw: 'Daftari la hesabu' })}
      description={tt({
        en: 'Append-only, double entry. Debits must equal credits for every payment; a correction is a reversing entry with a reason and an actor.',
        sw: 'Huongezwa tu, hesabu ya pande mbili. Debiti lazima zilingane na krediti kwa kila malipo; marekebisho ni kumbukumbu ya kurudisha yenye sababu na mhusika.',
      })}
      actions={
        totals && (
          <span className={balanced ? 'text-[12px] font-semibold text-success' : 'text-[12px] font-semibold text-destructive'}>
            {balanced
              ? tt({ en: 'Debits equal credits', sw: 'Debiti zinalingana na krediti' })
              : tt({ en: 'Not balanced', sw: 'Hazilingani' })}
          </span>
        )
      }
    >
      {totals && (
        <div className="mb-4 grid gap-2 text-[12px] sm:grid-cols-3">
          <p>{tt({ en: 'Debits', sw: 'Debiti' })}: <span className="ibmt-num font-semibold">{Number(totals.debits || 0).toLocaleString('en-US')}</span></p>
          <p>{tt({ en: 'Credits', sw: 'Krediti' })}: <span className="ibmt-num font-semibold">{Number(totals.credits || 0).toLocaleString('en-US')}</span></p>
          <p>{tt({ en: 'Entries', sw: 'Kumbukumbu' })}: <span className="ibmt-num font-semibold">{entries.length}</span></p>
        </div>
      )}

      {entries.length === 0 ? (
        <Notice tone="neutral">
          {tt({ en: 'Nothing has been posted yet. Credit is written only on a succeeded payment.', sw: 'Hakuna kilichoandikwa bado. Deni huandikwa tu kwenye malipo yaliyofanikiwa.' })}
        </Notice>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-border text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{tt({ en: 'Account', sw: 'Akaunti' })}</th>
                <th className="py-2 pr-3 font-medium">{tt({ en: 'Side', sw: 'Upande' })}</th>
                <th className="py-2 pr-3 text-right font-medium">{tt({ en: 'Amount', sw: 'Kiasi' })}</th>
                <th className="py-2 pr-3 font-medium">{tt({ en: 'Posting', sw: 'Hatua' })}</th>
                <th className="py-2 font-medium">{tt({ en: 'Reason', sw: 'Sababu' })}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2 pr-3">{tt(ACCOUNT_LABEL[entry.account] || { en: entry.account, sw: entry.account })}</td>
                  <td className="py-2 pr-3">
                    <span className={entry.side === 'debit' ? 'text-info' : 'text-navy'}>{entry.side}</span>
                  </td>
                  <td className="ibmt-num py-2 pr-3 text-right">{entry.amount.toLocaleString('en-US')}</td>
                  <td className="ibmt-num py-2 pr-3">{entry.posting}</td>
                  <td className="py-2 text-muted-foreground">
                    {entry.reason || (entry.reversal_of ? tt({ en: 'Reversing entry', sw: 'Kumbukumbu ya kurudisha' }) : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="ibmt-hint mt-4">
        {tt({
          en: 'A balance is never edited directly. A correction writes the opposite lines and keeps both.',
          sw: 'Salio halibadilishwi moja kwa moja. Marekebisho huandika mistari kinyume na huhifadhi yote mawili.',
        })}
      </p>
      {entries[0]?.recorded_at && (
        <p className="ibmt-hint mt-1">
          {tt({ en: 'Last posting', sw: 'Kumbukumbu ya mwisho' })}: {new Date(entries[entries.length - 1].recorded_at).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB')}
        </p>
      )}
    </SectionCard>
  );
}