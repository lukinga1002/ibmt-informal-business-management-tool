import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCouncil, isLocalSimulation, localCouncilChoices, localDefaultCouncil } from '../src/lib/localSimulation.js';

const local = [true, 'http://localhost:5173/rent/sim', 'http://localhost:4400'];
test('onboarding keeps the actual local fixture council ID and jurisdiction together', () => {
  const pilots = [{ council_id: 'pilot', region: 'Dar es Salaam', district: 'Kinondoni' }];
  const fixture = { id: 'actual-local-id', code: 'SIM-TEST', name: 'Test council', region: 'Synthetic test region', district: 'Synthetic test district' };
  const choices = localCouncilChoices(pilots, [fixture], local);
  assert.equal(choices[1].council_id, fixture.id);
  assert.equal(choices[1].region, fixture.region);
  assert.equal(choices[1].district, fixture.district);
  assert.deepEqual(choices[1].wards, ['SIMULATION - Test Ward']);
  assert.equal(pilots.length, 1);
  assert.equal(localCouncilChoices(pilots, [fixture], [false, local[1], local[2]]), pilots);
  assert.equal(localCouncilChoices(pilots, [fixture], [true, local[1], 'https://example.com']), pilots);
  assert.equal(localCouncilChoices(pilots, [{ ...fixture, code: 'OTHER' }], local), pilots);
});
test('test data setup rejects production builds, remote APIs and lookalike hosts', async () => {
  for (const environment of [
    [false, local[1], local[2]],
    [true, local[1], 'https://lumpy-biz-flow-tanzania.base44.app'],
    [true, 'http://localhost.example.com', local[2]],
  ]) {
    assert.equal(isLocalSimulation(...environment), false);
    await assert.rejects(createLocalCouncil({}, environment), /Local backend required/);
  }
  assert.equal(isLocalSimulation(...local), true);
});

test('test data setup requires a real administrator session', async () => {
  await assert.rejects(createLocalCouncil({ auth: { me: async () => ({ role: 'user' }) } }, local), /Administrator required/);
});

test('test data setup creates explicit placeholders and reuses them on retry', async () => {
  const councils = [], policies = [];
  const client = {
    auth: { me: async () => ({ role: 'admin' }) },
    entities: {
      Council: {
        filter: async ({ code }) => councils.filter((row) => row.code === code),
        create: async (row) => { const result = { ...row, id: 'local-test' }; councils.push(result); return result; },
      },
      PolicyRule: { list: async () => policies, create: async (row) => { policies.push(row); return row; } },
    },
  };
  assert.equal((await createLocalCouncil(client, local)).id, 'local-test');
  await createLocalCouncil(client, local);
  assert.equal(councils.length, 1);
  assert.equal(policies.length, 1);
  assert.equal(councils[0].rent_stage, 'record');
  assert.equal(councils[0].council_fee_status, 'proposed');
  assert.equal(policies[0].status, 'placeholder');
  policies[0].version = 'existing-policy';
  await createLocalCouncil(client, local);
  assert.equal(policies[0].version, 'existing-policy');
});

test("local onboarding defaults to the fictional council, never a pilot ID", () => {
  const pilots = [{ council_id: "pilot", region: "Dar es Salaam", district: "Kinondoni", wards: ["Msasani"] }];
  const fixture = { id: "actual-local-id", code: "SIM-TEST", name: "Test council", region: "Synthetic test region", district: "Synthetic test district" };
  const chosen = localDefaultCouncil(localCouncilChoices(pilots, [fixture], local), pilots);
  assert.deepEqual([chosen.council_id, chosen.region, chosen.district, chosen.wards[0]], [fixture.id, fixture.region, fixture.district, "SIMULATION - Test Ward"]);
  assert.equal(localDefaultCouncil(localCouncilChoices(pilots, [], local), pilots), null);
  assert.equal(localDefaultCouncil(localCouncilChoices(pilots, [fixture], [false, local[1], local[2]]), pilots), null);
});
