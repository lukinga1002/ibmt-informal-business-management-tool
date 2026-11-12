import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Found on the hosted test app at 375px (2026-11-12): the property picker sized
// itself to its longest option (1001px), so the whole payout page rendered at
// about 1038px wide on a phone.
test("the payout property picker is limited to its container width", () => {
  const source = readFileSync(new URL("../src/components/money/Stage2PayoutPanel.jsx", import.meta.url), "utf8");
  const select = source.match(/<select\s+className="([^"]*)"/);
  assert.ok(select, "property picker found");
  for (const cls of ["w-full", "max-w-full", "min-w-0"]) assert.ok(select[1].split(/\s+/).includes(cls), cls);
});

test("long bilingual payout buttons wrap instead of widening the page", () => {
  const source = readFileSync(new URL("../src/components/money/Stage2PayoutPanel.jsx", import.meta.url), "utf8");
  // Opening tags only, up to the first attribute line break or ">".
  const buttons = source.match(/<Button\s+className="[^"]*"/g) || [];
  assert.equal(buttons.length, (source.match(/<Button\b/g) || []).length, "every Button carries a className");
  assert.ok(buttons.length > 0);
  for (const tag of buttons) assert.match(tag, /whitespace-normal/, tag);
});
