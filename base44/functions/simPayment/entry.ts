import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, getPolicyRules, json, nextSerial, rentRates } from '../../shared/moneyOps.ts';
import {
  MOCK_PARTNER,
  STAGE,
  STAGE_LABEL,
  buildSettlementLedger,
  computeSplit,
  hmacHex,
  ledgerTotals,
  mockProviderStatus,
  runWorkedExamples,
  statePath,
  verifySignature,
  wholeTZS,
} from '../../shared/r7.ts';

/**
 * SIMULATED payment engine. Stages 2 and 3 are simulation only: the partner is
 * a mock, no money moves, and every response says so.
 *
 * The engine owns four things and nothing else:
 *  1. the split (order: tax, agent commission, service fee, landlord remainder)
 *  2. the state machine (initiated → pending → succeeded → reversed)
 *  3. the append-only ledger (a balanced group per settled payment)
 *  4. the callback rules a real provider would have to follow
 */

const STAGES = [STAGE.stage1, STAGE.stage2, STAGE.stage3];

/**
 * Rates from the active PolicyRule row, the single source. No tax: Stage 1 runs
 * no withholding and TaxRule stays dormant. Commission is one month's rent,
 * expressed as a share of one month so the cap is the figure itself.
 */
function ratesFromRule(rule) {
  const rates = rentRates(rule);
  return {
    tax_rate: 0,
    service_fee_rate: rates.landlord_service_fee_rate,
    commission_share: rates.commission_months,
    commission_cap: 0,
  };
}

function shape(payment) {
  return {
    id: payment.id,
    reference: payment.reference,
    stage: payment.stage,
    stage_label: STAGE_LABEL[payment.stage] || STAGE_LABEL[STAGE.stage2],
    unit_ref: payment.unit_ref || null,
    rent_total: wholeTZS(payment.rent_total),
    deposit_amount: wholeTZS(payment.deposit_amount),
    tenant_pays: wholeTZS(payment.tenant_pays),
    tax: wholeTZS(payment.tax),
    agent_commission: wholeTZS(payment.agent_commission),
    service_fee: wholeTZS(payment.service_fee),
    landlord_remainder: payment.landlord_remainder == null ? null : wholeTZS(payment.landlord_remainder),
    split_lines: Array.isArray(payment.split_lines) ? payment.split_lines : [],
    rates_snapshot: payment.rates_snapshot || null,
    state: payment.state,
    state_history: payment.state_history || [],
    provider: MOCK_PARTNER.name,
    provider_reference: payment.provider_reference || null,
    provider_status_check: payment.provider_status_check || null,
    signature_verified: Boolean(payment.signature_verified),
    refunded_amount: wholeTZS(payment.refunded_amount),
    succeeded_at: payment.succeeded_at || null,
    reversed_at: payment.reversed_at || null,
    simulation: true,
    created_date: payment.created_date || null,
  };
}

async function raiseAlert(base44, input) {
  return base44.asServiceRole.entities.PaymentAlert.create({
    payment_id: input.payment_id || null,
    provider_reference: input.provider_reference || null,
    kind: input.kind,
    detail: input.detail,
    observed: input.observed || null,
    state: 'open',
  });
}

