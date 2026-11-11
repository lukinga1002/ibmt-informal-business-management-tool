import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const base = new URL(argument('--base-url', 'http://localhost:5173'));
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || !['http:', 'https:'].includes(base.protocol)) {
  throw Error('This runner only accepts a localhost application.');
}
const modulePath = argument('--playwright');
if (!modulePath) throw Error('Use scripts/Run-Stage2BrowserChecks.ps1 to start this runner.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const directory = await mkdtemp(join(tmpdir(), 'ibmt-stage2-qa-'));
await mkdir(join(directory, 'screenshots'));
const terminal = createInterface({ input: stdin, output: stdout });
const results = [];
const sessions = new Map();
const check = (name, state, detail = '') => {
  results.push({ name, state, detail });
  console.log(`${state.toUpperCase()}: ${name}${detail ? ' - ' + detail : ''}`);
};
let browser;
let councilId;
let propertyId;
let councilName;
const roles = ['admin', 'second-admin', 'landlord', 'joint-owner', 'unrelated-user', 'council-official', 'other-council-official'];

// SDK calls execute in the page's own origin and session. No token is printed,
// exported, or written to disk. Raw API bodies never enter the report.
async function sdk(page, operation, payload = {}) {
  return page.evaluate(async ({ operation, payload }) => {
    const { base44 } = await import('/src/api/base44Client.js');
    try {
      if (operation === 'identity') {
        const user = await base44.auth.me();
        return { status: 200, data: { id: user.id, role: user.role, ibmtRole: user.data?.ibmt_role, council: user.data?.council_id } };
      }
      if (operation === 'environment') {
        const { appParams } = await import('/src/lib/app-params.js');
        const { isLocalSimulation } = await import('/src/lib/localSimulation.js');
        return { status: 200, data: isLocalSimulation(true, location.href, appParams.appBaseUrl) };
      }
      if (operation === 'setup') {
        const { appParams } = await import('/src/lib/app-params.js');
        const { createLocalCouncil } = await import('/src/lib/localSimulation.js');
        const council = await createLocalCouncil(base44, [true, location.href, appParams.appBaseUrl]);
        return { status: 200, data: { id: council.id, name: council.name } };
      }
      if (operation === 'entity-read') {
        return { status: 200, data: await base44.entities[payload.entity].get(payload.id) };
      }
      const response = await base44.functions.invoke(operation, payload);
      return { status: response.status || 200, data: response.data };
    } catch (error) {
      return { status: error.status ?? error.response?.status ?? 0 };
    }
  }, { operation, payload });
}

async function enter(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(new URL('/login', base).href, { waitUntil: 'domcontentloaded' });
  console.log(`\nCHROME: sign in as ${role}. Return to ${base.origin}. Do not type credentials into PowerShell.`);
  await terminal.question('Press Enter here AFTER sign-in completes (or type nothing and continue to record a blocked check): ');
  if (new URL(page.url()).origin !== base.origin) {
    check(`${role}: sign-in`, 'blocked', 'Browser did not return to localhost. Google may reject automated-browser sign-in.');
    await context.close(); return;
  }
  const identity = await sdk(page, 'identity');
  if (identity.status !== 200) {
    check(`${role}: sign-in`, 'blocked', `Identity request returned ${identity.status}`);
    await context.close(); return;
  }
  const duplicate = [...sessions.values()].some((session) => session.user.id === identity.data.id);
  const correctRole = role.includes('admin') ? identity.data.role === 'admin' : identity.data.role !== 'admin';
  if (duplicate || !correctRole) {
    check(`${role}: independent identity`, 'fail', duplicate ? 'This account was already used for another role.' : 'Unexpected platform role.');
    await context.close(); return;
  }
  sessions.set(role, { context, page, user: identity.data });
  check(`${role}: sign-in`, 'pass');
}

async function expectStatus(page, name, operation, payload, expected) {
  const result = await sdk(page, operation, payload);
  check(name, expected.includes(result.status) ? 'pass' : 'fail', `HTTP ${result.status}; expected ${expected.join('/')}`);
  return result;
}

async function screenshot(page, locator, name) {
  if (!await locator.isVisible().catch(() => false)) {
    check(`${name}: visible panel`, 'blocked', 'Required panel or synthetic record is missing.'); return;
  }
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await locator.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await locator.screenshot({ path: join(directory, 'screenshots', `${name}-${width}.png`), animations: 'disabled' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check(`${name} at ${width}px: page overflow`, overflow ? 'fail' : 'pass');
    check(`${name} at ${width}px: screenshot`, 'pass', 'Captured for human visual review; not a visual approval.');
  }
}
const section = (page, heading) => page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) }).first();

