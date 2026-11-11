import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createLocalCouncil, isLocalSimulation } from '@/lib/localSimulation';
import { fnError } from '@/lib/r4';
import { Button } from '@/components/ui/button';

export default function SimulationCouncilPicker({ value, onChange }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const environment = [import.meta.env.DEV, window.location.href, appParams.appBaseUrl];
  async function load() {
    setLoading(true);
    setError('');
    try {
      const page = await base44.entities.Council.list('name', 500);
      setList(Array.isArray(page) ? page : page.items || []);
    } catch (issue) { setError(fnError(issue)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    window.addEventListener('simulation-councils-changed', load);
    return () => window.removeEventListener('simulation-councils-changed', load);
  }, []);
  async function create() {
    setBusy(true);
    setError('');
    try {
      const council = await createLocalCouncil(base44, environment);
      onChange(council.id);
      window.dispatchEvent(new Event('simulation-councils-changed'));
    } catch (issue) { setError(fnError(issue)); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <label className="block">
        Halmashauri / Council
        <select value={value} onChange={(event) => onChange(event.target.value)}
          disabled={loading || !list.length}
          className="mt-2 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-navy">
          <option value="">{loading ? 'Inapakia / Loading.' : 'Chagua halmashauri / Select council'}</option>
          {list.map((council) => <option key={council.id} value={council.id}>{council.name}</option>)}
        </select>
      </label>
      {!loading && !error && !list.length && <p role="status">Hakuna halmashauri katika mazingira haya. / No councils exist in this environment.</p>}
      {!loading && !error && !list.length && isLocalSimulation(...environment) && (
        <div className="space-y-2">
          <p>Local simulation only: create one fictional council and a placeholder policy if none exists. Local records are lost when the backend restarts.</p>
          <Button onClick={create} disabled={busy}>{busy ? 'Inaunda / Creating.' : 'Unda data ya majaribio / Create local test data'}</Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <Button variant="outline" onClick={load} disabled={loading || busy}>Pakia upya / Reload councils</Button>
    </div>
  );
}
