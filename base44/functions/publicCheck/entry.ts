import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { rateLimit, requesterKey } from '../../shared/r5.ts';

const KINDS = ['lease', 'receipt', 'agent', 'unit'];

const DISCLAIMER = {
  sw: 'Ukurasa huu unaonyesha hali pekee. Hakuna jina, anwani, namba ya nyumba wala namba ya simu.',
  en: 'This check shows status only. No name, address, house number or phone number.',
};

/**
 * Public checks for a lease, a receipt, an agent licence and a registered unit.
 * Status only, and rate limited per caller so the registry cannot be scraped.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const kind = cleanText(payload.kind);
    const reference = cleanText(payload.reference).toUpperCase();

    if (!KINDS.includes(kind)) return fail(422, 'VALIDATION', 'Choose what to check');
    if (!reference) return fail(422, 'VALIDATION', 'The reference is required', { reference: 'Enter the number to check.' });

    const gate = await rateLimit(base44, `check:${kind}:${requesterKey(req)}`, 30, 300);
    if (!gate.allowed) {
      return fail(429, 'RATE_LIMITED', 'Too many checks from this connection. Try again in a few minutes.', {
        retry_after_seconds: gate.retry_after_seconds,
      });
    }

    const result = await lookup(base44, kind, reference);
    return json({ kind, reference, checked_at: isoNow(), ...result, disclaimer: DISCLAIMER, rate: gate });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function lookup(base44, kind, reference) {
  if (kind === 'lease') {
    const byCode = await base44.asServiceRole.entities.Lease.filter({ verify_code: reference }, { limit: 1 }).catch(() => ({ items: [] }));
    const byRef = (byCode.items || []).length
      ? byCode
      : await base44.asServiceRole.entities.Lease.filter({ lease_ref: reference }, { limit: 1 }).catch(() => ({ items: [] }));
    const row = (byRef.items || [])[0];
    if (!row) return { found: false };
    const signatures = row.signatures || [];
    return {
      found: true,
      status: row.status,
      valid: row.status === 'signed',
      signed: {
        landlord: signatures.some((item) => item.party === 'landlord'),
        tenant: signatures.some((item) => item.party === 'tenant'),
      },
      template_label: row.template_label || null,
    };
  }

  if (kind === 'receipt') {
    const page = await base44.asServiceRole.entities.RentPayment.filter({ receipt_reference: reference }, { limit: 1 }).catch(() => ({ items: [] }));
    const row = (page.items || [])[0];
    if (!row) return { found: false };
    return {
      found: true,
      status: row.record_status,
      valid: row.record_status === 'confirmed',
      period_month: row.period_month || null,
      issued_on: row.receipt_issued_at ? String(row.receipt_issued_at).slice(0, 10) : null,
      note: {
        sw: 'Kiasi na wahusika wanaonekana kwa pande za rekodi pekee.',
        en: 'The amount and the parties are visible to the parties of the record only.',
      },
    };
  }

  if (kind === 'agent') {
    const page = await base44.asServiceRole.entities.AgentLicence.filter({ licence_no: reference }, { limit: 1 }).catch(() => ({ items: [] }));
    const row = (page.items || [])[0];
    if (!row) return { found: false };
    // Ruling 14: council name and status only.
    return {
      found: true,
      status: row.status,
      valid: row.status === 'approved',
      council: row.council_name || null,
      scope: row.scope || 'rental',
    };
  }

  const page = await base44.asServiceRole.entities.RentalUnit.filter({ unit_ref: reference }, { limit: 1 }).catch(() => ({ items: [] }));
  const row = (page.items || [])[0];
  if (!row) return { found: false };
  return {
    found: true,
    status: row.status,
    verification_status: row.verification_status,
    valid: row.verification_status === 'verified',
    registered: true,
  };
}