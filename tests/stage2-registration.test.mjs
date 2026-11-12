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

const register = (await import("../base44/functions/landlordRegister/entry.ts")).default;
const overview = (await import("../base44/functions/landlordOverview/entry.ts")).default;

const SIM_COUNCIL = { id: "sim", code: "SIM-TEST", region: "Synthetic test region", district: "Synthetic test district" };
const PILOT = { id: "pilot", code: "KIN", region: "Dar es Salaam", district: "Kinondoni" };

function matches(row, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (expected && typeof expected === "object") {
      if ("$regex" in expected) throw Object.assign(Error("string $regex unsupported by the local store"), { status: 500 });
      if ("$gte" in expected && !(row[key] >= expected.$gte)) return false;
      if ("$lt" in expected && !(row[key] < expected.$lt)) return false;
      return true;
    }
    if (expected === null) return row[key] == null; // hosted: null matches a missing field
    return row[key] === expected;
  });
}

/** An in-memory Base44 stand-in that rejects the cursor-page form the local store lacks. */
function world({ user: given, units = [], failures = {}, jitter = false } = {}) {
  const user = given ? { ...given, data: { ...given.data } } : null;
  const records = { Council: [SIM_COUNCIL, PILOT], Property: [], RentalUnit: [...units], User: [user], RentPayment: [], Tenancy: [], PolicyVersion: [], VerificationCase: [] };
  const writes = [];
  let sequence = 0;
  // With jitter, every call yields for a random moment so simultaneous requests interleave.
  const tick = () => (jitter ? new Promise((resolve) => setTimeout(resolve, Math.random() * 4)) : null);
  const handler = (name) => ({
    get: async (id) => {
      const row = (records[name] || []).find((r) => r.id === id);
      if (!row) throw Object.assign(Error("Not found"), { status: 404 });
      return row;
    },
    filter: async (query = {}, sort, limit = 50) => {
      await tick();
      if (sort && typeof sort === "object") throw Object.assign(Error("This app is private"), { status: 403 });
      let rows = (records[name] || []).filter((row) => matches(row, query));
      if (typeof sort === "string") {
        const field = sort.replace(/^-/, "");
        const dir = sort.startsWith("-") ? -1 : 1;
        rows = rows.slice().sort((a, b) => (a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0));
      }
      return rows.slice(0, limit);
    },
    create: async (data) => {
      await tick();
      const fail = failures[name];
      if (fail && fail(records[name].length)) throw Object.assign(Error("This app is private, You do not have access to this app"), { status: 500 });
      const row = { ...data, id: `${name}-${++sequence}`, created_date: new Date(Date.now() + sequence).toISOString() };
      records[name].push(row);
      writes.push(name);
      return row;
    },
    update: async (id, data) => {
      const fail = failures[`${name}.update`];
      if (fail && fail()) throw Object.assign(Error("upstream detail"), { status: 500 });
      const row = records[name].find((r) => r.id === id);
      Object.assign(row, data);
      writes.push(`${name}.update`);
      return row;
    },
    // One atomic step per call, as measured on hosted.
    updateMany: async (query, change) => {
      await tick();
      const hits = (records[name] || []).filter((row) => matches(row, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
    delete: async (id) => {
      await tick();
      records[name] = records[name].filter((row) => row.id !== id);
      writes.push(`${name}.delete`);
      return { success: true };
    },
  });
  const entities = new Proxy({}, { get: (_, name) => handler(name) });
  globalThis.stage2TestClient = {
    auth: { me: async () => { if (!user) throw Object.assign(Error("Unauthorized"), { status: 401 }); return user; } },
    entities,
    asServiceRole: { entities },
  };
  return { records, writes };
}

const landlord = { id: "L1", role: "user", full_name: "SIM Test Landlord", email: "sim.landlord@example.test", data: {} };
const body = (overrides = {}) => ({
  registration_key: "reg-0000aaaa-1111-2222-3333-444455556666",
  landlord_name: "SIM Test Landlord",
  phone: "0700000001",
  email: "",
  region: SIM_COUNCIL.region,
  district: SIM_COUNCIL.district,
  ward: "SIMULATION - Test Ward",
  council_id: "sim",
  street: "SIMULATION Test Street",
  house_no: "SIM-001",
  consent: { core: true },
  units: [
    { name: "SIM Unit A", rent_amount: 500000 },
    { name: "SIM Unit B", rent_amount: 500000 },
  ],
  ...overrides,
});
const call = async (fn, payload) => {
  const res = await fn(new Request("http://local/fn", { method: "POST", body: JSON.stringify(payload ?? {}) }));
  return { status: res.status, body: await res.json() };
};

test("an administrator cannot register property, and nothing is written", async () => {
  const admin = { id: "A1", role: "admin", data: {} };
  const { writes, records } = world({ user: admin });
  const res = await call(register, body());
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "ADMIN_NOT_LANDLORD");
  assert.deepEqual(writes, []);
  assert.deepEqual(records.User[0].data, {});
});

test("signed-out registration is a 401", async () => {
  world({ user: null });
  assert.equal((await call(register, body())).status, 401);
});

test("jurisdiction is checked before any write", async () => {
  for (const [payload, code] of [
    [body({ council_id: "missing" }), "COUNCIL_UNKNOWN"],
    [body({ council_id: "pilot" }), "JURISDICTION_MISMATCH"],
    [body({ ward: "Msasani" }), "JURISDICTION_MISMATCH"],
    [body({ registration_key: "" }), "VALIDATION"],
    [body({ consent: undefined }), "CONSENT_REQUIRED"],
    [body({ consent: { core: false, council_sharing: true } }), "CONSENT_REQUIRED"],
    [body({ units: [{ name: "SIM Unit A", rent_amount: 1 }, { name: "sim unit a", rent_amount: 1 }] }), "VALIDATION"],
  ]) {
    const { writes } = world({ user: landlord });
    const res = await call(register, payload);
    assert.equal(res.body.code, code);
    assert.deepEqual(writes, [], code);
  }
});

test("a unit-write failure is reported as retryable, sanitized, and a retry completes without duplicates", async () => {
  let failSecondUnit = true;
  const state = world({
    user: landlord,
    units: [{ id: "old", unit_ref: `IBMT-UNIT-${new Date().getFullYear()}-000007`, landlord_id: "other" }],
    failures: { RentalUnit: (count) => failSecondUnit && count === 2 },
  });

  const first = await call(register, body());
  assert.equal(first.status, 503);
  assert.equal(first.body.code, "REGISTRATION_INCOMPLETE");
  assert.equal(first.body.retryable, true);
  assert.equal(first.body.stage, "units");
  assert.equal(first.body.created_units, 1);
  assert.equal(first.body.expected_units, 2);
  assert.doesNotMatch(JSON.stringify(first.body), /private|access to this app|stack/i);
  assert.equal(state.records.Property.length, 1);
  assert.equal(state.records.RentalUnit.filter((u) => u.landlord_id === "L1").length, 1);

  failSecondUnit = false;
  const retry = await call(register, body());
  assert.equal(retry.status, 200);
  assert.equal(retry.body.resumed, true);
  assert.equal(state.records.Property.length, 1);
  const mine = state.records.RentalUnit.filter((u) => u.landlord_id === "L1");
  assert.deepEqual(mine.map((u) => u.unit_name).sort(), ["SIM Unit A", "SIM Unit B"]);
  const refs = retry.body.units.map((u) => u.unit_ref);
  assert.equal(new Set(refs).size, 2);
  const year = new Date().getFullYear();
  assert.deepEqual(refs.sort(), [`IBMT-UNIT-${year}-000008`, `IBMT-UNIT-${year}-000009`]);
  assert.equal(state.records.Property[0].council_id, "sim");
  assert.equal(state.records.User[0].data.ibmt_role, "landlord");
  assert.equal(state.records.User[0].data.council_id, "sim");

  // A third, identical submit is a no-op.
  const again = await call(register, body());
  assert.equal(again.status, 200);
  assert.equal(state.records.Property.length, 1);
  assert.equal(state.records.RentalUnit.filter((u) => u.landlord_id === "L1").length, 2);
});

test("a failure before the first write saves nothing and says so", async () => {
  const state = world({ user: landlord, failures: { Property: () => true } });
  const res = await call(register, body());
  assert.equal(res.status, 503);
  assert.equal(res.body.stage, "property");
  assert.equal(res.body.created_units, 0);
  assert.equal(state.records.Property.length, 0);
});

test("a profile-update failure is retryable and the retry finishes the profile only", async () => {
  let failProfile = true;
  const state = world({ user: landlord, failures: { "User.update": () => failProfile } });
  const first = await call(register, body());
  assert.equal(first.status, 503);
  assert.equal(first.body.stage, "profile");
  assert.equal(first.body.created_units, 2);
  failProfile = false;
  const retry = await call(register, body());
  assert.equal(retry.status, 200);
  assert.equal(state.records.Property.length, 1);
  assert.equal(state.records.RentalUnit.length, 2);
  assert.equal(state.records.User[0].data.ibmt_role, "landlord");
});

test("a registration key cannot be replayed by another user or with a different house", async () => {
  const state = world({ user: landlord });
  assert.equal((await call(register, body())).status, 200);
  assert.equal((await call(register, body({ house_no: "SIM-002" }))).body.code, "KEY_CONFLICT");
  state.records.User.push({ id: "L2", role: "user", data: {} });
  globalThis.stage2TestClient.auth.me = async () => ({ id: "L2", role: "user", data: {} });
  const other = await call(register, body());
  assert.equal(other.status, 409);
  assert.equal(other.body.code, "KEY_CONFLICT");
  assert.equal(state.records.Property.length, 1);
});

test("landlordOverview maps a signed-out session to 401 and never echoes upstream errors", async () => {
  world({ user: null });
  const signedOut = await call(overview);
  assert.equal(signedOut.status, 401);
  assert.equal(signedOut.body.code, "SESSION_EXPIRED");

  world({ user: landlord });
  globalThis.stage2TestClient.auth.me = async () => { throw Object.assign(Error("This app is private"), { status: 403 }); };
  const broken = await call(overview);
  assert.equal(broken.status, 500);
  assert.doesNotMatch(broken.body.message, /private/);
});

test("landlordOverview sums this month's recorded payments without the aggregate route", async () => {
  const state = world({ user: landlord });
  const month = new Date().toISOString().slice(0, 7);
  state.records.RentPayment.push(
    { id: "p1", landlord_id: "L1", paid_at: `${month}-01`, amount: 300000, withholding_amount: 0 },
    { id: "p2", landlord_id: "L1", paid_at: `${month}-02`, amount: 200000, withholding_amount: 0 },
    { id: "p3", landlord_id: "L2", paid_at: `${month}-02`, amount: 999, withholding_amount: 0 },
  );
  const res = await call(overview);
  assert.equal(res.status, 200);
  assert.equal(res.body.counters.find((c) => c.key === "collected").value, "TZS 500,000");
});

// Found on the hosted test app (2026-11-12): four simultaneous first submits
// with one key made two properties (…7a78, …bc11) whose units shared
// IBMT-UNIT-2026-94777020.
test("simultaneous first submits with one key make one property and unique unit references", async () => {
  const state = world({ user: landlord, jitter: true });
  const results = await Promise.all(Array.from({ length: 4 }, () => call(register, body())));
  for (const r of results) {
    assert.ok(r.status === 200 || (r.status === 409 && r.body.code === "REGISTRATION_IN_PROGRESS" && r.body.retryable), JSON.stringify(r.body));
  }
  assert.equal(state.records.Property.length, 1, "one property per registration key");
  const mine = state.records.RentalUnit.filter((u) => u.landlord_id === "L1");
  assert.deepEqual(mine.map((u) => u.unit_name).sort(), ["SIM Unit A", "SIM Unit B"]);
  assert.equal(new Set(mine.map((u) => u.unit_ref)).size, 2);
  assert.equal(state.records.Property[0].registration_lock, null, "claim released");
  const again = await call(register, body());
  assert.equal(again.status, 200);
  assert.deepEqual(again.body.units.map((u) => u.unit_ref).sort(), mine.map((u) => u.unit_ref).sort());
});

test("two landlords registering at the same moment never share a unit reference", async () => {
  const state = world({ user: landlord, jitter: true });
  const other = { id: "L2", role: "user", full_name: "SIM Second Landlord", data: {} };
  state.records.User.push(other);
  const as = (who, payload) => {
    globalThis.stage2TestClient = { ...globalThis.stage2TestClient, auth: { me: async () => who } };
    return call(register, payload);
  };
  const results = await Promise.all([
    as(landlord, body()),
    as(other, body({ registration_key: "reg-9999bbbb-1111-2222-3333-444455556666", house_no: "SIM-002" })),
  ]);
  assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.body.code)));
  const refs = state.records.RentalUnit.map((u) => u.unit_ref);
  assert.equal(refs.length, 4);
  assert.equal(new Set(refs).size, 4, `duplicate unit reference: ${refs}`);
});

