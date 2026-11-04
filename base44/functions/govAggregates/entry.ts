import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { cleanText, fail, isoNow, json, todayISO } from '../../shared/moneyOps.ts';
import { hasAnyRole, isAdmin } from '../../shared/r5.ts';
import {
  MIN_CELL,
  NOT_STARTED,
  SUPPRESSED_LABEL,
  cellSuppressed,
  csvText,
  fileStamp,
  monthKeys,
  monthOf,
  rate,
  wardList,
  writeAudit,
} from '../../shared/r6.ts';

const EXPORT_COLUMNS = [
  'district',
  'area',
  'registered_units',
  'verified_units',
  'verification_rate_pct',
  'estimated_units',
  'active_leases',
  'disputes_opened',
  'disputes_resolved',
  'agents_licensed',
];

const EXPORT_NOTE = {
  en: 'Aggregate counters only. No name, address, phone number or individual rent is included.',
  sw: 'Hesabu za jumla pekee. Hakuna jina, anwani, namba ya simu wala kodi ya mtu mmoja.',
};

/**
 * District and regional oversight aggregates.
 *
 * Figures are counted here from records the caller cannot read one by one, and
 * only counters leave this function. A cell describing fewer than five units is
 * withheld, and a district with no registered units is reported as not started.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = cleanText(payload.action) || 'district';

    const user = await base44.auth.me().catch((error) => (error && error.status === 401 ? null : Promise.reject(error)));
    if (!user) return fail(401, 'SESSION_EXPIRED', 'Sign in required');

    const data = await loadData(base44);
    if (!data.councils.length) return fail(409, 'NO_COUNCIL', 'No council is configured yet');

    const scope = resolveScope(user, data.councils, payload, data);
    if (!scope) return fail(403, 'FORBIDDEN', 'This oversight view is for a commissioner account');
    if (scope.refusal) return scope.refusal;

    if (action === 'district') return await districtView(scope, data);
    if (action === 'region') return await regionView(scope, data);
    if (action === 'export') return await exportView(base44, user, scope, data, payload);

    return fail(422, 'VALIDATION', 'Unknown oversight action');
  } catch (error) {
    return fail(500, 'SERVER', error && error.message ? error.message : 'Unexpected error');
  }
};

async function loadData(base44) {
  const read = (entity, limit = 500) =>
    base44.asServiceRole.entities[entity].list({ limit }).catch(() => ({ items: [] }));
  const [councilPage, unitPage, leasePage, disputePage, licencePage] = await Promise.all([
    read('Council', 100),
    read('RentalUnit', 500),
    read('Lease', 500),
    read('Dispute', 500),
    read('AgentLicence', 500),
  ]);
  return {
    councils: councilPage.items || [],
    units: unitPage.items || [],
    leases: leasePage.items || [],
    disputes: disputePage.items || [],
    licences: licencePage.items || [],
  };
}

function countByDistrict(units) {
  const counts = new Map();
  for (const unit of units || []) {
    if (!unit.district) continue;
    counts.set(unit.district, (counts.get(unit.district) || 0) + 1);
  }
  return counts;
}

function resolveScope(user, councils, payload, store) {
  const data = user.data || {};
  const regionOf = (council) => council.region || data.region || null;

  if (isAdmin(user)) {
    const council = councils.find((row) => row.id === cleanText(payload.council_id)) || null;
    if (council) {
      return { role: 'admin', region: regionOf(council), district: council.district || cleanText(payload.district), council };
    }
    const district = cleanText(payload.district);
    const picked = district ? councils.find((row) => row.district === district) || null : null;
    if (picked) {
      return { role: 'admin', region: regionOf(picked), district: picked.district, council: picked };
    }
    // No district picked: show the district that holds the most registered units.
    const unitCounts = countByDistrict(store.units);
    const busiest = [...councils].sort(
      (a, b) => (unitCounts.get(b.district) || 0) - (unitCounts.get(a.district) || 0),
    )[0];
    return { role: 'admin', region: regionOf(busiest), district: busiest.district, council: busiest };
  }

  if (hasAnyRole(user, ['regional_commissioner'])) {
    const region = data.region || councils[0].region;
    if (!region) return { refusal: fail(403, 'JURISDICTION', 'Your region is not configured yet') };
    return { role: 'regional_commissioner', region, district: cleanText(payload.district) || null, council: null };
  }

  if (hasAnyRole(user, ['district_commissioner'])) {
    const district = data.district;
    if (!district) return { refusal: fail(403, 'JURISDICTION', 'Your district is not configured yet') };
    const council = councils.find((row) => row.district === district) || null;
    return {
      role: 'district_commissioner',
      region: data.region || (council && council.region) || null,
      district,
      council,
    };
  }

  return null;
}

/* -------------------------------------------------------------- figures --- */

