// Consent is an append-only log: the newest row for a subject and purpose is the
// current choice, and older rows stay as the record of what was accepted.

type ConsentRow = { subject_id?: string; purpose?: string; created_date?: string; granted_at?: string | null; withdrawn_at?: string | null };

const stamp = (row: ConsentRow) => String(row.created_date || row.withdrawn_at || row.granted_at || '');

function latestBy<T extends ConsentRow>(rows: T[], keyOf: (row: T) => string | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const row of rows || []) {
    const key = keyOf(row);
    if (!key) continue;
    if (!out[key] || stamp(row) > stamp(out[key])) out[key] = row;
  }
  return out;
}

export const latestByPurpose = <T extends ConsentRow>(rows: T[]) => latestBy(rows, (row) => row.purpose);
export const latestBySubject = <T extends ConsentRow>(rows: T[]) => latestBy(rows, (row) => row.subject_id);
