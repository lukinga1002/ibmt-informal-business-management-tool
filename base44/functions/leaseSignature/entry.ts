import { leasePayoutGuard } from '../../shared/stage2Payout.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { LEASE_TEMPLATE_LABEL, STAMP_DUTY_PLACEHOLDER, buildLeaseTerms } from '../../shared/leaseTemplate.ts';
import { attemptOtp, issuanceAllowed, issueChallenge } from '../../shared/registration.ts';
import { OTP_POLICY } from '../../shared/r7.ts';
import { ClaimBusyError, withRecordClaim } from '../../shared/recordClaim.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

const LEASE_PURPOSE = 'lease_signature';

/**
 * Reviewing and signing a lease.
 *
 * Each party signs from their own phone, in their own session, with a code sent
 * to their own number — a code is never shown to the other party. The lease
 * becomes signed only when both signatures are present, and only then does the
 * tenancy behind it become active.
 *
 * Signing codes (hardened 2026-11-12). The code used to sit in plain text on the
 * Lease record, which both parties can read, with no attempt limit and from
 * Math.random; a second party's request also overwrote the first party's code.
 * Now each request issues its own challenge through shared/registration.ts: a
 * random code, only its salted hash stored on the admin-only OtpChallenge row,
 * bound to this user, this lease and this party, five minutes, five attempts
 * then a fifteen-minute lockout, hourly send limits, and attempts counted and
 * consumed atomically (attemptOtp). The signature itself is written under the
 * lease's signing claim, so two parties signing at once both land.
 *
 * The public check (`action: 'public'`) answers with the long verify code from
 * the QR and shows no names, street or meter.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44).catch((e) => (e.status === 401 ? null : Promise.reject(e)));
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

      const phone = user.data && user.data.phone ? String(user.data.phone) : '';
      const allowed = await issuanceAllowed(base44, { subjectId: user.id, phone: phone || null });
      if (!allowed.allowed) {
        return fail(429, 'RATE_LIMITED', 'Too many signing codes were requested. Try again within the hour.');
      }
      const issued = await issueChallenge(base44, {
        subjectId: user.id,
        subjectRef: `${lease.id}:${party}`,
        purpose: LEASE_PURPOSE,
        phone,
      });
      // Codes never live on the lease. Clear any code an older version stored there.
      if (lease.otp) await base44.asServiceRole.entities.Lease.update(lease.id, { otp: null });
      return json({
        lease_id: lease.id,
        party,
        challenge_id: issued.challenge.id,
        otp: {
          required: true,
          channel: 'in-app (demo)',
          expires_at: issued.expires_at,
          max_attempts: OTP_POLICY.max_attempts,
          // Simulation only: a real deployment sends this by SMS and never returns it.
          code: issued.code,
        },
        note: 'The code is shown to this party only. SMS delivery starts once the notification gateway is connected.',
      });
    }

    if (action === 'sign') {
      if (!myParty && !isAdmin) return fail(403, 'FORBIDDEN', 'Only a party to this lease can sign it');
      const challengeId = cleanText(payload.challenge_id);
      if (!challengeId) return fail(409, 'NO_CHALLENGE', 'Request a signing code first');
      const svc = base44.asServiceRole.entities;
      const challenge = await svc.OtpChallenge.get(challengeId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      const [challengeLease, signingParty] = String((challenge && challenge.subject_ref) || '').split(':');
      // The code belongs to the user, lease and party it was issued to; nobody
      // signs in another party's place except the platform admin walking
      // through both phones, and even then only with a code issued to the admin.
      if (!challenge || challenge.purpose !== LEASE_PURPOSE || challenge.subject_id !== user.id || challengeLease !== lease.id) {
        return fail(403, 'WRONG_CHALLENGE', 'That code was not issued to you for this lease');
      }
      if (signingParty !== 'landlord' && signingParty !== 'tenant') return fail(403, 'WRONG_CHALLENGE', 'That code was not issued to you for this lease');
      if (signingParty !== myParty && !isAdmin) return fail(403, 'WRONG_PARTY', 'That code was issued to the other party');
      if (lease.status === 'signed') return fail(409, 'LEASE_SIGNED', 'This lease is already signed by both parties');
      if ((lease.signatures || []).some((row) => row.party === signingParty)) {
        return fail(409, 'ALREADY_SIGNED', 'This party has already signed');
      }

      // If this signature completes the lease, check the payout rule before the
      // code is spent, so a refusal does not cost the party their code.
      const otherParty = signingParty === 'landlord' ? 'tenant' : 'landlord';
      if ((lease.signatures || []).some((row) => row.party === otherParty)) {
        const blocked = await payoutBlock(base44, lease);
        if (blocked) return blocked;
      }

      const result = await attemptOtp(svc.OtpChallenge, challenge, leakSafeCode(cleanText(payload.code)));
      if (!result.ok) return otpRefusal(result);

      const outcome = await withRecordClaim(
        svc.Lease,
        lease.id,
        { lock: 'signing_lock', at: 'signing_lock_at' },
        async () => {
          const current = await svc.Lease.get(lease.id);
          const signatures = [...(current.signatures || []).filter((row) => row.party !== signingParty), {
            party: signingParty,
            method: 'otp_in_app',
            challenge_id: challenge.id,
            signed_at: isoNow(),
          }];
          const both = ['landlord', 'tenant'].every((party) => signatures.some((row) => row.party === party));
          if (both) {
            const blocked = await payoutBlock(base44, current);
            if (blocked) return { blocked };
          }
          const updated = await svc.Lease.update(current.id, {
            signatures,
            otp: null,
            status: both ? 'signed' : 'awaiting_signature',
            signed_at: both ? isoNow() : current.signed_at || null,
          });
          return { updated: { ...current, ...updated, signatures }, activated: both ? await activateTenancy(base44, { ...current, ...updated }) : false };
        },
        { busy: () => new ClaimBusyError('Another signature on this lease is being saved. Try again.', 'SIGNING_BUSY') },
      );
      if (outcome.blocked) return outcome.blocked;
      return json({ ...viewShape(outcome.updated, myParty, isAdmin), activated: outcome.activated });
    }

    return fail(422, 'VALIDATION', 'Unknown lease action');
  } catch (error) {
    if (error instanceof ClaimBusyError) return fail(409, error.code, error.message);
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

async function payoutBlock(base44, lease) {
  try {
    await leasePayoutGuard(base44, lease);
    return null;
  } catch (error) {
    return fail(409, 'PAYOUT_ACCOUNT_REQUIRED', error && error.message ? error.message : 'Approve a payout account first');
  }
}

function otpRefusal(result) {
  switch (result.reason) {
    case 'mismatch':
      return fail(422, 'OTP_MISMATCH', 'That code is not correct', {
        code: `Check the code and try again. Attempts left: ${Math.max(0, OTP_POLICY.max_attempts - result.attempts)}.`,
      });
    case 'too_many_attempts':
    case 'locked':
      return fail(423, 'OTP_LOCKED', `Too many wrong codes. Request a new code after ${OTP_POLICY.lockout_minutes} minutes.`);
    case 'expired':
      return fail(409, 'OTP_EXPIRED', 'That code has expired. Request a new one.');
    case 'already_used':
      return fail(409, 'OTP_USED', 'That code has already been used. Request a new one.');
    default:
      return fail(409, 'OTP_BUSY', 'Another attempt with this code is in progress. Try again.');
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