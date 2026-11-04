import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, findExistingByKey, isoNow, json, nextSerial, bilingual } from '../../shared/moneyOps.ts';
import {
  LEASE_TEMPLATE_LABEL,
  LEASE_TEMPLATE_VERSION,
  STAMP_DUTY_PLACEHOLDER,
  buildLeaseTerms,
} from '../../shared/leaseTemplate.ts';

/**
 * The standard lease builder.
 *
 * A lease may only sit on a unit the mtaa officer has verified, and only its
 * landlord may create it. The template is stored on the lease together with its
 * version, so a later template change never rewrites what was signed. Stamp
 * duty is stored as a placeholder: no amount is ever calculated here.
 *
 * `preview: true` returns exactly the clauses that would be saved, without
 * writing anything. The same idempotency key — or the same lease reference —
 * always returns the lease that already exists.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const unitId = cleanText(payload.unit_id);
    const rent = Math.round(Number(payload.rent_amount) || 0);

    if (!unitId) return fail(422, 'VALIDATION', 'Choose the unit', { unit_id: 'Choose the unit.' });
    if (rent <= 0) return fail(422, 'VALIDATION', 'The agreed rent is required', { rent_amount: 'Enter the rent.' });

    const unit = await base44.entities.RentalUnit.get(unitId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!unit) return fail(404, 'NOT_FOUND', 'That unit is not visible to you');
    if (unit.landlord_id !== user.id && user.role !== 'admin') {
      return fail(403, 'FORBIDDEN', 'Only the landlord of this unit can start a lease');
    }
    if (unit.verification_status !== 'verified') {
      return fail(409, 'UNIT_NOT_VERIFIED', 'This unit is not verified, so it cannot carry a lease yet', {
        unit_id: 'Wait for the mtaa officer to verify the unit.',
      });
    }

    // The tenant is bound later, from the tenant's own account: the landlord
    // hands over a claim code and the tenant opens the lease with it. A lease
    // created for a known account can name that account here instead.
    const tenantId = cleanText(payload.tenant_id);
    let tenant = null;
    if (tenantId) {
      tenant = await base44.asServiceRole.entities.User.get(tenantId).catch(() => null);
      if (!tenant) {
        return fail(422, 'VALIDATION', 'That tenant account was not found', { tenant_id: 'Choose an existing account.' });
      }
    }

    const terms = buildLeaseTerms({
      rent_amount: rent,
      frequency: payload.frequency,
      deposit_months: payload.deposit_months,
      notice_days: payload.notice_days,
      due_day: payload.due_day,
      start_date: cleanText(payload.start_date),
      end_date: cleanText(payload.end_date),
      unit_ref: unit.unit_ref,
      ward: unit.ward,
      mtaa: unit.mtaa || unit.street || '',
      landlord_name: user.full_name || 'Mmiliki',
      tenant_name: tenant && tenant.full_name ? tenant.full_name : 'Mpangaji',
      repair_duties: payload.repair_duties,
      house_rules: payload.house_rules,
    });

    if (!terms.start_date || !terms.end_date) {
      return fail(422, 'VALIDATION', 'Start and end dates are required', { start_date: 'Choose the dates.' });
    }
    if (terms.end_date <= terms.start_date) {
      return fail(422, 'VALIDATION', 'The end date must come after the start date', { end_date: 'Choose a later date.' });
    }

    const template = {
      template_version: LEASE_TEMPLATE_VERSION,
      template_state: 'draft_pending_legal_review',
      template_label: LEASE_TEMPLATE_LABEL,
      stamp_duty: STAMP_DUTY_PLACEHOLDER,
    };

    if (payload.preview === true) {
      return json({ preview: true, terms, ...template });
    }

    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existing = await findExistingByKey(base44, 'Lease', idempotencyKey);
      if (existing) return json({ ...leaseShape(existing), duplicate: true });
    }
    const sameReference = cleanText(payload.lease_ref);
    if (sameReference) {
      const page = await base44.entities.Lease.filter({ lease_ref: sameReference }, { limit: 1 });
      const rows = page.items || [];
      if (rows.length) return json({ ...leaseShape(rows[0]), duplicate: true });
    }

    const open = await base44.entities.Lease.filter(
      { unit_id: unit.id, status: { $in: ['draft', 'awaiting_signature', 'signed'] } },
      { limit: 1 },
    );
    if ((open.items || []).length) {
      return fail(409, 'LEASE_EXISTS', 'This unit already carries an open lease');
    }

    const year = new Date().getFullYear();
    const leaseRef = await nextSerial(base44, 'Lease', `IBMT-LSE-${year}-`, 'lease_ref');
    const lease = await base44.entities.Lease.create({
      lease_ref: leaseRef,
      unit_id: unit.id,
      unit_ref: unit.unit_ref,
      landlord_id: unit.landlord_id,
      tenant_id: tenant ? tenant.id : null,
      claim_code: tenant ? null : crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      agent_id: unit.agent_id || null,
      council_id: unit.council_id || null,
      region: unit.region || null,
      district: unit.district,
      ward: unit.ward,
      mtaa: unit.mtaa || unit.street || null,
      start_date: terms.start_date,
      end_date: terms.end_date,
      rent_amount: terms.rent_amount,
      currency: 'TZS',
      frequency: terms.frequency,
      terms,
      status: tenant ? 'awaiting_signature' : 'awaiting_tenant',
      lease_version: 1,
      signatures: [],
      verify_code: crypto.randomUUID().replace(/-/g, ''),
      idempotency_key: idempotencyKey || null,
      ...template,
      policy_version: '2026.1-stage1',
    });

    // The tenancy exists from the moment the lease does, so rent records have
    // somewhere to attach. It only becomes active once both parties sign.
    let tenancyId = null;
    const existingTenancy = await base44.entities.Tenancy
      .filter({ unit_id: unit.id, status: { $in: ['pending', 'active'] } }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const known = (existingTenancy.items || [])[0];
    if (!tenant) {
      tenancyId = null;
    } else if (known) {
      tenancyId = known.id;
    } else {
      const tenancy = await base44.entities.Tenancy.create({
        unit_id: unit.id,
        unit_ref: unit.unit_ref,
        landlord_id: unit.landlord_id,
        tenant_id: tenant.id,
        start_date: terms.start_date,
        end_date: terms.end_date,
        rent_amount: terms.rent_amount,
        status: 'pending',
        district: unit.district,
        ward: unit.ward,
      });
      tenancyId = tenancy.id;
    }
    if (tenancyId) await base44.entities.Lease.update(lease.id, { tenancy_id: tenancyId });

    return json({ ...leaseShape({ ...lease, tenancy_id: tenancyId }), duplicate: false });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

export function leaseShape(lease) {
  return {
    lease_id: lease.id,
    lease_ref: lease.lease_ref,
    tenancy_id: lease.tenancy_id || null,
    unit_ref: lease.unit_ref,
    status: lease.status,
    signed_at: lease.signed_at || null,
    verify_code: lease.verify_code || null,
    claim_code: lease.claim_code || null,
    template_version: lease.template_version || LEASE_TEMPLATE_VERSION,
    template_state: lease.template_state || 'draft_pending_legal_review',
    template_label: lease.template_label || LEASE_TEMPLATE_LABEL,
    stamp_duty: lease.stamp_duty || STAMP_DUTY_PLACEHOLDER,
    terms: lease.terms || null,
    signatures: lease.signatures || [],
    disclaimer: bilingual(
      'Rent record — not a fiscal EFD/VFD receipt.',
      'Rekodi ya kodi — si risiti ya kodi ya serikali (EFD/VFD).',
    ),
    created_at: lease.created_date || isoNow(),
  };
}