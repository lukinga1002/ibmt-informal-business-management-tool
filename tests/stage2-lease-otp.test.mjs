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

// Found in review (2026-11-12): the lease signing code sat in plain text on the
// Lease record (readable by both parties), came from Math.random, had no attempt
// limit, and a second party's request overwrote the first party's code.
const tick = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
function matches(row, query) {
  return Object.entries(query).every(([k, v]) => {
    if (v && typeof v === "object" && "$in" in v) return v.$in.includes(row[k]);
    return v === null ? row[k] == null : row[k] === v;
  });
}

function world() {
  const records = {
    Lease: [{
      id: "LE1", lease_ref: "SIM-LEASE-1", unit_id: "U1", unit_ref: "SIM-UNIT-1", landlord_id: "L1", tenant_id: "T1",
      status: "awaiting_signature", signatures: [], rent_amount: 100000,
      otp: { party: "tenant", code: "111111", expires_at: new Date(Date.now() + 600000).toISOString() },
    }],
    OtpChallenge: [],
    Tenancy: [{ id: "TN1", unit_id: "U1", status: "pending", landlord_id: "L1", tenant_id: "T1" }],
    RentalUnit: [{ id: "U1", council_id: "C1" }],
    Council: [{ id: "C1", rent_stage: "stage1" }],
  };
  let sequence = 0;
  const entity = (name) => ({
    get: async (id) => {
      await tick();
      const row = (records[name] ||= []).find((r) => r.id === id);
      if (!row) throw Object.assign(Error("Not found"), { status: 404 });
      return structuredClone(row);
    },
    filter: async (query = {}, sort, limit = 50) => {
      await tick();
      const rows = (records[name] ||= []).filter((r) => matches(r, query)).map((r) => structuredClone(r));
      return sort && typeof sort === "object" ? { items: rows.slice(0, sort.limit || 50) } : rows.slice(0, limit);
    },
    create: async (data) => {
      await tick();
      const row = { ...data, id: `${name}-${++sequence}`, created_date: new Date().toISOString() };
      (records[name] ||= []).push(row);
      return structuredClone(row);
    },
    update: async (id, data) => {
      await tick();
      const row = records[name].find((r) => r.id === id);
      Object.assign(row, structuredClone(data));
      return structuredClone(row);
    },
    updateMany: async (query, change) => {
      await tick();
      const hits = (records[name] ||= []).filter((r) => matches(r, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
  });
  const entities = new Proxy({}, { get: (_, name) => entity(name) });
  const users = {
    L1: { id: "L1", role: "user", full_name: "SIM Landlord", data: { phone: "0700000101" } },
    T1: { id: "T1", role: "user", full_name: "SIM Tenant", data: { phone: "0700000102" } },
  };
  return { records, entities, users };
}

function as(state, userId) {
  return async (body) => {
    globalThis.stage2TestClient = {
      auth: { me: async () => state.users[userId] },
      entities: state.entities,
      asServiceRole: { entities: state.entities },
    };
    const res = await lease(new Request("http://local/fn", { method: "POST", body: JSON.stringify({ lease_id: "LE1", ...body }) }));
    return { status: res.status, body: await res.json() };
  };
}

test("a signing code never sits on the lease, and an old stored code no longer signs", async () => {
  const state = world();
  const tenant = as(state, "T1");
  const legacy = await tenant({ action: "sign", code: "111111" });
  assert.equal(legacy.status, 409);
  assert.equal(legacy.body.code, "NO_CHALLENGE");
  const issued = await tenant({ action: "request" });
  assert.equal(issued.status, 200);
  assert.ok(issued.body.challenge_id);
  assert.equal(state.records.Lease[0].otp, null, "legacy code cleared");
  assert.doesNotMatch(JSON.stringify(state.records.Lease[0]), new RegExp(issued.body.otp.code));
  const stored = state.records.OtpChallenge[0];
  assert.equal(stored.code, undefined);
  assert.ok(stored.code_hash && stored.salt);
  assert.equal(stored.subject_ref, "LE1:tenant");
});

test("five wrong codes lock the challenge; the right code is then refused", async () => {
  const state = world();
  const tenant = as(state, "T1");
  const issued = await tenant({ action: "request" });
  const wrong = issued.body.otp.code === "000000" ? "000001" : "000000";
  const replies = [];
  for (let i = 0; i < 5; i++) replies.push(await tenant({ action: "sign", challenge_id: issued.body.challenge_id, code: wrong }));
  assert.deepEqual(replies.map((r) => r.body.code), ["OTP_MISMATCH", "OTP_MISMATCH", "OTP_MISMATCH", "OTP_MISMATCH", "OTP_LOCKED"]);
  const right = await tenant({ action: "sign", challenge_id: issued.body.challenge_id, code: issued.body.otp.code });
  assert.equal(right.status, 423);
  assert.equal(state.records.Lease[0].signatures.length, 0);
});

test("parallel guesses cannot share an attempt", async () => {
  const state = world();
  const tenant = as(state, "T1");
  const issued = await tenant({ action: "request" });
  const guesses = Array.from({ length: 20 }, (_, i) => String(100000 + i)).filter((c) => c !== issued.body.otp.code);
  const replies = await Promise.all(guesses.map((code) => tenant({ action: "sign", challenge_id: issued.body.challenge_id, code })));
  const judged = replies.filter((r) => r.body.code === "OTP_MISMATCH").length;
  assert.equal(state.records.OtpChallenge[0].attempts, judged, "every judged guess is counted");
  assert.ok(judged <= 5);
});

test("a party cannot use the other party's code, and a used code cannot sign again", async () => {
  const state = world();
  const tenant = as(state, "T1");
  const landlord = as(state, "L1");
  const issued = await tenant({ action: "request" });
  const stolen = await landlord({ action: "sign", challenge_id: issued.body.challenge_id, code: issued.body.otp.code });
  assert.equal(stolen.status, 403);
  assert.equal(stolen.body.code, "WRONG_CHALLENGE");
  assert.equal(state.records.OtpChallenge[0].attempts, 0, "a refused party does not spend the owner's attempts");
  const ok = await tenant({ action: "sign", challenge_id: issued.body.challenge_id, code: issued.body.otp.code });
  assert.equal(ok.status, 200);
  const replay = await tenant({ action: "sign", challenge_id: issued.body.challenge_id, code: issued.body.otp.code });
  assert.equal(replay.status, 409);
});

test("both parties hold codes at once and signing at the same moment records both signatures", async () => {
  const state = world();
  const tenant = as(state, "T1");
  const landlord = as(state, "L1");
  const [t, l] = [await tenant({ action: "request" }), await landlord({ action: "request" })];
  const [ts, ls] = await Promise.all([
    tenant({ action: "sign", challenge_id: t.body.challenge_id, code: t.body.otp.code }),
    landlord({ action: "sign", challenge_id: l.body.challenge_id, code: l.body.otp.code }),
  ]);
  assert.ok([ts, ls].every((r) => r.status === 200), JSON.stringify([ts.body, ls.body]));
  const signed = state.records.Lease[0];
  assert.deepEqual(signed.signatures.map((s) => s.party).sort(), ["landlord", "tenant"]);
  assert.equal(signed.status, "signed");
  assert.equal(state.records.Tenancy[0].status, "active");
  assert.equal(signed.signing_lock, null);
});

test("code requests are rate limited per phone", async () => {
  const state = world();
  const tenant = as(state, "T1");
  const replies = [];
  for (let i = 0; i < 4; i++) replies.push(await tenant({ action: "request" }));
  assert.deepEqual(replies.map((r) => r.status), [200, 200, 200, 429]);
});

test("leaseSignature no longer makes or stores plain codes", () => {
  const source = readFileSync(new URL("../base44/functions/leaseSignature/entry.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.random\(/);
  assert.doesNotMatch(source, /otp:\s*\{\s*party,\s*code/);
  assert.match(source, /attemptOtp\(/);
});
