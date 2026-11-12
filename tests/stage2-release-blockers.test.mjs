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

const lease = (await import("../base44/functions/leaseSignature/entry.ts")).default;
const whoami = (await import("../base44/functions/whoami/entry.ts")).default;
const roleGrant = (await import("../base44/functions/roleGrant/entry.ts")).default;
const { reverseSettlement, recoverySummary } = await import("../base44/shared/stage2Settlement.ts");

function matches(row, query) {
  return Object.entries(query).every(([k, v]) => {
    if (v && typeof v === "object" && "$in" in v) return v.$in.includes(row[k]);
    return v === null ? row[k] == null : row[k] === v;
  });
}

function store(records) {
  let sequence = 0;
  const entity = (name) => ({
    get: async (id) => {
      const row = (records[name] ||= []).find((r) => r.id === id);
      if (!row) throw Object.assign(Error("Not found"), { status: 404 });
      return structuredClone(row);
    },
    filter: async (query = {}, sort, limit = 100, skip = 0) => {
      const rows = (records[name] ||= []).filter((r) => matches(r, query)).map((r) => structuredClone(r));
      return sort && typeof sort === "object" ? { items: rows.slice(0, sort.limit || 100) } : rows.slice(skip, skip + limit);
    },
    create: async (data) => {
      const row = { ...structuredClone(data), id: `${name}-${++sequence}`, created_date: new Date(Date.now() + sequence).toISOString() };
      (records[name] ||= []).push(row);
      return structuredClone(row);
    },
    bulkCreate: async (rows) => Promise.all(rows.map((r) => entity(name).create(r))),
    update: async (id, data) => Object.assign(records[name].find((r) => r.id === id), structuredClone(data)),
    updateMany: async (query, change) => {
      const hits = (records[name] ||= []).filter((r) => matches(r, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
  });
  return new Proxy({}, { get: (_, name) => entity(name) });
}

function as(records, user) {
  const entities = store(records);
  globalThis.stage2TestClient = {
    auth: { me: async () => { if (!user) throw Object.assign(Error("no"), { status: 401 }); return structuredClone(user); } },
    entities,
    asServiceRole: { entities },
  };
  return async (handler, body) => {
    const res = await handler(new Request("http://local/fn", { method: "POST", body: JSON.stringify(body) }));
    return { status: res.status, body: await res.json() };
  };
}

const leaseWorld = () => ({
  Lease: [{ id: "LE", landlord_id: "L", tenant_id: null, claim_code: "CLAIM-1234", status: "awaiting_tenant", signatures: [], unit_id: "U", rent_amount: 100000, terms: {} }],
  OtpChallenge: [],
  Tenancy: [],
  RentalUnit: [{ id: "U", council_id: "C" }],
  Council: [{ id: "C", rent_stage: "stage1" }],
  User: [
    { id: "L", role: "user", full_name: "SIM Landlord", data: { ibmt_role: "landlord", phone: "0700000101" } },
    { id: "T", role: "user", full_name: "SIM Tenant", data: {} },
    { id: "A", role: "admin", full_name: "SIM Admin", data: {} },
  ],
});

// Release blocker 1: an administrator could request a code for either party and
// sign the lease in that party's place.
test("an administrator can neither request a code nor sign for a party", async () => {
  const records = leaseWorld();
  records.Lease[0].tenant_id = "T";
  records.Lease[0].status = "awaiting_signature";
  const admin = as(records, records.User[2]);
  for (const party of ["landlord", "tenant", undefined]) {
    const res = await admin(lease, { action: "request", lease_id: "LE", party });
    assert.equal(res.status, 403, `request as ${party}`);
  }
  assert.equal(records.OtpChallenge.length, 0);
  const view = await admin(lease, { action: "view", lease_id: "LE" });
  assert.equal(view.status, 200, "an admin may still read the lease");
  assert.equal(view.body.can_request, false);
});

test("a landlord cannot claim their own lease as the tenant", async () => {
  const records = leaseWorld();
  const landlord = as(records, records.User[0]);
  const res = await landlord(lease, { action: "claim", code: "CLAIM-1234" });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "SAME_PARTY");
  assert.equal(records.Lease[0].tenant_id, null);
});

// Release blocker 2: the tenant reached the signing flow only after someone
// edited their profile role.
test("claiming a lease makes the person its tenant party and gives a role-less profile the tenant role", async () => {
  const records = leaseWorld();
  const tenant = as(records, records.User[1]);
  const claimed = await tenant(lease, { action: "claim", code: "CLAIM-1234" });
  assert.equal(claimed.status, 200);
  assert.equal(records.Lease[0].tenant_id, "T");
  assert.equal(records.User[1].data.ibmt_role, "tenant");
  const view = await tenant(lease, { action: "view", lease_id: "LE" });
  assert.equal(view.body.my_party, "tenant");
  assert.equal(view.body.can_request, true);
  const issued = await tenant(lease, { action: "request", lease_id: "LE" });
  assert.equal(issued.status, 200);

  const stranger = as(records, { id: "X", role: "user", data: {} });
  assert.equal((await stranger(lease, { action: "view", lease_id: "LE" })).status, 403);
  assert.equal((await stranger(lease, { action: "request", lease_id: "LE" })).status, 403);
});

test("claiming never overwrites an existing role", async () => {
  const records = leaseWorld();
  records.User[1].data = { ibmt_role: "landlord" };
  await as(records, records.User[1])(lease, { action: "claim", code: "CLAIM-1234" });
  assert.equal(records.User[1].data.ibmt_role, "landlord");
});

test("lease screens are reachable by any signed-in party and are not parked behind the tenant module", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /path="\/rent\/lease\/:leaseId" element=\{<SignedInGuard><LeaseDetail \/><\/SignedInGuard>\}/);
  assert.match(app, /path="\/rent\/leases" element=\{<SignedInGuard><TenantLease \/><\/SignedInGuard>\}/);
  assert.doesNotMatch(app, /ModuleGate flag="tenant_module"><WorkspaceGuard allow=\{\['tenant'\]\}><TenantLease/);
});

