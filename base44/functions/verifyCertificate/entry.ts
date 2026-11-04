import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import { publicCertificateView } from '../../shared/registration.ts';

/**
 * Public certificate lookup. Anyone holding the certificate number may check
 * it, and the answer never contains an address, meter, rent or contact.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const certificate = cleanText(payload.certificate_no).toUpperCase();
    if (!certificate) return fail(422, 'VALIDATION', 'A certificate number is required');

    const page = await base44.asServiceRole.entities.VerificationCase
      .filter({ certificate_no: certificate }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const record = (page.items || [])[0];

    if (!record || record.status !== 'approved') {
      return json({ found: false, certificate_no: certificate });
    }
    return json(publicCertificateView(record));
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}