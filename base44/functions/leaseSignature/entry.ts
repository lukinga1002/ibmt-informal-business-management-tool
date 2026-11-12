import { leasePayoutGuard } from '../../shared/stage2Payout.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { LEASE_TEMPLATE_LABEL, STAMP_DUTY_PLACEHOLDER, buildLeaseTerms } from '../../shared/leaseTemplate.ts';

/**
 * Reviewing and signing a lease.
 *
 * Each party signs from their own phone, in their own session, with a code sent
 * to their own number — a code is never shown to the other party. The lease
 * becomes signed only when both signatures are present, and only then does the
 * tenancy behind it become active.
 *
 * The public check (`action: 'public'`) answers with the long verify code from
 * the QR and shows no names, street or meter.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'view';

    if (action === 'public') {
      const code = cleanText(payload.verify_code);
      if (!code) return fail(400, 'VALIDATION', 'The lease code is required');
      const found = await base44.asServiceRole.entities.Lease.filter({ verify_code: code }, { limit: 1 });
      const lease = (found.items || [])[0];
      if (!lease) return fail(404, 'NOT_FOUND', 'No lease matches that code');
      const signatures = lease.signatures || [];
      return json({
        lease_ref: lease.lease_ref,
        unit_ref: lease.unit_ref,
        ward: lease.ward,
        status: lease.status,
        rent_amount: lease.rent_amount,
        frequency: lease.frequency,
        start_date: lease.start_date,
        end_date: lease.end_date,
        template_label: lease.template_label || LEASE_TEMPLATE_LABEL,
        template_version: lease.template_version,
        stamp_duty: lease.stamp_duty || STAMP_DUTY_PLACEHOLDER,
        landlord_signed: signatures.some((row) => row.party === 'landlord'),
        tenant_signed: signatures.some((row) => row.party === 'tenant'),
        signed_at: lease.signed_at || null,
      });
    }

    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    if (action === 'claim') {
      return await claim(base44, user, cleanText(payload.code));
    }

    const leaseId = cleanText(payload.lease_id);
    if (!leaseId) return fail(422, 'VALIDATION', 'The lease is required');

    const lease = await base44.entities.Lease.get(leaseId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!lease) return fail(404, 'NOT_FOUND', 'That lease is not visible to you');

    const isLandlord = lease.landlord_id === user.id;
    const isTenant = lease.tenant_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isLandlord && !isTenant && !isAdmin) return fail(403, 'FORBIDDEN', 'Only the two parties may see this lease');

    const myParty = isLandlord ? 'landlord' : isTenant ? 'tenant' : null;

    if (action === 'view') {
      return json(viewShape(lease, myParty, isAdmin));
    }

    if (action === 'request') {
      if (lease.status === 'signed') return fail(409, 'LEASE_SIGNED', 'This lease is already signed by both parties');
      if (lease.status === 'terminated') return fail(409, 'LEASE_CLOSED', 'This lease is closed');
      // A party may only ask for their own code; an admin may request either,
      // which is how a walkthrough of both phones is done.
      const party = isAdmin && cleanText(payload.party) ? cleanText(payload.party) : myParty;
      if (party !== 'landlord' && party !== 'tenant') {
        return fail(403, 'FORBIDDEN', 'Only a party to this lease can request a signing code');
      }
      const already = (lease.signatures || []).some((row) => row.party === party);
      if (already) return fail(409, 'ALREADY_SIGNED', 'This party has already signed');

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.Lease.update(lease.id, {
        otp: { party, code, issued_at: isoNow(), expires_at: expiresAt },
      });
      return json({
        lease_id: lease.id,
        party,
        otp: { required: true, channel: 'in-app (demo)', expires_at: expiresAt, code },
        note: 'The code is shown to this party only. SMS delivery starts once the notification gateway is connected.',
      });
    }

    if (action === 'sign') {
      const otp = lease.otp || null;
      if (!otp || !otp.code) return fail(409, 'NO_CHALLENGE', 'Request a signing code first');
      if (new Date(otp.expires_at).getTime() < Date.now()) return fail(409, 'OTP_EXPIRED', 'That code has expired');
      if (!myParty && !isAdmin) return fail(403, 'FORBIDDEN', 'Only a party to this lease can sign it');
      if (leakSafeCode(cleanText(payload.code)) !== otp.code) {
        return fail(422, 'OTP_MISMATCH', 'That code is not correct', { code: 'Check the code and try again.' });
      }
      // The code belongs to the party it was issued to; nobody signs in another
      // party's place except the platform admin walking through both phones.
      if (otp.party !== myParty && !isAdmin) return fail(403, 'WRONG_PARTY', 'That code was issued to the other party');
      const signingParty = otp.party;

      const signatures = [...(lease.signatures || []).filter((row) => row.party !== signingParty), {
        party: signingParty,
        method: 'otp_in_app',
        signed_at: isoNow(),
      }];
      const both = ['landlord', 'tenant'].every((party) => signatures.some((row) => row.party === party));
      if (both) await leasePayoutGuard(base44,lease);
      const updated = await base44.asServiceRole.entities.Lease.update(lease.id, {
        signatures,
        otp: null,
        status: both ? 'signed' : 'awaiting_signature',
        signed_at: both ? isoNow() : lease.signed_at || null,
      });

      let activated = false;
      if (both) {
        activated = await activateTenancy(base44, updated);
      }
      return json({ ...viewShape(updated, myParty, isAdmin), activated });
    }

    return fail(422, 'VALIDATION', 'Unknown lease action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

/**
 * The tenant opens the lease with the code the landlord handed over. The
 * account is bound here, and the clauses are re-rendered with the tenant's own
 * name — nothing has been signed yet, so the document can still be completed.
 */
