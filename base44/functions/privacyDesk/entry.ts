import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import { RETENTION_DEFAULTS, maskEmail, maskIdNumber, maskPhone } from '../../shared/r7.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * Privacy desk: what a person can do about their own records, and the retention
 * purge an admin runs. Periods are placeholders — the screen says so, and so
 * does every answer here.
 */

const PURPOSES = [
  {
    key: 'core_service',
    label: { en: 'Running my tenancy record', sw: 'Kuendesha kumbukumbu ya upangaji wangu' },
    detail: { en: 'Required. Without it the register cannot work.', sw: 'Inahitajika. Bila yake rejista haiwezi kufanya kazi.' },
    required: true,
  },
  {
    key: 'council_sharing',
    label: { en: 'Sharing building and registration data with the council', sw: 'Kushiriki data ya jengo na usajili na halmashauri' },
    detail: { en: 'Separate choice. Withdrawing it stops council sharing.', sw: 'Uamuzi tofauti. Kuiondoa kunasimamisha kushiriki na halmashauri.' },
    required: false,
  },
  {
    key: 'listings',
    label: { en: 'Showing my unit on the listing board', sw: 'Kuonyesha kitengo changu kwenye ubao wa matangazo' },
    detail: { en: 'Area only, never the house number.', sw: 'Eneo pekee, kamwe si namba ya nyumba.' },
    required: false,
  },
  {
    key: 'rent_history_credit',
    label: { en: 'Using my rent history for credit', sw: 'Kutumia historia yangu ya kodi kwa mkopo' },
    detail: { en: 'Off unless I turn it on.', sw: 'Imezimwa isipokuwa niiwashe.' },
    required: false,
  },
];

