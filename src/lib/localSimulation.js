const loopback = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
};

export function isLocalSimulation(isDev, pageUrl, backendUrl) {
  return isDev === true && loopback(pageUrl) && loopback(backendUrl);
}

export function localCouncilChoices(pilots, records, environment) {
  if (!isLocalSimulation(...environment)) return pilots;
  const fixture = records.find((row) => row.code === 'SIM-TEST' && row.id && row.region && row.district);
  if (!fixture || pilots.some((row) => row.council_id === fixture.id)) return pilots;
  return [...pilots, {
    council_id: fixture.id, name: fixture.name, region: fixture.region,
    district: fixture.district, wards: ['SIMULATION - Test Ward'],
  }];
}

// Explicit local fixture setup, never run automatically or against a remote API.
export async function createLocalCouncil(client, environment) {
  if (!isLocalSimulation(...environment)) throw Error('Local backend required');
  const user = await client.auth.me();
  if (user?.role !== 'admin') throw Error('Administrator required');
  const rows = (page) => Array.isArray(page) ? page : page.items || [];
  const existing = rows(await client.entities.Council.filter({ code: 'SIM-TEST' }));
  const council = existing[0] || await client.entities.Council.create({
    name: 'SIMULATION - Test Council', code: 'SIM-TEST',
    region: 'Synthetic test region', district: 'Synthetic test district',
    enforcement_mode: 'voluntary', rent_stage: 'record',
    council_fee_status: 'proposed', fee_placeholder_status: 'placeholder',
    notes: 'Fictional local test record. Not an actual council.',
  });
  const policies = rows(await client.entities.PolicyRule.list('-effective_from', 100));
  if (!policies.some((row) => !row.effective_to)) {
    await client.entities.PolicyRule.create({
      version: 'SIM-LOCAL-TEST', status: 'placeholder',
      effective_from: new Date().toISOString().slice(0, 10),
      landlord_service_fee_rate: 0, commission_cap: 1,
      partner_charge_rate: 0.02, partner_rebate_rate: 0.0075,
      payout_cooling_off_hours: 24, payment_parameters_status: 'placeholder',
    });
  }
  return council;
}