try {
  console.log('IBMT STAGE 2 - LOCAL SYNTHETIC DATA ONLY');
  console.log('The runner may explicitly create a fictional council and placeholder policy. It does not approve fees, send OTPs, move money, or record authentication files.');
  console.log(`Results: ${directory}`);
  browser = await chromium.launch({ channel: argument('--channel', 'chrome'), headless: false });
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(base.origin, { waitUntil: 'domcontentloaded' });
  await anonymousPage.getByRole('heading', { level: 1 }).first().waitFor();
  check('Public landing stays on localhost without login', new URL(anonymousPage.url()).origin === base.origin ? 'pass' : 'fail');
  for (const name of ['stage2Payout', 'stage2Council', 'councilSettlementTerms']) {
    await expectStatus(anonymousPage, `Anonymous denied by ${name}`, name,
      { action: 'read', council_id: 'qa-nonexistent', property_id: 'qa-nonexistent' }, [401, 403]);
  }
  await anonymous.close();
  await enter('admin');
  const admin = sessions.get('admin');
  if (!admin) throw Error('Administrator sign-in is required to continue. No authentication bypass is attempted.');
  if (!(await sdk(admin.page, 'environment')).data) throw Error('The configured API is not a local backend.');
  const setup = await sdk(admin.page, 'setup');
  if (setup.status !== 200) throw Error(`Local fixture setup returned HTTP ${setup.status}`);
  councilId = setup.data.id; councilName = setup.data.name;
  const properties = await sdk(admin.page, 'stage2Payout', { action: 'properties' });
  const synthetic = (properties.data?.properties || []).filter((property) => /SIM|TEST|MAJARIBIO/i.test(`${property.name} ${property.property_ref}`));
  console.log(`Fictional properties found: ${synthetic.length}`);
  propertyId = synthetic[0]?.id;
  if (synthetic.length > 1) {
    console.log(synthetic.map((property, index) => `${index + 1}: ${property.name}`).join('\n'));
    const selected = Number(await terminal.question('Choose the fictional property number (blank uses first): '));
    propertyId = synthetic[(selected || 1) - 1]?.id;
  }
  for (const role of roles.slice(1)) {
    const answer = await terminal.question(`Do you have a separate synthetic ${role} test account ready? [y/N] `);
    if (answer.trim().toLowerCase() === 'y') await enter(role);
    else check(`${role}: permission coverage`, 'blocked', 'Separate test account not supplied.');
  }
  await admin.page.goto(new URL('/rent/sim', base).href);
  const terms = section(admin.page, /Council terms/);
  await terms.getByLabel(/Halmashauri/).selectOption(councilId);
  await terms.getByText(/Proposed fee|Approved/).first().waitFor();
  await screenshot(admin.page, terms, 'council-terms');
  const bills = section(admin.page, /Council fees, bills and invoices/);
  await bills.getByLabel(/Halmashauri/).selectOption(councilId);
  await bills.getByRole('button', { name: /Reconcile/ }).waitFor();
  await screenshot(admin.page, bills, 'council-fees');
  const councilRead = await sdk(admin.page, 'stage2Council', { action: 'read', council_id: councilId });
  if (!councilRead.data?.invoices?.length) check('Council invoice screenshot', 'blocked', 'No issued synthetic invoice exists; an empty panel is not invoice evidence.');
  else await screenshot(admin.page, bills, 'council-invoice-panel');
  const payments = await sdk(admin.page, 'simPayment', { action: 'ledger' });
  const payment = payments.data?.payments?.find((row) => row.stage === 'stage2_partner' && row.state === 'succeeded');
  if (!payment) check('Stage 2 receipt screenshot', 'blocked', 'No succeeded Stage 2 synthetic payment exists.');
  else {
    const paymentPanel = section(admin.page, /Simulated payments|Malipo ya majaribio/);
    await screenshot(admin.page, paymentPanel.locator('li').filter({ hasText: payment.reference }).first(), 'stage2-receipt');
  }
  for (const [role, session] of sessions) {
    const { page, user } = session;
    const isCouncil = role === 'council-official' || role === 'other-council-official';
    if (isCouncil && (user.ibmtRole !== 'council_official' || (role === 'council-official' ? user.council !== councilId : user.council === councilId))) {
      check(`${role}: council assignment`, 'fail', 'Account jurisdiction does not match the requested test role.'); continue;
    }
    const feeAllowed = role.includes('admin') || role === 'council-official';
    for (const name of ['stage2Council', 'councilSettlementTerms']) {
      const response = await expectStatus(page, `${role}: ${name} read scope`, name,
        { action: 'read', council_id: councilId }, feeAllowed ? [200] : [403]);
      if (name === 'stage2Council' && role === 'council-official' && response.status === 200) {
        const exposed = (response.data?.settlements || []).some((row) => 'account_number' in row || 'landlord_amount' in row || 'income' in row);
        check('Council summary excludes payout account and private income', exposed ? 'fail' : 'pass');
      }
    }
    if (!role.includes('admin')) {
      await expectStatus(page, `${role}: council writes denied`, 'stage2Council', { action: 'batch', council_id: councilId, day: 'invalid' }, [403]);
      await expectStatus(page, `${role}: commercial edits denied`, 'councilSettlementTerms', { action: 'propose', council_id: councilId, terms: {} }, [403]);
    }
    if (!propertyId) { check(`${role}: property permissions`, 'blocked', 'Create a fictional property and verified joint-owner roster first.'); continue; }
    const owned = await sdk(page, 'stage2Payout', { action: 'properties' });
    const member = owned.data?.properties?.some((property) => property.id === propertyId);
    if ((role === 'landlord' || role === 'joint-owner') && !member) {
      check(`${role}: fixture membership`, 'blocked', 'This account is not assigned to the selected fictional property.'); continue;
    }
    if (role === 'unrelated-user' && member) {
      check('Unrelated-user fixture', 'fail', 'Account belongs to the selected property.'); continue;
    }
    const payout = await expectStatus(page, `${role}: property read scope`, 'stage2Payout',
      { action: 'read', property_id: propertyId }, role.includes('admin') || role === 'landlord' || role === 'joint-owner' ? [200] : [403]);
    if (role === 'landlord' || role === 'joint-owner') {
      await page.goto(new URL('/rent/landlord/payouts', base).href);
      const panel = section(page, /Payout account/);
      await panel.getByLabel(/Property/).selectOption(propertyId);
      await panel.getByText(/Stage 2 requires/).first().waitFor();
      const ready = role === 'landlord' || payout.data?.records?.length;
      if (ready) await screenshot(page, panel, role === 'landlord' ? 'landlord-payout' : 'joint-owner-approval');
      else check('Joint-owner approval screenshot', 'blocked', 'No nomination exists for this property.');
    }
  }
  for (const name of ['Two distinct admins approve the same revision', 'All owners approve their own OTP', 'Cooling-off and held payout release', 'Settled invoice and reversal workflow', 'Hosted direct entity RLS']) {
    check(name, 'blocked', 'This runner verifies read permissions and captures existing records; this workflow requires separate end-to-end verification.');
  }
} catch (error) {
  // Do not serialize exceptions: SDK/browser errors can contain URLs or headers.
  check('Runner completed', 'blocked', error.message?.startsWith('browserType.launch')
    ? 'Chrome could not start. Confirm Google Chrome is installed.'
    : `Runner stopped (${error.name || 'Error'}). Check the current Chrome page; no private error details were exported.`);
} finally {
  await browser?.close().catch(() => {});
  terminal.close();
  const summary = { passed: results.filter((r) => r.state === 'pass').length, failed: results.filter((r) => r.state === 'fail').length, blocked: results.filter((r) => r.state === 'blocked').length };
  const report = { generatedAt: new Date().toISOString(), scope: 'Local browser and function checks only; no hosted RLS certification', summary, results };
  await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(directory, 'REPORT.md'), `# IBMT Stage 2 browser checks\n\nPassed: ${summary.passed}; failed: ${summary.failed}; blocked: ${summary.blocked}.\n\nScreenshots require human review. Blocked checks prevent release sign-off. Authentication state is not exported.\n\n${results.map((r) => `- **${r.state.toUpperCase()}** ${r.name}: ${r.detail}`).join('\n')}\n`);
  console.log(`\nReport and screenshots: ${directory}\nShare REPORT.md, report.json and synthetic-data screenshots only.`);
  process.exitCode = summary.failed ? 1 : summary.blocked ? 2 : 0;
}
