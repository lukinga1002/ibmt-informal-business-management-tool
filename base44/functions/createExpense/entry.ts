import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  cleanText,
  fail,
  findBusiness,
  findExistingByKey,
  getActivePolicy,
  json,
  todayISO,
} from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';

/**
 * Records an expense with its evidence grade. The grade is decided here from
 * what evidence exists, never claimed by the interface. A retried action key
 * returns the expense that was already recorded.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'expenses_module');
    if (blocked) return blocked;

    const payload = await req.json().catch(() => ({}));

    const supplierName = cleanText(payload.supplier_name);
    if (supplierName.length < 3) {
      return fail(422, 'VALIDATION', 'The supplier is required', { supplier: 'Enter the supplier (at least 3 characters).' });
    }
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail(422, 'VALIDATION', 'The amount must be greater than zero', { amount: 'Enter the amount.' });
    }

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'Expense', idempotencyKey);
      if (existing) return json({ ...existing, duplicate: true });
    }

    const business = await findBusiness(base44, user);
    const policy = await getActivePolicy(base44);

    // Evidence grade is derived from what the operator actually holds.
    const tin = cleanText(payload.supplier_tin);
    let evidenceGrade = 'none';
    if (tin) evidenceGrade = 'supplier_receipt';
    else if (payload.evidence === true) evidenceGrade = 'photo';

    const expense = await base44.entities.Expense.create({
      business_id: business.id,
      description: cleanText(payload.description) || supplierName,
      supplier_name: supplierName,
      supplier_tin: tin || null,
      supplier_verified: false,
      amount,
      issued_on: cleanText(payload.incurred_on) || todayISO(),
      evidence_grade: evidenceGrade,
      evidence_uri: cleanText(payload.evidence_uri) || null,
      idempotency_key: idempotencyKey || null,
      policy_version: policy ? policy.version : null,
    });

    return json(expense);
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}