async function claim(base44, user, code) {
  if (!code) return fail(422, 'VALIDATION', 'Enter the lease code', { code: 'The code from your landlord.' });
  const found = await base44.asServiceRole.entities.Lease.filter({ claim_code: code }, { limit: 1 });
  const lease = (found.items || [])[0];
  if (!lease) return fail(404, 'NOT_FOUND', 'No lease matches that code');
  if (lease.tenant_id && lease.tenant_id !== user.id) {
    return fail(409, 'ALREADY_CLAIMED', 'This lease has already been claimed by another account');
  }
  if (lease.status === 'signed') return fail(409, 'LEASE_SIGNED', 'This lease is already signed by both parties');

  const landlord = await base44.asServiceRole.entities.User.get(lease.landlord_id).catch(() => null);
  const previous = lease.terms || {};
  const terms = buildLeaseTerms({
    rent_amount: lease.rent_amount,
    frequency: lease.frequency,
    deposit_months: previous.deposit_months,
    notice_days: previous.notice_days,
    due_day: previous.due_day,
    start_date: lease.start_date,
    end_date: lease.end_date,
    unit_ref: lease.unit_ref,
    ward: lease.ward,
    mtaa: lease.mtaa || '',
    landlord_name: landlord && landlord.full_name ? landlord.full_name : 'Mmiliki',
    tenant_name: user.full_name || 'Mpangaji',
    repair_duties: previous.repair_duties,
    house_rules: previous.house_rules,
  });

  // Binding the account to a lease that carries nobody yet is the one write a
  // tenant cannot make under the ordinary rules; the long claim code is the check.
  const updated = await base44.asServiceRole.entities.Lease.update(lease.id, {
    tenant_id: user.id,
    claim_code: null,
    status: 'awaiting_signature',
    terms,
    lease_version: (lease.lease_version || 1) + 1,
  });

  let tenancyId = lease.tenancy_id || null;
  if (!tenancyId) {
    const rows = await base44.asServiceRole.entities.Tenancy
      .filter({ unit_id: lease.unit_id, status: { $in: ['pending', 'active'] } }, { limit: 1 });
    const known = (rows.items || [])[0];
    if (known) {
      tenancyId = known.id;
    } else {
      const tenancy = await base44.asServiceRole.entities.Tenancy.create({
        unit_id: lease.unit_id,
        unit_ref: lease.unit_ref,
        landlord_id: lease.landlord_id,
        tenant_id: user.id,
        start_date: lease.start_date,
        end_date: lease.end_date,
        rent_amount: lease.rent_amount,
        status: 'pending',
        district: lease.district || '',
        ward: lease.ward || '',
      });
      tenancyId = tenancy.id;
    }
    await base44.asServiceRole.entities.Lease.update(lease.id, { tenancy_id: tenancyId });
  }

  return json({ ...viewShape({ ...updated, tenancy_id: tenancyId }, 'tenant', false), claimed: true });
}

function leakSafeCode(value) {
  return String(value || '').replace(/[^0-9]/g, '').slice(0, 6);
}

/**
 * Both signatures are in: the tenancy becomes active and the unit is marked
 * occupied. The tenancy is not editable by either party through the ordinary
 * rules, so this one narrow write is elevated after the signatures are checked.
 */
async function activateTenancy(base44, lease) {
  try {
    const rows = await base44.asServiceRole.entities.Tenancy
      .filter({ unit_id: lease.unit_id, status: { $in: ['pending', 'active'] } }, { limit: 1 });
    const tenancy = (rows.items || [])[0];
    if (tenancy) {
      await base44.asServiceRole.entities.Tenancy.update(tenancy.id, {
        status: 'active',
        tenant_id: lease.tenant_id,
        start_date: lease.start_date,
        end_date: lease.end_date,
        rent_amount: lease.rent_amount,
      });
    }
    await base44.asServiceRole.entities.RentalUnit.update(lease.unit_id, {
      occupancy: 'occupied',
      tenant_id: lease.tenant_id,
    });
    return true;
  } catch {
    return false;
  }
}

function viewShape(lease, myParty, isAdmin) {
  const signatures = lease.signatures || [];
  return {
    lease_id: lease.id,
    tenancy_id: lease.tenancy_id || null,
    lease_ref: lease.lease_ref,
    unit_ref: lease.unit_ref,
    ward: lease.ward,
    status: lease.status,
    signed_at: lease.signed_at || null,
    verify_code: lease.verify_code || null,
    claim_code: lease.claim_code || null,
    template_version: lease.template_version,
    template_state: lease.template_state,
    template_label: lease.template_label || LEASE_TEMPLATE_LABEL,
    stamp_duty: lease.stamp_duty || STAMP_DUTY_PLACEHOLDER,
    terms: lease.terms || null,
    rent_amount: lease.rent_amount,
    frequency: lease.frequency,
    start_date: lease.start_date,
    end_date: lease.end_date,
    my_party: myParty,
    i_have_signed: myParty ? signatures.some((row) => row.party === myParty) : false,
    parties: ['landlord', 'tenant'].map((party) => {
      const row = signatures.find((item) => item.party === party);
      return { party, signed: Boolean(row), signed_at: row ? row.signed_at : null };
    }),
    can_request: Boolean(myParty && !signatures.some((row) => row.party === myParty) && lease.status !== 'signed'),
    is_admin: Boolean(isAdmin),
  };
}