// Release blocker 3: screens took the role from the profile, which users can rewrite.
test("whoami returns only the trusted role", async () => {
  const records = { RoleGrant: [{ id: "g", subject_id: "O", ibmt_role: "council_official", council_id: "C", status: "active" }] };
  const cases = [
    [{ id: "S", role: "user", data: { ibmt_role: "council_official", council_id: "C" } }, "public", null],
    [{ id: "W", role: "user", data: { ibmt_role: "mtaa_officer", ward_ids: ["W1"] } }, "public", null],
    [{ id: "O", role: "user", data: { ibmt_role: "landlord", council_id: "X" } }, "council_official", "C"],
    [{ id: "L", role: "user", data: { ibmt_role: "landlord" } }, "landlord", null],
    [{ id: "A", role: "admin", data: {} }, "admin", null],
  ];
  for (const [user, role, council] of cases) {
    const res = await as(records, user)(whoami, {});
    assert.equal(res.body.role, role, user.id);
    assert.equal(res.body.jurisdiction.council_id, council, `${user.id} council`);
    if (role === "public") assert.deepEqual(res.body.jurisdiction.wards, []);
  }
});

test("screens take their role from whoami, never from the profile", () => {
  const platform = readFileSync(new URL("../src/api/platform.js", import.meta.url), "utf8");
  const session = platform.slice(platform.indexOf("async function session()"), platform.indexOf("const HANDLERS"));
  assert.match(session, /invokeFunction\('whoami'/);
  assert.doesNotMatch(session, /data\.ibmt_role/);
  for (const file of ["../src/pages/rent/Pangisha.jsx"]) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), "utf8"), /data\??\.ibmt_role/);
  }
});

test("profile roles migrate only for users the admin names, never automatically", async () => {
  const records = {
    User: [
      { id: "A", role: "admin", email: "admin@sim.test", data: {} },
      { id: "O1", role: "user", email: "o1@sim.test", data: { ibmt_role: "council_official", council_id: "C" } },
      { id: "M1", role: "user", email: "m1@sim.test", data: { ibmt_role: "mtaa_officer", ward_ids: ["W1"] } },
      { id: "AG", role: "user", email: "ag@sim.test", data: { ibmt_role: "agent" } },
      { id: "L1", role: "user", email: "l1@sim.test", data: { ibmt_role: "landlord" } },
      { id: "BAD", role: "user", email: "bad@sim.test", data: { ibmt_role: "council_official" } },
    ],
    Council: [{ id: "C" }],
    RoleGrant: [],
    AuditLog: [],
  };
  const admin = as(records, records.User[0]);
  const dry = await admin(roleGrant, { action: "migrateProfiles" });
  assert.equal(dry.body.dry_run, true);
  assert.deepEqual(dry.body.candidates.map((c) => c.subject_id).sort(), ["AG", "BAD", "M1", "O1"]);
  assert.equal(records.RoleGrant.length, 0, "a dry run grants nothing");
  const run = await admin(roleGrant, { action: "migrateProfiles", subject_ids: ["O1", "M1", "AG", "BAD", "L1"], reason: "Reviewed each officer against appointment letters" });
  const result = Object.fromEntries(run.body.results.map((r) => [r.subject_id, r.result]));
  assert.deepEqual(result, { O1: "granted", M1: "granted", AG: "granted", BAD: "needs_council", L1: "not_a_candidate" });
  assert.equal(records.RoleGrant.length, 3);
  assert.equal(records.AuditLog.length, 3);
  const user = as(records, records.User[4]);
  assert.equal((await user(roleGrant, { action: "migrateProfiles" })).status, 403);
});

