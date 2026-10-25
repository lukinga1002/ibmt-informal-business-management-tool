import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  ageDays,
  bilingual,
  cleanText,
  fail,
  hasIbmtRole,
  json,
  todayISO,
} from '../../shared/moneyOps.ts';

/**
 * Read-only work queue for a district official: pending permits, submitted
 * ward reports, complaints and ratings awaiting moderation. Access rules
 * decide which records are visible; this only counts and lists them.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');
    if (!hasIbmtRole(user, 'district_official')) {
      return fail(403, 'FORBIDDEN', 'Only a district official can open the council overview');
    }

    const district = (user.data && user.data.district) || null;
    const districtQuery = district ? { district } : {};
    const today = todayISO();

    const [
      permitsPending, permitsApproved, wardReportsSubmitted, complaintsOpen, ratingsAwaiting,
    ] = await Promise.all([
      base44.entities.Permit.filter({ ...districtQuery, status: { $in: ['submitted', 'in_review', 'queried'] } }, { sort: 'created_date', limit: 10 }),
      base44.entities.Permit.filter({ ...districtQuery, status: 'approved', start_date: { $gte: today } }, { sort: 'start_date', limit: 6 }),
      base44.entities.WardReport.filter({ ...districtQuery, review_status: 'submitted' }, { sort: 'created_date', limit: 10 }),
      base44.entities.Complaint.filter({ ...districtQuery, status: { $in: ['open', 'in_review'] } }, { sort: 'created_date', limit: 6 }),
      base44.entities.Rating.filter({ status: 'awaiting_confirmation' }, { sort: 'created_date', limit: 6 }),
    ]);

    const permits = permitsPending.items || permitsPending;
    const calendarPermits = permitsApproved.items || permitsApproved;
    const reports = wardReportsSubmitted.items || wardReportsSubmitted;
    const complaints = complaintsOpen.items || complaintsOpen;
    const ratings = ratingsAwaiting.items || ratingsAwaiting;

    const queue = [];
    for (const permit of permits) {
      queue.push({
        id: `permit-${permit.id}`,
        kind: 'permit',
        reference: permit.reference,
        label: bilingual(permit.event_name, permit.event_name),
        ward_id: permit.ward,
        status: permit.status,
        age_days: ageDays(permit.created_date),
      });
    }
    for (const report of reports) {
      queue.push({
        id: `report-${report.id}`,
        kind: 'ward_report',
        reference: report.period,
        label: bilingual(`Ward report from ${report.ward}`, `Ripoti ya kata kutoka ${report.ward}`),
        ward_id: report.ward,
        status: report.review_status,
        age_days: ageDays(report.created_date),
      });
    }
    for (const complaint of complaints) {
      queue.push({
        id: `complaint-${complaint.id}`,
        kind: 'complaint',
        reference: complaint.reference,
        label: bilingual(complaint.subject_reference || complaint.subject_type, complaint.subject_reference || complaint.subject_type),
        ward_id: complaint.ward,
        status: complaint.status,
        age_days: ageDays(complaint.created_date),
      });
    }
    for (const rating of ratings) {
      queue.push({
        id: `rating-${rating.id}`,
        kind: 'rating',
        reference: 'Rating',
        label: bilingual(`${rating.stars} star rating awaiting moderation`, `Kadirio la nyota ${rating.stars} linasubiri uhakiki`),
        ward_id: null,
        status: rating.status,
        age_days: ageDays(rating.created_date),
      });
    }
    queue.sort((a, b) => b.age_days - a.age_days);

    const calendar = calendarPermits.map((permit) => ({
      id: permit.id,
      date: permit.start_date,
      label: bilingual(permit.event_name, permit.event_name),
      venue: bilingual(permit.venue, permit.venue),
      ward_id: permit.ward,
      permit_ref: permit.reference,
      status: permit.status,
    }));

    return json({
      jurisdiction: { wards: district ? [district] : [], district: district || '' },
      counters: [
        { key: 'permits_pending', label: bilingual('Permits awaiting a decision', 'Vibali vinasubiri uamuzi'), value: String(permits.length) },
        { key: 'complaints_open', label: bilingual('Private complaints open', 'Malalamiko ya faragha yaliyo wazi'), value: String(complaints.length) },
        { key: 'ratings_queue', label: bilingual('Ratings awaiting moderation', 'Kadirio yanayosubiri kusimamiwa'), value: String(ratings.length) },
        { key: 'ward_reports', label: bilingual('Ward reports awaiting human review', 'Ripoti za kata zinazosubiri mapitio ya mtu'), value: String(reports.length) },
      ],
      queue: queue.slice(0, 8),
      calendar,
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}