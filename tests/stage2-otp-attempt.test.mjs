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

const { attemptOtp, hashOtp } = await import("../base44/shared/registration.ts");
const { checkOtp } = await import("../base44/shared/r7.ts");
const payout = (await import("../base44/functions/stage2Payout/entry.ts")).default;

// Found on the hosted test app (2026-11-12): five simultaneous approvals of SIM-001
// nomination …69964d with one single-use code (challenge …670907) all returned 200.
const tick = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 4));
const matches = (row, query) => Object.entries(query).every(([k, v]) => (v === null ? row[k] == null : row[k] === v));

function store(rows) {
  let sequence = 0;
  const records = rows;
  const entity = (name) => ({
    get: async (id) => {
      await tick();
      const row = (records[name] ||= []).find((r) => r.id === id);
      if (!row) throw Object.assign(Error("Not found"), { status: 404 });
      return { ...row };
    },
    filter: async (query = {}, sort, limit = 100, skip = 0) => {
      await tick();
      return (records[name] ||= []).filter((r) => matches(r, query)).slice(skip, skip + limit).map((r) => ({ ...r }));
    },
    create: async (data) => {
      await tick();
      const row = { ...data, id: `${name}-${++sequence}`, created_date: new Date(Date.now() + sequence).toISOString() };
      (records[name] ||= []).push(row);
      return { ...row };
    },
    update: async (id, data) => {
      await tick();
      const row = records[name].find((r) => r.id === id);
      Object.assign(row, data);
      return { ...row };
    },
    // One atomic step per call, as measured on hosted.
    updateMany: async (query, change) => {
      await tick();
      const hits = (records[name] ||= []).filter((r) => matches(r, query));
      for (const row of hits) Object.assign(row, change.$set);
      return { success: true, updated: hits.length };
    },
  });
  return { records, entities: new Proxy({}, { get: (_, name) => entity(name) }) };
}

async function challenge(code = "123456", extra = {}) {
  const salt = "sim-salt";
  return {
    id: "otp1",
    salt,
    code_hash: await hashOtp(salt, code),
    attempts: 0,
    expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
    ...extra,
  };
}

test("one correct code succeeds once, however many requests carry it at the same moment", async () => {
  const { records, entities } = store({ OtpChallenge: [await challenge()] });
  const row = records.OtpChallenge[0];
  const results = await Promise.all(Array.from({ length: 8 }, () => attemptOtp(entities.OtpChallenge, { ...row }, "123456")));
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => r.reason)));
  assert.ok(records.OtpChallenge[0].consumed_at);
  const later = await attemptOtp(entities.OtpChallenge, { ...records.OtpChallenge[0] }, "123456");
  assert.equal(later.ok, false);
  assert.equal(later.reason, "already_used");
});

test("parallel wrong guesses cannot share one attempt, and the limit still locks the code", async () => {
  const { records, entities } = store({ OtpChallenge: [await challenge()] });
  const snapshot = { ...records.OtpChallenge[0] };
  const burst = await Promise.all(Array.from({ length: 20 }, (_, i) => attemptOtp(entities.OtpChallenge, snapshot, String(200000 + i))));
  assert.equal(burst.filter((r) => r.reason === "mismatch").length, 1, "only one guess of the burst is judged");
  assert.equal(records.OtpChallenge[0].attempts, 1);

  for (let i = 0; i < 4; i++) await attemptOtp(entities.OtpChallenge, { ...records.OtpChallenge[0] }, "999999");
  assert.equal(records.OtpChallenge[0].attempts, 5);
  assert.ok(records.OtpChallenge[0].locked_until, "fifth wrong attempt locks the code");
  const right = await attemptOtp(entities.OtpChallenge, { ...records.OtpChallenge[0] }, "123456");
  assert.equal(right.ok, false);
  assert.equal(right.reason, "locked");
  assert.equal(records.OtpChallenge[0].consumed_at, undefined);
});

test("expired codes are refused without spending an attempt; plain-code flows use the same guard", async () => {
  const { records, entities } = store({ OtpChallenge: [await challenge("123456", { expires_at: new Date(Date.now() - 1000).toISOString() })] });
  const expired = await attemptOtp(entities.OtpChallenge, { ...records.OtpChallenge[0] }, "123456");
  assert.equal(expired.reason, "expired");
  assert.equal(records.OtpChallenge[0].attempts, 0);

  const plain = store({ OtpChallenge: [{ id: "otp1", code: "654321", attempts: 0, expires_at: new Date(Date.now() + 60000).toISOString() }] });
  const check = async (args) => checkOtp(args);
  const row = { ...plain.records.OtpChallenge[0] };
  const results = await Promise.all(Array.from({ length: 5 }, () => attemptOtp(plain.entities.OtpChallenge, row, "654321", { check })));
  assert.equal(results.filter((r) => r.ok).length, 1);
});

test("stage2Payout: five simultaneous approvals with one code record one approval", async () => {
  const owners = [
    { owner_id: "L1", contact_phone: "0700000101" },
    { owner_id: "J1", contact_phone: "0700000102" },
  ];
  const { records, entities } = store({
    Property: [{ id: "P1", landlord_id: "L1" }],
    PayoutAccountChange: [
      { id: "R1", property_id: "P1", record_kind: "verified_roster", owners, created_date: "2026-11-12T00:00:00.000Z" },
      {
        id: "N1", property_id: "P1", record_kind: "nomination", roster_id: "R1", status: "requested",
        account_type: "mobile_money", account_number: "0712000222", name_check: "mismatch", consent: true,
        cooling_off_hours: 48, created_date: "2026-11-12T01:00:00.000Z",
      },
    ],
    OtpChallenge: [{ ...(await challenge()), subject_id: "L1", subject_ref: "N1", purpose: "joint_payout" }],
  });
  globalThis.stage2TestClient = { auth: { me: async () => ({ id: "L1", role: "user" }) }, entities, asServiceRole: { entities } };
  const approve = () =>
    payout(new Request("http://local/fn", {
      method: "POST",
      body: JSON.stringify({ action: "approve", property_id: "P1", id: "N1", challenge_id: "otp1", code: "123456" }),
    })).then(async (res) => ({ status: res.status, body: await res.json() }));

  const results = await Promise.all(Array.from({ length: 5 }, approve));
  assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => r.body.code || r.status)));
  assert.ok(results.filter((r) => r.status !== 200).every((r) => ["OTP_BUSY", "OTP_INVALID"].includes(r.body.code)));
  assert.equal(records.PayoutAccountChange.filter((r) => r.record_kind === "owner_approval").length, 1);
  const nomination = records.PayoutAccountChange.find((r) => r.id === "N1");
  assert.deepEqual(nomination.approvals, [{ owner_id: "L1" }]);
  assert.equal(nomination.cooling_off_ends_at, undefined, "one of two owners is not enough");
});

test("no function judges a code and writes the counter back outside attemptOtp", () => {
  for (const fn of ["stage2Payout", "confirmRegistrationOtp", "portalAccess", "moneyControl"]) {
    const source = readFileSync(new URL(`../base44/functions/${fn}/entry.ts`, import.meta.url), "utf8");
    assert.match(source, /attemptOtp\(/, `${fn} uses attemptOtp`);
    assert.doesNotMatch(source, /OtpChallenge\.update\(challenge\.id,\s*\{\s*attempts/, `${fn} still writes attempts back`);
  }
});
