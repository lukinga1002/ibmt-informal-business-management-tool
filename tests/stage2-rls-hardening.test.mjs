import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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

const moneyControl = (await import("../base44/functions/moneyControl/entry.ts")).default;
const entity = (name) => JSON.parse(readFileSync(new URL(`../base44/entities/${name}.jsonc`, import.meta.url), "utf8"));
const ADMIN = { user_condition: { role: "admin" } };

// Found on the hosted test app (2026-11-12): direct entity writes let a landlord
// self-verify a unit and create an "active" tenancy that started a Stage 2
// payment, and let any admin edit ledger rows and approval requests. These
// records are now written only by functions, after their own checks.
test("money, tenancy and lease records accept no direct user or admin writes", () => {
  const expectations = {
    LedgerEntry: { create: false, update: false, delete: false },
    ApprovalRequest: { create: false, update: false, delete: false },
    SimPayment: { create: false, update: false, delete: false },
    Tenancy: { create: false, update: false },
    Lease: { create: false, update: false },
  };
  for (const [name, rules] of Object.entries(expectations)) {
    const rls = entity(name).rls;
    for (const [operation, expected] of Object.entries(rules)) {
      assert.deepEqual(rls[operation], expected, `${name}.${operation}`);
    }
  }
});

test("a landlord cannot set a unit's verification, jurisdiction or tenant fields", () => {
  const unit = entity("RentalUnit");
  assert.deepEqual(unit.properties.verification_status.rls, { create: ADMIN, update: ADMIN });
  for (const field of ["status", "council_id", "district", "ward", "region", "landlord_id", "tenant_id", "property_id", "occupancy", "unit_ref"]) {
    assert.deepEqual(unit.properties[field].rls, { update: ADMIN }, field);
  }
  // The landlord still creates and updates their own units through functions.
  assert.deepEqual(unit.rls.create, { "data.landlord_id": "{{user.id}}" });
});

test("functions write protected records only through the service role", () => {
  const protectedWrite = /(?<!asServiceRole\.)entities\.(LedgerEntry|ApprovalRequest|SimPayment|Tenancy|Lease)\.(create|update|updateMany|bulkCreate|delete)\(|(?<!asServiceRole\.)entities\.RentalUnit\.update\(/;
  const offenders = [];
  for (const dir of ["base44/functions", "base44/shared"]) {
    const root = new URL(`../${dir}/`, import.meta.url);
    const files = dir.endsWith("functions")
      ? readdirSync(root).map((name) => `${name}/entry.ts`)
      : readdirSync(root).filter((name) => name.endsWith(".ts"));
    for (const file of files) {
      readFileSync(new URL(file, root), "utf8").split("\n").forEach((line, index) => {
        if (protectedWrite.test(line)) offenders.push(`${dir}/${file}:${index + 1}`);
      });
    }
  }
  assert.deepEqual(offenders, []);
});

/** A store whose updateMany applies only to rows that still match, like the hosted platform. */
function world() {
  const records = {
    SimPayment: [{ id: "pay", reference: "IBMT-SIM-1", state: "succeeded", tenant_pays: 500000, refunded_amount: 0, state_history: [] }],
    LedgerEntry: [
      { id: "l1", payment_id: "pay", posting: 1, account: "partner_clearing", side: "debit", amount: 500000 },
      { id: "l2", payment_id: "pay", posting: 1, account: "landlord_payable", side: "credit", amount: 500000 },
    ],
    ApprovalRequest: [],
    SimSettlement: [],
    SimSettlementAdjustment: [],
    PaymentAlert: [],
    AuditEvent: [],
  };
  let sequence = 0;
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const matches = (row, query) => Object.entries(query).every(([k, v]) => row[k] === v);
  const handler = (name, scope) => ({
    get: async (id) => {
      await tick();
      const row = (records[name] || []).find((r) => r.id === id);
      if (!row) throw Object.assign(Error("Not found"), { status: 404 });
      return { ...row };
    },
    filter: async (query = {}, sort, limit = 100, skip = 0) => {
      await tick();
      return (records[name] || []).filter((r) => matches(r, query)).slice(skip, skip + limit).map((r) => ({ ...r }));
    },
    create: async (data) => {
      if (scope === "user" && ["ApprovalRequest", "LedgerEntry", "SimPayment"].includes(name)) throw Error(`user-scoped write to ${name}`);
      const row = { ...data, id: `${name}-${++sequence}` };
      (records[name] ||= []).push(row);
      return row;
    },
    bulkCreate: async (rows) => {
      if (scope === "user") throw Error(`user-scoped bulk write to ${name}`);
      for (const data of rows) records[name].push({ ...data, id: `${name}-${++sequence}` });
      return rows;
    },
    update: async (id, data) => {
      if (scope === "user" && ["ApprovalRequest", "SimPayment"].includes(name)) throw Error(`user-scoped update of ${name}`);
      await tick();
      const row = records[name].find((r) => r.id === id);
      Object.assign(row, data);
      return { ...row };
    },
    updateMany: async (query, change) => {
      // Matching and writing happen in one step, as one atomic document update.
      const hits = records[name].filter((r) => matches(r, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
  });
  const proxy = (scope) => new Proxy({}, { get: (_, name) => handler(name, scope) });
  const client = (user) => ({ auth: { me: async () => user }, entities: proxy("user"), asServiceRole: { entities: proxy("service") } });
  return { records, client };
}

const adminA = { id: "A", role: "admin", full_name: "SIM Admin A" };
const adminB = { id: "B", role: "admin", full_name: "SIM Admin B" };
const call = async (body) => {
  const res = await moneyControl(new Request("http://local/fn", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};

test("five concurrent approvals of one reversal execute it exactly once", async () => {
  const { records, client } = world();
  globalThis.stage2TestClient = client(adminA);
  const requested = await call({ action: "request", kind: "reverse", payment_id: "pay", reason: "QA reversal" });
  assert.equal(requested.status, 200);
  const id = requested.body.request.id;

  globalThis.stage2TestClient = client(adminA);
  assert.equal((await call({ action: "decide", id })).body.code, "SECOND_PERSON_REQUIRED");

  globalThis.stage2TestClient = client(adminB);
  const results = await Promise.all(Array.from({ length: 5 }, () => call({ action: "decide", id })));
  assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => r.body.code)));
  assert.ok(results.filter((r) => r.status !== 200).every((r) => r.body.code === "ALREADY_DECIDED"));
  const mirrored = records.LedgerEntry.filter((row) => row.actor_role === "money_control");
  assert.equal(mirrored.length, 2, "one mirrored group of two lines");
  assert.equal(records.LedgerEntry.filter((row) => row.id === "l1" || row.id === "l2").every((row) => row.amount === 500000), true, "originals untouched");
  assert.equal(records.SimPayment[0].state, "reversed");
  assert.equal(records.ApprovalRequest[0].status, "executed");
});

test("an approval that would fail is refused before it is claimed", async () => {
  const { records, client } = world();
  records.SimPayment[0].state = "initiated";
  records.ApprovalRequest.push({ id: "req", action: "reverse", status: "pending", requested_by_id: "A", reason: "QA", payload: { payment_id: "pay" }, approvals: [] });
  globalThis.stage2TestClient = client(adminB);
  const res = await call({ action: "decide", id: "req" });
  assert.equal(res.body.code, "ILLEGAL_TRANSITION");
  assert.equal(records.ApprovalRequest[0].status, "pending", "still decidable after the refusal");
  assert.equal(records.LedgerEntry.length, 2, "no mirrored lines written");
});
