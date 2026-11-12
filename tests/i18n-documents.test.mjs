// Language switching must change the interface only. Signed documents and accepted
// consent records keep the wording they were saved or accepted with.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function documentRegions(source) {
  const regions = [];
  const re = /i18n-document-start[\s\S]*?i18n-document-end/g;
  let match;
  while ((match = re.exec(source))) regions.push(match[0]);
  return regions;
}

test("signed lease clauses render from the stored lease, never from the interface language", () => {
  const source = read("src/components/rent/lease/LeaseDocument.jsx");
  const [region] = documentRegions(source);
  assert.ok(region, "LeaseDocument marks its clause list as a document region");
  assert.match(region, /\{clause\.en\}/);
  assert.match(region, /\{clause\.sw\}/);
  assert.doesNotMatch(region, /\bt\(\s*['"`]leaseDoc\.clause/, "clauses are not looked up in translation files");
  assert.doesNotMatch(region, /\[lang\]|lang ===/, "clause text does not branch on the screen language");
  assert.match(source, /const clauses = terms\.clauses \|\| \[\]/, "clauses come from the saved lease terms");
});

test("the printable certificate keeps its fixed wording in a document region", () => {
  const source = read("src/pages/rent/certificate/Own.jsx");
  const regions = documentRegions(source);
  assert.equal(regions.length, 1);
  assert.doesNotMatch(regions[0], /\[lang\]|lang ===/);
});

test("the selected language is remembered on this device and restored on reload", () => {
  const prefs = read("src/lib/prefs.js");
  assert.match(prefs, /lang: 'ibmt\.pref\.lang'/);
  assert.match(prefs, /setLang: \(lang\) => write\(KEYS\.lang/);
  const context = read("src/i18n/I18nContext.jsx");
  assert.match(context, /useState\(\(\) => prefs\.getLang\(\)\)/, "the provider starts from the stored choice");
  assert.match(context, /prefs\.setLang\(value\)/, "a switch is written back before re-rendering");
  assert.match(context, /document\.documentElement\.lang = lang/, "the page language attribute follows the choice");
});

test("every consent capture sends the wording version and the language shown", () => {
  for (const path of ["src/pages/rent/Join.jsx", "src/components/rent/registration/RegistrationWizard.jsx"]) {
    const source = read(path);
    assert.match(source, /language: lang, text_version: CONSENT_TEXT_VERSION/, path);
  }
  const payout = read("src/components/money/Stage2PayoutPanel.jsx");
  assert.match(payout, /consent_language: lang, consent_text_version: CONSENT_TEXT_VERSION/);
  assert.match(payout, /"withdraw", \{ acknowledged: true, language: lang \}/);
});

test("the server records the accepted language with each consent and never rewrites it", () => {
  const cases = [
    ["base44/functions/landlordRegister/entry.ts", /language: \['sw', 'en'\]\.includes\(consent\.language\)/],
    ["base44/functions/registerUnit/entry.ts", /language: \['sw', 'en'\]\.includes\(consent\.language\)/],
    ["base44/functions/stage2Payout/entry.ts", /consent_language: \["sw", "en"\]\.includes\(input\.consent_language\)/],
    ["base44/functions/stage2Payout/entry.ts", /disclosure_language: \["sw", "en"\]\.includes\(input\.language\)/],
  ];
  for (const [path, pattern] of cases) assert.match(read(path), pattern, path);
  for (const entity of ["Consent", "PayoutAccountChange"]) {
    const spec = read(`base44/entities/${entity}.jsonc`);
    assert.match(spec, /"create":\s*false/, `${entity} rows are written by the server only`);
    assert.match(spec, /"update":\s*false/, `${entity} rows are never edited`);
  }
});
