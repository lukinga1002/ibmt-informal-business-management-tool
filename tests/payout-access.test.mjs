import test from "node:test";
import assert from "node:assert/strict";
import { payoutPageAccess, verifiedOwnerPropertyCount } from "../src/lib/payoutAccess.js";

// Found on the hosted test app (2026-11-12): a joint owner on the verified
// roster of SIM-002 was refused the payout page because it allowed only the
// landlord role, so the approval they must give had no screen.
test("landlords and admins open the payout page as before", () => {
  assert.equal(payoutPageAccess({ user: { role: "user" }, role: "landlord" }), "allow");
  assert.equal(payoutPageAccess({ user: { role: "admin" }, role: null }), "allow");
});

test("a verified co-owner without the landlord role opens it; an unrelated user does not", () => {
  assert.equal(payoutPageAccess({ user: { role: "user" }, role: null, ownedPropertyCount: 1 }), "allow");
  assert.equal(payoutPageAccess({ user: { role: "user" }, role: null, ownedPropertyCount: 0 }), "deny");
  assert.equal(payoutPageAccess({ user: { role: "user" }, role: "council_official", ownedPropertyCount: 0 }), "deny");
  assert.equal(payoutPageAccess({ user: { role: "user" }, role: null, ownedPropertyCount: null }), "checking");
  assert.equal(payoutPageAccess({ user: null, role: null, ownedPropertyCount: 3 }), "deny");
});

test("only the server's verified-roster answer counts, and a failure denies", async () => {
  assert.equal(await verifiedOwnerPropertyCount(async () => ({ properties: [{ id: "p" }] })), 1);
  assert.equal(await verifiedOwnerPropertyCount(async () => ({ properties: [] })), 0);
  assert.equal(await verifiedOwnerPropertyCount(async () => { throw Error("403"); }), 0);
  assert.equal(await verifiedOwnerPropertyCount(async () => ({})), 0);
});
