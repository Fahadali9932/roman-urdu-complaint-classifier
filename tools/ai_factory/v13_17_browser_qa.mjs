import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCREENSHOT_DIR = process.env.AWAAZ_QA_SCREENSHOT_DIR || path.join(ROOT_DIR, 'docs', 'v11', 'screenshots', 'v13_17');
const ARTIFACT_DIR = process.env.AWAAZ_QA_ARTIFACT_DIR || 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v13_17';
let PORT;
let ORIGIN;
let BROWSER_PORT;
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/chromium');

const QA_STAFF_USERNAME = process.env.AWAAZ_QA_STAFF_USERNAME || 'roads-01';
const QA_STAFF_ACCESS_KEY = process.env.AWAAZ_QA_STAFF_ACCESS_KEY || 'DemoAccessKey2026!Secure';

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
      const el = document.querySelector('h1, .page-heading h1, .civic-map-heading h1');
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
  console.log('=== V13.17 GEO EVIDENCE, PUBLIC MAP & COMPLETED CASES ARCHIVE BROWSER QA ===\n');

  PORT = await freePort();
  ORIGIN = `http://127.0.0.1:${PORT}`;
  BROWSER_PORT = await freePort();
  let viteProc;
  let chromeProc;
  try {
    viteProc = await startViteServer();

    const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1317-qa-'));
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
      packet.error ? entry.reject(new Error(packet.error.message)) : entry.resolve(packet.result);
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

    console.log('\n--- 2. VERIFYING COMPLETED CASES ARCHIVE (?view=archive) ACROSS 5 VIEWPORTS ---');
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

      // Check search input presence
      const hasSearch = await evaluate(`Boolean(document.querySelector('input#searchBox'))`);
      assert(hasSearch, 'Expected search box in Completed cases archive');

      // Check active tab chip says "Archived resolutions"
      const activeChip = await evaluate(`
        (() => {
          const chip = document.querySelector('.view-chip.active');
          return chip ? chip.innerText.trim() : '';
        })()
      `);
      assert(activeChip.includes('Archived resolutions'), `Expected chip "Archived resolutions", got "${activeChip}"`);
      console.log(`    ✓ Active chip asserted: "${activeChip}"`);

      // Light mode verification
      await setTheme('light');
      await checkOverflow('Archive-Light', vp.width);
      await saveImage(`dept_archive_${vp.width}px.png`);

      // Dark mode verification
      await setTheme('dark');
      await checkOverflow('Archive-Dark', vp.width);
      await saveImage(`dept_archive_dark_${vp.width}px.png`);

      await setTheme('light');
    }

    console.log('\n--- 3. VERIFYING PUBLIC KARACHI ISSUES MAP (/karachi-map) ACROSS 5 VIEWPORTS ---');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/karachi-map` });
      await waitForSelector('.civic-issue-map-page, .civic-public-map');
      await delay(600);

      await assertUrl('/karachi-map');
      await assertPageHeader('Where the city needs attention');

      // Check toolbar filters
      const hasCategorySelect = await evaluate(`Boolean(document.querySelector('select#map-category'))`);
      const hasPeriodSelect = await evaluate(`Boolean(document.querySelector('select#map-period'))`);
      const hasRefreshBtn = await evaluate(`Boolean(document.querySelector('button[aria-label="Refresh map"]'))`);
      assert(hasCategorySelect, 'Expected Service category filter dropdown');
      assert(hasPeriodSelect, 'Expected Reported Period filter dropdown');
      assert(hasRefreshBtn, 'Expected Refresh map button');
      console.log('    ✓ Map toolbar controls verified (category, period, refresh)');

      // Check Leaflet map container and tiles
      const hasMap = await evaluate(`Boolean(document.querySelector('.civic-public-map.leaflet-container'))`);
      assert(hasMap, 'Expected Leaflet map container with .leaflet-container');

      // Check privacy notice (8 reports threshold)
      const privacyText = await evaluate(`document.querySelector('.civic-map-privacy')?.innerText || ''`);
      assert(privacyText.includes('at least eight confirmed'), `Expected privacy notice with 8-complaint threshold, got "${privacyText}"`);
      console.log('    ✓ Privacy notice verified: 8+ confirmed complaints threshold disclosed');

      // Light mode verification
      await checkOverflow('KarachiMap-Light', vp.width);
      await saveImage(`public_karachi_map_${vp.width}px.png`);

      // Dark mode verification
      await setTheme('dark');
      await checkOverflow('KarachiMap-Dark', vp.width);
      await saveImage(`public_karachi_map_dark_${vp.width}px.png`);
      await setTheme('light');
    }

    console.log('\n--- 4. VERIFYING CITIZEN TRACKER (/track) WITH KARACHI MAP LINK ---');
    for (const vp of [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[4]]) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/track` });
      await waitForSelector('#tracking-number-input, a[href="/karachi-map"]');
      await delay(400);

      await assertUrl('/track');
      const hasMapLink = await evaluate(`
        (() => {
          const link = document.querySelector('a[href="/karachi-map"]');
          return link ? link.innerText.trim() : '';
        })()
      `);
      assert(hasMapLink.includes('Karachi'), `Expected link to /karachi-map, found "${hasMapLink}"`);
      console.log(`    ✓ Karachi Map link asserted on /track: "${hasMapLink}"`);

      await checkOverflow('CitizenTrack', vp.width);
      await saveImage(`citizen_track_${vp.width}px.png`);
    }

    console.log('\n--- 5. VERIFYING CITIZEN COMPLAINT FORM (/submit STEP 1, STEP 2 INCIDENT PIN PICKER, STEP 3 PHOTO UPLOAD) ---');
    for (const vp of [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[4]]) {
      await setViewport(vp.width, vp.height);
      await request('Page.navigate', { url: `${ORIGIN}/submit` });
      await waitForSelector('input#citizenName');
      await delay(400);

      // Fill Step 1 Applicant Details
      await evaluate(`
        (() => {
          const setVal = (el, val) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          setVal(document.querySelector('input#citizenName'), 'Fahad Ali');
          setVal(document.querySelector('input#citizenPhone'), '03001234567');
          const submitBtn = document.querySelector('form button[type="submit"]');
          if (submitBtn) submitBtn.click();
        })()
      `);
      await delay(800);

      // In Step 2: Assert Incident Pin Picker is rendered
      await waitForSelector('.incident-pin-picker');
      const hasPinPicker = await evaluate(`Boolean(document.querySelector('.incident-pin-picker'))`);
      assert(hasPinPicker, 'Expected .incident-pin-picker in Step 2 of complaint submission');
      const hasPickerMap = await evaluate(`Boolean(document.querySelector('.incident-picker-map.leaflet-container'))`);
      assert(hasPickerMap, 'Expected Leaflet container in incident pin picker');
      const hasOptInGpsBtn = await evaluate(`
        (() => {
          const btn = Array.from(document.querySelectorAll('.incident-picker-actions button')).find(b => /location|gps/i.test(b.innerText));
          return Boolean(btn);
        })()
      `);
      assert(hasOptInGpsBtn, 'Expected opt-in "Use my location" button in incident pin picker');
      console.log(`    ✓ [${vp.name}] Step 2 Incident Pin Picker, Leaflet map, and opt-in GPS button verified`);

      await checkOverflow('Submit-Step2-PinPicker', vp.width);
      await saveImage(`citizen_submit_step2_pinpicker_${vp.width}px.png`);

      // Fill Step 2 Location details and select a locality from combobox
      await evaluate(`
        (() => {
          const setVal = (el, val) => {
            if (!el) return;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          setVal(document.querySelector('input#publicLocation'), 'Main University Road near NED');
          setVal(document.querySelector('input#applicantAddress'), 'Flat 402, Block 13-D, Gulshan-e-Iqbal');
          const locInput = document.querySelector('input#locality');
          if (locInput) {
            locInput.focus();
            setVal(locInput, 'Gulshan-e-Iqbal');
          }
        })()
      `);
      await delay(400);

      // Select first option in locality listbox if present
      await evaluate(`
        (() => {
          const firstOption = document.querySelector('li[role="option"]');
          if (firstOption) {
            firstOption.click();
          } else {
            const distSelect = document.querySelector('select#district');
            if (distSelect) {
              distSelect.value = 'east';
              distSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        })()
      `);
      await delay(300);

      // Submit Step 2 to advance to Step 3
      await evaluate(`
        (() => {
          const submitBtn = document.querySelector('form button[type="submit"]');
          if (submitBtn) submitBtn.click();
        })()
      `);
      await delay(800);

      // In Step 3: Verify optional photo uploader advisory and input
      await waitForSelector('input#incident-photo');
      const hasPhotoUpload = await evaluate(`Boolean(document.querySelector('input#incident-photo'))`);
      assert(hasPhotoUpload, 'Expected input#incident-photo in Step 3');
      const photoAccept = await evaluate(`document.querySelector('input#incident-photo')?.getAttribute('accept') || ''`);
      assert(photoAccept.includes('image/jpeg') && photoAccept.includes('image/png') && photoAccept.includes('image/webp'),
        `Expected photo input to accept jpeg, png, webp, got "${photoAccept}"`);
      console.log(`    ✓ [${vp.name}] Step 3 Photo upload input and accepted formats verified: ${photoAccept}`);

      await checkOverflow('Submit-Step3-PhotoUpload', vp.width);
      await saveImage(`citizen_submit_step3_photoupload_${vp.width}px.png`);
    }

    console.log('\n=== ALL V13.17 BROWSER QA TESTS & STRICT ASSERTIONS PASSED ===');
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
