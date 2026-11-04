import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { DEPOSIT_STAGE1_NOTE, ZERO_FEE, activePolicy, isAdmin, notify } from '../../shared/r5.ts';

const HOLDERS = ['landlord', 'agent', 'tenant', 'other'];

/**
 * Stage 1 deposit: the amount and who holds it are recorded and nothing more.
 * IBMT never holds this money and escrow exists only from Stage 2.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'get';

    if (action === 'record') return await record(base44, user, payload);
    if (action === 'get') return await get(base44, user, payload);

    return fail(422, 'VALIDATION', 'Unknown deposit action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function party(base44, user, tenancyId) {
  const tenancy = await base44.asServiceRole.entities.Tenancy.get(tenancyId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!tenancy) return { error: fail(404, 'NOT_FOUND', 'That tenancy does not exist') };
  const isLandlord = tenancy.landlord_id === user.id;
  const isTenant = tenancy.tenant_id === user.id;
  if (!isLandlord && !isTenant && !isAdmin(user)) {
    return { error: fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can record this deposit') };
  }
  return { tenancy, role: isLandlord ? 'landlord' : 'tenant' };
}

async function record(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  if (!tenancyId) return fail(422, 'VALIDATION', 'The tenancy is required');
  const { tenancy, role, error } = await party(base44, user, tenancyId);
  if (error) return error;

  const amount = Math.round(Number(payload.amount) || 0);
  if (amount <= 0) return fail(422, 'VALIDATION', 'The deposit amount is required', { amount: 'Enter the amount held.' });

  const heldBy = HOLDERS.includes(cleanText(payload.held_by)) ? cleanText(payload.held_by) : 'landlord';
  const policy = await activePolicy(base44);
  const capMonths = Number(policy && policy.deposit_cap_months) || 0;
  const monthlyRent = Math.round(Number(tenancy.rent_amount) || 0);
  const cap = capMonths > 0 && monthlyRent > 0 ? Math.round(capMonths * monthlyRent) : 0;
  if (cap > 0 && amount > cap) {
    return fail(422, 'ABOVE_CAP', `The deposit cannot exceed ${cap} TZS (${capMonths} month(s) of rent)`, {
      amount: `At most ${cap} TZS under the policy in force.`,
    });
  }

  const existing = await base44.asServiceRole.entities.SecurityDeposit
    .filter({ tenancy_id: tenancy.id }, { sort: '-created_date', limit: 1 });
  const current = (existing.items || [])[0];

  const patch = {
    tenancy_id: tenancy.id,
    lease_id: cleanText(payload.lease_id) || tenancy.lease_id || null,
    landlord_id: tenancy.landlord_id,
    tenant_id: tenancy.tenant_id,
    amount,
    currency: 'TZS',
    held_by: heldBy,
    held_by_name: cleanText(payload.held_by_name) || null,
    stage: 'stage1_record_only',
    status: current ? current.status : 'held',
    council_id: tenancy.council_id || null,
    region: tenancy.region || null,
    district: tenancy.district || null,
    ward: tenancy.ward || null,
    recorded_by_id: user.id,
    recorded_by_role: role,
    policy_version: policy ? policy.version : null,
  };

  const row = current
    ? await base44.entities.SecurityDeposit.update(current.id, patch)
    : await base44.entities.SecurityDeposit.create(patch);

  const counterpart = role === 'landlord' ? tenancy.tenant_id : tenancy.landlord_id;
  await notify(base44, {
    subjectId: counterpart,
    kind: 'deposit_recorded',
    title: { sw: 'Amana imeandikwa', en: 'Deposit recorded' },
    body: {
      sw: `Amana ya TZS ${amount.toLocaleString('en-US')} imeandikwa. Inashikiliwa na: ${heldBy}. IBMT haishikilii pesa hii.`,
      en: `A deposit of TZS ${amount.toLocaleString('en-US')} was recorded. Held by: ${heldBy}. IBMT does not hold this money.`,
    },
    data: { tenancy_id: tenancy.id, amount },
    dedupeKey: `deposit_recorded:${tenancy.id}:${amount}`,
  });

  return json({ ...shape(row), duplicate: Boolean(current), zero_fee: ZERO_FEE });
}

async function get(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  if (!tenancyId) return fail(422, 'VALIDATION', 'The tenancy is required');
  const { error } = await party(base44, user, tenancyId);
  if (error) return error;
  const page = await base44.entities.SecurityDeposit
    .filter({ tenancy_id: tenancyId }, { sort: '-created_date', limit: 1 });
  const row = (page.items || [])[0];
  return json({ deposit: row ? shape(row) : null, zero_fee: ZERO_FEE });
}

function shape(row) {
  return {
    deposit_id: row.id,
    tenancy_id: row.tenancy_id,
    amount: Math.round(Number(row.amount) || 0),
    currency: row.currency || 'TZS',
    held_by: row.held_by || null,
    held_by_name: row.held_by_name || null,
    stage: row.stage || 'stage1_record_only',
    status: row.status,
    recorded_by_role: row.recorded_by_role || null,
    recorded_at: row.created_date || isoNow(),
    label: DEPOSIT_STAGE1_NOTE,
    escrow_note: {
      sw: 'Escrow (IBMT kushikilia amana) itaanza Hatua ya 2.',
      en: 'Escrow (IBMT holding the deposit) starts in Stage 2.',
    },
  };
}