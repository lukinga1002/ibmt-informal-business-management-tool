import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  cleanText,
  fail,
  findBusiness,
  findExistingByKey,
  getActivePolicy,
  json,
  nextReceiptReference,
  todayISO,
} from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';

/**
 * Records a receipt draft. The serial number, the line totals and the business
 * it belongs to are all decided here: the interface only sends the sale facts.
 * A retried action key returns the receipt that was already created.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'operator_module');
    if (blocked) return blocked;

    const payload = await req.json().catch(() => ({}));

    const buyerName = cleanText(payload.buyer_name);
    if (buyerName.length < 3) {
      return fail(422, 'VALIDATION', 'The buyer name is required', { buyer_name: 'Enter the buyer name (at least 3 characters).' });
    }

    const rawLines = Array.isArray(payload.lines) ? payload.lines : [];
    const lines = rawLines
      .map((line) => ({
        description: cleanText(line && line.description) || 'Item',
        qty: Number(line && line.qty) > 0 ? Number(line.qty) : 1,
        unit_amount: Math.max(0, Number(line && line.unit_amount) || 0),
      }))
      .filter((line) => line.unit_amount > 0);
    if (!lines.length) {
      const fallback = Number(payload.total);
      if (!Number.isFinite(fallback) || fallback <= 0) {
        return fail(422, 'VALIDATION', 'At least one line or a total is required', { total: 'Enter the amount.' });
      }
      lines.push({ description: 'Sale', qty: 1, unit_amount: fallback });
    }
    const total = lines.reduce((sum, line) => sum + line.qty * line.unit_amount, 0);
    const issuedOn = cleanText(payload.issued_on) || todayISO();

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'Receipt', idempotencyKey);
      if (existing) return json({ ...existing, duplicate: true });
    }

    const business = await findBusiness(base44, user);
    const policy = await getActivePolicy(base44);
    const reference = await nextReceiptReference(base44);

    const receipt = await base44.entities.Receipt.create({
      reference,
      business_id: business.id,
      business_name: business.business_name,
      district: business.district,
      buyer_name: buyerName,
      buyer_contact: cleanText(payload.buyer_contact) || null,
      buyer_ref: cleanText(payload.buyer_ref) || null,
      issued_on: issuedOn,
      total,
      status: 'draft',
      buyer_confirmation: 'draft',
      fiscal_status: 'unreported',
      version: 1,
      idempotency_key: idempotencyKey || null,
      lines: lines.map((line) => ({ ...line, line_total: line.qty * line.unit_amount })),
      policy_version: policy ? policy.version : null,
    });

    return json(receipt);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}