function estimatesFor(council) {
  return ((council && council.stock_estimates) || []).filter(
    (row) => row && cleanText(row.source) && Number(row.units) >= 0,
  );
}

function districtFigures(council, data, months) {
  const units = data.units.filter(
    (unit) => unit.district === council.district || (council.id && unit.council_id === council.id),
  );
  const verified = units.filter((unit) => unit.status === 'verified');
  const estimates = estimatesFor(council);
  const estimated = estimates.reduce((sum, row) => sum + Math.round(Number(row.units) || 0), 0);

  const live = units.length > 0;
  const suppressed = live && cellSuppressed(units.length);
  const count = (value) => (suppressed ? null : value);

  const leases = data.leases.filter(
    (lease) => lease.district === council.district && ['signed', 'amended'].includes(lease.status),
  );
  const disputes = data.disputes.filter((row) => row.district === council.district);
  const agents = data.licences.filter(
    (row) => row.district === council.district && row.status === 'approved',
  );

  const wards = wardList(council, units).map((ward) => {
    const inWard = units.filter((unit) => unit.ward === ward);
    const wardVerified = inWard.filter((unit) => unit.status === 'verified').length;
    const wardSuppressed = cellSuppressed(inWard.length);
    const wardEstimate = estimates
      .filter((row) => row.ward === ward)
      .reduce((sum, row) => sum + Math.round(Number(row.units) || 0), 0);
    return {
      ward,
      units: wardSuppressed ? null : inWard.length,
      verified: wardSuppressed ? null : wardVerified,
      verification_rate: wardSuppressed ? null : rate(wardVerified, inWard.length),
      estimated_units: wardEstimate || null,
      suppressed: wardSuppressed,
    };
  });

  const trend = months.map((month) => {
    const registered = units.filter((unit) => monthOf(unit.created_date) === month).length;
    const signed = leases.filter((lease) => monthOf(lease.start_date) === month).length;
    const monthSuppressed = cellSuppressed(registered);
    return {
      month,
      registered_units: monthSuppressed ? null : registered,
      leases_signed: monthSuppressed ? null : signed,
      suppressed: monthSuppressed,
    };
  });

  return {
    district: council.district,
    region: council.region,
    council: council.name,
    live,
    status: live ? 'live' : 'not_started',
    status_label: live ? null : NOT_STARTED,
    suppressed,
    units: count(units.length),
    verified: count(verified.length),
    verification_rate: suppressed ? null : rate(verified.length, units.length),
    estimated_units: suppressed ? null : estimated || null,
    stock_source: estimates.length ? estimates[0].source : null,
    stock_source_note: (council && council.stock_source_note) || null,
    stock_wards_without_source: wardList(council, units).filter(
      (ward) => !estimates.some((row) => row.ward === ward),
    ),
    active_leases: count(leases.length),
    disputes_opened: count(disputes.length),
    disputes_resolved: count(disputes.filter((row) => ['resolved', 'closed'].includes(row.status)).length),
    agents_licensed: count(agents.length),
    wards,
    trend,
  };
}

function totalsOf(rows) {
  const live = rows.filter((row) => row.live && !row.suppressed);
  const sum = (key) => live.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  const verified = sum('verified');
  const units = sum('units');
  return {
    districts_live: rows.filter((row) => row.live).length,
    districts_total: rows.length,
    units,
    verified,
    verification_rate: rate(verified, units),
    estimated_units: sum('estimated_units') || null,
    active_leases: sum('active_leases'),
    disputes_opened: sum('disputes_opened'),
    disputes_resolved: sum('disputes_resolved'),
    agents_licensed: sum('agents_licensed'),
  };
}

/* ----------------------------------------------------------------- views --- */

async function districtView(scope, data) {
  const council = scope.council || data.councils.find((row) => row.district === scope.district);
  if (!council) {
    return json({
      jurisdiction: { district: scope.district, region: scope.region },
      live: false,
      status: 'not_started',
      status_label: NOT_STARTED,
      suppression: { min_units: MIN_CELL, label: SUPPRESSED_LABEL },
    });
  }
  const months = monthKeys(6);
  const figures = districtFigures(council, data, months);
  return json({
    jurisdiction: { district: council.district, region: council.region },
    ...figures,
    suppression: { min_units: MIN_CELL, label: SUPPRESSED_LABEL },
    export_note: EXPORT_NOTE,
    generated_at: isoNow(),
    today: todayISO(),
  });
}

