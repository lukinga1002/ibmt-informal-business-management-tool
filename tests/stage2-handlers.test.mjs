import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "npm:@base44/sdk@0.8.54")
      return {
        url: "data:text/javascript,export const createClientFromRequest = () => globalThis.stage2TestClient;",
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
const payout = (await import("../base44/functions/stage2Payout/entry.ts"))
  .default;
const council = (await import("../base44/functions/stage2Council/entry.ts"))
  .default;
const terms = (await import("../base44/functions/councilSettlementTerms/entry.ts"))
  .default;
function fixture() {
  const records = {
    Property: [{ id: "p", landlord_id: "A" }],
    PayoutAccountChange: [],
    Consent: [],
    Notification: [],
    OtpChallenge: [],
    User: [{ id: "A" }, { id: "B" }],
    PolicyRule: [{ id: "policy", payout_cooling_off_hours: 24 }],
    Council: [{ id: "c" }],
    SimSettlement: [],
    SimCouncilBill: [],
    SimCouncilInvoice: [],
    SimSettlementAdjustment: [],
    LedgerEntry: [],
    PaymentAlert: [],
  };
  let sequence = 0;
  const db = new Proxy(
    {},
    {
      get(_, name) {
        return {
          get: async (id) => {
            const row = (records[name] || []).find((r) => r.id === id);
            if (!row) throw Error("Not found");
            return row;
          },
          filter: async (query = {}, sort, limit = 100, skip = 0) =>
            (records[name] || [])
              .filter((row) =>
                Object.entries(query).every(([k, v]) => row[k] === v),
              )
              .slice()
              .reverse()
              .slice(skip, skip + limit),
          create: async (data) => {
            const row = {
              ...data,
              id: "row" + ++sequence,
              created_date: new Date(Date.now() + sequence).toISOString(),
            };
            (records[name] ||= []).push(row);
            return row;
          },
          update: async (id, change) => {
            const row = (records[name] || []).find((r) => r.id === id);
            Object.assign(row, change);
            return row;
          },
          updateMany: async (query, change) => {
            for (const row of records[name] || [])
              if (Object.entries(query).every(([k, v]) => row[k] === v))
                Object.assign(row, change.$set);
            return { updated: 1 };
          },
        };
      },
    },
  );
  let user = { id: "reviewer", role: "admin" };
  let sessionError = null;
  globalThis.stage2TestClient = {
    entities: db,
    asServiceRole: { entities: db },
    auth: { me: async () => { if (sessionError) throw sessionError; return user; } },
  };
  return {
    records,
    rejectSession: (error) => { sessionError = error; },
    as: (value) => {
      user = value;
    },
  };
}
const request = (handler, input) =>
  handler(
    new Request("https://simulation.test", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
test("Verified joint owners approve only their own nomination; codes cannot be replayed", async () => {
  const f = fixture();
  let response = await request(payout, {
    action: "verifyOwners",
    property_id: "p",
    owners: [
      { owner_id: "A", contact_phone: "0712345678" },
      { owner_id: "B", contact_phone: "0752345678" },
    ],
  });
  assert.equal(response.status, 200);
  f.as({ id: "A", role: "user" });
  response = await request(payout, {
    action: "nominate",
    property_id: "p",
    account_type: "bank",
    provider: "SIM",
    account_number: "SIM1234",
    account_name: "Demo",
    simulated_partner_name: "Demo",
    consent: true,
  });
  assert.equal(response.status, 200);
  const id = (await response.json()).id;
  response = await request(payout, {
    action: "requestOtp",
    property_id: "p",
    id,
  });
  const otp = await response.json();
  assert.ok(otp.simulation_code);
  f.as({ id: "B", role: "user" });
  assert.equal(
    (
      await request(payout, {
        action: "approve",
        property_id: "p",
        id,
        challenge_id: otp.challenge_id,
        code: otp.simulation_code,
      })
    ).status,
    403,
  );
  f.as({ id: "A", role: "user" });
  assert.equal(
    (
      await request(payout, {
        action: "approve",
        property_id: "p",
        id,
        challenge_id: otp.challenge_id,
        code: otp.simulation_code,
      })
    ).status,
    200,
  );
  const nomination = f.records.PayoutAccountChange.find((r) => r.id === id);
  assert.equal(nomination.approvals.length, 1);
  assert.equal(nomination.cooling_off_ends_at, undefined);
  f.as({ id: "B", role: "user" });
  response = await request(payout, {
    action: "requestOtp",
    property_id: "p",
    id,
  });
  const b = await response.json();
  assert.equal(
    (
      await request(payout, {
        action: "approve",
        property_id: "p",
        id,
        challenge_id: b.challenge_id,
        code: b.simulation_code,
      })
    ).status,
    200,
  );
  assert.equal(nomination.approvals.length, 2);
  assert.ok(nomination.cooling_off_ends_at);
  f.as({ id: "reviewer", role: "admin" });
  response = await request(payout, { action: "read", property_id: "p" });
  const view = await response.json();
  assert.equal(view.records[0].account_number, "****1234");
  assert.equal(JSON.stringify(view).includes("0712345678"), false);
});
test("Another council cannot read fee records and draft contracts only receive previews", async () => {
  const f = fixture();
  f.as({
    id: "staff",
    role: "user",
    data: { ibmt_role: "council_official", council_id: "other" },
  });
  assert.equal(
    (await request(council, { action: "read", council_id: "c" })).status,
    403,
  );
  f.as({ id: "reviewer", role: "admin" });
  f.records.SimSettlement.push({
    id: "s",
    payment_id: "payment",
    council_id: "c",
    council_amount: 90000,
    income: {
      system_fee: 45000,
      partner_rebate: 22500,
      contract_status: "draft",
    },
  });
  f.records.LedgerEntry.push({
    payment_id: "payment",
    account: "council_fee_payable",
    side: "credit",
    amount: 90000,
  });
  let response = await request(council, {
    action: "invoice",
    council_id: "c",
    month: "2026-11",
  });
  assert.equal(response.status, 409);
  f.records.SimCouncilBill.push({
    id: "bill",
    council_id: "c",
    state: "settled",
    day: "2026-11-10",
    amount: 90000,
    lines: [{ source_id: "s" }],
  });
  response = await request(council, {
    action: "invoice",
    council_id: "c",
    month: "2026-11",
  });
  assert.equal((await response.json()).invoice.state, "non_payable_preview");
  assert.equal(f.records.SimCouncilInvoice.length, 0);
  f.records.SimSettlement[0].income.contract_status = "signed";
  response = await request(council, {
    action: "invoice",
    council_id: "c",
    month: "2026-11",
  });
  assert.equal((await response.json()).invoice.amount, 45000);
  assert.equal(f.records.SimCouncilInvoice.length, 1);
});

test("Simulated settlement uses approved accounts, records a wallet hold, and retries once", async () => {
  const { recordSettlement } =
    await import("../base44/shared/stage2Settlement.ts");
  const f = fixture();
  f.records.PolicyRule[0] = {
    id: "policy",
    partner_rebate_rate: 0.0075,
    mobile_wallet_limit: 100000,
  };
  f.records.Tenancy = [{ id: "t", unit_id: "u" }];
  f.records.RentalUnit = [{ id: "u", property_id: "p" }];
  f.records.CouncilSettlementTerms = [
    {
      id: "v",
      ibmt_fee_basis: "share_of_rent",
      ibmt_fee_rate: 0.015,
      ibmt_contract_status: "signed",
    },
  ];
  f.records.PayoutAccountChange.push(
    {
      id: "r",
      property_id: "p",
      record_kind: "verified_roster",
      owners: [{ owner_id: "A" }],
    },
    {
      id: "n",
      property_id: "p",
      record_kind: "nomination",
      roster_id: "r",
      consent: true,
      name_check: "matched",
      account_type: "mobile_money",
      status: "cooling_off",
      cooling_off_ends_at: "2020-01-01",
    },
    {
      id: "a",
      property_id: "p",
      record_kind: "owner_approval",
      old_account_id: "n",
      owner_id: "A",
    },
  );
  const payment = {
    id: "payment",
    stage: "stage2_partner",
    tenancy_id: "t",
    fee_revision_id: "v",
    council_id: "c",
    rent_total: 3000000,
    council_fee: 90000,
    partner_charge: 60000,
    landlord_remainder: 2350000,
    succeeded_at: "2026-11-10T00:00:00Z",
  };
  const row = await recordSettlement(globalThis.stage2TestClient, {
    ...payment,
    deposit_amount: 500000,
  });
  assert.equal(row.landlord_amount, 2850000);
  assert.equal(row.landlord_state, "held_limit");
  assert.equal(row.income.system_fee, 45000);
  assert.equal(row.income.partner_rebate, 22500);
  assert.equal(
    (await recordSettlement(globalThis.stage2TestClient, payment)).id,
    row.id,
  );
  assert.equal(f.records.SimSettlement.length, 1);
});

test("Legacy unit grouping is reviewer-led, preserves unit references, and rejects mixed landlords", async () => {
  const f = fixture();
  f.records.RentalUnit = [
    { id: "u1", unit_ref: "ORIGINAL-1",district:"Demo district",ward:"Demo ward", landlord_id: "A", council_id: "c" },
    { id: "u2", unit_ref: "ORIGINAL-2",district:"Demo district",ward:"Demo ward", landlord_id: "B", council_id: "c" },
  ];
  let response = await request(payout, {
    action: "prepareProperty",
    name: "Demo property",
    unit_ids: ["u1", "u2"],
  });
  assert.equal(response.status, 422);
  response = await request(payout, {
    action: "prepareProperty",
    name: "Demo property",
    unit_ids: ["u1"],
  });
  assert.equal(response.status, 200);
  const propertyId = (await response.json()).property_id;
  assert.equal(f.records.RentalUnit[0].property_id, propertyId);
  assert.equal(f.records.RentalUnit[0].unit_ref, "ORIGINAL-1");
  response = await request(payout, {
    action: "prepareProperty",
    name: "Demo property",
    unit_ids: ["u1"],
  });
  assert.equal((await response.json()).property_id, propertyId);
});

test('The account holder cannot forge the simulated partner name check',async()=>{
 const f=fixture();f.records.PayoutAccountChange.push({id:'roster',property_id:'p',record_kind:'verified_roster',owners:[{owner_id:'A',contact_phone:'0712345678'}]});
 f.as({id:'A',role:'user'});
 const response=await request(payout,{action:'nominate',property_id:'p',account_type:'bank',provider:'SIM',account_number:'UNKNOWN-SIM',account_name:'Claimed Name',simulated_partner_name:'Claimed Name',consent:true});
 assert.equal(response.status,200);
 const id=(await response.json()).id;
 assert.equal(f.records.PayoutAccountChange.find(r=>r.id===id).name_check,'mismatch');
});

test('Signed-out callers cannot read or change Stage 2 resources', async () => {
  const f = fixture();
  f.as(null);
  for (const [handler, input] of [
    [payout, { action: 'properties' }],
    [payout, { action: 'nominate', property_id: 'p' }],
    [council, { action: 'read', council_id: 'c' }],
    [council, { action: 'invoice', council_id: 'c' }],
    [terms, { action: 'read', council_id: 'c' }],
    [terms, { action: 'propose', council_id: 'c' }],
  ]) assert.equal((await request(handler, input)).status, 401);
  assert.equal(f.records.PayoutAccountChange.length, 0);
  assert.equal(f.records.SimCouncilInvoice.length, 0);
});

test('Unrelated users cannot discover or operate another property payout', async () => {
  const f = fixture();
  f.as({ id: 'stranger', role: 'user' });
  const discovery = await request(payout, { action: 'properties' });
  assert.deepEqual((await discovery.json()).properties, []);
  for (const action of ['read', 'nominate', 'verifyOwners', 'requestOtp', 'approve', 'withdraw']) {
    assert.equal((await request(payout, { action, property_id: 'p' })).status, 403, action);
  }
  assert.equal(f.records.PayoutAccountChange.length, 0);
});

test('A landlord cannot act as the ownership reviewer or nominate before review', async () => {
  const f = fixture();
  f.as({ id: 'A', role: 'user' });
  assert.equal((await request(payout, { action: 'verifyOwners', property_id: 'p', owners: [] })).status, 403);
  assert.equal((await request(payout, { action: 'nominate', property_id: 'p', consent: true })).status, 409);
  assert.equal(f.records.PayoutAccountChange.length, 0);
});

test('Council staff can read their own fees but cannot bill, invoice or edit terms', async () => {
  const f = fixture();
  f.as({ id: 'staff', role: 'user', data: { ibmt_role: 'council_official', council_id: 'c' } });
  f.records.SimSettlement.push({ id: 's', property_id: 'p', council_id: 'c', council_amount: 90000,
    account_number: 'PRIVATE-ACCOUNT', landlord_amount: 2850000, settled_at: '2026-11-10T00:00:00Z',
    income: { partner_rebate: 22500 } });
  const response = await request(council, { action: 'read', council_id: 'c' });
  assert.equal(response.status, 200);
  const view = await response.json();
  assert.equal(view.settlements[0].council_amount, 90000);
  for (const secret of ['PRIVATE-ACCOUNT', 'landlord_amount', 'partner_rebate']) {
    assert.equal(JSON.stringify(view).includes(secret), false, secret);
  }
  for (const action of ['batch', 'invoice']) {
    assert.equal((await request(council, { action, council_id: 'c' })).status, 403);
  }
  for (const action of ['propose', 'approve', 'configureSimulation']) {
    assert.equal((await request(terms, { action, council_id: 'c' })).status, 403);
  }
});

test('Commercial terms reject tenants and officials from another council', async () => {
  const f = fixture();
  for (const user of [
    { id: 'tenant', role: 'user', data: { ibmt_role: 'tenant', council_id: 'c' } },
    { id: 'staff', role: 'user', data: { ibmt_role: 'council_official', council_id: 'other' } },
  ]) {
    f.as(user);
    assert.equal((await request(terms, { action: 'read', council_id: 'c' })).status, 403);
    assert.equal((await request(council, { action: 'read', council_id: 'c' })).status, 403);
  }
});

test('SDK auth_required exceptions return 401 rather than a server error', async () => {
  for (const error of [
    { status: 401 },
    { status: 403, data: { extra_data: { reason: 'auth_required' } } },
    { response: { status: 403, data: { extra_data: { reason: 'auth_required' } } } },
  ]) {
    const f = fixture();
    f.rejectSession(error);
    for (const handler of [payout, council, terms]) {
      const response = await request(handler, { action: 'read', property_id: 'p', council_id: 'c' });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).code, 'SESSION_EXPIRED');
    }
    assert.equal(f.records.PayoutAccountChange.length, 0);
  }
});

test('SDK outages are not mistaken for successful authentication or signed-out sessions', async () => {
  const f = fixture();
  f.rejectSession({ status: 503, message: 'private diagnostic' });
  for (const handler of [payout, council, terms]) {
    const response = await request(handler, { action: 'read', property_id: 'p', council_id: 'c' });
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes('private diagnostic'), false);
  }
});

