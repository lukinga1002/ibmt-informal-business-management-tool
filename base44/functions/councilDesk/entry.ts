import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ageDays, cleanText, fail, isoNow, json, todayISO } from '../../shared/moneyOps.ts';
import { hasAnyRole, isAdmin } from '../../shared/r5.ts';
import { resolveCouncil } from '../../shared/councilScope.ts';
import {
  MIN_CELL,
  SUPPRESSED_LABEL,
  activeByLaw,
  cellSuppressed,
  csvText,
  fileStamp,
  rate,
  wardList,
  writeAudit,
} from '../../shared/r6.ts';
import { trustedMe } from '../../shared/trustedRole.ts';

const MODES = ['voluntary', 'registration_window', 'compulsory'];

const BASIS_NOTE = {
  en: 'Owner, address and meter number are only shown where a by-law is in force, or where the owner consented to sharing with the council. Every other row is withheld.',
  sw: 'Jina la mmiliki, anwani na namba ya mita huonyeshwa pale tu ambapo sheria ndogo inatumika, au mmiliki amekubali kushirikiana na halmashauri. Safu nyingine zote hufichwa.',
};

const DECISION_RULE = {
  en: 'Every decision on this desk is made by a person. Nothing is decided automatically.',
  sw: 'Kila uamuzi kwenye dawati hili hufanywa na mtu. Hakuna uamuzi wa kiotomatiki.',
};

/**
 * Council desk: the ward register, the building register used for
 * property-rates work, the human review queues, and the enforcement settings
 * that only an authorised official may change — each change audited.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'register';

    const user = await trustedMe(base44).catch((error) => (error && error.status === 401 ? null : Promise.reject(error)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const resolved = await resolveCouncil(base44, user, payload);
    if (!resolved.council) return resolved.refusal;
    const council = resolved.council;

    if (action === 'register') return await register(base44, council);
    if (action === 'buildings') return await buildings(base44, council);
    if (action === 'queues') return await queues(base44, council);
    if (action === 'settings') return await settingsView(base44, council);
    if (action === 'save_settings') return await saveSettings(base44, council, user, payload);
    if (action === 'export') return await exportRegister(base44, council, user, payload);

    return fail(422, 'VALIDATION', 'Unknown council action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
}

function councilShape(council) {
  return {
    id: council.id,
    name: council.name,
    code: council.code || null,
    district: council.district,
    region: council.region,
    enforcement_mode: council.enforcement_mode || 'voluntary',
    bylaw_reference: council.bylaw_reference || null,
    bylaw_effective_date: council.bylaw_effective_date || null,
    registration_window_days: council.registration_window_days || 0,
    ward_list_note: council.ward_list_note || null,
  };
}

function pendingUnit(unit) {
  return unit.status === 'evidence_pending' || unit.verification_status === 'pending';
}

async function unitsForCouncil(base44, council) {
  const page = await base44.asServiceRole.entities.RentalUnit
    .filter({ district: council.district }, { limit: 500 })
    .catch(() => ({ items: [] }));
  return (page.items || []).filter((unit) => unit.council_id === council.id || !unit.council_id);
}

/* ------------------------------------------------------------- register --- */

async function register(base44, council) {
  const units = await unitsForCouncil(base44, council);
  const verified = units.filter((unit) => unit.status === 'verified').length;
  const pending = units.filter((unit) => pendingUnit(unit)).length;
  const suspended = units.filter((unit) => unit.status === 'suspended').length;

  const wards = wardList(council, units).map((ward) => {
    const inWard = units.filter((unit) => unit.ward === ward);
    const wardVerified = inWard.filter((unit) => unit.status === 'verified').length;
    const wardPending = inWard.filter((unit) => pendingUnit(unit)).length;
    const suppressed = cellSuppressed(inWard.length);
    return {
      ward,
      units: suppressed ? null : inWard.length,
      verified: suppressed ? null : wardVerified,
      pending: suppressed ? null : wardPending,
      verification_rate: suppressed ? null : rate(wardVerified, inWard.length),
      suppressed,
    };
  });

  return json({
    council: councilShape(council),
    wards,
    totals: {
      units: units.length,
      verified,
      pending,
      suspended,
      unverified: Math.max(0, units.length - verified - pending - suspended),
      verification_rate: rate(verified, units.length),
      suppressed: cellSuppressed(units.length),
    },
    suppression: { min_units: MIN_CELL, label: SUPPRESSED_LABEL },
  });
}

/* ------------------------------------------------------------ buildings --- */

