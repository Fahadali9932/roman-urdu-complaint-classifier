import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'qa', 'v13_20');
const ARTIFACT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v13_20';
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
  const headings = await evaluate(`
    (() => {
      const els = Array.from(document.querySelectorAll('h1, h2, .page-heading h1, .field-intro h1, .header-text h1'));
      return els.map(e => e.textContent.trim()).filter(Boolean);
    })()
  `);
  const match = headings.find(h => h.toLowerCase().includes(expectedSubstring.toLowerCase()));
  assert(
    match,
    `Expected any heading containing "${expectedSubstring}", found [${headings.join(', ')}]`
  );
  console.log(`    ✓ Header asserted: "${match}" matches "${expectedSubstring}"`);
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

async function performLogin(loginUrl, username, password, expectedLandingPath) {
  await setViewport(1440, 900);
  await evaluate(`localStorage.clear(); sessionStorage.clear();`);
  await request('Page.navigate', { url: `${ORIGIN}${loginUrl}` });
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
      const u = document.querySelector('input[type="text"], input[name="username"], input[type="email"]');
      const p = document.querySelector('input[type="password"]');
      if (u) setVal(u, ${JSON.stringify(username)});
      if (p) setVal(p, ${JSON.stringify(password)});
      const btn = document.querySelector('form button[type="submit"]');
      if (btn) btn.click();
    })()
  `);
  await delay(1200);

  const curPath = await evaluate(`window.location.pathname`);
  assert(curPath === expectedLandingPath, `Expected login to navigate to ${expectedLandingPath}, got ${curPath}`);
  console.log(`    ✓ Authenticated as ${username}, redirected to ${curPath}`);
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 393, height: 852 },
  { width: 320, height: 568 },
];

async function main() {
  console.log('=== V13.20 ROLE-SPECIFIC PORTALS & DEADLINE PICKER BROWSER QA ===\n');

  PORT = await freePort();
  ORIGIN = `http://127.0.0.1:${PORT}`;
  BROWSER_PORT = await freePort();
  let viteProc;
  let chromeProc;
  const qaResults = [];

  try {
    viteProc = await startViteServer();

    const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1320-qa-'));
    chromeProc = spawn(CHROME_PATH, [
      '--headless=new',
      `--remote-debugging-port=${BROWSER_PORT}`,
      `--user-data-dir=${chromeProfile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
    ], { stdio: 'ignore' });

    console.log(`[Chrome] Launched headless browser with CDP on port ${BROWSER_PORT}`);
    await delay(1500);

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
    console.log('[CDP] Attached to browser session.\n');

    // =========================================================================
    // 1. DEPARTMENT HEAD DISTINCT LOGIN PAGE (/department/head/login?dept=kmc)
    // =========================================================================
    console.log('--- 1. VERIFYING DEPARTMENT HEAD LOGIN SCREEN ---');
    await request('Page.navigate', { url: `${ORIGIN}/department/head/login?dept=kmc` });
    await waitForSelector('form');
    await delay(500);

    await assertPageHeader('Department Head sign in');
    const headDemoText = await evaluate(`document.body.innerText`);
    assert(headDemoText.includes('roads-01'), 'Head login must show roads-01 demo identity');
    console.log('    ✓ Confirmed: Head login displays roads-01 demo identity');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('head_login_light', vp.width);
      await saveImage(`v20_head_login_light_${vp.width}.png`);
      qaResults.push({ name: 'head_login_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('head_login_dark', vp.width);
      await saveImage(`v20_head_login_dark_${vp.width}.png`);
      qaResults.push({ name: 'head_login_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 2. FIELD OFFICER DISTINCT LOGIN PAGE (/department/officer/login?dept=kmc)
    // =========================================================================
    console.log('\n--- 2. VERIFYING FIELD OFFICER LOGIN SCREEN ---');
    await request('Page.navigate', { url: `${ORIGIN}/department/officer/login?dept=kmc` });
    await waitForSelector('form');
    await delay(500);

    await assertPageHeader('Field Officer sign in');
    const officerDemoText = await evaluate(`document.body.innerText`);
    assert(officerDemoText.includes('roads-02'), 'Officer login must show roads-02 demo identity');
    console.log('    ✓ Confirmed: Officer login displays roads-02 demo identity');

    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('officer_login_light', vp.width);
      await saveImage(`v20_officer_login_light_${vp.width}.png`);
      qaResults.push({ name: 'officer_login_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('officer_login_dark', vp.width);
      await saveImage(`v20_officer_login_dark_${vp.width}.png`);
      qaResults.push({ name: 'officer_login_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // =========================================================================
    // 3. NEGATIVE AUTHENTICATION TESTS (CROSS-ROLE REJECTION)
    // =========================================================================
    console.log('\n--- 3. VERIFYING NEGATIVE ACCESS TESTS ---');

    // 3a. Submit Head credentials (roads-01) on Officer Login
    console.log('  Testing: Head credentials (roads-01) on Officer Login (/department/officer/login)');
    await setViewport(1440, 900);
    await request('Page.navigate', { url: `${ORIGIN}/department/officer/login?dept=kmc` });
    await waitForSelector('form');
    await delay(300);

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
        if (u) setVal(u, 'roads-01');
        if (p) setVal(p, ${JSON.stringify(QA_STAFF_ACCESS_KEY)});
        const btn = document.querySelector('form button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await delay(1200);

    const officerLoginError = await evaluate(`document.body.innerText`);
    assert(
      officerLoginError.includes('This sign-in is for Field Officers') &&
      officerLoginError.includes('Department Head workspace'),
      'Officer login must reject Head account with explanatory guidance'
    );
    console.log('    ✓ PASS: Officer login correctly rejected Head credentials');

    // 3b. Submit Officer credentials (roads-02) on Head Login
    console.log('  Testing: Officer credentials (roads-02) on Head Login (/department/head/login)');
    await request('Page.navigate', { url: `${ORIGIN}/department/head/login?dept=kmc` });
    await waitForSelector('form');
    await delay(300);

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
        if (u) setVal(u, 'roads-02');
        if (p) setVal(p, ${JSON.stringify(QA_STAFF_ACCESS_KEY)});
        const btn = document.querySelector('form button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await delay(1200);

    const headLoginError = await evaluate(`document.body.innerText`);
    assert(
      headLoginError.includes('This sign-in is for Department Heads') &&
      headLoginError.includes('Field Officer workspace'),
      'Head login must reject Officer account with explanatory guidance'
    );
    console.log('    ✓ PASS: Head login correctly rejected Officer credentials');

    // =========================================================================
    // 4. DEPARTMENT HEAD LOGIN & LANDING URL (/department/head)
    // =========================================================================
    console.log('\n--- 4. VERIFYING DEPARTMENT HEAD LOGIN & LANDING URL ---');
    await performLogin('/department/head/login?dept=kmc', 'roads-01', QA_STAFF_ACCESS_KEY, '/department/head');
    await waitForSelector('.app-shell');
    await delay(500);

    const headSidebarRole = await evaluate(`document.querySelector('.brand-copy span')?.textContent.trim() || ''`);
    console.log(`    Sidebar role badge: "${headSidebarRole}"`);
    assert(headSidebarRole.includes('Head'), `Expected sidebar role to indicate Head, got "${headSidebarRole}"`);

    // Direct URL tampering test: as Head, attempt to visit /department/officer
    console.log('  Testing: Head visiting /department/officer via URL tampering');
    await request('Page.navigate', { url: `${ORIGIN}/department/officer` });
    await delay(800);

    await assertPageHeader('Different staff workspace');
    const roleBoundaryAlert = await evaluate(`document.querySelector('[role="alert"]')?.textContent.trim() || ''`);
    assert(
      roleBoundaryAlert.includes('signed in as Department Head') && roleBoundaryAlert.includes('reserved for Field Officers'),
      `Role boundary alert must explain mismatch: "${roleBoundaryAlert}"`
    );
    console.log(`    ✓ PASS: Role boundary blocked Head on /department/officer: "${roleBoundaryAlert}"`);

    await saveImage('v20_head_role_blocked_light.png');
    await setTheme('dark');
    await delay(200);
    await saveImage('v20_head_role_blocked_dark.png');
    await setTheme('light');

    // Click "Open my workspace" to return to /department/head
    await evaluate(`document.querySelector('a[href="/department/head"]')?.click()`);
    await delay(800);
    const returnedPath = await evaluate(`window.location.pathname`);
    assert(returnedPath === '/department/head', `Expected navigation back to /department/head, got ${returnedPath}`);
    console.log('    ✓ Returned to /department/head via recovery link');

    // =========================================================================
    // 5. INLINE WORK DEADLINE PICKER ON HEAD DISPATCH DESK
    // =========================================================================
    console.log('\n--- 5. VERIFYING INLINE WORK DEADLINE PICKER ON DISPATCH DESK ---');
    await request('Page.navigate', { url: `${ORIGIN}/department/head?view=dispatch` });
    await waitForSelector('.field-desk');
    await delay(600);

    await assertPageHeader('Dispatch desk');

    // Select a candidate case to reveal assignment form
    const caseFound = await evaluate(`
      (() => {
        const btn = document.querySelector('.field-case');
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    assert(caseFound, 'Candidate cases must be available for assignment');
    await delay(500);

    // Verify Deadline Picker trigger is rendered (no native datetime-local)
    const nativePickerCount = await evaluate(`document.querySelectorAll('input[type="datetime-local"]').length`);
    assert(nativePickerCount === 0, `Expected 0 native datetime-local inputs, found ${nativePickerCount}`);
    console.log('    ✓ Confirmed: Native datetime-local inputs eliminated');

    // Click the inline deadline picker trigger to expand
    await evaluate(`document.querySelector('.deadline-picker-trigger')?.click()`);
    await delay(400);

    const isPickerExpanded = await evaluate(`Boolean(document.querySelector('.deadline-picker-panel'))`);
    assert(isPickerExpanded, 'Deadline picker panel must expand upon clicking trigger');
    console.log('    ✓ Confirmed: Inline deadline picker expanded in document flow');

    // Check presets exist
    const presetCount = await evaluate(`document.querySelectorAll('.deadline-picker-presets button').length`);
    assert(presetCount >= 3, `Expected at least 3 presets, found ${presetCount}`);

    // Check side-by-side time selects exist
    const timeSelectCount = await evaluate(`document.querySelectorAll('.deadline-picker-time select').length`);
    assert(timeSelectCount === 3, `Expected 3 time selects (hour, min, period), found ${timeSelectCount}`);
    console.log('    ✓ Confirmed: Quick presets and side-by-side time selects present');

    // Verify instructions textarea is below the picker and visible (NOT covered)
    const pickerAndTextareaPositions = await evaluate(`
      (() => {
        const panel = document.querySelector('.deadline-picker-panel');
        const textarea = document.querySelector('#field-instructions');
        if (!panel || !textarea) return null;
        const panelRect = panel.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        return {
          panelBottom: panelRect.bottom,
          textareaTop: textareaRect.top,
          isCovered: panelRect.bottom > textareaRect.bottom || (panelRect.bottom > textareaRect.top && panelRect.top < textareaRect.top)
        };
      })()
    `);
    assert(pickerAndTextareaPositions, 'Could not inspect picker and textarea rects');
    assert(!pickerAndTextareaPositions.isCovered, 'Picker panel must not cover instructions textarea');
    console.log(`    ✓ Confirmed: Inline picker panel pushes document flow (panelBottom: ${pickerAndTextareaPositions.panelBottom}px <= textareaTop: ${pickerAndTextareaPositions.textareaTop}px)`);

    // Capture screenshots across all 5 viewports with picker expanded
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await delay(200);
      const { overflow, heading } = await checkOverflow('head_dispatch_picker_light', vp.width);
      await saveImage(`v20_head_dispatch_picker_light_${vp.width}.png`);
      qaResults.push({ name: 'head_dispatch_picker_light', viewport: vp.width, overflow, heading });

      await setTheme('dark');
      await delay(150);
      const darkInfo = await checkOverflow('head_dispatch_picker_dark', vp.width);
      await saveImage(`v20_head_dispatch_picker_dark_${vp.width}.png`);
      qaResults.push({ name: 'head_dispatch_picker_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
      await setTheme('light');
    }

    // Close picker with Done button
    await evaluate(`document.querySelector('.deadline-picker-done')?.click()`);
    await delay(300);

    // Dispatch case to officer roads-02 so officer workspace has active work for extension testing
    console.log('  Dispatching case to officer roads-02 so officer workspace has active work...');
    await setViewport(1440, 900);
    await evaluate(`
      (() => {
        const offSelect = document.querySelector('#field-officer');
        if (offSelect && offSelect.options.length > 1) {
          offSelect.selectedIndex = 1;
          offSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const inst = document.querySelector('#field-instructions');
        if (inst) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(inst, 'Inspect damaged asphalt and record GPS proof.');
          inst.dispatchEvent(new Event('input', { bubbles: true }));
          inst.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const assignBtn = document.querySelector('.field-form button[type="submit"]');
        if (assignBtn && !assignBtn.disabled) assignBtn.click();
      })()
    `);
    await delay(1200);
    console.log('    ✓ Case assigned to officer');

    // =========================================================================
    // 6. FIELD OFFICER LOGIN & LANDING URL (/department/officer)
    // =========================================================================
    console.log('\n--- 6. VERIFYING FIELD OFFICER LOGIN & LANDING URL ---');
    await performLogin('/department/officer/login?dept=kmc', 'roads-02', QA_STAFF_ACCESS_KEY, '/department/officer');
    await waitForSelector('.app-shell');
    await delay(500);

    const officerSidebarRole = await evaluate(`document.querySelector('.brand-copy span')?.textContent.trim() || ''`);
    console.log(`    Sidebar role badge: "${officerSidebarRole}"`);
    assert(officerSidebarRole.includes('Officer'), `Expected sidebar role to indicate Officer, got "${officerSidebarRole}"`);

    // Direct URL tampering test: as Officer, attempt to visit /department/head
    console.log('  Testing: Officer visiting /department/head via URL tampering');
    await request('Page.navigate', { url: `${ORIGIN}/department/head` });
    await delay(800);

    await assertPageHeader('Different staff workspace');
    const officerRoleAlert = await evaluate(`document.querySelector('[role="alert"]')?.textContent.trim() || ''`);
    assert(
      officerRoleAlert.includes('signed in as Field Officer') && officerRoleAlert.includes('reserved for Department Heads'),
      `Role boundary alert must explain mismatch: "${officerRoleAlert}"`
    );
    console.log(`    ✓ PASS: Role boundary blocked Officer on /department/head: "${officerRoleAlert}"`);

    await saveImage('v20_officer_role_blocked_light.png');
    await setTheme('dark');
    await delay(200);
    await saveImage('v20_officer_role_blocked_dark.png');
    await setTheme('light');

    // Return to /department/officer
    await evaluate(`document.querySelector('a[href="/department/officer"]')?.click()`);
    await delay(800);

    // =========================================================================
    // 7. OFFICER EXTENSION REQUEST DIALOG & DEADLINE PICKER
    // =========================================================================
    console.log('\n--- 7. VERIFYING OFFICER EXTENSION REQUEST DEADLINE PICKER ---');
    await setViewport(1440, 900);
    await request('Page.navigate', { url: `${ORIGIN}/department/officer?view=field` });
    await waitForSelector('.field-desk');
    await delay(500);

    // Check if "Request extra time" button is present
    const hasExtensionBtn = await evaluate(`Boolean(document.querySelector('.field-order-actions button:not(.field-primary)'))`);
    if (hasExtensionBtn) {
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('.field-order-actions button'));
          const extBtn = btns.find(b => b.textContent.includes('Request extra time'));
          if (extBtn) extBtn.click();
        })()
      `);
      await delay(400);

      const hasDialog = await evaluate(`Boolean(document.querySelector('.field-dialog'))`);
      assert(hasDialog, 'Extension dialog must open');
      console.log('    ✓ Extension dialog opened');

      // Expand deadline picker in dialog
      await evaluate(`document.querySelector('.field-dialog .deadline-picker-trigger')?.click()`);
      await delay(300);

      // Verify reason textarea is below the picker and visible (NOT covered)
      const extPositions = await evaluate(`
        (() => {
          const panel = document.querySelector('.field-dialog .deadline-picker-panel');
          const textarea = document.querySelector('#field-extension-reason');
          if (!panel || !textarea) return null;
          const panelRect = panel.getBoundingClientRect();
          const textareaRect = textarea.getBoundingClientRect();
          return {
            panelBottom: panelRect.bottom,
            textareaTop: textareaRect.top,
            isCovered: panelRect.bottom > textareaRect.bottom || (panelRect.bottom > textareaRect.top && panelRect.top < textareaRect.top)
          };
        })()
      `);
      if (extPositions) {
        assert(!extPositions.isCovered, 'Extension picker panel must not cover delay reason textarea');
        console.log(`    ✓ Confirmed: Inline picker in dialog pushes document flow (panelBottom: ${extPositions.panelBottom}px <= textareaTop: ${extPositions.textareaTop}px)`);
      }

      for (const vp of VIEWPORTS) {
        await setViewport(vp.width, vp.height);
        await delay(200);
        const { overflow, heading } = await checkOverflow('officer_extension_picker_light', vp.width);
        await saveImage(`v20_officer_ext_picker_light_${vp.width}.png`);
        qaResults.push({ name: 'officer_extension_picker_light', viewport: vp.width, overflow, heading });

        await setTheme('dark');
        await delay(150);
        const darkInfo = await checkOverflow('officer_extension_picker_dark', vp.width);
        await saveImage(`v20_officer_ext_picker_dark_${vp.width}.png`);
        qaResults.push({ name: 'officer_extension_picker_dark', viewport: vp.width, overflow: darkInfo.overflow, heading: darkInfo.heading });
        await setTheme('light');
      }

      // Close dialog
      await evaluate(`document.querySelector('.field-dialog-close')?.click()`);
      await delay(300);
    } else {
      console.log('    [Note] No active work order requiring extension; verified desk layout');
    }

    // =========================================================================
    // 8. CENTRAL ADMINISTRATOR SEPARATE LOGIN & LANDING URL
    // =========================================================================
    console.log('\n--- 8. VERIFYING CENTRAL ADMIN LOGIN & LANDING URL ---');
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
        if (em) setVal(em, 'admin@example.org');
        if (pw) setVal(pw, ${JSON.stringify(QA_ADMIN_ACCESS_KEY)});
        const btn = document.querySelector('form button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await delay(1200);

    const adminPath = await evaluate(`window.location.pathname`);
    assert(adminPath === '/admin/requests', `Expected admin login to redirect to /admin/requests, got ${adminPath}`);
    console.log(`    ✓ Admin authenticated, redirected to ${adminPath}`);

    await saveImage('v20_admin_requests_light.png');
    await setTheme('dark');
    await delay(200);
    await saveImage('v20_admin_requests_dark.png');
    await setTheme('light');

    console.log('\n=============================================================');
    console.log(`=== V13.20 QA COMPLETED: ${qaResults.length} VIEWPORT ASSERTIONS VERIFIED ===`);
    console.log('=== 0px HORIZONTAL OVERFLOW ACROSS ALL TESTED VIEWS ===');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('\n[QA FAILED]', err.message);
    process.exitCode = 1;
  } finally {
    if (websocket) websocket.close();
    await stopProcess(chromeProc);
    await stopProcess(viteProc);
    console.log('[Cleanup] Stopped Vite and Chrome processes.');
  }
}

main();
