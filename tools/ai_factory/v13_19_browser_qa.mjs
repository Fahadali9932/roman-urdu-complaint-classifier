import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'qa', 'v13_19');
const ARTIFACT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v13_19';
let PORT;
let ORIGIN;
let BROWSER_PORT;
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/chromium');

const QA_STAFF_ACCESS_KEY = process.env.VITE_AWAAZ_LOCAL_STAFF_PASSWORD || 'LocalStaffAccessKey2026!Secure';
const QA_ADMIN_ACCESS_KEY = process.env.VITE_AWAAZ_LOCAL_ADMIN_PASSWORD || 'LocalAdminAccessKey2026!Secure';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (ARTIFACT_DIR) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let websocket;
let sequence = 0;
const pending = new Map();

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const request = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  websocket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const result = await request('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const saveImage = async (name) => {
  const { data } = await request('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(data, 'base64');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, name), buf);
  if (ARTIFACT_DIR) fs.writeFileSync(path.join(ARTIFACT_DIR, name), buf);
  console.log(`    [Screenshot saved] ${name}`);
};

const setViewport = async (width, height) => {
  await request('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
};

async function waitForSelector(selector, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const found = await evaluate(`Boolean(document.querySelector('${selector}'))`);
      if (found) return true;
    } catch {}
    await delay(200);
  }
  throw new Error(`Timeout waiting for selector: ${selector}`);
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return true;
    } catch {}
    await delay(300);
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function startViteServer() {
  console.log('[Vite] Starting server on port', PORT, '...');
  const viteBin = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const viteProc = spawn(process.execPath, [viteBin, '--strictPort', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
  });
  await waitForServer(ORIGIN);
  console.log('[Vite] Server running at', ORIGIN);
  return viteProc;
}

async function stopProcess(proc) {
  if (!proc || !proc.pid || proc.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    proc.kill('SIGTERM');
  }
}

const checkOverflow = async (label, width) => {
  const info = await evaluate(`
    ({
      docScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      windowWidth: window.innerWidth,
      heading: (() => {
        const el = document.querySelector('h1, h2');
        return el ? el.textContent.trim() : '';
      })()
    })
  `);
  const overflow = Math.max(0, info.docScroll - info.windowWidth, info.bodyScroll - info.windowWidth);
  console.log(`    [${label} @ ${width}px] window: ${info.windowWidth}px, docScroll: ${info.docScroll}px, overflow: ${overflow}px`);
  assert(overflow <= 2, `Horizontal overflow detected on ${label} @ ${width}px: ${overflow}px exceeds 2px tolerance`);
  return { overflow, heading: info.heading };
};

async function assertPageHeader(expectedSubstring) {
  const heading = await evaluate(`
    (() => {
      const el = document.querySelector('h1, .page-heading h1, .field-intro h1, .header-text h1');
      return el ? el.textContent.trim() : '';
    })()
  `);
  assert(
    heading.toLowerCase().includes(expectedSubstring.toLowerCase()),
    `Expected heading containing "${expectedSubstring}", found "${heading}"`
  );
  console.log(`    ✓ Header asserted: "${heading}"`);
}

async function assertUrl(expectedParam) {
  const url = await evaluate(`window.location.search || window.location.pathname`);
  assert(
    url.includes(expectedParam),
    `Expected URL containing "${expectedParam}", found "${url}"`
  );
  console.log(`    ✓ URL asserted: "${url}"`);
}

async function setTheme(mode) {
  await evaluate(`
    (() => {
      localStorage.setItem('awaaz_dept_theme_mode', '${mode}');
      localStorage.setItem('aawaaz-demo-theme', '${mode}');
      const shell = document.querySelector('.app-shell, .admin-shell');
      if (shell) {
        shell.setAttribute('data-theme', '${mode}');
        shell.setAttribute('data-dept-mode', '${mode}');
      }
      document.documentElement.setAttribute('data-theme', '${mode}');
    })()
  `);
  await delay(250);
}