// Release blocker 6: a reversal after the landlord was paid recorded nothing
// about the unrecovered amount.
test("a reversal after payout opens an unrecovered-payout exception and a balanced ledger record, once", async () => {
  const records = {
    SimSettlement: [
      { id: "paid", payment_id: "P", council_id: "C", property_id: "Q", landlord_amount: 475000, landlord_state: "settled", council_amount: 15000, income: { system_fee: 4500, partner_rebate: 0 } },
    ],
    SimSettlementAdjustment: [],
    SimRecoveryException: [],
    LedgerEntry: [],
  };
  as(records, { id: "A", role: "admin" });
  const app = globalThis.stage2TestClient;
  const first = await reverseSettlement(app, "P");
  const again = await reverseSettlement(app, "P");
  assert.deepEqual(first, { cancelled: 0, exceptions: 1 });
  assert.deepEqual(again, { cancelled: 0, exceptions: 0 });
  assert.equal(records.SimRecoveryException.length, 1);
  const exception = records.SimRecoveryException[0];
  assert.equal(exception.state, "open", "never marked recovered");
  assert.equal(exception.amount, 475000);
  const group = records.LedgerEntry.filter((l) => l.group_id === exception.ledger_group_id);
  assert.equal(group.length, 2);
  const debit = group.filter((l) => l.side === "debit").reduce((s, l) => s + l.amount, 0);
  const credit = group.filter((l) => l.side === "credit").reduce((s, l) => s + l.amount, 0);
  assert.equal(debit, credit);
  assert.equal(records.SimSettlement[0].landlord_state, "settled", "the payout record itself is not rewritten");
  assert.deepEqual(recoverySummary(records.SimRecoveryException, records.LedgerEntry), { open: 1, amount: 475000, ledger_receivable: 475000, matched: true });
});

test("a reversal of a still-held share cancels the hold instead of opening an exception", async () => {
  const records = {
    SimSettlement: [{ id: "held", payment_id: "P", council_id: "C", landlord_amount: 475000, landlord_state: "held_limit", council_amount: 15000, income: { system_fee: 4500, partner_rebate: 0 } }],
    SimSettlementAdjustment: [],
    SimRecoveryException: [],
    LedgerEntry: [],
  };
  as(records, { id: "A", role: "admin" });
  assert.deepEqual(await reverseSettlement(globalThis.stage2TestClient, "P"), { cancelled: 1, exceptions: 0 });
  assert.equal(records.SimSettlement[0].landlord_state, "cancelled_by_reversal");
  assert.equal(records.SimRecoveryException.length, 0);
});

test("nothing in this release can mark a recovery exception resolved", () => {
  const schema = JSON.parse(readFileSync(new URL("../base44/entities/SimRecoveryException.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  assert.deepEqual(schema.properties.state.enum, ["open"]);
  assert.equal(schema.rls.update, false);
  assert.equal(schema.rls.delete, false);
});

// Consent evidence: a change of mind adds a row and never rewrites an earlier one,
// and the accepted language travels with each row.
const privacyDesk = (await import("../base44/functions/privacyDesk/entry.ts")).default;
const { latestBySubject } = await import("../base44/shared/consentLog.ts");

test("consent changes are appended with their language, never edited in place", async () => {
  const records = { Consent: [], User: [{ id: "L", role: "user", full_name: "SIM Landlord", data: {} }] };
  const me = as(records, records.User[0]);
  const grant = await me(privacyDesk, { action: "setConsent", purpose: "council_sharing", granted: true, language: "sw" });
  assert.equal(grant.status, 200);
  const first = structuredClone(records.Consent[0]);
  const withdraw = await me(privacyDesk, { action: "setConsent", purpose: "council_sharing", granted: false, language: "en" });
  assert.equal(withdraw.status, 200);
  assert.equal(records.Consent.length, 2, "the withdrawal is a second row");
  assert.deepEqual(records.Consent[0], first, "the original grant is untouched");
  assert.equal(records.Consent[0].language, "sw");
  assert.equal(records.Consent[1].language, "en");
  const summary = await me(privacyDesk, { action: "summary" });
  const sharing = summary.body.purposes.find((p) => p.key === "council_sharing");
  assert.equal(sharing.granted, false, "the latest choice is what counts");
});

test("a later withdrawal overrides an earlier grant when the council desk decides what to show", () => {
  const rows = [
    { subject_id: "L1", purpose: "council_sharing", granted: true, created_date: "2026-11-01T00:00:00Z" },
    { subject_id: "L1", purpose: "council_sharing", granted: false, created_date: "2026-11-02T00:00:00Z" },
    { subject_id: "L2", purpose: "council_sharing", granted: true, created_date: "2026-11-02T00:00:00Z" },
  ];
  const latest = latestBySubject(rows);
  assert.equal(latest.L1.granted, false);
  assert.equal(latest.L2.granted, true);
});

test("consent rows cannot be written from the browser", () => {
  const spec = readFileSync(new URL("../base44/entities/Consent.jsonc", import.meta.url), "utf8");
  assert.match(spec, /"create": false/);
  assert.match(spec, /"update": false/);
  const desk = readFileSync(new URL("../base44/functions/privacyDesk/entry.ts", import.meta.url), "utf8");
  assert.doesNotMatch(desk, /Consent\.update\(/, "the privacy desk never edits a consent row");
});
