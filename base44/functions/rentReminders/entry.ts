import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { fail, json } from '../../shared/moneyOps.ts';
import { dueDateOf } from '../../shared/leaseTemplate.ts';

/**
 * Rent reminders, run once a day by the scheduled workflow.
 *
 * Seven days and one day before the rent is due, both parties get a reminder —
 * but only when the period has no confirmed record. Each reminder carries a
 * dedupe key per person, period and lead time, so a re-run never sends twice.
 * SMS is used only where the person has not opted out; everyone else gets the
 * in-app message.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');
    if (user.role !== 'admin') return fail(403, 'FORBIDDEN', 'This function runs from the schedule only');

    const payload = await req.json().catch(() => ({}));
    const dryRun = payload.dry_run === true;

    const today = new Date().toISOString().slice(0, 10);
    const tenancyPage = await base44.asServiceRole.entities.Tenancy
      .filter({ status: 'active' }, { sort: '-created_date', limit: 300 });
    const tenancies = tenancyPage.items || [];
    if (!tenancies.length) return json({ sent: 0, checked: 0, today });

    const leasePage = await base44.asServiceRole.entities.Lease
      .filter({ tenancy_id: { $in: tenancies.map((row) => row.id) } }, { sort: '-created_date', limit: 300 });
    const leaseByTenancy = new Map();
    for (const row of leasePage.items || []) {
      if (!leaseByTenancy.has(row.tenancy_id)) leaseByTenancy.set(row.tenancy_id, row);
    }

    const period = today.slice(0, 7);
    let sent = 0;
    const planned = [];

    for (const tenancy of tenancies) {
      const lease = leaseByTenancy.get(tenancy.id) || null;
      const dueDay = (lease && lease.terms && lease.terms.due_day) || 1;
      const due = dueDateOf(period, dueDay);
      const days = Math.round((new Date(`${due}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
      if (days !== 7 && days !== 1) continue;

      const already = await base44.asServiceRole.entities.RentPayment
        .filter({ tenancy_id: tenancy.id, period_month: period, record_status: 'confirmed' }, { limit: 1 });
      if ((already.items || []).length) continue;

      for (const subjectId of [tenancy.tenant_id, tenancy.landlord_id]) {
        if (!subjectId) continue;
        const role = subjectId === tenancy.tenant_id ? 'tenant' : 'landlord';
        const dedupeKey = `${tenancy.id}:${period}:${days}:${role}`;
        const existing = await base44.asServiceRole.entities.Notification
          .filter({ dedupe_key: dedupeKey }, { limit: 1 });
        if ((existing.items || []).length) continue;

        const person = await base44.asServiceRole.entities.User.get(subjectId).catch(() => null);
        const allowsSms = !(person && person.data && person.data.sms_rent_reminders === false);
        const channel = allowsSms ? 'sms' : 'in_app';

        if (dryRun) {
          planned.push({ tenancy_id: tenancy.id, unit_ref: tenancy.unit_ref, role, days, channel, dedupe_key: dedupeKey });
          continue;
        }

        await base44.asServiceRole.entities.Notification.create({
          subject_id: subjectId,
          kind: `rent_reminder_${days}`,
          channel,
          title: {
            sw: days === 1 ? 'Kodi inastahili kesho' : 'Kodi inastahili baada ya siku 7',
            en: days === 1 ? 'Rent is due tomorrow' : 'Rent is due in 7 days',
          },
          body: {
            sw: `Nyumba ${tenancy.unit_ref}: kodi ya mwezi ${period} inastahili tarehe ${due}. Rekodi hii si risiti ya kodi ya serikali (EFD/VFD).`,
            en: `Unit ${tenancy.unit_ref}: rent for ${period} is due on ${due}. This reminder is not a fiscal EFD/VFD receipt.`,
          },
          data: { unit_ref: tenancy.unit_ref, period_month: period, due_on: due, amount: tenancy.rent_amount || null },
          dedupe_key: dedupeKey,
          sent_via: 'in_app',
        });
        sent += 1;
      }
    }

    // Renewal reminders: 60 days and 30 days before the lease ends.
    let renewals = 0;
    for (const tenancy of tenancies) {
      const lease = leaseByTenancy.get(tenancy.id) || null;
      if (!lease || !lease.end_date) continue;
      const daysLeft = Math.round(
        (new Date(`${lease.end_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000,
      );
      if (daysLeft !== 60 && daysLeft !== 30) continue;

      for (const subjectId of [tenancy.tenant_id, tenancy.landlord_id]) {
        if (!subjectId) continue;
        const role = subjectId === tenancy.tenant_id ? 'tenant' : 'landlord';
        const dedupeKey = `renewal:${tenancy.id}:${daysLeft}:${role}`;
        const existingRenewal = await base44.asServiceRole.entities.Notification
          .filter({ dedupe_key: dedupeKey }, { limit: 1 });
        if ((existingRenewal.items || []).length) continue;

        if (dryRun) {
          planned.push({ tenancy_id: tenancy.id, unit_ref: tenancy.unit_ref, role, days_left: daysLeft, kind: 'renewal', dedupe_key: dedupeKey });
          continue;
        }

        await base44.asServiceRole.entities.Notification.create({
          subject_id: subjectId,
          kind: `renewal_reminder_${daysLeft}`,
          channel: 'in_app',
          title: {
            sw: daysLeft === 30 ? 'Mkataba unaisha baada ya siku 30' : 'Mkataba unaisha baada ya siku 60',
            en: daysLeft === 30 ? 'The lease ends in 30 days' : 'The lease ends in 60 days',
          },
          body: {
            sw: `Mkataba ${lease.lease_ref || ''} wa nyumba ${tenancy.unit_ref} unaisha tarehe ${lease.end_date}. Amueni kuhusu kuendelea kabla ya tarehe hiyo.`,
            en: `Lease ${lease.lease_ref || ''} for unit ${tenancy.unit_ref} ends on ${lease.end_date}. Decide about renewing before then.`,
          },
          data: { unit_ref: tenancy.unit_ref, lease_ref: lease.lease_ref || null, ends_on: lease.end_date, days_left: daysLeft },
          dedupe_key: dedupeKey,
          sent_via: 'in_app',
        });
        renewals += 1;
      }
    }

    return json({
      sent,
      renewals,
      checked: tenancies.length,
      today,
      planned: dryRun ? planned : undefined,
      sms_note: 'SMS copies stay in the app until the SMS gateway is connected.',
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}