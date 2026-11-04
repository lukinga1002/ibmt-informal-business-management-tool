import Notice from '@/components/ibmt/Notice';
import { useT } from '@/i18n/I18nContext';

/** Loading, error and ready, decided by the answer and by nothing else. */
export default function AsyncBlock({ state, children }) {
  const { tt } = useT();

  if (state.status === 'loading' || state.status === 'refreshing') {
    return (
      <div className="py-10 text-center" role="status">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-border border-t-navy" />
        <p className="ibmt-hint mt-3">{tt({ en: 'Loading from the register', sw: 'Inapakia kutoka rejista' })}</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Notice tone="danger" title={tt({ en: 'This view did not load', sw: 'Mwonekano huu haukupakiwa' })}>
        {state.error}
      </Notice>
    );
  }

  if (!state.data) return null;
  return children(state.data);
}