async function regionView(scope, data) {
  const months = monthKeys(6);
  const councils = data.councils.filter((row) => row.region === scope.region);
  const rows = councils.map((council) => districtFigures(council, data, months));
  rows.sort((a, b) => Number(b.units || 0) - Number(a.units || 0) || a.district.localeCompare(b.district));

  const trend = months.map((month) => {
    const registered = rows
      .filter((row) => !row.suppressed)
      .reduce((total, row) => {
        const cell = (row.trend || []).find((item) => item.month === month);
        return total + (Number(cell && cell.registered_units) || 0);
      }, 0);
    const monthSuppressed = cellSuppressed(registered);
    return { month, registered_units: monthSuppressed ? null : registered, suppressed: monthSuppressed };
  });

  return json({
    jurisdiction: { region: scope.region },
    districts: rows,
    totals: totalsOf(rows),
    trend,
    not_started: rows.filter((row) => !row.live).map((row) => row.district),
    suppressed_districts: rows.filter((row) => row.suppressed).map((row) => row.district),
    suppression: { min_units: MIN_CELL, label: SUPPRESSED_LABEL },
    export_note: EXPORT_NOTE,
    generated_at: isoNow(),
    today: todayISO(),
  });
}

async function exportView(base44, user, scope, data, payload) {
  const months = monthKeys(6);
  const wanted = cleanText(payload.scope) === 'region' ? 'region' : 'district';
  const rows = [];

  if (wanted === 'region') {
    const councils = data.councils.filter((row) => row.region === scope.region);
    for (const council of councils) {
      const figures = districtFigures(council, data, months);
      if (!figures.live) {
        rows.push([figures.district, 'ALL', 'not_started', 'not_started', 'not_started', '', '', '', '', '']);
        continue;
      }
      if (figures.suppressed) {
        rows.push([figures.district, 'ALL', ...Array(8).fill('suppressed')]);
        continue;
      }
      rows.push([
        figures.district,
        'ALL',
        figures.units,
        figures.verified,
        figures.verification_rate,
        figures.estimated_units ?? '',
        figures.active_leases,
        figures.disputes_opened,
        figures.disputes_resolved,
        figures.agents_licensed,
      ]);
    }
  } else {
    const council = scope.council || data.councils.find((row) => row.district === scope.district);
    if (!council) return fail(409, 'NO_COUNCIL', 'No council is configured for this district yet');
    const figures = districtFigures(council, data, months);
    if (figures.suppressed) {
      rows.push([figures.district, 'ALL', ...Array(8).fill('suppressed')]);
    } else {
      for (const ward of figures.wards) {
        if (ward.suppressed) {
          rows.push([figures.district, ward.ward, ...Array(8).fill('suppressed')]);
          continue;
        }
        rows.push([
          figures.district,
          ward.ward,
          ward.units,
          ward.verified,
          ward.verification_rate,
          ward.estimated_units ?? '',
          '',
          '',
          '',
          '',
        ]);
      }
    }
  }

  const csv = csvText(EXPORT_COLUMNS, rows);
  const filename = `ibmt-oversight-${wanted}-${fileStamp()}.csv`;

  const logged = await base44.entities.ExportRequest.create({
    kind: `government_${wanted}_aggregate`,
    format: 'csv',
    status: 'ready',
    requested_at: isoNow(),
  }).catch(() => null);

  const auditId = await writeAudit(base44, {
    actor_id: user.id,
    actor_role: (user.data && user.data.ibmt_role) || user.role,
    action: 'export.government_aggregate',
    subject_type: 'ExportRequest',
    subject_id: logged ? logged.id : null,
    subject_ref: filename,
    district: scope.district || null,
    outcome: 'allowed',
    reason: cleanText(payload.reason) || null,
    detail: { scope: wanted, region: scope.region, rows: rows.length, contains_personal_data: false },
  });

  return json({
    filename,
    csv,
    columns: EXPORT_COLUMNS,
    row_count: rows.length,
    contains_personal_data: false,
    note: EXPORT_NOTE,
    export_id: logged ? logged.id : null,
    audit_id: auditId,
    logged_at: isoNow(),
  });
}