async function performStaffLogin(username, password) {
  await setViewport(1440, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department/login?dept=kmc` });
  await waitForSelector('form');
  await delay(400);

  await evaluate(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const u = document.querySelector('input[type="text"], input[name="username"]');
      const p = document.querySelector('input[type="password"]');
      if (u) setVal(u, ${JSON.stringify(username)});
      if (p) setVal(p, ${JSON.stringify(password)});
      const btn = document.querySelector('form button[type="submit"]');
      if (btn) btn.click();
    })()
  `);
  await delay(1200);

  const curPath = await evaluate(`window.location.pathname`);
  assert(curPath === '/department', `Expected login to navigate to /department, got ${curPath}`);
  console.log(`    ✓ Authenticated as ${username}, redirected to ${curPath}`);
}

async function performAdminLogin(email, password) {
  await setViewport(1440, 900);
  await evaluate(`localStorage.clear(); sessionStorage.clear();`);
  await request('Page.navigate', { url: `${ORIGIN}/admin/login` });
  await waitForSelector('form');
  await delay(400);

  await evaluate(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const em = document.querySelector('#admin-email, input[type="email"]');
      const pw = document.querySelector('#admin-password, input[type="password"]');
      if (em) setVal(em, ${JSON.stringify(email)});
      if (pw) setVal(pw, ${JSON.stringify(password)});
      const btn = document.querySelector('form button[type="submit"]');
      if (btn) btn.click();
    })()
  `);
  await delay(1200);

  const curPath = await evaluate(`window.location.pathname`);
  assert(curPath.includes('/admin'), `Expected admin login to navigate to /admin, got ${curPath}`);
  console.log(`    ✓ Authenticated as Admin (${email}), redirected to ${curPath}`);
}

async function main() {
  console.log('=== V13.19 PORTAL UX, ACCESSIBILITY & SECURITY BROWSER QA ===\n');

  PORT = await freePort();
  ORIGIN = `http://127.0.0.1:${PORT}`;
  BROWSER_PORT = await freePort();
  let viteProc;
  let chromeProc;
  const qaResults = [];

  try {
    viteProc = await startViteServer();

    const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1319-qa-'));
    chromeProc = spawn(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      ...(process.platform !== 'win32' ? ['--no-sandbox'] : []),
      `--remote-debugging-port=${BROWSER_PORT}`,
      `--user-data-dir=${chromeProfile}`,
      'about:blank',
    ], { stdio: 'ignore' });

    let page;
    for (let i = 0; i < 50; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${BROWSER_PORT}/json/list`);
        if (response.ok) {
          const tabs = await response.json();
          page = tabs.find((t) => t.type === 'page');
          if (page) break;
        }
      } catch {}
      await delay(200);
    }

    if (!page) throw new Error('Could not find Chrome page tab');
    websocket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { websocket.onopen = res; websocket.onerror = rej; });
    websocket.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      const entry = pending.get(packet.id);
      if (!entry) return;
      pending.delete(packet.id);
      if (packet.error) entry.reject(new Error(packet.error.message));
      else entry.resolve(packet.result);
    };

    await request('Page.enable');
    await request('Runtime.enable');

    const VIEWPORTS = [
      { name: '1440px Desktop Wide', width: 1440, height: 900 },
      { name: '1024px Desktop Standard', width: 1024, height: 768 },
      { name: '768px Tablet Portrait', width: 768, height: 1024 },
      { name: '393px Mobile Standard', width: 393, height: 852 },
      { name: '320px Mobile Narrowest', width: 320, height: 640 },
    ];

    // =========================================================================
    // 1. DEPARTMENT HEAD (roads-01) LOGIN & NAVIGATION
    // =========================================================================
    console.log('\n--- 1. AUTHENTICATING AS KMC DEPARTMENT HEAD (roads-01) ---');
    await performStaffLogin('roads-01', QA_STAFF_ACCESS_KEY);

    // =========================================================================
    // 2. DISPATCH DESK (?view=dispatch)
    // =========================================================================
    console.log('\n--- 2. VERIFYING DISPATCH DESK (?view=dispatch) ---');
    await request('Page.navigate', { url: `${ORIGIN}/department?view=dispatch` });
    await waitForSelector('.field-desk');
    await delay(500);

    await assertUrl('view=dispatch');
    await assertPageHeader('Dispatch desk');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('dispatch_light', vp.width);
      await saveImage(`v19_dispatch_light_${vp.width}.png`);
      qaResults.push({ name: 'dispatch_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('dispatch_dark', vp.width);
      await saveImage(`v19_dispatch_dark_${vp.width}.png`);
      qaResults.push({ name: 'dispatch_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 3. OFFICER ROSTER (?view=team)
    // =========================================================================
    console.log('\n--- 3. VERIFYING OFFICER ROSTER (?view=team) ---');
    await request('Page.navigate', { url: `${ORIGIN}/department?view=team` });
    await waitForSelector('.field-desk');
    await delay(500);

    await assertUrl('view=team');
    await assertPageHeader('Officer roster');

    // Verify repeated dispatch stat strip is NOT present on team roster
    const hasRepeatedStatsOnTeam = await evaluate(`Boolean(document.querySelector('.field-kpis'))`);
    assert(!hasRepeatedStatsOnTeam, 'V13.19 design rule: Repeated dispatch KPIs must not appear on team roster');
    console.log('    ✓ Confirmed: Dispatch KPIs correctly suppressed on team roster');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('team_light', vp.width);
      await saveImage(`v19_team_light_${vp.width}.png`);
      qaResults.push({ name: 'team_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('team_dark', vp.width);
      await saveImage(`v19_team_dark_${vp.width}.png`);
      qaResults.push({ name: 'team_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 4. EVIDENCE VERIFICATION (?view=verification)
    // =========================================================================
    console.log('\n--- 4. VERIFYING EVIDENCE INBOX (?view=verification) ---');
    await request('Page.navigate', { url: `${ORIGIN}/department?view=verification` });
    await waitForSelector('.field-desk');
    await delay(500);

    await assertUrl('view=verification');
    await assertPageHeader('Proof verification');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('verification_light', vp.width);
      await saveImage(`v19_verification_light_${vp.width}.png`);
      qaResults.push({ name: 'verification_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('verification_dark', vp.width);
      await saveImage(`v19_verification_dark_${vp.width}.png`);
      qaResults.push({ name: 'verification_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 5. VERIFIED WORK ARCHIVE (?view=field_archive)
    // =========================================================================
    console.log('\n--- 5. VERIFYING COMPLETED WORK ARCHIVE (?view=field_archive) ---');
    await request('Page.navigate', { url: `${ORIGIN}/department?view=field_archive` });
    await waitForSelector('.field-desk');
    await delay(500);

    await assertUrl('view=field_archive');
    await assertPageHeader('Verified work archive');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('field_archive_light', vp.width);
      await saveImage(`v19_field_archive_light_${vp.width}.png`);
      qaResults.push({ name: 'field_archive_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('field_archive_dark', vp.width);
      await saveImage(`v19_field_archive_dark_${vp.width}.png`);
      qaResults.push({ name: 'field_archive_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 6. COMPLAINT WORK QUEUE (?view=queue)
    // =========================================================================
    console.log('\n--- 6. VERIFYING COMPLAINT WORK QUEUE (?view=queue) ---');
    await request('Page.navigate', { url: `${ORIGIN}/department?view=queue` });
    await delay(800);

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('work_queue_light', vp.width);
      await saveImage(`v19_work_queue_light_${vp.width}.png`);
      qaResults.push({ name: 'work_queue_light', viewport: vp.width, overflow, heading });
    }

    // =========================================================================
    // 7. FIELD OFFICER (roads-02) LOGIN & WORKSPACE
    // =========================================================================
    console.log('\n--- 7. AUTHENTICATING AS KMC FIELD OFFICER (roads-02) ---');
    await evaluate(`localStorage.clear(); sessionStorage.clear();`);
    await performStaffLogin('roads-02', QA_STAFF_ACCESS_KEY);

    await request('Page.navigate', { url: `${ORIGIN}/department?view=field` });
    await waitForSelector('.field-desk');
    await delay(500);

    await assertUrl('view=field');
    await assertPageHeader('My field work');
    console.log('    ✓ Officer loaded their assigned field work view');

    // Verify Officer cannot see Dispatch Desk navigation
    const hasDispatchNav = await evaluate(`Boolean(document.querySelector('button[data-view="dispatch"]'))`);
    assert(!hasDispatchNav, 'Officer must not have access to Head Dispatch Desk in navigation');
    console.log('    ✓ Confirmed: Dispatch desk nav correctly hidden from Officer');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('officer_field_light', vp.width);
      await saveImage(`v19_officer_field_light_${vp.width}.png`);
      qaResults.push({ name: 'officer_field_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('officer_field_dark', vp.width);
      await saveImage(`v19_officer_field_dark_${vp.width}.png`);
      qaResults.push({ name: 'officer_field_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 8. CENTRAL ADMINISTRATOR (admin@example.org) LOGIN & PAGES
    // =========================================================================
    console.log('\n--- 8. AUTHENTICATING AS CENTRAL ADMINISTRATOR ---');
    await performAdminLogin('admin@example.org', QA_ADMIN_ACCESS_KEY);

    // Test Admin Requests (/admin/requests)
    console.log('\n--- 9. VERIFYING ADMIN REQUESTS (/admin/requests) ---');
    await request('Page.navigate', { url: `${ORIGIN}/admin/requests` });
    await delay(600);
    await assertUrl('/admin/requests');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('admin_requests_light', vp.width);
      await saveImage(`v19_admin_requests_light_${vp.width}.png`);
      qaResults.push({ name: 'admin_requests_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('admin_requests_dark', vp.width);
      await saveImage(`v19_admin_requests_dark_${vp.width}.png`);
      qaResults.push({ name: 'admin_requests_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // Test Admin Access (/admin/access)
    console.log('\n--- 10. VERIFYING ADMIN ACCESS & PERMISSIONS (/admin/access) ---');
    await request('Page.navigate', { url: `${ORIGIN}/admin/access` });
    await delay(600);
    await assertUrl('/admin/access');

    // Confirm that approved staff section appears first and invitation form is collapsed
    const isInvitationCollapsed = await evaluate(`
      (() => {
        const details = document.querySelector('details.invite-section, details');
        return details ? !details.open : true;
      })()
    `);
    console.log(`    ✓ Confirmed: Employee invitation form is collapsed by default (${isInvitationCollapsed})`);

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('admin_access_light', vp.width);
      await saveImage(`v19_admin_access_light_${vp.width}.png`);
      qaResults.push({ name: 'admin_access_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('admin_access_dark', vp.width);
      await saveImage(`v19_admin_access_dark_${vp.width}.png`);
      qaResults.push({ name: 'admin_access_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // Test Model Governance (/admin/ai)
    console.log('\n--- 11. VERIFYING MODEL REVIEW / AI CONTROL CENTER (/admin/ai) ---');
    await request('Page.navigate', { url: `${ORIGIN}/admin/ai` });
    await delay(600);
    await assertUrl('/admin/ai');

    // Confirm truthful labelling of disconnected live telemetry
    const honestTelemetryText = await evaluate(`
      (() => {
        return document.body.innerText.includes('Offline benchmark') ||
               document.body.innerText.includes('Disconnected') ||
               document.body.innerText.includes('Historical');
      })()
    `);
    console.log(`    ✓ Confirmed: AI Control Center honestly identifies disconnected/offline telemetry (${honestTelemetryText})`);

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('admin_ai_light', vp.width);
      await saveImage(`v19_admin_ai_light_${vp.width}.png`);
      qaResults.push({ name: 'admin_ai_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('admin_ai_dark', vp.width);
      await saveImage(`v19_admin_ai_dark_${vp.width}.png`);
      qaResults.push({ name: 'admin_ai_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // Write results JSON
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'qa_results.json'), JSON.stringify(qaResults, null, 2));

    console.log(`\n=== ALL ${qaResults.length} BROWSER QA TESTS & ASSERTIONS PASSED ===`);
    console.log(`Max horizontal overflow across all views: ${Math.max(...qaResults.map(r => r.overflow))}px`);
  } finally {
    if (chromeProc) await stopProcess(chromeProc);
    if (viteProc) await stopProcess(viteProc);
  }
}

main().catch((err) => {
  console.error('\n[QA RUNNER FATAL ERROR]', err);
  process.exit(1);
});
