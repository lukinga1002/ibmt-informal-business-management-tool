import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const en = JSON.parse(read("src/i18n/en.json"));
const sw = JSON.parse(read("src/i18n/sw.json"));
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const enKeys = new Map(flat(en));
const swKeys = new Map(flat(sw));

/** Every screen reachable in this release: routes not parked behind a ModuleGate, and what they import. */
export function releaseScreens() {
  const app = read("src/App.jsx");
  const imports = {};
  for (const m of app.matchAll(/import\s+(\w+)\s+from\s+'@\/([^']+)'/g)) imports[m[1]] = m[2];
  const routes = [...app.matchAll(/<Route\s+path="[^"]+"\s+element=\{(.*?)\}\s*\/>/g)].map((m) => m[1]);
  const start = new Set();
  for (const el of routes.filter((r) => !/ModuleGate/.test(r))) for (const m of el.matchAll(/<(\w+)/g)) if (imports[m[1]]) start.add(imports[m[1]]);
  for (const [name, p] of Object.entries(imports)) if (/Layout|Shell|Nav|Header|Footer|Guard|Gate/.test(name)) start.add(p);
  const resolve = (spec, from) => {
    const base = spec.startsWith("@/") ? join(root, "src", spec.slice(2)) : join(dirname(from), spec);
    for (const ext of ["", ".jsx", ".js", "/index.jsx", "/index.js"]) {
      const f = base + ext;
      if (existsSync(f) && statSync(f).isFile()) return f;
    }
    return null;
  };
  const seen = new Set();
  const stack = [...start].map((c) => resolve(`@/${c}`, join(root, "src/App.jsx"))).filter(Boolean);
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of readFileSync(f, "utf8").matchAll(/from\s+'([@.][^']+)'/g)) {
      const r = resolve(m[1], f);
      if (r && /\.jsx?$/.test(r) && !seen.has(r)) stack.push(r);
    }
  }
  return [...seen].filter((f) => f.endsWith(".jsx")).map((f) => f.slice(root.length + 1).replace(/\\/g, "/"));
}

