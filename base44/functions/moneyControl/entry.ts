import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import {
  OTP_POLICY,
  PAYOUT,
  RATE_LIMIT,
  coolingOffEndsAt,
  issueOtp,
  checkOtp,
  maskPhone,
  payoutActivationGuard,
  refundGuard,
  reversingLines,
  statePath,
  wholeTZS,
  withinRateLimit,
} from '../../shared/r7.ts';

/**
 * Money controls. Every one of these is a simulated action, because no real
 * provider is connected.
 *
 * Two rules hold everywhere:
 *  - a refund can never exceed what was paid
 *  - an admin money action needs a second person: the requester can never be
 *    the approver, and the action cannot run before that approval exists
 */

async function audit(base44, user, action, subjectType, subjectId, outcome, reason, detail = null) {
  return base44.asServiceRole.entities.AuditLog.create({
    actor_id: user.id,
    actor_role: user.role === 'admin' ? 'platform_admin' : (user.data && user.data.ibmt_role) || 'user',
    action,
    subject_type: subjectType,
    subject_id: subjectId || null,
    outcome,
    reason: reason || null,
    occurred_at: new Date().toISOString(),
    detail,
  });
}

async function ledgerFor(base44, paymentId) {
  const page = await base44.asServiceRole.entities.LedgerEntry.filter({ payment_id: paymentId }, { limit: 500 });
  return page.items || page;
}

