import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bilingual,
  cleanText,
  fail,
  hasIbmtRole,
  isoNow,
  json,
} from '../../shared/moneyOps.ts';
import { requireModule } from '../../shared/moduleGate.ts';

/**
 * A district official reviews a submitted ward report. The reason is
 * mandatory and stored on the record; the review decision maps
 * approved to reviewed and queried/rejected to flagged.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const blocked = await requireModule(base44, 'ward_reports_module');
    if (blocked) return blocked;
    if (!hasIbmtRole(user, 'district_official')) {
      return fail(403, 'FORBIDDEN', 'Only a district official can review ward reports');
    }

    const payload = await req.json().catch(() => ({}));
    const reportId = cleanText(payload.id);
    const decision = cleanText(payload.decision);
    const reason = cleanText(payload.reason);

    if (!reportId) return fail(422, 'VALIDATION', 'The ward report is required');
    if (!['approved', 'queried', 'rejected'].includes(decision)) {
      return fail(422, 'VALIDATION', 'The decision must be approved, queried or rejected');
    }
    if (reason.length < 10) {
      return fail(422, 'VALIDATION', 'A review reason of at least 10 characters is required', { reason: 'Write the reason for the record (at least 10 characters).' });
    }

    const report = await base44.entities.WardReport.get(reportId).catch(() => null);
    if (!report) return fail(404, 'NOT_FOUND', 'That ward report is not visible to you');

    const userDistrict = (user.data && user.data.district) || null;
    if (user.role !== 'admin' && userDistrict && report.district && report.district !== userDistrict) {
      return fail(403, 'JURISDICTION', 'The ward report is outside your assigned district');
    }

    const reviewStatus = decision === 'approved' ? 'reviewed' : 'flagged';
    const updated = await base44.entities.WardReport.update(reportId, {
      review_status: reviewStatus,
      review_note: bilingual(reason, reason),
      reviewed_at: isoNow(),
      decided_by_name: user.full_name,
    });

    return json({ id: updated.id, ward_id: updated.ward, status: updated.review_status });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}