async function buildings(base44, council) {
  const [propertyPage, unitPage, consentPage] = await Promise.all([
    base44.asServiceRole.entities.Property.filter({ district: council.district }, { limit: 300 }).catch(() => ({ items: [] })),
    base44.asServiceRole.entities.RentalUnit.filter({ district: council.district }, { limit: 500 }).catch(() => ({ items: [] })),
    base44.asServiceRole.entities.Consent.filter({ purpose: 'council_sharing', granted: true }, { limit: 500 }).catch(() => ({ items: [] })),
  ]);

  const properties = (propertyPage.items || []).filter((row) => row.council_id === council.id || !row.council_id);
  const units = unitPage.items || [];
  const consenting = new Set((consentPage.items || []).map((row) => row.subject_id));
  const byLaw = activeByLaw(council);

  const rows = properties.map((property) => {
    const held = units.filter((unit) => unit.property_id === property.id);
    const consent = consenting.has(property.landlord_id);
    const basis = byLaw ? 'by_law' : consent ? 'consent' : null;
    return {
      id: property.id,
      building: property.name,
      building_ref: property.property_ref,
      ward: property.ward,
      units: held.length || Number(property.unit_count) || 0,
      verified_units: held.filter((unit) => unit.status === 'verified').length,
      verification_status: property.verification_status || 'unverified',
      owner: basis ? property.landlord_name || null : null,
      address: basis ? property.address || null : null,
      meters: basis ? held.map((unit) => unit.tanesco_meter).filter(Boolean) : [],
      basis,
      restricted: !basis,
    };
  });

  const linked = new Set(properties.map((row) => row.id));

  return json({
    council: councilShape(council),
    rows,
    basis: {
      by_law: byLaw,
      consenting_owners: consenting.size,
      note: BASIS_NOTE,
      withheld_rows: rows.filter((row) => row.restricted).length,
      available_rows: rows.filter((row) => !row.restricted).length,
    },
    units_without_building: units.filter((unit) => !unit.property_id || !linked.has(unit.property_id)).length,
  });
}

/* --------------------------------------------------------------- queues --- */

async function queues(base44, council) {
  const [casePage, complaintPage, licencePage] = await Promise.all([
    base44.asServiceRole.entities.ComplianceCase.filter({ district: council.district }, { limit: 100 }).catch(() => ({ items: [] })),
    base44.asServiceRole.entities.Complaint.filter({ district: council.district }, { limit: 100 }).catch(() => ({ items: [] })),
    base44.asServiceRole.entities.AgentLicence.filter({ district: council.district }, { limit: 100 }).catch(() => ({ items: [] })),
  ]);

  const cases = (casePage.items || []).filter((row) => ['open', 'escalated'].includes(row.status));
  const complaints = (complaintPage.items || []).filter((row) => ['open', 'in_review'].includes(row.status));
  const licences = licencePage.items || [];
  const pendingLicences = licences.filter((row) => row.status === 'pending');

  return json({
    council: councilShape(council),
    compliance: cases.slice(0, 20).map((row) => ({
      id: row.id,
      reference: row.subject_reference,
      subject_type: row.subject_type,
      kind: row.kind,
      ward: row.ward,
      status: row.status,
      age_days: ageDays(row.created_date),
      automatic_action: false,
    })),
    complaints: complaints.slice(0, 20).map((row) => ({
      id: row.id,
      reference: row.reference,
      subject_type: row.subject_type,
      subject_reference: row.subject_reference,
      ward: row.ward,
      status: row.status,
      age_days: ageDays(row.created_date),
    })),
    licences: {
      pending: pendingLicences.length,
      approved: licences.filter((row) => row.status === 'approved').length,
      sample: pendingLicences.slice(0, 5).map((row) => ({
        id: row.id,
        agent_name: row.agent_name,
        status: row.status,
        age_days: ageDays(row.created_date),
      })),
    },
    rule: DECISION_RULE,
  });
}

/* ------------------------------------------------------------- settings --- */

function settingsShape(council) {
  return {
    enforcement_mode: council.enforcement_mode || 'voluntary',
    bylaw_reference: council.bylaw_reference || null,
    bylaw_effective_date: council.bylaw_effective_date || null,
    registration_window_days: council.registration_window_days || 0,
    stock_estimates: (council.stock_estimates || []).map((row) => ({
      ward: row.ward,
      units: row.units,
      source: row.source,
      as_of: row.as_of || null,
    })),
    stock_source_note: council.stock_source_note || null,
  };
}

async function settingsView(base44, council) {
  const page = await base44.asServiceRole.entities.AuditLog
    .filter({ council_id: council.id, action: 'council.settings.changed' }, { sort: '-occurred_at', limit: 10 })
    .catch(() => ({ items: [] }));

  return json({
    council: councilShape(council),
    settings: settingsShape(council),
    audit: (page.items || []).map((row) => ({
      id: row.id,
      actor_role: row.actor_role,
      occurred_at: row.occurred_at,
      reason: row.reason || null,
      before: (row.detail && row.detail.before) || null,
      after: (row.detail && row.detail.after) || null,
    })),
    modes: MODES,
  });
}

