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

const simPayment = (await import("../base44/functions/simPayment/entry.ts")).default;

// Found on the hosted test app (2026-11-12): Tenancy rows are not readable by an
// admin, and the Stage 2 callback (admin-only, the mock partner) read the
// tenancy with the caller's own permissions, so no Stage 2 payment could ever
// settle. The payment engine's verification reads now use the service role,
// and the party check in settlementRules stays explicit.
function world() {
  const past = new Date(Date.now() - 60000).toISOString();
  const records = {
    Tenancy: [{ id: "ten", unit_id: "unit", landlord_id: "L", tenant_id: "T", status: "active", rent_amount: 500000 }],
    RentalUnit: [{ id: "unit", council_id: "c", property_id: "prop", landlord_id: "L", tenant_id: "T" }],
    Council: [{ id: "c", rent_stage: "partner", council_fee_type: "percent", council_fee_rate: 0.03, council_fee_fixed_amount: 0, council_fee_status: "proposed", fee_revision_id: "rev" }],
    CouncilSettlementTerms: [{ id: "rev", council_id: "c", council_fee_type: "percent", council_fee_rate: 0.03, council_fee_fixed_amount: 0, ibmt_fee_basis: "share_of_rent", ibmt_fee_rate: 0.015, ibmt_contract_status: "draft" }],
    CouncilFeeApproval: [],
    PolicyRule: [{ id: "policy", effective_from: "2026-01-01", partner_charge_rate: 0.02, partner_rebate_rate: 0.0075, mobile_wallet_limit: null, payout_cooling_off_hours: 24 }],
    PayoutAccountChange: [
      { id: "roster", property_id: "prop", record_kind: "verified_roster", owners: [{ owner_id: "L", contact_phone: "0700000001" }], created_date: past },
      { id: "nom", property_id: "prop", record_kind: "nomination", roster_id: "roster", account_type: "mobile_money", account_number: "0712000111", status: "cooling_off", cooling_off_ends_at: past, consent: true, name_check: "reviewed", created_date: past },
      { id: "vote", property_id: "prop", record_kind: "owner_approval", old_account_id: "nom", owner_id: "L", created_date: past },
    ],
    SimPayment: [],
    LedgerEntry: [],
    SimSettlement: [],
    PaymentAlert: [],
  };
  let sequence = 0;
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const matches = (row, query) => Object.entries(query).every(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? true : row[k] === v));
  const handler = (name, scope) => ({
    get: async (id) => {
      await tick();
      // Hosted behaviour: a tenancy is invisible to anyone reading as themselves here.
      if (scope === "user" && name === "Tenancy") throw Object.assign(Error(`Entity Tenancy with ID ${id} not found`), { status: 404 });
      const row = (records[name] || []).find((r) => r.id === id);
      if (!row) throw Object.assign(Error("Not found"), { status: 404 });
      return { ...row };
    },
    filter: async (query = {}, sort, limit = 100, skip = 0) => {
      await tick();
      return (records[name] || []).filter((r) => matches(r, query)).slice(skip, skip + limit).map((r) => ({ ...r }));
    },
    list: async () => (records[name] || []).map((r) => ({ ...r })),
    create: async (data) => {
      const row = { ...data, id: `${name}-${++sequence}`, created_date: new Date().toISOString() };
      (records[name] ||= []).push(row);
      return { ...row };
    },
    bulkCreate: async (rows) => {
      for (const data of rows) records[name].push({ ...data, id: `${name}-${++sequence}` });
      return rows;
    },
    update: async (id, data) => {
      const row = records[name].find((r) => r.id === id);
      Object.assign(row, data);
      return { ...row };
    },
    updateMany: async (query, change) => {
      const hits = records[name].filter((r) => matches(r, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
  });
  const proxy = (scope) => new Proxy({}, { get: (_, name) => handler(name, scope) });
  const client = (user) => ({ auth: { me: async () => user }, entities: proxy("user"), asServiceRole: { entities: proxy("service") } });
  return { records, client };
}

const call = async (body) => {
  const res = await simPayment(new Request("http://local/fn", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};

test("a tenant-started Stage 2 payment settles through the admin mock partner, once", async () => {
  const { records, client } = world();
  globalThis.stage2TestClient = client({ id: "T", role: "user" });
  const started = await call({ action: "initiate", tenancy_id: "ten", monthly_rent: 500000, rent_total: 500000, months: 1, new_tenancy: false, deposit_amount: 0, idempotency_key: "k1" });
  assert.equal(started.status, 200, JSON.stringify(started.body));
  assert.equal(started.body.payment.stage, "stage2_partner");
  assert.equal(records.SimPayment[0].landlord_id, "L", "landlord taken from the registered tenancy");

  globalThis.stage2TestClient = client({ id: "A", role: "admin" });
  const results = await Promise.all(
    Array.from({ length: 5 }, () => call({ action: "partnerNotify", payment_id: started.body.payment.id, outcome: "succeeded", provider_reference: "SIM-REF-1" })),
  );
  assert.ok(results.every((r) => r.status !== 500), JSON.stringify(results.map((r) => r.body.message)));
  const credited = results.filter((r) => r.status === 200 && r.body.credits_written > 0);
  assert.equal(credited.length, 1);
  const debits = records.LedgerEntry.filter((l) => l.side === "debit").reduce((s, l) => s + l.amount, 0);
  const credits = records.LedgerEntry.filter((l) => l.side === "credit").reduce((s, l) => s + l.amount, 0);
  assert.equal(debits, credits);
  assert.equal(records.SimSettlement.length, 1);
  assert.equal(records.SimSettlement[0].landlord_state, "held_limit", "unknown mobile-wallet limit holds the landlord share");
  assert.equal(records.SimPayment[0].state, "succeeded");
});

test("someone who is not a party to the tenancy still cannot start a payment on it", async () => {
  const { client } = world();
  globalThis.stage2TestClient = client({ id: "U", role: "user" });
  const res = await call({ action: "initiate", tenancy_id: "ten", monthly_rent: 500000, rent_total: 500000, months: 1, new_tenancy: false, deposit_amount: 0 });
  assert.equal(res.status, 500);
  assert.match(res.body.message, /not yours/);
});
