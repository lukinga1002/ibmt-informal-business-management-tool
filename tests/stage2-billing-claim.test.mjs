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

const council = (await import("../base44/functions/stage2Council/entry.ts")).default;

// Found on the hosted test app (2026-11-12): three simultaneous batch requests
// for 2026-11-13 created three bill records (…5f76, …9a88, …4558) within 71 ms.
function world({ settlements = 2, signed = false } = {}) {
  const records = {
    Council: [{ id: "c", name: "SIM" }],
    SimSettlement: [],
    SimCouncilBill: [],
    SimCouncilInvoice: [],
    SimSettlementAdjustment: [],
    LedgerEntry: [],
    PaymentAlert: [],
  };
  for (let i = 1; i <= settlements; i++) {
    records.SimSettlement.push({
      id: `s${i}`, payment_id: `p${i}`, council_id: "c", council_amount: 15000,
      settled_at: "2026-11-12T08:00:00.000Z",
      income: { system_fee: 7500, partner_rebate: 3750, contract_status: signed ? "signed" : "draft" },
    });
    records.LedgerEntry.push({ id: `l${i}`, payment_id: `p${i}`, account: "council_fee_payable", side: "credit", amount: 15000 });
  }
  let sequence = 0;
  const tick = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
  // Hosted semantics measured on 2026-11-12: `field: null` matches a missing field.
  const matches = (row, query) => Object.entries(query).every(([k, v]) => (v === null ? row[k] == null : row[k] === v));
  const handler = (name) => ({
    get: async (id) => { await tick(); const row = records[name].find((r) => r.id === id); if (!row) throw Object.assign(Error("Not found"), { status: 404 }); return { ...row }; },
    filter: async (query = {}, sort, limit = 100, skip = 0) => { await tick(); return records[name].filter((r) => matches(r, query)).slice(skip, skip + limit).map((r) => ({ ...r })); },
    create: async (data) => { await tick(); const row = { ...data, id: `${name}-${++sequence}`, created_date: new Date().toISOString() }; records[name].push(row); return { ...row }; },
    update: async (id, data) => { const row = records[name].find((r) => r.id === id); Object.assign(row, data); return { ...row }; },
    updateMany: async (query, change) => {
      // One atomic step per call, as on hosted.
      const hits = records[name].filter((r) => matches(r, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
  });
  const entities = new Proxy({}, { get: (_, name) => handler(name) });
  globalThis.stage2TestClient = { auth: { me: async () => ({ id: "A", role: "admin" }) }, entities, asServiceRole: { entities } };
  return records;
}

const call = async (body) => {
  const res = await council(new Request("http://local/fn", { method: "POST", body: JSON.stringify({ council_id: "c", ...body }) }));
  return { status: res.status, body: await res.json() };
};
const sources = (records) => records.SimCouncilBill.flatMap((b) => (b.lines || []).map((l) => l.source_id));

test("five simultaneous batch requests for one day create one bill", async () => {
  const records = world();
  const results = await Promise.all(Array.from({ length: 5 }, () => call({ action: "batch", day: "2026-11-13" })));
  assert.equal(records.SimCouncilBill.length, 1, JSON.stringify(results.map((r) => r.body.code || r.status)));
  assert.ok(results.every((r) => r.status === 200 && r.body.bill.id === records.SimCouncilBill[0].id));
  assert.equal(records.SimCouncilBill[0].amount, 30000);
  assert.equal(records.Council[0].billing_lock, null, "claim released");
});

test("sequential retries return the same bill", async () => {
  const records = world();
  const first = await call({ action: "batch", day: "2026-11-13" });
  const again = await call({ action: "batch", day: "2026-11-13" });
  assert.equal(again.body.bill.id, first.body.bill.id);
  assert.equal(records.SimCouncilBill.length, 1);
});

test("two days billed at the same moment never bill one settlement twice", async () => {
  const records = world({ settlements: 3 });
  await Promise.all([call({ action: "batch", day: "2026-11-13" }), call({ action: "batch", day: "2026-11-14" }), call({ action: "batch", day: "2026-11-15" })]);
  const used = sources(records);
  assert.equal(used.length, new Set(used).size, `settlement billed twice: ${used}`);
  assert.deepEqual([...used].sort(), ["s1", "s2", "s3"]);
  assert.equal(records.SimCouncilBill.reduce((sum, b) => sum + b.amount, 0), 45000);
});

test("simultaneous invoice requests issue one invoice", async () => {
  const records = world({ signed: true });
  await call({ action: "batch", day: "2026-11-12" });
  const results = await Promise.all(Array.from({ length: 4 }, () => call({ action: "invoice", month: "2026-11" })));
  assert.equal(records.SimCouncilInvoice.length, 1, JSON.stringify(results.map((r) => r.body.code || r.body.invoice?.state)));
  assert.ok(results.every((r) => r.status === 200 && r.body.invoice.state === "issued"));
});

test("an abandoned claim is taken over after the timeout, a fresh one is respected", async () => {
  const records = world();
  records.Council[0].billing_lock = "crashed-run";
  records.Council[0].billing_lock_at = new Date(Date.now() - 5 * 60000).toISOString();
  assert.equal((await call({ action: "batch", day: "2026-11-13" })).status, 200);
  assert.equal(records.Council[0].billing_lock, null);

  records.Council[0].billing_lock = "live-run";
  records.Council[0].billing_lock_at = new Date().toISOString();
  const busy = await call({ action: "batch", day: "2026-11-14" });
  assert.equal(busy.status, 409);
  assert.equal(busy.body.code, "BILLING_BUSY");
  assert.equal(records.Council[0].billing_lock, "live-run", "someone else's claim is never released");
});