async function saveSettings(base44, council, user, payload) {
  if (!hasAnyRole(user, ['council_official']) && !isAdmin(user)) {
    return fail(403, 'FORBIDDEN', 'Only an authorised council official can change enforcement settings');
  }

  const mode = cleanText(payload.enforcement_mode) || council.enforcement_mode || 'voluntary';
  if (!MODES.includes(mode)) {
    return fail(422, 'VALIDATION', 'Choose a valid enforcement mode', {
      enforcement_mode: 'Choose voluntary, registration window or compulsory.',
    });
  }

  const bylaw = cleanText(payload.bylaw_reference);
  const effective = cleanText(payload.bylaw_effective_date).slice(0, 10);
  if (mode !== 'voluntary' && !bylaw) {
    return fail(422, 'VALIDATION', 'A by-law reference is required before enforcement is switched on', {
      bylaw_reference: 'Enter the by-law number or citation.',
    });
  }
  if (mode !== 'voluntary' && !effective) {
    return fail(422, 'VALIDATION', 'The date the by-law took effect is required', {
      bylaw_effective_date: 'Enter the effective date of the by-law.',
    });
  }

  const windowDays = mode === 'voluntary' ? 0 : Math.max(0, Math.round(Number(payload.registration_window_days) || 0));
  const estimates = Array.isArray(payload.stock_estimates) ? payload.stock_estimates : [];
  const clean = [];
  for (const row of estimates) {
    const ward = cleanText(row && row.ward);
    if (!ward) continue;
    const units = Math.round(Number(row && row.units));
    const source = cleanText(row && row.source);
    if (!Number.isFinite(units) || units < 0) {
      return fail(422, 'VALIDATION', `The estimate for ${ward} must be a whole number of units`, {
        stock_estimates: 'Enter estimated units as a whole number.',
      });
    }
    if (!source) {
      return fail(422, 'VALIDATION', `The source for the ${ward} estimate is required`, {
        stock_estimates: 'Every estimate must state where the figure came from.',
      });
    }
    clean.push({ ward, units, source, as_of: cleanText(row.as_of).slice(0, 10) || todayISO() });
  }

  const before = settingsShape(council);
  const updated = await base44.asServiceRole.entities.Council.update(council.id, {
    enforcement_mode: mode,
    bylaw_reference: bylaw || null,
    bylaw_effective_date: effective || null,
    registration_window_days: windowDays,
    stock_estimates: clean,
    stock_source_note: cleanText(payload.stock_source_note) || null,
  });
  const after = settingsShape(updated);

  const auditId = await writeAudit(base44, {
    actor_id: user.id,
    actor_role: (user.data && user.data.ibmt_role) || user.role,
    action: 'council.settings.changed',
    subject_type: 'Council',
    subject_id: council.id,
    subject_ref: council.name,
    council_id: council.id,
    district: council.district,
    outcome: 'allowed',
    reason: cleanText(payload.reason) || null,
    detail: { before, after },
  });

  return json({ council: councilShape(updated), settings: after, audit_id: auditId, changed_at: isoNow() });
}

/* --------------------------------------------------------------- export --- */

async function exportRegister(base44, council, user, payload) {
  const kind = cleanText(payload.kind) === 'register' ? 'register' : 'buildings';

  let header;
  let rows;
  if (kind === 'register') {
    const units = await unitsForCouncil(base44, council);
    header = ['ward', 'registered_units', 'verified_units', 'verification_rate_pct'];
    rows = wardList(council, units).map((ward) => {
      const inWard = units.filter((unit) => unit.ward === ward);
      const suppressed = cellSuppressed(inWard.length);
      const verified = inWard.filter((unit) => unit.status === 'verified').length;
      return suppressed
        ? [ward, 'suppressed', 'suppressed', 'suppressed']
        : [ward, inWard.length, verified, rate(verified, inWard.length)];
    });
  } else {
    const built = await buildings(base44, council);
    const body = await built.json();
    header = ['building', 'building_ref', 'ward', 'owner', 'meter_numbers', 'units', 'verified_units', 'verification_status', 'basis'];
    rows = (body.rows || [])
      .filter((row) => !row.restricted)
      .map((row) => [
        row.building,
        row.building_ref,
        row.ward,
        row.owner,
        (row.meters || []).join(' '),
        row.units,
        row.verified_units,
        row.verification_status,
        row.basis,
      ]);
  }

  const csv = csvText(header, rows);
  const filename = `ibmt-${kind}-${String(council.code || council.district).toLowerCase()}-${fileStamp()}.csv`;

  const logged = await base44.entities.ExportRequest.create({
    kind: `council_${kind}`,
    format: 'csv',
    status: 'ready',
    requested_at: isoNow(),
  }).catch(() => null);

  const auditId = await writeAudit(base44, {
    actor_id: user.id,
    actor_role: (user.data && user.data.ibmt_role) || user.role,
    action: 'export.council_register',
    subject_type: 'ExportRequest',
    subject_id: logged ? logged.id : null,
    subject_ref: filename,
    council_id: council.id,
    district: council.district,
    outcome: 'allowed',
    reason: cleanText(payload.reason) || null,
    detail: { kind, rows: rows.length, basis_required: kind === 'buildings' },
  });

  return json({
    filename,
    csv,
    row_count: rows.length,
    export_id: logged ? logged.id : null,
    audit_id: auditId,
    logged_at: isoNow(),
  });
}