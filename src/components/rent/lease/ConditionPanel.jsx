import { useCallback, useEffect, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SectionCard from '@/components/ibmt/SectionCard';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { callFn, fnError } from '@/lib/r4';
import { formatDateTime } from '@/lib/format';
import { useT } from '@/i18n/I18nContext';

const BLANK_ROWS = [
  { area: 'Sebule', condition: '', photo_uri: '' },
  { area: 'Jikoni', condition: '', photo_uri: '' },
  { area: 'Choo na bafu', condition: '', photo_uri: '' },
];

/**
 * Move-in and move-out photo checklists. Both sides sign with a one-time code;
 * the report is agreed only when both signatures exist.
 */
export default function ConditionPanel({ tenancyId, role = 'landlord' }) {
  const { lang } = useT();
  const [reports, setReports] = useState([]);
  const [kind, setKind] = useState('move_in');
  const [rows, setRows] = useState(BLANK_ROWS);
  const [otp, setOtp] = useState({});
  const [codes, setCodes] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await callFn('conditionReport', { action: 'list', tenancy_id: tenancyId });
      setReports(data.rows || []);
    } catch (err) {
      setError(fnError(err));
    }
  }, [tenancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const setRow = (index, patch) => {
    setRows((prev) => prev.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  };

  const upload = async (index, file) => {
    if (!file) return;
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    setRow(index, { photo_uri: file_uri });
  };

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      await callFn('conditionReport', {
        action: 'create',
        tenancy_id: tenancyId,
        kind,
        items: rows.filter((row) => row.area && row.condition),
      });
      setRows(BLANK_ROWS);
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const requestSign = async (report) => {
    setBusy(true);
    setError('');
    try {
      const data = await callFn('conditionReport', { action: 'request_otp', report_id: report.report_id });
      setOtp((prev) => ({ ...prev, [report.report_id]: data.otp }));
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  const sign = async (report) => {
    setBusy(true);
    setError('');
    try {
      await callFn('conditionReport', {
        action: 'sign',
        report_id: report.report_id,
        code: (codes[report.report_id] || '').trim(),
      });
      setOtp((prev) => ({ ...prev, [report.report_id]: null }));
      setCodes((prev) => ({ ...prev, [report.report_id]: '' }));
      await load();
    } catch (err) {
      setError(fnError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Orodha ya hali ya nyumba" description="Picha na hali ya kila eneo, imesainiwa na pande zote mbili.">
      <div className="space-y-4">
        {reports.length === 0 ? (
          <Notice tone="neutral">Hakuna orodha bado. Andaa orodha ya kuingia au ya kuondoka.</Notice>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => {
              const signed = report.my_party ? report.signed[report.my_party] : true;
              return (
                <li key={report.report_id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{report.kind === 'move_in' ? 'Orodha ya kuingia' : 'Orodha ya kuondoka'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {report.items.length} eneo · mmiliki {report.signed.landlord ? 'amesaini' : 'hajasaini'} · mpangaji{' '}
                        {report.signed.tenant ? 'amesaini' : 'hajasaini'}
                      </p>
                      {report.signatures.map((item) => (
                        <p key={item.party} className="ibmt-num text-[11px] text-muted-foreground">
                          {item.party === 'landlord' ? 'Mmiliki' : 'Mpangaji'}: {formatDateTime(item.signed_at, lang)}
                        </p>
                      ))}
                    </div>
                    <StatusBadge status={report.agreed ? 'agreed' : 'pending'} label={report.agreed ? 'Imekubaliwa' : 'Inasubiri sahihi'} />
                  </div>

                  {!report.agreed && report.my_party && !signed && (
                    <div className="mt-2 space-y-2">
                      {!otp[report.report_id] ? (
                        <Button type="button" size="sm" variant="outline" className="ibmt-tap" onClick={() => requestSign(report)} disabled={busy}>
                          Pata namba ya kusaini
                        </Button>
                      ) : (
                        <div className="space-y-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                          <p className="ibmt-kicker">Namba yako</p>
                          <p className="ibmt-num font-heading text-lg font-semibold text-navy">{otp[report.report_id].code}</p>
                          <Field label="Weka namba" required>
                            {(props) => (
                              <TextInput
                                {...props}
                                className={`${props.className} ibmt-num`}
                                inputMode="numeric"
                                value={codes[report.report_id] || ''}
                                onChange={(event) =>
                                  setCodes((prev) => ({ ...prev, [report.report_id]: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) }))
                                }
                              />
                            )}
                          </Field>
                          <Button
                            type="button"
                            size="sm"
                            className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
                            onClick={() => sign(report)}
                            disabled={busy || (codes[report.report_id] || '').length !== 6}
                          >
                            Saini
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <Field label="Aina ya orodha" required>
            {(props) => (
              <SelectControl {...props} value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="move_in">Kuingia (move-in)</option>
                <option value="move_out">Kuondoka (move-out)</option>
              </SelectControl>
            )}
          </Field>

          {rows.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-border px-3 py-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <Field label="Eneo">
                {(props) => <TextInput {...props} value={row.area} onChange={(event) => setRow(index, { area: event.target.value })} />}
              </Field>
              <Field label="Hali">
                {(props) => <TextInput {...props} value={row.condition} onChange={(event) => setRow(index, { condition: event.target.value })} />}
              </Field>
              <label className="flex cursor-pointer items-end gap-2 pb-1 text-[11px] text-muted-foreground">
                <Camera className="h-4 w-4" aria-hidden="true" />
                {row.photo_uri ? 'Picha imeambatishwa (stored privately)' : 'Picha'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => upload(index, event.target.files && event.target.files[0])}
                />
              </label>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="ibmt-tap gap-2"
            onClick={() => setRows((prev) => [...prev, { area: '', condition: '', photo_uri: '' }])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ongeza eneo
          </Button>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-destructive">
              {error}
            </p>
          )}

          <Button
            type="button"
            className="ibmt-tap w-full bg-navy font-semibold text-primary-foreground hover:bg-navy-deep"
            onClick={create}
            disabled={busy || !rows.some((row) => row.area && row.condition)}
          >
            {busy ? 'Inatuma…' : role === 'tenant' ? 'Anzisha orodha ya hali' : 'Hifadhi orodha ya hali'}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}