import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/I18nContext';
import { callFn, fnError } from '@/lib/r4';
import { downloadCsv, stamp } from '@/lib/gov';

/**
 * Export: the server builds the file, writes the audit entry, and only then
 * hands the bytes over. The screen says so in words.
 */
export default function ExportBar({ fn, payload, label, note }) {
  const { tt } = useT();
  const [state, setState] = useState({ status: 'idle', error: '', result: null });

  const run = async () => {
    setState({ status: 'busy', error: '', result: null });
    try {
      const data = await callFn(fn, payload);
      downloadCsv(data.filename, data.csv);
      setState({ status: 'done', error: '', result: data });
    } catch (error) {
      setState({ status: 'error', error: fnError(error), result: null });
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="ibmt-hint max-w-xl">
        {tt(note || {
          en: 'Every export is written to the audit log before the file is produced.',
          sw: 'Kila utoaji wa faili huandikwa kwenye kumbukumbu ya ukaguzi kabla ya faili kutolewa.',
        })}
      </p>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button type="button" variant="outline" className="ibmt-tap" onClick={run} disabled={state.status === 'busy'}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {state.status === 'busy'
            ? tt({ en: 'Preparing the file', sw: 'Inaandaa faili' })
            : tt(label || { en: 'Export CSV', sw: 'Toa CSV' })}
        </Button>
        {state.status === 'done' && (
          <p role="status" className="ibmt-hint">
            {tt({
              en: `Logged ${stamp(state.result.logged_at)} · ${state.result.row_count} rows`,
              sw: `Imeandikwa ${stamp(state.result.logged_at)} · mistari ${state.result.row_count}`,
            })}
          </p>
        )}
        {state.status === 'error' && (
          <p role="alert" className="text-[12px] font-medium text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}