import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, json } from '../../shared/moneyOps.ts';
import { TAX_INDICATIVE_DISCLAIMER } from '../../shared/leaseTemplate.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

/**
 * The landlord's indicative tax statement.
 *
 * Every figure is computed here, on the server, from confirmed rent records and
 * the active TaxRule row — never in the interface and never hard-coded. If the
 * rule is still a placeholder, the screen is told so plainly: the statement is
 * a working figure nobody has signed off, and it is not a TRA assessment.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await trustedMe(base44).catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const payload = await req.json().catch(() => ({}));
    const today = new Date().toISOString().slice(0, 10);
    const from = /^\d{4}-\d{2}-\d{2}$/.test(cleanText(payload.from)) ? cleanText(payload.from) : `${today.slice(0, 4)}-01-01`;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(cleanText(payload.to)) ? cleanText(payload.to) : today;

    const landlordId = user.role === 'admin' && cleanText(payload.landlord_id) ? cleanText(payload.landlord_id) : user.id;
    if (landlordId !== user.id && user.role !== 'admin') {
      return fail(403, 'FORBIDDEN', 'Only the landlord can read their own statement');
    }

    const rules = await base44.entities.TaxRule.list({ sort: '-effective_from', limit: 50 }).catch(() => ({ items: [] }));
    const allRules = rules.items || [];
    const confirmedRule = allRules.find((row) => row.status === 'confirmed') || null;
    const rule = confirmedRule || allRules.find((row) => row.status === 'placeholder') || null;

    if (!rule) {
      return json({
        statement: null,
        rule: null,
        disclaimer: TAX_INDICATIVE_DISCLAIMER,
        note: {
          sw: 'Hakuna kanuni ya kodi iliyowekwa bado, kwa hiyo hakuna kiasi kinachoonyeshwa.',
          en: 'No tax rule is configured yet, so no figure is shown.',
        },
      });
    }

    const payments = await base44.entities.RentPayment
      .filter(
        {
          landlord_id: landlordId,
          record_status: 'confirmed',
          paid_on: { $gte: from, $lte: to },
        },
        { limit: 500 },
      )
      .catch(() => ({ items: [] }));
    const rows = payments.items || [];

    const gross = rows.reduce((sum, row) => sum + Math.round(Number(row.amount) || 0), 0);
    const rate = Number(rule.rental_tax_rate) || 0;
    const annualThreshold = Math.round(Number(rule.exemption_threshold) || 0);
    const months = monthsBetween(from, to);
    const exemption = Math.round((annualThreshold * months) / 12);
    const taxable = Math.max(0, gross - exemption);
    const indicative = Math.round(taxable * rate);
    const placeholder = rule.status === 'placeholder';

    return json({
      statement: {
        landlord_id: landlordId,
        from,
        to,
        months,
        records: rows.length,
        gross_rent: gross,
        exemption_for_period: exemption,
        annual_exemption: annualThreshold,
        taxable_amount: taxable,
        rate,
        rate_percent: Math.round(rate * 10000) / 100,
        indicative_tax: indicative,
        basis: rule.rental_tax_basis || null,
        currency: rule.currency || 'TZS',
      },
      rule: {
        version: rule.version,
        status: rule.status,
        placeholder,
        effective_from: rule.effective_from || null,
        confirmed_by: rule.confirmed_by || null,
        notes: rule.notes || null,
      },
      disclaimer: TAX_INDICATIVE_DISCLAIMER,
      placeholder_notice: placeholder
        ? {
            sw: 'Kanuni ya kodi iliyotumika ni ya majaribio (placeholder). Ni namba ya kazi ambayo hakuna aliyethibitisha; kiasi hiki kitabadilika kanuni rasmi ikiwekwa.',
            en: 'The tax rule in use is a placeholder. It is a working figure nobody has signed off; this figure changes once an official rule is set.',
          }
        : null,
      method: {
        sw: `Kodi inakadiriwa kama (kodi iliyothibitishwa − msamaha wa kipindi) × kiwango. Msamaha wa mwaka ${annualThreshold.toLocaleString('en-US')} umegawanywa kwa miezi ${months}.`,
        en: `Indicative tax = (confirmed rent − period exemption) × rate. The annual exemption of ${annualThreshold.toLocaleString('en-US')} is apportioned across ${months} month(s).`,
      },
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

function monthsBetween(from, to) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
  return Math.min(Math.max(months, 1), 24);
}