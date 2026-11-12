import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The local `base44 dev` store (CLI 0.3.x) implements GET /Entity but not the
// cursor-page route used by filter(query, { ...options }) or list({ ... }), and it
// rejects string $regex. Unknown routes are forwarded to the hosted app, so those
// forms silently read hosted data with the user's session, or fail with
// "This app is private" under the local service role. Stage 2 paths must use
// the positional form: filter(query, sort, limit, skip).
const STAGE2_SERVER_FILES = [
  "base44/functions/landlordRegister/entry.ts",
  "base44/functions/landlordOverview/entry.ts",
  "base44/functions/simPayment/entry.ts",
  "base44/functions/moneyControl/entry.ts",
  "base44/functions/stage2Payout/entry.ts",
  "base44/functions/stage2Council/entry.ts",
  "base44/functions/councilSettlementTerms/entry.ts",
  "base44/shared/moneyOps.ts",
  "base44/shared/stage2Payout.ts",
  "base44/shared/councilFee.ts",
  "base44/shared/stage2Settlement.ts",
];

/** Every .filter( / .list( call whose argument after the query (or first argument for list) opens an object. */
function optionsFormCalls(source) {
  const found = [];
  const re = /\.(filter|list)\(/g;
  let match;
  while ((match = re.exec(source))) {
    let depth = 1, i = re.lastIndex, args = [""], inString = null;
    for (; i < source.length && depth > 0; i++) {
      const ch = source[i];
      if (inString) { if (ch === inString && source[i - 1] !== "\\") inString = null; args[args.length - 1] += ch; continue; }
      if (ch === "'" || ch === '"' || ch === "`") inString = ch;
      if ("([{".includes(ch)) depth++;
      if (")]}".includes(ch)) depth--;
      if (depth === 1 && ch === ",") { args.push(""); continue; }
      if (depth > 0) args[args.length - 1] += ch;
    }
    const optionsIndex = match[1] === "list" ? 0 : 1;
    if ((args[optionsIndex] || "").trim().startsWith("{")) {
      found.push(`${match[1]} @${source.slice(0, match.index).split("\n").length}`);
    }
  }
  return found;
}

test("Stage 2 server code uses only query forms the local store answers itself", () => {
  for (const file of STAGE2_SERVER_FILES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.deepEqual(optionsFormCalls(source), [], `${file} uses filter(query, { options }) or list({ options })`);
    assert.doesNotMatch(source, /\$regex/, `${file} uses $regex`);
  }
});

test("the scanner catches the options form, including across lines", () => {
  assert.equal(optionsFormCalls("db.X.filter({ a: 1 }, { limit: 1 })").length, 1);
  assert.equal(optionsFormCalls("db.X.filter(\n  { a: 1 },\n  { sort: '-x', limit: 2 },\n)").length, 1);
  assert.equal(optionsFormCalls("db.X.list({ limit: 5 })").length, 1);
  assert.equal(optionsFormCalls("db.X.filter({ a: 1 }, '-created_date', 1)").length, 0);
  assert.equal(optionsFormCalls("rows.filter((r) => r.a === 1)").length, 0);
});
