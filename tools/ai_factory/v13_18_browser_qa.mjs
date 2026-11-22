import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCREENSHOT_DIR = process.env.AWAAZ_QA_SCREENSHOT_DIR || path.join(ROOT_DIR, 'docs', 'v11', 'screenshots', 'v13_18');
const ARTIFACT_DIR = process.env.AWAAZ_QA_ARTIFACT_DIR || 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v13_18';
let PORT;
let ORIGIN;
let BROWSER_PORT;
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/chromium');

const QA_STAFF_USERNAME = process.env.AWAAZ_QA_STAFF_USERNAME || 'roads-01';
const QA_STAFF_ACCESS_KEY = process.env.AWAAZ_QA_STAFF_ACCESS_KEY || 'LocalStaffAccessKey2026!Secure';

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
    stdio: 'inherit',
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
        const el = document.querySelector('h1');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      })()
    })
  `);
  const overflow = Math.max(0, info.docScroll - info.windowWidth, info.bodyScroll - info.windowWidth);
  console.log(`    [${label} @ ${width}px] window: ${info.windowWidth}px, docScroll: ${info.docScroll}px, overflow: ${overflow}px`);
  assert(overflow <= 2, `Horizontal overflow detected on ${label} @ ${width}px: ${overflow}px exceeds 2px tolerance`);
  return overflow;
};

async function assertPageHeader(expectedSubstring) {
  const heading = await evaluate(`
    (() => {
      const el = document.querySelector('h1, .page-heading h1, .field-intro h1');
      return el ? el.innerText.trim() : '';
    })()
  `);
  assert(
    heading.toLowerCase().includes(expectedSubstring.toLowerCase()),
    `Expected heading containing "${expectedSubstring}", found "${heading}"`
  );
  console.log(`    ✓ Header asserted: "${heading}"`);
}

async function assertActiveNav(expectedView) {
  const activeView = await evaluate(`
    (() => {
      const activeEl = document.querySelector('.sidebar .nav-item.active, [aria-current="page"]');
      return activeEl ? (activeEl.getAttribute('data-view') || activeEl.innerText.trim()) : '';
    })()
  `);
  assert(
    activeView.toLowerCase().includes(expectedView.toLowerCase()),
    `Expected active nav item matching "${expectedView}", found "${activeView}"`
  );
  console.log(`    ✓ Active nav asserted: "${activeView}"`);
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
      const shell = document.querySelector('.app-shell');
      if (shell) {
        shell.setAttribute('data-theme', '${mode}');
        shell.setAttribute('data-dept-mode', '${mode}');
      }
    })()
  `);
  await delay(250);
}