async function ledgerFor(base44, paymentId) {
  const page = await base44.asServiceRole.entities.LedgerEntry.filter({ payment_id: paymentId }, { limit: 200 });
  return page.items || page;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error && error.status === 401 ? null : Promise.reject(error)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'list';
    const isAdmin = user.role === 'admin';

    if (action === 'selfTest') {
      const pure = runWorkedExamples();
      const body = { provider_reference: 'MOCK-REF-1', payment_id: 'p1', amount: 100000, status: 'succeeded' };
      const goodSignature = await hmacHex(MOCK_PARTNER.secret, `MOCK-REF-1|p1|100000|succeeded`);
      const signatureCases = [
        { name: 'A valid signature verifies', expected: true, actual: await verifySignature(MOCK_PARTNER.secret, body, goodSignature) },
        { name: 'A tampered amount fails', expected: false, actual: await verifySignature(MOCK_PARTNER.secret, { ...body, amount: 100001 }, goodSignature) },
        { name: 'Another key fails', expected: false, actual: await verifySignature('a-different-key', body, goodSignature) },
      ];
      const passed = signatureCases.filter((item) => item.expected === item.actual).length;
      return json({
        simulation: true,
        pure: { passed: pure.passed, failed: pure.failed, total: pure.total, cases: pure.cases },
        signature: { passed, failed: signatureCases.length - passed, total: signatureCases.length, cases: signatureCases },
        summary: {
          passed: pure.passed + passed,
          failed: pure.failed + (signatureCases.length - passed),
        },
      });
    }

    const rule = await getPolicyRules(base44);
    const policyRates = ratesFromRule(rule);

    if (action === 'quote') {
      const stage = STAGES.includes(cleanText(payload.stage)) ? cleanText(payload.stage) : STAGE.stage2;
      const rates = isAdmin && payload.demo_rates ? payload.demo_rates : policyRates;
      const split = computeSplit({
        rent_total: payload.rent_total,
        monthly_rent: payload.monthly_rent,
        months: payload.months,
        new_tenancy: payload.new_tenancy,
        deposit_amount: payload.deposit_amount,
        stage,
        rates,
      });
      return json({
        simulation: true,
        split,
        rates_used: rates,
        rates_source: isAdmin && payload.demo_rates ? 'explicit test rates' : 'active PolicyRule',
        policy_version: rule ? rule.version : null,
      });
    }

    if (action === 'initiate') {
      const stage = STAGES.includes(cleanText(payload.stage)) ? cleanText(payload.stage) : STAGE.stage2;
      const idempotencyKey = cleanText(payload.idempotency_key);
      if (idempotencyKey) {
        const existing = await base44.entities.SimPayment.filter({ idempotency_key: idempotencyKey }, { limit: 1 });
        const rows = existing.items || existing;
        if (rows.length) return json({ payment: shape(rows[0]), duplicate: true, simulation: true });
      }

      const rates = isAdmin && payload.demo_rates ? payload.demo_rates : policyRates;
      const split = computeSplit({
        rent_total: payload.rent_total,
        monthly_rent: payload.monthly_rent,
        months: payload.months,
        new_tenancy: payload.new_tenancy,
        deposit_amount: payload.deposit_amount,
        stage,
        rates,
      });

      let landlordId = cleanText(payload.landlord_id) || user.id;
      let tenantId = cleanText(payload.tenant_id) || null;
      let unitRef = cleanText(payload.unit_ref) || null;
      const tenancyId = cleanText(payload.tenancy_id);
      if (tenancyId) {
        const tenancy = await base44.entities.Tenancy.get(tenancyId).catch(() => null);
        if (tenancy) {
          landlordId = tenancy.landlord_id || landlordId;
          tenantId = tenancy.tenant_id || tenantId;
          unitRef = unitRef || tenancy.unit_ref || null;
        }
      }

      const reference = await nextSerial(base44, 'SimPayment', `IBMT-SIM-${new Date().getFullYear()}-`);
      const created = await base44.entities.SimPayment.create({
        reference,
        stage,
        tenancy_id: tenancyId || null,
        unit_ref: unitRef,
        landlord_id: landlordId,
        tenant_id: tenantId,
        rent_total: split.rent_total,
        monthly_rent: split.monthly_rent,
        months: split.months,
        new_tenancy: split.new_tenancy,
        deposit_amount: split.deposit,
        tenant_pays: split.tenant_pays,
        tax: split.tax,
        agent_commission: split.agent_commission,
        service_fee: split.service_fee,
        landlord_remainder: split.landlord_remainder,
        split_lines: split.lines,
        rates_snapshot: rates,
        state: 'initiated',
        state_history: [{ from: null, to: 'initiated', at: new Date().toISOString(), by: user.id, note: 'Simulation started' }],
        provider: MOCK_PARTNER.provider,
        refunded_amount: 0,
        simulation: true,
        policy_version: rule ? rule.version : null,
        idempotency_key: idempotencyKey || null,
      });

      return json({ payment: shape(created), simulation: true });
    }

    if (action === 'status') {
      const paymentId = cleanText(payload.payment_id);
      const payment = await base44.asServiceRole.entities.SimPayment.get(paymentId).catch(() => null);
      if (!payment) return fail(404, 'NOT_FOUND', 'Unknown simulated payment');
      if (!isAdmin && payment.landlord_id !== user.id && payment.tenant_id !== user.id && payment.created_by_id !== user.id) {
        return fail(403, 'FORBIDDEN', 'That simulated payment is not yours');
      }
      const check = mockProviderStatus({
        provider_reference: payment.provider_reference || payment.reference,
        amount: payment.tenant_pays,
      });
      return json({ payment_id: payment.id, state: payment.state, provider_check: check, simulation: true });
    }

    if (action === 'callback' || action === 'partnerNotify') {
      // The demo plays the mock partner: it signs the callback, then the very
      // same rules below run. Nothing is skipped by using this path.
      if (action === 'partnerNotify') {
        if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only the platform admin plays the mock partner');
        const signFor = cleanText(payload.payment_id);
        const outcome = cleanText(payload.outcome) || 'succeeded';
        const row = await base44.asServiceRole.entities.SimPayment.get(signFor).catch(() => null);
        if (!row) return fail(404, 'NOT_FOUND', 'Unknown simulated payment');
        payload.provider_reference = cleanText(payload.provider_reference) || row.provider_reference || `SIM-${row.reference}`;
        payload.status = outcome;
        payload.amount = wholeTZS(row.tenant_pays);
        payload.payment_id = signFor;
        payload.signature = await hmacHex(
          MOCK_PARTNER.secret,
          `${payload.provider_reference}|${signFor}|${payload.amount}|${outcome}`,
        );
      }
      const paymentId = cleanText(payload.payment_id);
      const providerReference = cleanText(payload.provider_reference);
      const claimedStatus = cleanText(payload.status) || 'succeeded';
      const claimedAmount = wholeTZS(payload.amount);
      const payment = await base44.asServiceRole.entities.SimPayment.get(paymentId).catch(() => null);
      if (!payment) return fail(404, 'NOT_FOUND', 'Unknown simulated payment');
      if (!providerReference) return fail(422, 'VALIDATION', 'The provider reference is required');

      // 1. Signature first: nothing is read from a callback that did not sign.
      const signatureOk = await verifySignature(
        MOCK_PARTNER.secret,
        { provider_reference: providerReference, payment_id: paymentId, amount: claimedAmount, status: claimedStatus },
        payload.signature,
      );
      if (!signatureOk) {
        await raiseAlert(base44, {
          payment_id: payment.id,
          provider_reference: providerReference,
          kind: 'signature_invalid',
          detail: 'Callback signature did not verify, so the callback was refused',
          observed: { claimed_status: claimedStatus, claimed_amount: claimedAmount },
        });
        return fail(401, 'BAD_SIGNATURE', 'The callback signature did not verify');
      }

      // 2. A provider reference may be used once, by one payment only.
      const dupPage = await base44.asServiceRole.entities.SimPayment.filter({ provider_reference: providerReference }, { limit: 10 });
      const duplicates = (dupPage.items || dupPage).filter((row) => row.id !== payment.id);
      if (duplicates.length) {
        await raiseAlert(base44, {
          payment_id: payment.id,
          provider_reference: providerReference,
          kind: 'duplicate_callback',
          detail: 'That provider reference is already attached to another payment',
          observed: { other_payment: duplicates[0].id },
        });
        return fail(409, 'DUPLICATE_REFERENCE', 'That provider reference has already been used');
      }

      // 3. Confirm separately with the partner's status endpoint.
      const statusCheck = mockProviderStatus({ provider_reference: providerReference, amount: payment.tenant_pays });
      if (statusCheck.status !== claimedStatus) {
        await base44.asServiceRole.entities.SimPayment.update(payment.id, { provider_status_check: statusCheck });
        await raiseAlert(base44, {
          payment_id: payment.id,
          provider_reference: providerReference,
          kind: 'status_mismatch',
          detail: 'The callback status and the separate status check disagree',
          observed: { claimed: claimedStatus, checked: statusCheck.status },
        });
        return fail(409, 'STATUS_MISMATCH', 'The callback and the status check disagree. The payment was not credited.');
      }
      if (claimedAmount !== wholeTZS(payment.tenant_pays)) {
        await raiseAlert(base44, {
          payment_id: payment.id,
          provider_reference: providerReference,
          kind: 'amount_mismatch',
          detail: 'The callback amount is not the amount this payment expects',
          observed: { claimed_amount: claimedAmount, expected: wholeTZS(payment.tenant_pays) },
        });
        return fail(409, 'AMOUNT_MISMATCH', 'The callback amount does not match the payment. It was not credited.');
      }

      // 4. One place decides whether the move exists.
      const path = statePath(payment.state, claimedStatus);
      if (!path) {
        await raiseAlert(base44, {
          payment_id: payment.id,
          provider_reference: providerReference,
          kind: 'state_violation',
          detail: `Refused a move from ${payment.state} to ${claimedStatus}`,
          observed: { from: payment.state, to: claimedStatus },
        });
        return fail(409, 'ILLEGAL_TRANSITION', `A payment cannot move from ${payment.state} to ${claimedStatus}`);
      }

      const history = Array.isArray(payment.state_history) ? [...payment.state_history] : [];
      let from = payment.state;
      for (const step of path) {
        history.push({ from, to: step, at: new Date().toISOString(), by: 'provider_callback', note: 'Simulation callback' });
        from = step;
      }

      const update = {
        state: claimedStatus,
        state_history: history,
        provider_reference: providerReference,
        signature_verified: true,
        provider_status_check: statusCheck,
        callback_received_at: new Date().toISOString(),
      };
      if (claimedStatus === 'succeeded') update.succeeded_at = new Date().toISOString();

      // A single-record claim. Base44 has no row locks, so the write only
      // applies while the state still matches what this callback read: a second
      // callback arriving at the same moment matches nothing and credits nothing.
      const claim = await base44.asServiceRole.entities.SimPayment.updateMany(
        { id: payment.id, state: payment.state },
        { $set: update },
      );
      if (!claim || !claim.updated) {
        await raiseAlert(base44, {
          payment_id: payment.id,
          provider_reference: providerReference,
          kind: 'state_violation',
          detail: 'Another callback changed this payment first, so this one credited nothing',
          observed: { attempted_from: payment.state, to: claimedStatus },
        });
        return fail(409, 'CONCURRENT_UPDATE', 'The payment changed while this callback was handled. Nothing was credited.');
      }

      // 5. Credit only on success, once.
      let creditsWritten = 0;
      let balanced = null;
      if (claimedStatus === 'succeeded') {
        const existing = await ledgerFor(base44, payment.id);
        if (existing.length) {
          creditsWritten = 0;
          balanced = true;
        } else {
          const split = {
            runs: payment.stage !== STAGE.stage1,
            rent_total: wholeTZS(payment.rent_total),
            tenant_pays: wholeTZS(payment.tenant_pays),
            deposit: wholeTZS(payment.deposit_amount),
            lines: Array.isArray(payment.split_lines) ? payment.split_lines : [],
          };
          const group = buildSettlementLedger(split, payment.id);
          if (!group.balanced) {
            await raiseAlert(base44, {
              payment_id: payment.id,
              kind: 'state_violation',
              detail: 'The ledger group did not balance, so nothing was written',
              observed: { debits: group.debits, credits: group.credits },
            });
            return fail(409, 'UNBALANCED_LEDGER', 'The ledger group did not balance. Nothing was written.');
          }
          const groupId = `${payment.id}-${Date.now()}`;
          await base44.asServiceRole.entities.LedgerEntry.bulkCreate(
            group.lines.map((line) => ({
              payment_id: payment.id,
              group_id: groupId,
              posting: line.posting,
              account: line.account,
              side: line.side,
              amount: wholeTZS(line.amount),
              currency: 'TZS',
              actor_id: user.id,
              actor_role: 'payment_engine',
              simulation: true,
              recorded_at: new Date().toISOString(),
            })),
          );
          creditsWritten = group.lines.length;
          balanced = group.balanced;
        }
      }

      const updated = await base44.asServiceRole.entities.SimPayment.get(payment.id);
      return json({
        payment: shape(updated),
        credits_written: creditsWritten,
        balanced,
        simulation: true,
        note: 'Simulation only. No money moved.',
      });
    }

    if (action === 'ledger') {
      const paymentId = cleanText(payload.payment_id);
      const query = paymentId ? { id: paymentId } : {};
      const ownPage = isAdmin
        ? await base44.asServiceRole.entities.SimPayment.filter(query, { sort: '-created_date', limit: 25 })
        : await base44.entities.SimPayment.filter(query, { sort: '-created_date', limit: 25 });
      const payments = ownPage.items || ownPage;
      const ids = payments.map((row) => row.id);
      const entries = [];
      for (const id of ids) entries.push(...(await ledgerFor(base44, id)));
      const totals = ledgerTotals(entries);
      return json({
        simulation: true,
        payments: payments.map(shape),
        entries: entries.map((entry) => ({
          id: entry.id,
          payment_id: entry.payment_id,
          posting: entry.posting,
          account: entry.account,
          side: entry.side,
          amount: wholeTZS(entry.amount),
          reversal_of: entry.reversal_of || null,
          reason: entry.reason || null,
          recorded_at: entry.recorded_at || entry.created_date,
        })),
        totals,
      });
    }

    if (action === 'alerts') {
      if (!isAdmin) return fail(403, 'FORBIDDEN', 'The alert queue is for the platform admin, so two people see a mismatch');
      const page = await base44.asServiceRole.entities.PaymentAlert.filter({ state: 'open' }, { sort: '-created_date', limit: 50 });
      const rows = page.items || page;
      return json({ alerts: rows, count: rows.length });
    }

    if (action === 'clearAlert') {
      if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only the platform admin clears an alert');
      const id = cleanText(payload.id);
      if (!id) return fail(422, 'VALIDATION', 'The alert is required');
      const cleared = await base44.asServiceRole.entities.PaymentAlert.update(id, {
        state: 'cleared',
        cleared_by: user.id,
        cleared_at: new Date().toISOString(),
        note: cleanText(payload.note) || 'Reviewed',
      });
      return json({ alert: cleared });
    }

    if (action === 'list') {
      const page = await base44.entities.SimPayment.filter({}, { sort: '-created_date', limit: 25 });
      const rows = page.items || page;
      return json({ simulation: true, payments: rows.map(shape) });
    }

    return fail(422, 'VALIDATION', 'Unknown simulated payment action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}