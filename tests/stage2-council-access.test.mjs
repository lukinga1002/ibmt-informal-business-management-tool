import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const terms = (await import("../base44/functions/councilSettlementTerms/entry.ts")).default;

// Council money records are read by officials only through the two council
// functions, which check the official's council against the requested one.
// Direct entity reads are admin-only (found 2026-11-12: the old official clause
// never matched on hosted, so it only looked like access).
const MONEY_ENTITIES = ["SimSettlement", "SimCouncilBill", "SimCouncilInvoice", "SimSettlementAdjustment", "CouncilSettlementTerms", "CouncilFeeApproval"];

function world() {
  const records = {
    Council: [{ id: "A", name: "SIM A" }, { id: "B", name: "SIM B" }],
    SimSettlement: [
      { id: "sA", council_id: "A", property_id: "p", council_amount: 15000, settled_at: "2026-11-12T08:00:00Z", landlord_amount: 475000, income: { partner_rebate: 3750 } },
      { id: "sB", council_id: "B", property_id: "q", council_amount: 99000, settled_at: "2026-11-12T08:00:00Z", landlord_amount: 1, income: { partner_rebate: 1 } },
    ],
    SimCouncilBill: [], SimCouncilInvoice: [], SimSettlementAdjustment: [], CouncilSettlementTerms: [], CouncilFeeApproval: [], LedgerEntry: [], PaymentAlert: [],
  };
  const matches = (row, q) => Object.entries(q).every(([k, v]) => row[k] === v);
  const entity = (name) => ({
    get: async (id) => { const row = (records[name] || []).find((r) => r.id === id); if (!row) throw Object.assign(Error("Not found"), { status: 404 }); return { ...row }; },
    filter: async (q = {}, sort, limit = 100, skip = 0) => (records[name] || []).filter((r) => matches(r, q)).slice(skip, skip + limit),
    create: async (d) => { const row = { ...d, id: `${name}-${(records[name] ||= []).length + 1}` }; records[name].push(row); return row; },
    update: async (id, d) => Object.assign(records[name].find((r) => r.id === id), d),
    updateMany: async () => ({ updated: 0 }),
  });
  const entities = new Proxy({}, { get: (_, n) => entity(n) });
  return { records, entities };
}

async function call(handler, user, body) {
  const { entities } = world();
  globalThis.stage2TestClient = { auth: { me: async () => { if (!user) throw Object.assign(Error("no"), { status: 401 }); return user; } }, entities, asServiceRole: { entities } };
  const res = await handler(new Request("http://local/fn", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}

const officialA = { id: "oA", role: "user", data: { ibmt_role: "council_official", council_id: "A" } };

test("council money entities are not readable or writable directly by anyone but the admin", () => {
  for (const name of MONEY_ENTITIES) {
    const source = readFileSync(new URL(`../base44/entities/${name}.jsonc`, import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, "");
    const { rls } = JSON.parse(source);
    assert.deepEqual(rls.read, { user_condition: { role: "admin" } }, `${name} read`);
    for (const op of ["create", "update", "delete"]) assert.equal(rls[op], false, `${name} ${op}`);
  }
});

test("an official reads only their own council, and never landlord amounts or the partner rebate", async () => {
  const own = await call(council, officialA, { action: "read", council_id: "A" });
  assert.equal(own.status, 200);
  assert.deepEqual(own.body.settlements.map((s) => s.id), ["sA"]);
  for (const secret of ["landlord_amount", "partner_rebate", "475000", "sB"]) assert.equal(JSON.stringify(own.body).includes(secret), false, secret);
});

test("negative permissions: wrong council, missing council, wrong role, ordinary users and signed-out callers", async () => {
  const cases = [
    ["official of another council", officialA, "B", 403],
    ["official with no council", { id: "o0", role: "user", data: { ibmt_role: "council_official" } }, "A", 403],
    ["official asking for no council", officialA, "", 403],
    ["mtaa officer of the same council", { id: "m", role: "user", data: { ibmt_role: "mtaa_officer", council_id: "A" } }, "A", 403],
    ["landlord in the council", { id: "l", role: "user", data: { ibmt_role: "landlord", council_id: "A" } }, "A", 403],
    ["tenant in the council", { id: "t", role: "user", data: { ibmt_role: "tenant", council_id: "A" } }, "A", 403],
    ["user with no role", { id: "u", role: "user", data: {} }, "A", 403],
    ["signed out", null, "A", 401],
  ];
  for (const [label, user, councilId, status] of cases) {
    for (const handler of [council, terms]) {
      const res = await call(handler, user, { action: "read", council_id: councilId });
      assert.equal(res.status, status, `${label} (${handler === council ? "stage2Council" : "councilSettlementTerms"})`);
    }
  }
});

test("an official of the right council still cannot bill, invoice, reconcile or change terms", async () => {
  for (const action of ["batch", "invoice", "reconcile"]) {
    assert.equal((await call(council, officialA, { action, council_id: "A", day: "2026-11-12", month: "2026-11" })).status, 403, action);
  }
  for (const action of ["propose", "approve", "configureSimulation"]) {
    assert.equal((await call(terms, officialA, { action, council_id: "A" })).status, 403, action);
  }
});