async function main() {
  console.log('=== V13.18 VERIFIED FIELD OPERATIONS BROWSER QA SUITE ===\n');

  PORT = await freePort();
  ORIGIN = `http://127.0.0.1:${PORT}`;
  BROWSER_PORT = await freePort();
  let viteProc;
  let chromeProc;
  try {
    viteProc = await startViteServer();

    const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1318-qa-'));
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

    console.log('\n--- 1. AUTHENTICATING INTO KMC ROADS OPERATIONS CONSOLE ---');
    await setViewport(1440, 900);
    await request('Page.navigate', { url: `${ORIGIN}/department/login?dept=kmc` });
    await waitForSelector('form');
    await delay(500);

    await evaluate(`
      (() => {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const u = document.querySelector('input[type="text"]');
        const p = document.querySelector('input[type="password"]');
        setVal(u, ${JSON.stringify(QA_STAFF_USERNAME)});
        setVal(p, ${JSON.stringify(QA_STAFF_ACCESS_KEY)});
        document.querySelector('form button[type="submit"]').click();
      })()
    `);
    await delay(1200);

    const afterLoginUrl = await evaluate(`window.location.pathname`);
    console.log('Navigated to:', afterLoginUrl);
    assert(afterLoginUrl === '/department', `Expected login to navigate to /department, got ${afterLoginUrl}`);

    console.log('\n--- 2. VERIFYING DISPATCH DESK (?view=dispatch) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/department?view=dispatch` });
      await waitForSelector('.field-desk, .field-intro h1');
      await delay(400);

      await assertUrl('view=dispatch');
      await assertPageHeader('A clearer way to move Karachi forward');
      if (vp.width > 780) {
        await assertActiveNav('dispatch');
      }

      // Assert 4 field metrics are rendered
      const metricCount = await evaluate(`document.querySelectorAll('.field-metrics > div').length`);
      assert(metricCount === 4, `Expected 4 field metrics, found ${metricCount}`);

      // Assert incoming cases panel exists
      const hasIncomingCases = await evaluate(`Boolean(document.querySelector('.field-cases, .field-form'))`);
      assert(hasIncomingCases, 'Expected incoming cases or assignment form in Dispatch view');
      console.log(`    ✓ [${vp.name}] Dispatch metrics and case dispatch panels verified`);

      // Light mode
      await setTheme('light');
      await checkOverflow('Dispatch-Light', vp.width);
      await saveImage(`v18_dispatch_${vp.width}px.png`);

      // Dark mode
      await setTheme('dark');
      await checkOverflow('Dispatch-Dark', vp.width);
      await saveImage(`v18_dispatch_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 3. VERIFYING OFFICER ROSTER & 5-STAR RATINGS (?view=team) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/department?view=team` });
      await waitForSelector('.field-desk, .field-roster');
      await delay(400);

      await assertUrl('view=team');
      await assertPageHeader('The people behind the work');
      if (vp.width > 780) {
        await assertActiveNav('team');
      }

      // Assert roster cards and star rating elements exist
      const rosterCount = await evaluate(`document.querySelectorAll('.field-person').length`);
      assert(rosterCount >= 3, `Expected at least 3 officer roster cards, found ${rosterCount}`);
      const hasRatings = await evaluate(`Boolean(document.querySelector('.field-rating-stars'))`);
      assert(hasRatings, 'Expected .field-rating-stars in Officer Roster');
      console.log(`    ✓ [${vp.name}] Officer roster verified with ${rosterCount} cards and star rating components`);

      // Light mode
      await checkOverflow('Team-Light', vp.width);
      await saveImage(`v18_team_roster_${vp.width}px.png`);

      // Dark mode
      await setTheme('dark');
      await checkOverflow('Team-Dark', vp.width);
      await saveImage(`v18_team_roster_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 4. VERIFYING PROOF VERIFICATION INBOX (?view=verification) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/department?view=verification` });
      await waitForSelector('.field-desk');
      await delay(400);

      await assertUrl('view=verification');
      await assertPageHeader('Proof before closure');
      if (vp.width > 780) {
        await assertActiveNav('verification');
      }

      // Light mode
      await checkOverflow('Verification-Light', vp.width);
      await saveImage(`v18_verification_${vp.width}px.png`);

      // Dark mode
      await setTheme('dark');
      await checkOverflow('Verification-Dark', vp.width);
      await saveImage(`v18_verification_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 5. VERIFYING VERIFIED WORK ARCHIVE (?view=field_archive) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/department?view=field_archive` });
      await waitForSelector('.field-desk');
      await delay(400);

      await assertUrl('view=field_archive');
      await assertPageHeader('The record of work completed');
      if (vp.width > 780) {
        await assertActiveNav('field_archive');
      }

      // Light mode
      await checkOverflow('FieldArchive-Light', vp.width);
      await saveImage(`v18_field_archive_${vp.width}px.png`);

      // Dark mode
      await setTheme('dark');
      await checkOverflow('FieldArchive-Dark', vp.width);
      await saveImage(`v18_field_archive_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 6. VERIFYING COMPLETED CASES ARCHIVE (?view=archive) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/department?view=archive` });
      await waitForSelector('.work-queue-container, .page-heading h1');
      await delay(400);

      await assertUrl('view=archive');
      await assertPageHeader('Completed cases');
      if (vp.width > 780) {
        await assertActiveNav('archive');
      }

      await checkOverflow('Archive-Light', vp.width);
      await saveImage(`v18_archive_${vp.width}px.png`);

      await setTheme('dark');
      await checkOverflow('Archive-Dark', vp.width);
      await saveImage(`v18_archive_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 7. VERIFYING PUBLIC KARACHI ISSUES MAP (/karachi-map) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/karachi-map` });
      await waitForSelector('.civic-issue-map-page, .civic-public-map');
      await delay(600);

      await assertUrl('/karachi-map');
      await assertPageHeader('Where the city needs attention');

      await checkOverflow('KarachiMap-Light', vp.width);
      await saveImage(`v18_karachi_map_${vp.width}px.png`);

      await setTheme('dark');
      await checkOverflow('KarachiMap-Dark', vp.width);
      await saveImage(`v18_karachi_map_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 8. VERIFYING CITIZEN REGISTRATION (/register) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/register` });
      await waitForSelector('form');
      await delay(400);

      await assertUrl('/register');
      await checkOverflow('Register-Light', vp.width);
      await saveImage(`v18_register_${vp.width}px.png`);
    }

    console.log('\n--- 9. VERIFYING CITIZEN TRACKER (/track) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/track` });
      await waitForSelector('#tracking-number-input, a[href="/karachi-map"]');
      await delay(400);

      await assertUrl('/track');
      await checkOverflow('Track-Light', vp.width);
      await saveImage(`v18_track_${vp.width}px.png`);
    }

    console.log('\n=== ALL V13.18 REAL BROWSER QA TESTS & STRICT ASSERTIONS PASSED ===');
  } finally {
    if (websocket) websocket.close();
    await stopProcess(chromeProc);
    await stopProcess(viteProc);
  }
}

main().catch(async (err) => {
  console.error('\n❌ QA Test Failure:', err);
  process.exit(1);
});
