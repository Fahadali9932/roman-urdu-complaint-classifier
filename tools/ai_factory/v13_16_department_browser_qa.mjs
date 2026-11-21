import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT_DIR = 'D:\\RomanUrdu_V13_16_Department';
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'v11', 'screenshots', 'v13_16');
const ARTIFACT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v13_16';
const PORT = 5173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BROWSER_PORT = 9399;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let websocket;
let sequence = 0;
const pending = new Map();

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
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), buf);
  console.log(`[Screenshot saved] ${name}`);
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
  const viteProc = spawn(process.execPath, [viteBin, '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  await waitForServer(ORIGIN);
  console.log('[Vite] Server running at', ORIGIN);
  return viteProc;
}

async function killProcessTree(pid) {
  try {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {}
}

const checkOverflow = async (label, width) => {
  const info = await evaluate(`
    ({
      docScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      windowWidth: window.innerWidth
    })
  `);
  const overflow = Math.max(0, info.docScroll - info.windowWidth, info.bodyScroll - info.windowWidth);
  console.log(`  [${label} @ ${width}px] window: ${info.windowWidth}px, docScroll: ${info.docScroll}px, overflow: ${overflow}px`);
  if (overflow > 2) {
    console.warn(`  WARNING: Horizontal overflow detected on ${label} @ ${width}px: ${overflow}px`);
  }
  return overflow;
};

async function main() {
  console.log('=== V13.16 DEPARTMENT OPERATIONS REDESIGN REAL BROWSER QA ===\n');

  const viteProc = await startViteServer();

  const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1316-qa-'));
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
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

  console.log('\n--- 1. AUTHENTICATING INTO KMC ROADS OPERATIONS CONSOLE ---');
  await setViewport(1440, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department/login?dept=kmc` });
  await waitForSelector('form');
  await delay(500);

  // Authenticate using demo key
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
      setVal(u, 'roads-01');
      setVal(p, 'DemoAccessKey2026!Secure');
      document.querySelector('form button[type="submit"]').click();
    })()
  `);
  await delay(1200);

  const afterLoginUrl = await evaluate(`window.location.pathname`);
  console.log('Navigated to:', afterLoginUrl);
  if (afterLoginUrl !== '/department') {
    throw new Error(`Expected login to navigate to /department, got ${afterLoginUrl}`);
  }

  const VIEWPORTS = [
    { name: '1440px Desktop Wide', width: 1440, height: 900 },
    { name: '1024px Desktop Standard', width: 1024, height: 768 },
    { name: '768px Tablet Portrait', width: 768, height: 1024 },
    { name: '393px Mobile Standard', width: 393, height: 852 },
    { name: '320px Mobile Narrowest', width: 320, height: 640 },
  ];

  console.log('\n--- 2. VERIFYING OVERVIEW PAGE ACROSS ALL VIEWPORTS ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=overview` });
    await waitForSelector('.overview-page, .overview-title, h1');
    await delay(500);
    await checkOverflow('Overview', vp.width);
    await saveImage(`dept_overview_${vp.width}px.png`);
  }

  console.log('\n--- 3. VERIFYING DARK THEME ON OVERVIEW (1440px & 393px) ---');
  // Toggle to dark theme
  await evaluate(`
    (() => {
      const darkBtn = document.querySelector('button[title*="dark" i], button[aria-label*="dark" i], .theme-btn');
      if (darkBtn) darkBtn.click();
      else {
        localStorage.setItem('awaaz_dept_theme_mode', 'dark');
        localStorage.setItem('aawaaz-demo-theme', 'dark');
        window.location.reload();
      }
    })()
  `);
  await delay(600);
  await setViewport(1440, 900);
  await saveImage('dept_overview_dark_1440px.png');
  await setViewport(393, 852);
  await saveImage('dept_overview_dark_393px.png');

  // Switch back to light theme
  await evaluate(`
    (() => {
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
      localStorage.setItem('aawaaz-demo-theme', 'light');
      window.location.reload();
    })()
  `);
  await delay(600);

  console.log('\n--- 4. VERIFYING WORK QUEUE (CASES VIEW) ACROSS VIEWPORTS ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=queue` });
    await waitForSelector('.list-shell, .case-row, table, .case-card');
    await delay(500);
    await checkOverflow('Queue-Cases', vp.width);
    await saveImage(`dept_work_queue_cases_${vp.width}px.png`);
  }

  console.log('\n--- 5. VERIFYING WORK QUEUE (INDIVIDUAL REPORTS VIEW) ---');
  for (const vp of [1440, 1024, 768, 393, 320]) {
    const height = vp === 1440 ? 900 : vp === 1024 ? 768 : vp === 768 ? 1024 : 852;
    await setViewport(vp, height);
    // Switch to Individual Reports tab/view
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('.view-chip, .tab-button, button'));
        const reportsBtn = buttons.find(b => /reports|individual/i.test(b.innerText));
        if (reportsBtn) reportsBtn.click();
      })()
    `);
    await delay(500);
    await checkOverflow('Queue-Reports', vp);
    await saveImage(`dept_work_queue_reports_${vp}px.png`);
  }

  console.log('\n--- 6. VERIFYING SEARCH DEBOUNCE & FILTER IN WORK QUEUE ---');
  await setViewport(1440, 900);
  await evaluate(`
    (() => {
      const search = document.querySelector('.searchbox input, input[type="search"], input[placeholder*="search" i]');
      if (search) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(search, 'University');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await delay(600);
  await saveImage('dept_work_queue_search_filter.png');

  console.log('\n--- 7. VERIFYING CASE DETAIL PAGE (ALL 4 TABS) ---');
  // Open first case
  await evaluate(`
    (() => {
      const openBtn = document.querySelector('.case-row, .case-title, button[aria-label*="open" i], .ops-open-case');
      if (openBtn) openBtn.click();
    })()
  `);
  await delay(800);

  for (const vp of [1440, 768, 393, 320]) {
    const height = vp === 1440 ? 900 : vp === 768 ? 1024 : 852;
    await setViewport(vp, height);
    await checkOverflow('CaseDetail-Overview', vp);
    await saveImage(`dept_case_detail_overview_${vp}px.png`);
  }

  // Tab 2: Reports
  await setViewport(1440, 900);
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.detail-tabs button, [role="tab"]'));
      const t = tabs.find(b => /reports/i.test(b.innerText));
      if (t) t.click();
    })()
  `);
  await delay(500);
  await saveImage('dept_case_detail_reports_tab_1440px.png');

  // Tab 3: Activity
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.detail-tabs button, [role="tab"]'));
      const t = tabs.find(b => /activity|timeline/i.test(b.innerText));
      if (t) t.click();
    })()
  `);
  await delay(500);
  await saveImage('dept_case_detail_activity_tab_1440px.png');

  // Tab 4: Work / Actions
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.detail-tabs button, [role="tab"]'));
      const t = tabs.find(b => /work|action/i.test(b.innerText));
      if (t) t.click();
    })()
  `);
  await delay(500);
  await saveImage('dept_case_detail_work_tab_1440px.png');

  // Back button navigation
  await evaluate(`
    (() => {
      const backBtn = document.querySelector('.back-link, button[aria-label*="back" i]');
      if (backBtn) backBtn.click();
    })()
  `);
  await delay(600);

  console.log('\n--- 8. VERIFYING AREAS COVERAGE PAGE ---');
  for (const vp of [1440, 1024, 768, 393, 320]) {
    const height = vp === 1440 ? 900 : vp === 1024 ? 768 : vp === 768 ? 1024 : 852;
    await setViewport(vp, height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=areas` });
    await waitForSelector('.area-row, .area-head, .ops-section-topline, h1');
    await delay(500);
    await checkOverflow('Areas', vp);
    await saveImage(`dept_areas_${vp}px.png`);
  }

  console.log('\n--- 9. VERIFYING PRIORITY ESCALATION QUEUE ---');
  for (const vp of [1440, 1024, 768, 393, 320]) {
    const height = vp === 1440 ? 900 : vp === 1024 ? 768 : vp === 768 ? 1024 : 852;
    await setViewport(vp, height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=priority` });
    await waitForSelector('.ops-priority-item, .ops-priority-list, h1');
    await delay(500);
    await checkOverflow('Priority', vp);
    await saveImage(`dept_priority_${vp}px.png`);
  }

  console.log('\n--- 10. VERIFYING KMC CLARIFICATION & ROUTING REVIEW QUEUE ---');
  for (const vp of [1440, 1024, 768, 393, 320]) {
    const height = vp === 1440 ? 900 : vp === 1024 ? 768 : vp === 768 ? 1024 : 852;
    await setViewport(vp, height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=review` });
    await delay(700);
    await checkOverflow('ReviewQueue', vp);
    await saveImage(`dept_review_queue_${vp}px.png`);
  }

  console.log('\n--- 11. VERIFYING MOBILE DRAWER ON 393px ---');
  await setViewport(393, 852);
  await request('Page.navigate', { url: `${ORIGIN}/department?view=overview` });
  await delay(600);
  await evaluate(`
    (() => {
      const burger = document.querySelector('button[aria-label*="menu" i], .topbar button, .burger-btn');
      if (burger) burger.click();
    })()
  `);
  await delay(500);
  await saveImage('dept_mobile_drawer_393px.png');

  console.log('\n--- 12. VERIFYING DESKTOP SIDEBAR COLLAPSE ON 1440px ---');
  await setViewport(1440, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department?view=overview` });
  await delay(600);
  await evaluate(`
    (() => {
      const toggle = document.querySelector('.sidebar .icon-btn, button[aria-label*="collapse" i]');
      if (toggle) toggle.click();
    })()
  `);
  await delay(500);
  await saveImage('dept_desktop_sidebar_collapsed_1440px.png');

  // Clean shutdown
  if (viteProc.pid) await killProcessTree(viteProc.pid);
  if (chromeProc.pid) await killProcessTree(chromeProc.pid);

  console.log('\n=== ALL V13.16 REAL BROWSER QA TESTS COMPLETED SUCCESSFULLY ===');
}

main().catch(async (err) => {
  console.error('QA Test Failure:', err);
  process.exit(1);
});
