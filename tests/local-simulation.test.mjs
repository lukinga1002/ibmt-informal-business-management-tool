import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCouncil, isLocalSimulation } from '../src/lib/localSimulation.js';

const local = [true, 'http://localhost:5173/rent/sim', 'http://localhost:4400'];
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
