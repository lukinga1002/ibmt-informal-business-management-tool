import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json } from '../../shared/moneyOps.ts';
import { checkHashedOtp, issueChallenge, issuanceAllowed } from '../../shared/registration.ts';
import { maskEmail, maskPhone } from '../../shared/r7.ts';

/**
 * Entry code for a rental workspace.
 *
 * The person confirms with a code sent to the phone number or email already on
 * their own account, and only then does the workspace open. This is a
 * confirmation, never a sign-in: the platform session is what authenticates the
 * account, so no session, token or password is ever created here.
 *
 * Nothing but the salted hash is stored, on the admin-only OtpChallenge row.
 * Five minutes, five attempts, fifteen-minute lockout, three codes an hour.
 */
const ENTRY_ROLES = {
  landlord: ['landlord'],
  tenant: ['tenant'],
  agent: ['agent'],
  mtaa_officer: ['mtaa_officer'],
  council: ['council_official', 'district_commissioner', 'regional_commissioner'],
};

const ROUTE_BY_ROLE = {
  landlord: '/rent/landlord',
  tenant: '/rent/tenant',
  agent: '/rent/agent',
  mtaa_officer: '/rent/ward',
  council_official: '/rent/council',
  district_commissioner: '/rent/district',
  regional_commissioner: '/rent/region',
};

function routeFor(entry, accountRole) {
  return ROUTE_BY_ROLE[accountRole] || (entry === 'council' ? '/rent/council' : `/rent/${entry}`);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'AUTH', 'Sign in first');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'send';
    const entry = cleanText(payload.entry);
    if (!ENTRY_ROLES[entry]) return fail(422, 'VALIDATION', 'Unknown workspace', { entry: 'Choose a workspace.' });

    const accountRole = (user.data && user.data.ibmt_role) || null;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !ENTRY_ROLES[entry].includes(accountRole)) {
      return json({
        ok: false,
        reason: 'role',
        registered_role: accountRole,
        route: ROUTE_BY_ROLE[accountRole] || null,
      });
    }

    if (action === 'verify') {
      const challengeId = cleanText(payload.challenge_id);
      const code = cleanText(payload.code);
      if (!challengeId) return fail(422, 'VALIDATION', 'Missing challenge');
      if (!/^[0-9]{6}$/.test(code)) {
        return json({ ok: false, reason: 'code', message: 'Enter the six digit code' });
      }

      const challenge = await base44.asServiceRole.entities.OtpChallenge
        .get(challengeId)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));

      // A challenge belongs to one account and one purpose; anything else is
      // refused rather than read.
      if (!challenge || challenge.subject_id !== user.id || challenge.purpose !== 'workspace_access') {
        return json({ ok: false, reason: 'expired' });
      }

      const now = isoNow();
      const result = await checkHashedOtp({ challenge, code, now });

      await base44.asServiceRole.entities.OtpChallenge.update(challenge.id, {
        attempts: result.attempts,
        locked_until: result.locked_until,
        consumed_at: result.ok ? now : challenge.consumed_at || null,
      });

      if (!result.ok) return json({ ok: false, reason: String(result.reason) });

      return json({
        ok: true,
        entry: challenge.subject_ref,
        route: routeFor(challenge.subject_ref, accountRole),
        confirmed_at: now,
      });
    }

    const phone = user.data && user.data.phone ? String(user.data.phone) : '';
    const requested = cleanText(payload.channel);
    const channel = requested === 'phone' || requested === 'email' ? requested : phone ? 'phone' : 'email';
    if (channel === 'phone' && !phone) return json({ ok: false, reason: 'no_phone' });

    const allowed = await issuanceAllowed(base44, { subjectId: user.id, phone: channel === 'phone' ? phone : null });
    if (!allowed.allowed) return json({ ok: false, reason: 'rate_limited' });

    const issued = await issueChallenge(base44, {
      subjectId: user.id,
      subjectRef: entry,
      purpose: 'workspace_access',
      phone: channel === 'phone' ? phone : '',
    });

    // Phone delivery has no gateway yet, so the demo shows the code in the app
    // instead of pretending an SMS left the system.
    if (channel === 'phone') {
      return json({
        ok: true,
        challenge_id: issued.challenge.id,
        channel,
        to: maskPhone(phone),
        demo_code: issued.code,
        expires_minutes: issued.ttl_minutes,
        route: routeFor(entry, accountRole),
      });
    }

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Your IBMT Rent entry code',
        body: [
          `Your IBMT Rent entry code is ${issued.code}.`,
          `It expires in ${issued.ttl_minutes} minutes and can be used once.`,
          'If you did not ask for this code, ignore this message: nobody can open your workspace without it.',
        ].join('\n\n'),
        category: 'transactional',
      });
    } catch (error) {
      return json({ ok: false, reason: 'email_failed' });
    }

    await base44.asServiceRole.entities.OtpChallenge.update(issued.challenge.id, { channel: 'email_sent' });

    return json({
      ok: true,
      challenge_id: issued.challenge.id,
      channel,
      to: maskEmail(user.email),
      demo_code: null,
      expires_minutes: issued.ttl_minutes,
      route: routeFor(entry, accountRole),
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}