// Text that is the same in both languages: brand names, units, codes, symbols.
const NEUTRAL = /^(IBMT|IBMT KODI|TZS|SMS|OTP|QR|USSD|GePG|SIM|PDPA|PDF|OK|EN|SW|Makazi|\W|\d|[·•|–—\-/:,.()%*#+&]|\s)+$/;

/** Literal user-facing text left in a screen file (line number and text). */
export function literalText(source) {
  const found = [];
  const lines = source.split("\n");
  // An inline pair { en: '…', sw: '…' } (rendered with tt()) is translated text,
  // but only when both languages are present: a lone en or sw value stays flagged.
  const EN_SW = /\{\s*en:\s*(['"`])(?:(?!\1)[^\\\n]|\\.)*\1\s*,\s*sw:\s*(['"`])(?:(?!\2)[^\\\n]|\\.)*\2\s*,?\s*\}/g;
  const SW_EN = /\{\s*sw:\s*(['"`])(?:(?!\1)[^\\\n]|\\.)*\1\s*,\s*en:\s*(['"`])(?:(?!\2)[^\\\n]|\\.)*\2\s*,?\s*\}/g;
  const blank = (m) => m.replace(/[^\n]/g, " ");
  // A file may opt out only with a stated reason: `// i18n-ignore-file: <why>`.
  if (/\/\/\s*i18n-ignore-file:\s*\S{5,}/.test(source)) return [];
  source = source
    // A document (certificate, lease text) keeps its own fixed wording whatever
    // the screen language; it must be marked as such, start and end.
    .replace(/\{\/\*\s*i18n-document-start:[^*]*\*\/\}[\s\S]*?\{\/\*\s*i18n-document-end\s*\*\/\}/g, blank)
    .replace(/\bconsole\.\w+\([^\n]*\)/g, blank) // developer diagnostics, never shown
    .replace(/\bthrow new Error\((['"`])[^\n]*?\1\)/g, blank); // programming errors (misused hooks), never shown
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(EN_SW, blank)
    .replace(SW_EN, blank);
  const lineOf = (index) => code.slice(0, index).split("\n").length;
  // JSX text between tags.
  // JSX text runs from a tag's ">" to the next tag or {expression}; the ">" of
  // an arrow function (=>) or a comparison is not a tag.
  for (const m of code.matchAll(/(?<![=\-])>([^<>{}]*[A-Za-zÀ-ÿ][^<>{}]*)(?=<|\{)/g)) {
    const text = m[1].trim();
    if (!text || NEUTRAL.test(text)) continue;
    if (/^[\w.]+\s*=>|&&|\?\s|=>|\(\)/.test(text)) continue; // code fragments, not text
    if (/^[\w$]*[.$_][\w$.]*$/.test(text)) continue; // an identifier from code such as `a.length < 2` (single words are text)
    if (/===|!==|\)\);|\breturn \(/.test(text)) continue; // spans of code between `=>` and `<`
    // Code between a closing tag and the next {: `))`, `x.displayName = y`, `0) return;`, `cards: (`.
    if (/^\)|\)\)|[=;]|^\w+:\s*\($|\bconst\b|\bawait\b/.test(text)) continue;
    found.push(`${lineOf(m.index)}: ${text}`);
  }
  // User-facing string props.
  for (const m of code.matchAll(/\b(title|label|description|placeholder|lede|kicker|aria-label|alt|caption|hint|note)="([^"]*[A-Za-z][^"]*)"/g)) {
    if (NEUTRAL.test(m[2])) continue;
    found.push(`${lineOf(m.index)}: ${m[1]}="${m[2]}"`);
  }
  // Combined bilingual labels in string literals, e.g. 'Jengo / Property'.
  for (const m of code.matchAll(/(['"`])([^'"`\n]*[a-z]{2,} \/ [A-Z][a-z][^'"`\n]*)\1/g)) found.push(`${lineOf(m.index)}: combined ${m[2]}`);
  // Natural-language string literals anywhere else in the screen (ternaries,
  // constants, toasts). Class lists, imports, routes and keys are not text.
  const stripped = code
    .replace(/className=(?:"[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g, "")
    .replace(/\b(?:cn|clsx|cva)\([^)]*\)/g, "")
    .replace(/^import .*$/gm, "");
  // Code inside ${…} is not text: remove it (balanced) before judging a template string.
  const withoutExpressions = (value) => {
    let out = "";
    for (let i = 0, depth = 0; i < value.length; i++) {
      if (value[i] === "$" && value[i + 1] === "{" && depth === 0) { depth = 1; i++; continue; }
      if (depth) { if (value[i] === "{") depth++; else if (value[i] === "}") depth--; continue; }
      out += value[i];
    }
    return out;
  };
  for (const m of stripped.matchAll(/(['"`])((?:(?!\1)[^\n\\])*)\1/g)) {
    const text = m[1] === "`" ? withoutExpressions(m[2]) : m[2];
    if (!/[A-Za-zÀ-ÿ]/.test(text) || /^(\/|@\/|https?:|mailto:|#|\.\.?\/)/.test(text)) continue;
    if (/^[a-z][a-zA-Z0-9_.]*$/.test(text)) continue; // keys, identifiers, statuses
    const words = text.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]{2,}[.,!?…:;)]*$/.test(w));
    if (words.length < 2 || NEUTRAL.test(text)) continue;
    const cssLike = text.split(/\s+/).every((w) => /[-:[\]]/.test(w) || /^[a-z]+$/.test(w)) && !/[A-Z.!?…]/.test(text);
    if (cssLike) continue;
    found.push(`${lineOf(code.indexOf(m[0]))}: '${text.slice(0, 70)}'`);
  }
  return found.filter((x, i, all) => all.indexOf(x) === i).filter(() => lines.length);
}

test("English and Swahili have the same keys and no empty text", () => {
  const missingSw = [...enKeys.keys()].filter((k) => !swKeys.has(k));
  const missingEn = [...swKeys.keys()].filter((k) => !enKeys.has(k));
  assert.deepEqual(missingSw, [], "keys missing in sw.json");
  assert.deepEqual(missingEn, [], "keys missing in en.json");
  for (const [k, v] of [...enKeys, ...swKeys]) assert.ok(typeof v === "string" && v.trim(), `empty value: ${k}`);
});

test("no translation mixes both languages in one string", () => {
  for (const [k, v] of [...enKeys, ...swKeys]) assert.doesNotMatch(v, /\b[A-Za-z]{3,} \/ [A-Z][a-z]{2,}\b/, `combined text in ${k}: ${v}`);
});

test("every backend error code has a message in both languages", () => {
  const codes = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const p = `${dir}/${name}`;
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (p.endsWith(".ts")) {
        const s = read(p);
        for (const m of s.matchAll(/fail\(\s*\d{3}\s*,\s*["']([A-Z_]{3,})["']/g)) codes.add(m[1]);
        for (const m of s.matchAll(/this\.code\s*=\s*["']([A-Z_]+)["']/g)) codes.add(m[1]);
        for (const m of s.matchAll(/ClaimBusyError\([\s\S]*?["']([A-Z][A-Z_]{4,})["']\s*,?\s*\)/g)) codes.add(m[1]);
      }
    }
  };
  walk("base44");
  const missing = [...codes].filter((c) => !enKeys.has(`errors.${c}`) || !swKeys.has(`errors.${c}`));
  assert.deepEqual(missing, []);
});

test("every translation key used on a release screen exists", () => {
  const missing = [];
  for (const file of releaseScreens()) {
    for (const m of read(file).matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!enKeys.has(m[1]) || !swKeys.has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

// Ratchet while the translation pass is in progress: the number of untranslated
// strings on release screens may only go down. The release requires 0.
const UNTRANSLATED_BUDGET = 312;

test("release screens carry no more hard-coded or combined-language text than the budget", () => {
  const problems = [];
  for (const file of releaseScreens()) for (const hit of literalText(read(file))) problems.push(`${file}:${hit}`);
  const sample = problems.slice(0, 40).join(String.fromCharCode(10));
  assert.ok(problems.length <= UNTRANSLATED_BUDGET, `${problems.length} untranslated strings (budget ${UNTRANSLATED_BUDGET}): ${sample}`);
});

test("release gate: no untranslated strings remain", { skip: process.env.RELEASE_GATE !== "1" }, () => {
  const problems = [];
  for (const file of releaseScreens()) for (const hit of literalText(read(file))) problems.push(`${file}:${hit}`);
  assert.deepEqual(problems, []);
});