async function retentionPeriods(base44) {
  const page = await base44.asServiceRole.entities.RetentionPolicy.filter({ key: 'retention' }, { limit: 1 });
  const rows = page.items || page;
  const row = rows[0];
  if (row && Array.isArray(row.periods) && row.periods.length) return { row, periods: row.periods };
  return { row: null, periods: RETENTION_DEFAULTS };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44).catch((error) => (error && error.status === 401 ? null : Promise.reject(error)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'summary';
    const isAdmin = user.role === 'admin';

    if (action === 'summary') {
      const consentPage = await base44.entities.Consent.filter({ subject_id: user.id }, { limit: 20 });
      const consentRows = consentPage.items || consentPage;
      const consents = PURPOSES.map((purpose) => {
        const row = consentRows.find((item) => item.purpose === purpose.key);
        return {
          ...purpose,
          granted: row ? Boolean(row.granted) : Boolean(purpose.required),
          version: row ? row.version || null : null,
          granted_at: row ? row.granted_at || null : null,
          withdrawn_at: row ? row.withdrawn_at || null : null,
        };
      });

      const accessPage = await base44.entities.AccessLog.filter({ subject_id: user.id }, { sort: '-occurred_at', limit: 10 });
      const deletionPage = await base44.entities.DeletionRequest.filter({ subject_id: user.id }, { sort: '-created_date', limit: 1 });
      const { row, periods } = await retentionPeriods(base44);

      return json({
        profile: {
          full_name: cleanText(user.full_name),
          email_masked: maskEmail(user.email),
          role: (user.data && user.data.ibmt_role) || (isAdmin ? 'admin' : 'user'),
          phone_masked: user.data && user.data.phone ? maskPhone(user.data.phone) : null,
          id_number_masked: user.data && user.data.id_number ? maskIdNumber(user.data.id_number) : null,
        },
        purposes: consents,
        access: accessPage.items || accessPage,
        deletion_request: (deletionPage.items || deletionPage)[0] || null,
        retention: {
          periods,
          placeholder: row ? row.placeholder !== false : true,
          last_run_at: row ? row.last_run_at || null : null,
          last_result: row ? row.last_result || null : null,
        },
      });
    }

    if (action === 'setConsent') {
      const purpose = cleanText(payload.purpose);
      if (!PURPOSES.some((item) => item.key === purpose)) return fail(422, 'VALIDATION', 'Unknown consent purpose');
      const required = PURPOSES.find((item) => item.key === purpose).required;
      if (required && payload.granted === false) {
        return fail(409, 'REQUIRED_PURPOSE', 'This purpose is needed for the register to work. Closing your account is the way to withdraw it.');
      }

      const existingPage = await base44.entities.Consent.filter({ subject_id: user.id, purpose }, { limit: 1 });
      const existing = (existingPage.items || existingPage)[0];
      const now = new Date().toISOString();
      const version = 'consent-2026.1';

      const saved = existing
        ? await base44.entities.Consent.update(existing.id, {
            granted: Boolean(payload.granted),
            granted_at: payload.granted ? now : existing.granted_at || null,
            withdrawn_at: payload.granted ? null : now,
            version,
          })
        : await base44.entities.Consent.create({
            subject_id: user.id,
            purpose,
            granted: Boolean(payload.granted),
            granted_at: payload.granted ? now : null,
            withdrawn_at: payload.granted ? null : now,
            version,
          });

      return json({ consent: saved, separate_choices: true });
    }

    if (action === 'exportData') {
      const read = async (entity, filter) => {
        const page = await base44.entities[entity].filter(filter, { sort: '-created_date', limit: 200 });
        const rows = page.items || page;
        return Array.isArray(rows) ? rows : [];
      };

      const units = await read('RentalUnit', { landlord_id: user.id });
      const leases = await read('Lease', {});
      const rentRecords = await read('RentPayment', {});
      const simulated = await read('SimPayment', {});
      const consents = await read('Consent', { subject_id: user.id });
      const access = await read('AccessLog', { subject_id: user.id });

      const exportPayload = {
        generated_at: new Date().toISOString(),
        subject: { full_name: cleanText(user.full_name), email: user.email, role: (user.data && user.data.ibmt_role) || 'user' },
        note: 'Everything here is what the register holds about you. Amounts are whole shillings.',
        units: units.map((row) => ({
          unit_ref: row.unit_ref,
          address: row.address,
          ward: row.ward,
          mtaa: row.mtaa,
          rent_amount: row.rent_amount,
          status: row.status,
        })),
        leases: leases.map((row) => ({
          lease_ref: row.lease_ref,
          unit_ref: row.unit_ref,
          start_date: row.start_date,
          end_date: row.end_date,
          rent_amount: row.rent_amount,
          status: row.status,
        })),
        rent_records: rentRecords.map((row) => ({
          reference: row.reference,
          period_month: row.period_month,
          amount: row.amount,
          record_status: row.record_status,
          receipt_reference: row.receipt_reference || null,
        })),
        simulated_payments: simulated.map((row) => ({
          reference: row.reference,
          stage: row.stage,
          rent_total: row.rent_total,
          tenant_pays: row.tenant_pays,
          state: row.state,
        })),
        consents: consents.map((row) => ({ purpose: row.purpose, granted: row.granted, version: row.version })),
        access_history: access.map((row) => ({ actor_role: row.actor_role, purpose: row.purpose, at: row.occurred_at })),
      };

      const exportRow = await base44.entities.ExportRequest.create({
        kind: 'own_records',
        format: 'csv',
        status: 'ready',
        requested_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.AccessLog.create({
        subject_id: user.id,
        actor_role: 'self_service',
        purpose: 'Subject asked for a copy of their own records',
        record_type: 'own_records',
        record_reference: exportRow.id,
        occurred_at: new Date().toISOString(),
      });

      return json({
        export_id: exportRow.id,
        filename: `ibmt-my-records-${new Date().toISOString().slice(0, 10)}.json`,
        payload: exportPayload,
        counts: {
          units: exportPayload.units.length,
          leases: exportPayload.leases.length,
          rent_records: exportPayload.rent_records.length,
          simulated_payments: exportPayload.simulated_payments.length,
          consents: exportPayload.consents.length,
          access_history: exportPayload.access_history.length,
        },
      });
    }

    if (action === 'deleteRequest') {
      const reason = cleanText(payload.reason);
      if (payload.confirm !== true) return fail(422, 'VALIDATION', 'Confirm that you understand what is replaced and what is kept');

      const retained = [
        { what: 'Lease and rent records', why: 'A contract and a payment record are evidence both parties may need.' },
        { what: 'Council register entry for the building', why: 'The council keeps its building register under its by-laws.' },
        { what: 'Audit and access history', why: 'Kept so a person can still see who touched their records.' },
      ];

      const anonymisedFields = [];
      const units = await base44.asServiceRole.entities.RentalUnit.updateMany(
        { landlord_id: user.id },
        { $set: { landlord_name: 'Mmiliki (jina limefichwa)' } },
      );
      if (units && units.updated) anonymisedFields.push(`RentalUnit.landlord_name (${units.updated})`);

      const viewings = await base44.asServiceRole.entities.Viewing.updateMany(
        { tenant_id: user.id },
        { $set: { tenant_name: 'Mpangaji (jina limefichwa)' } },
      );
      if (viewings && viewings.updated) anonymisedFields.push(`Viewing.tenant_name (${viewings.updated})`);

      const consents = await base44.entities.Consent.filter({ subject_id: user.id }, { limit: 10 });
      for (const row of consents.items || consents) {
        await base44.entities.Consent.update(row.id, { granted: false, withdrawn_at: new Date().toISOString() });
      }
      anonymisedFields.push('Consent purposes withdrawn');

      const request = await base44.entities.DeletionRequest.create({
        subject_id: user.id,
        reason,
        status: 'anonymised',
        anonymised_fields: anonymisedFields,
        retained,
        anonymised_at: new Date().toISOString(),
        note: 'Names replaced with a neutral value. The account itself is closed by the platform, not by this screen.',
      });

      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_role: 'self_service',
        action: 'privacy.anonymise',
        subject_type: 'User',
        subject_id: user.id,
        outcome: 'confirmed',
        reason: reason || 'Subject asked to be anonymised',
        occurred_at: new Date().toISOString(),
        detail: { anonymised_fields: anonymisedFields },
      });

      return json({
        request,
        note: {
          en: 'Your name has been replaced in the records this screen may change. Lease, rent and council records are kept, and a person can still see who accessed them.',
          sw: 'Jina lako limebadilishwa katika kumbukumbu ambazo ukurasa huu unaweza kubadilisha. Kumbukumbu za mkataba, kodi na halmashauri zinahifadhiwa, na mtu anaweza kuona nani alizifikia.',
        },
      });
    }

    if (action === 'retentionRun') {
      if (!isAdmin) return fail(403, 'FORBIDDEN', 'The purge job is run by the platform admin');
      if (payload.acknowledge_placeholder !== true) {
        return fail(422, 'VALIDATION', 'Confirm that the periods are placeholders before running the purge');
      }

      const { row, periods } = await retentionPeriods(base44);
      const results = [];
      for (const period of periods) {
        const cutoff = new Date(Date.now() - Number(period.days) * 86400000).toISOString();
        let deleted = 0;
        try {
          const outcome = await base44.asServiceRole.entities[period.entity].deleteMany({ created_date: { $lt: cutoff } });
          deleted = (outcome && (outcome.deleted || outcome.count)) || 0;
        } catch (error) {
          results.push({ key: period.key, entity: period.entity, days: period.days, deleted: 0, error: error.message });
          continue;
        }
        results.push({ key: period.key, entity: period.entity, days: period.days, cutoff, deleted });
      }

      const lastResult = { run_at: new Date().toISOString(), placeholder: true, results };
      if (row) {
        await base44.asServiceRole.entities.RetentionPolicy.update(row.id, { last_run_at: lastResult.run_at, last_result: lastResult });
      } else {
        await base44.asServiceRole.entities.RetentionPolicy.create({
          key: 'retention',
          periods,
          placeholder: true,
          last_run_at: lastResult.run_at,
          last_result: lastResult,
          notes: 'Placeholder periods. No lawyer has signed these off.',
        });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_role: 'platform_admin',
        action: 'privacy.retention_run',
        subject_type: 'RetentionPolicy',
        subject_id: row ? row.id : 'retention',
        outcome: 'confirmed',
        reason: 'Placeholder retention purge',
        occurred_at: new Date().toISOString(),
        detail: { deleted: results.map((item) => ({ entity: item.entity, deleted: item.deleted })) },
      });

      return json({ result: lastResult, placeholder: true });
    }

    return fail(422, 'VALIDATION', 'Unknown privacy action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}