test("a live registration claim makes a second submit wait, then report it is in progress", async () => {
  const state = world({ user: landlord });
  assert.equal((await call(register, body())).status, 200);
  state.records.Property[0].registration_lock = "other-request";
  state.records.Property[0].registration_lock_at = new Date().toISOString();
  const busy = await call(register, body());
  assert.equal(busy.status, 409);
  assert.equal(busy.body.code, "REGISTRATION_IN_PROGRESS");
  assert.equal(busy.body.retryable, true);
  assert.equal(state.records.Property[0].registration_lock, "other-request", "someone else's claim is never released");
});

// Found on the hosted test app (2026-11-12): units registered through /rent/join
// had no verification case, so no officer could decide them and they could
// never carry a lease or a Stage 2 payment.
test("every joined unit gets one verification case with the consent recorded", async () => {
  const state = world({ user: landlord });
  const res = await call(register, body({ consent: { core: true, council_sharing: false } }));
  assert.equal(res.status, 200);
  assert.equal(state.records.VerificationCase.length, 2);
  for (const unit of state.records.RentalUnit) {
    const found = state.records.VerificationCase.filter((c) => c.unit_id === unit.id);
    assert.equal(found.length, 1);
    assert.equal(found[0].status, "submitted");
    assert.equal(found[0].channel, "self");
    assert.equal(found[0].landlord_id, "L1");
    assert.equal(found[0].ward, "SIMULATION - Test Ward");
    assert.equal(found[0].consent.core, true);
    assert.equal(found[0].consent.council_sharing, false, "optional sharing stays off unless ticked");
    assert.equal(unit.verification_status, "pending");
  }
  assert.ok(res.body.units.every((u) => u.case_ref && u.case_status === "submitted"));
  const again = await call(register, body());
  assert.equal(again.status, 200);
  assert.equal(state.records.VerificationCase.length, 2, "a retry never opens a second case");
});

test("a retry opens the case a unit is missing (units joined before this fix)", async () => {
  const state = world({ user: landlord });
  assert.equal((await call(register, body())).status, 200);
  state.records.VerificationCase.splice(0, 1);
  const again = await call(register, body());
  assert.equal(again.status, 200);
  assert.equal(state.records.VerificationCase.length, 2);
  assert.equal(new Set(state.records.VerificationCase.map((c) => c.unit_id)).size, 2);
});

test("simultaneous submits open one case per unit", async () => {
  const state = world({ user: landlord, jitter: true });
  await Promise.all(Array.from({ length: 4 }, () => call(register, body())));
  assert.equal(state.records.VerificationCase.length, 2);
  assert.equal(new Set(state.records.VerificationCase.map((c) => c.unit_id)).size, 2);
});