async function writeGroup(base44, user, paymentId, lines, reason, reversalOf) {
  const groupId = `${paymentId}-${Date.now()}-adj`;
  await base44.asServiceRole.entities.LedgerEntry.bulkCreate(
    lines.map((line) => ({
      payment_id: paymentId,
      group_id: groupId,
      posting: line.posting,
      account: line.account,
      side: line.side,
      amount: wholeTZS(line.amount),
      currency: 'TZS',
      reason: reason || null,
      actor_id: user.id,
      actor_role: 'money_control',
      reversal_of: reversalOf || null,
      simulation: true,
      recorded_at: new Date().toISOString(),
    })),
  );
  return groupId;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error && error.status === 401 ? null : Promise.reject(error)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'list';
    const isAdmin = user.role === 'admin';

    if (action === 'list') {
      const approvals = await base44.entities.ApprovalRequest.filter({}, { sort: '-created_date', limit: 20 });
      const payouts = await base44.entities.PayoutAccountChange.filter({}, { sort: '-created_date', limit: 20 });
      return json({
        simulation: true,
        approvals: approvals.items || approvals,
        payouts: payouts.items || payouts,
        otp_policy: OTP_POLICY,
        cooling_off_hours: PAYOUT.cooling_off_hours,
      });
    }

    if (action === 'request') {
      if (!isAdmin) return fail(403, 'FORBIDDEN', 'A money action is requested by the platform admin and approved by a second person');
      const kind = cleanText(payload.kind);
      const paymentId = cleanText(payload.payment_id);
      const reason = cleanText(payload.reason);
      if (!['refund', 'reverse'].includes(kind)) return fail(422, 'VALIDATION', 'Unknown money action');
      if (!paymentId) return fail(422, 'VALIDATION', 'The payment is required');
      if (!reason) return fail(422, 'VALIDATION', 'Give the reason for the correction', { reason: 'A reason is required' });

      const payment = await base44.asServiceRole.entities.SimPayment.get(paymentId).catch(() => null);
      if (!payment) return fail(404, 'NOT_FOUND', 'Unknown simulated payment');
      if (payment.state !== 'succeeded') {
        return fail(409, 'NOT_SUCCEEDED', 'Only a succeeded payment can be refunded or reversed');
      }

      if (kind === 'refund') {
        const guard = refundGuard({
          paid: payment.tenant_pays,
          alreadyRefunded: payment.refunded_amount,
          requested: payload.amount,
        });
        if (!guard.ok) return fail(409, 'REFUND_TOO_LARGE', guard.reason);
      }

      const request = await base44.entities.ApprovalRequest.create({
        action: kind,
        payload: {
          payment_id: payment.id,
          payment_reference: payment.reference,
          amount: kind === 'refund' ? wholeTZS(payload.amount) : wholeTZS(payment.tenant_pays),
          paid: wholeTZS(payment.tenant_pays),
          already_refunded: wholeTZS(payment.refunded_amount),
        },
        requested_by_id: user.id,
        requested_by_name: cleanText(user.full_name) || 'Admin',
        reason,
        required_approvals: 1,
        approvals: [],
        status: 'pending',
      });

      await audit(base44, user, `money.${kind}.requested`, 'SimPayment', payment.id, 'proposed', reason, {
        amount: kind === 'refund' ? wholeTZS(payload.amount) : wholeTZS(payment.tenant_pays),
      });

      return json({ request, simulation: true, note: 'Waiting for a second person to approve.' });
    }

    if (action === 'decide') {
      if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an admin can approve a money action');
      const id = cleanText(payload.id);
      const decision = cleanText(payload.decision) || 'approve';
      const request = await base44.entities.ApprovalRequest.get(id).catch(() => null);
      if (!request) return fail(404, 'NOT_FOUND', 'Unknown approval request');
      if (request.status !== 'pending') return fail(409, 'ALREADY_DECIDED', 'That request is no longer pending');
      if (request.requested_by_id === user.id) {
        return fail(403, 'SECOND_PERSON_REQUIRED', 'The person who requested it cannot approve it. A second person is required.');
      }

      if (decision === 'reject') {
        const rejected = await base44.entities.ApprovalRequest.update(request.id, {
          status: 'rejected',
          approvals: [
            ...(request.approvals || []),
            { by_id: user.id, by_name: cleanText(user.full_name) || 'Admin', at: new Date().toISOString(), note: cleanText(payload.note) || 'Rejected' },
          ],
        });
        await audit(base44, user, `money.${request.action}.rejected`, 'ApprovalRequest', request.id, 'refused', cleanText(payload.note));
        return json({ request: rejected });
      }

      const payment = await base44.asServiceRole.entities.SimPayment.get(request.payload.payment_id).catch(() => null);
      if (!payment) return fail(404, 'NOT_FOUND', 'The payment behind this request no longer exists');

      if (request.action === 'refund') {
        const guard = refundGuard({
          paid: payment.tenant_pays,
          alreadyRefunded: payment.refunded_amount,
          requested: request.payload.amount,
        });
        if (!guard.ok) return fail(409, 'REFUND_TOO_LARGE', guard.reason);

        await writeGroup(
          base44,
          user,
          payment.id,
          [
            { posting: 50, account: 'refunds', side: 'debit', amount: guard.amount },
            { posting: 50, account: 'partner_clearing', side: 'credit', amount: guard.amount },
          ],
          request.reason,
          payment.id,
        );

        const refundedTotal = wholeTZS(payment.refunded_amount) + guard.amount;
        const fullyRefunded = refundedTotal >= wholeTZS(payment.tenant_pays);
        const history = Array.isArray(payment.state_history) ? [...payment.state_history] : [];
        const update = { refunded_amount: refundedTotal };
        if (fullyRefunded) {
          const path = statePath(payment.state, 'reversed');
          if (path) {
            let from = payment.state;
            for (const step of path) {
              history.push({ from, to: step, at: new Date().toISOString(), by: user.id, note: 'Fully refunded' });
              from = step;
            }
            update.state = 'reversed';
            update.reversed_at = new Date().toISOString();
            update.state_history = history;
          }
        }
        await base44.asServiceRole.entities.SimPayment.update(payment.id, update);
        const updated = await base44.entities.ApprovalRequest.update(request.id, {
          status: 'executed',
          executed_at: new Date().toISOString(),
          approvals: [
            ...(request.approvals || []),
            { by_id: user.id, by_name: cleanText(user.full_name) || 'Admin', at: new Date().toISOString(), note: cleanText(payload.note) || 'Approved' },
          ],
          result: { refunded: guard.amount, refunded_total: refundedTotal, fully_refunded: fullyRefunded },
        });
        await audit(base44, user, 'money.refund.executed', 'SimPayment', payment.id, 'confirmed', request.reason, {
          amount: guard.amount,
          fully_refunded: fullyRefunded,
        });
        return json({ request: updated, result: { refunded: guard.amount, fully_refunded: fullyRefunded }, simulation: true });
      }

      // A reversal mirrors the original posting group; it never edits it.
      const entries = await ledgerFor(base44, payment.id);
      if (!entries.length) return fail(409, 'NO_LEDGER', 'That payment has no ledger entries to reverse');
      const mirrored = reversingLines(entries);
      await writeGroup(base44, user, payment.id, mirrored, request.reason, payment.id);

      const path = statePath(payment.state, 'reversed');
      if (!path) return fail(409, 'ILLEGAL_TRANSITION', 'That payment cannot be reversed from its current state');
      const history = Array.isArray(payment.state_history) ? [...payment.state_history] : [];
      let from = payment.state;
      for (const step of path) {
        history.push({ from, to: step, at: new Date().toISOString(), by: user.id, note: request.reason });
        from = step;
      }
      await base44.asServiceRole.entities.SimPayment.update(payment.id, {
        state: 'reversed',
        reversed_at: new Date().toISOString(),
        state_history: history,
      });
      const updated = await base44.entities.ApprovalRequest.update(request.id, {
        status: 'executed',
        executed_at: new Date().toISOString(),
        approvals: [
          ...(request.approvals || []),
          { by_id: user.id, by_name: cleanText(user.full_name) || 'Admin', at: new Date().toISOString(), note: cleanText(payload.note) || 'Approved' },
        ],
        result: { reversed_entries: mirrored.length },
      });
      await audit(base44, user, 'money.reverse.executed', 'SimPayment', payment.id, 'confirmed', request.reason, {
        reversed_entries: mirrored.length,
      });
      return json({ request: updated, simulation: true });
    }

    if (action === 'payoutRequest') {
      const newPhone = cleanText(payload.new_phone);
      const declaredOld = cleanText(payload.old_phone);
      if (!newPhone) return fail(422, 'VALIDATION', 'Enter the new payout number', { new_phone: 'Enter the new number' });

      const onFile = cleanText(user.data && user.data.phone) || cleanText(user.phone);
      const oldPhone = onFile || declaredOld;
      if (!oldPhone) {
        return fail(422, 'VALIDATION', 'No number is on file, so the change cannot be sent for verification', {
          old_phone: 'Enter the number currently on file',
        });
      }

      // Rate limit per person, then per number.
      const recentPage = await base44.asServiceRole.entities.OtpChallenge.filter(
        { subject_id: user.id, purpose: 'payout_change' },
        { sort: '-created_date', limit: 20 },
      );
      const recentRows = recentPage.items || recentPage;
      const perUser = withinRateLimit(recentRows.map((row) => row.issued_at), RATE_LIMIT.otp_per_user_per_hour, 60);
      if (!perUser.allowed) {
        return fail(429, 'RATE_LIMITED', `Too many codes requested. Try again after ${perUser.window_minutes} minutes.`);
      }
      const sameNumber = recentRows.filter((row) => row.phone_masked === maskPhone(oldPhone));
      const perPhone = withinRateLimit(sameNumber.map((row) => row.issued_at), RATE_LIMIT.otp_per_phone_per_hour, 60);
      if (!perPhone.allowed) {
        return fail(429, 'RATE_LIMITED', 'Too many codes sent to that number. Try again later.');
      }

      const otp = issueOtp();
      const change = await base44.entities.PayoutAccountChange.create({
        landlord_id: user.id,
        landlord_name: cleanText(user.full_name) || 'Landlord',
        old_phone_masked: maskPhone(oldPhone),
        new_phone_masked: maskPhone(newPhone),
        new_phone_last4: String(newPhone).replace(/\D/g, '').slice(-4),
        status: 'otp_sent',
        history: [
          {
            status: 'otp_sent',
            at: otp.issued_at,
            by: user.id,
            note: onFile ? 'Code sent to the number on file' : 'Number on file not recorded; the code was sent to the number the landlord declared, which is weaker',
          },
        ],
      });

      const challenge = await base44.asServiceRole.entities.OtpChallenge.create({
        subject_id: user.id,
        purpose: 'payout_change',
        phone_masked: maskPhone(oldPhone),
        code: otp.code,
        issued_at: otp.issued_at,
        expires_at: otp.expires_at,
        attempts: 0,
        subject_ref: change.id,
      });

      await base44.entities.PayoutAccountChange.update(change.id, { challenge_id: challenge.id });
      await audit(base44, user, 'payout.change.requested', 'PayoutAccountChange', change.id, 'proposed', 'Payout number change', {
        old_phone_masked: maskPhone(oldPhone),
      });

      return json({
        change: { ...change, challenge_id: challenge.id },
        otp: { expires_at: otp.expires_at, ttl_minutes: OTP_POLICY.ttl_minutes, max_attempts: OTP_POLICY.max_attempts },
        // Simulation only: a real provider sends this by SMS and never returns it.
        simulation_code: otp.code,
        simulation_note: {
          en: 'Simulation: the code is shown here because no SMS is sent. In production it goes to the old number only.',
          sw: 'Majaribio: namba inaonyeshwa hapa kwa sababu hakuna SMS inayotumwa. Katika matumizi halisi huenda kwa namba ya zamani pekee.',
        },
      });
    }

    if (action === 'payoutVerify') {
      const changeId = cleanText(payload.id);
      const change = await base44.entities.PayoutAccountChange.get(changeId).catch(() => null);
      if (!change) return fail(404, 'NOT_FOUND', 'Unknown payout change');
      if (change.landlord_id !== user.id && !isAdmin) return fail(403, 'FORBIDDEN', 'That change is not yours');
      if (change.status !== 'otp_sent') return fail(409, 'BAD_STATE', 'That change is not waiting for a code');

      const challenge = change.challenge_id
        ? await base44.asServiceRole.entities.OtpChallenge.get(change.challenge_id).catch(() => null)
        : null;
      if (!challenge) return fail(409, 'NO_CHALLENGE', 'The code for that change no longer exists');

      const result = checkOtp({ challenge, code: payload.code });
      await base44.asServiceRole.entities.OtpChallenge.update(challenge.id, {
        attempts: result.attempts,
        locked_until: result.locked_until,
        consumed_at: result.ok ? new Date().toISOString() : challenge.consumed_at || null,
      });

      if (!result.ok) {
        await base44.entities.PayoutAccountChange.update(change.id, {
          history: [
            ...(change.history || []),
            { status: change.status, at: new Date().toISOString(), by: user.id, note: `Code refused: ${result.reason}` },
          ],
        });
        return fail(401, 'OTP_REFUSED', `The code was refused: ${String(result.reason).replace(/_/g, ' ')}`);
      }

      const endsAt = coolingOffEndsAt();
      const updated = await base44.entities.PayoutAccountChange.update(change.id, {
        status: 'cooling_off',
        cooling_off_ends_at: endsAt,
        history: [
          ...(change.history || []),
          { status: 'cooling_off', at: new Date().toISOString(), by: user.id, note: `Verified. Cooling off until ${endsAt}` },
        ],
      });
      await audit(base44, user, 'payout.change.verified', 'PayoutAccountChange', change.id, 'allowed', 'Old number confirmed the change', {
        cooling_off_ends_at: endsAt,
      });
      return json({ change: updated, cooling_off_hours: PAYOUT.cooling_off_hours });
    }

    if (action === 'payoutActivate') {
      const changeId = cleanText(payload.id);
      const change = await base44.entities.PayoutAccountChange.get(changeId).catch(() => null);
      if (!change) return fail(404, 'NOT_FOUND', 'Unknown payout change');
      if (change.landlord_id !== user.id && !isAdmin) return fail(403, 'FORBIDDEN', 'That change is not yours');
      const guard = payoutActivationGuard({ cooling_off_ends_at: change.cooling_off_ends_at });
      if (!guard.ok) return fail(409, 'COOLING_OFF', guard.reason);

      const updated = await base44.entities.PayoutAccountChange.update(change.id, {
        status: 'effective',
        effective_at: new Date().toISOString(),
        history: [
          ...(change.history || []),
          { status: 'effective', at: new Date().toISOString(), by: user.id, note: 'Cooling-off finished' },
        ],
      });
      await audit(base44, user, 'payout.change.effective', 'PayoutAccountChange', change.id, 'confirmed', 'Cooling-off finished');
      return json({ change: updated });
    }

    return fail(422, 'VALIDATION', 'Unknown money control action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}