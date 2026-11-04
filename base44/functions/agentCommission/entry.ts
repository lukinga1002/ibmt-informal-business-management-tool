import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { ZERO_FEE, isAdmin, notify } from '../../shared/r5.ts';

/**
 * Stage 1 commission: an amount the landlord owes the agent, earned on a new
 * tenancy only. A renewal earns nothing, and a tenant is never charged.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'list';

    if (action === 'assess') return await assess(base44, user, payload);
    if (action === 'list') return await list(base44, user);

    return fail(422, 'VALIDATION', 'Unknown commission action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function assess(base44, user, payload) {
  const tenancyId = cleanText(payload.tenancy_id);
  if (!tenancyId) return fail(422, 'VALIDATION', 'The tenancy is required');

  const tenancy = await base44.asServiceRole.entities.Tenancy.get(tenancyId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!tenancy) return fail(404, 'NOT_FOUND', 'That tenancy does not exist');
  const party = tenancy.landlord_id === user.id || tenancy.tenant_id === user.id;
  if (!party && !isAdmin(user)) return fail(403, 'FORBIDDEN', 'Only the landlord or the tenant can assess this tenancy');

  const existing = await base44.asServiceRole.entities.AgentCommission
    .filter({ tenancy_id: tenancyId }, { limit: 1 });
  const already = (existing.items || [])[0];
  if (already) return json({ ...commissionShape(already), duplicate: true, zero_fee: ZERO_FEE });

  const mandates = await base44.asServiceRole.entities.Mandate
    .filter({ unit_id: tenancy.unit_id, status: 'active' }, { sort: '-created_date', limit: 1 });
  const mandate = (mandates.items || [])[0];
  if (!mandate) {
    return json({ amount: 0, kind: null, reason: 'no_active_mandate', commission: null, zero_fee: ZERO_FEE, duplicate: false });
  }

  // A renewal is any earlier tenancy on the same unit, or a second lease on it.
  const siblings = await base44.asServiceRole.entities.Tenancy
    .filter({ unit_id: tenancy.unit_id }, { limit: 100 });
  const others = (siblings.items || []).filter((row) => row.id !== tenancy.id);
  const leases = await base44.asServiceRole.entities.Lease
    .filter({ unit_id: tenancy.unit_id }, { limit: 100 });
  const renewal = others.length > 0 || (leases.items || []).length > 1;

  const kind = renewal ? 'renewal' : 'new_tenancy';
  const amount = renewal ? 0 : Math.round(Number(mandate.fee_amount) || 0);

  const row = await base44.asServiceRole.entities.AgentCommission.create({
    agent_id: mandate.agent_id,
    mandate_id: mandate.id,
    landlord_id: mandate.landlord_id,
    tenancy_id: tenancy.id,
    unit_ref: tenancy.unit_ref || mandate.unit_ref || null,
    amount,
    kind,
    status: renewal ? 'zero_renewal' : 'accrued',
    note: renewal
      ? 'Renewal: no commission is earned on a renewal in Stage 1.'
      : 'New tenancy: commission owed by the landlord to the agent.',
    policy_version: mandate.policy_version || null,
  });

  if (amount > 0) {
    await notify(base44, {
      subjectId: mandate.agent_id,
      kind: 'commission_accrued',
      title: { sw: 'Kamisheni imepatikana', en: 'Commission accrued' },
      body: {
        sw: `Kamisheni ya TZS ${amount.toLocaleString('en-US')} kwa nyumba ${row.unit_ref} inadaiwa na mmiliki. Ada ya mpangaji: TZS 0.`,
        en: `Commission of TZS ${amount.toLocaleString('en-US')} for unit ${row.unit_ref} is owed by the landlord. Tenant fee: TZS 0.`,
      },
      data: { commission_id: row.id, unit_ref: row.unit_ref },
      dedupeKey: `commission:${row.id}`,
    });
  }

  return json({ ...commissionShape(row), renewal, duplicate: false, zero_fee: ZERO_FEE });
}

async function list(base44, user) {
  const page = await base44.entities.AgentCommission.filter({}, { sort: '-created_date', limit: 100 });
  const rows = (page.items || []).map(commissionShape);
  const owed = rows.filter((row) => row.status === 'accrued').reduce((sum, row) => sum + row.amount, 0);
  const paid = rows.filter((row) => row.status === 'paid').reduce((sum, row) => sum + row.amount, 0);
  return json({
    rows,
    totals: { owed, paid, renewals: rows.filter((row) => row.kind === 'renewal').length },
    zero_fee: ZERO_FEE,
    as: rows.length && rows[0].agent_id === user.id ? 'agent' : 'landlord',
    checked_at: isoNow(),
  });
}

function commissionShape(row) {
  return {
    commission_id: row.id,
    agent_id: row.agent_id,
    mandate_id: row.mandate_id,
    landlord_id: row.landlord_id,
    tenancy_id: row.tenancy_id || null,
    unit_ref: row.unit_ref || null,
    amount: Math.round(Number(row.amount) || 0),
    kind: row.kind || null,
    status: row.status,
    note: row.note || null,
    created_at: row.created_date || null,
  };
}