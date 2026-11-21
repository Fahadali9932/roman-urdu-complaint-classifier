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
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), buf);
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
  console.log(`    [${label} @ ${width}px] window: ${info.windowWidth}px, docScroll: ${info.docScroll}px, overflow: ${overflow}px`);
  assert(overflow <= 2, `Horizontal overflow detected on ${label} @ ${width}px: ${overflow}px exceeds 2px tolerance`);
  return overflow;
};

async function assertPageHeader(expectedSubstring) {
  const heading = await evaluate(`
    (() => {
      const el = document.querySelector('h1, .overview-title, .detail-heading h1');
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
  console.log('=== V13.16.1 DEPARTMENT OPERATIONS REDESIGN REFINED BROWSER QA ===\n');

  const viteProc = await startViteServer();

  const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13161-qa-'));
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
  assert(afterLoginUrl === '/department', `Expected login to navigate to /department, got ${afterLoginUrl}`);

  const VIEWPORTS = [
    { name: '1440px Desktop Wide', width: 1440, height: 900 },
    { name: '1024px Desktop Standard', width: 1024, height: 768 },
    { name: '768px Tablet Portrait', width: 768, height: 1024 },
    { name: '393px Mobile Standard', width: 393, height: 852 },
    { name: '320px Mobile Narrowest', width: 320, height: 640 },
  ];

  console.log('\n--- 2. VERIFYING OVERVIEW PAGE (LIGHT & DARK MODES ACROSS ALL 5 VIEWPORTS) ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=overview` });
    await waitForSelector('.overview-page, .overview-title, h1');
    await delay(400);

    // Assert URL, Header, Active Nav, Visible Elements
    await assertUrl('view=overview');
    await assertPageHeader('Good work starts here');
    if (vp.width > 780) {
      await assertActiveNav('overview');
    }
    const hasFeatureBand = await evaluate(`Boolean(document.querySelector('.overview-feature-band'))`);
    assert(hasFeatureBand, 'Expected .overview-feature-band to be visible on Overview page');
    const hasFactsStrip = await evaluate(`Boolean(document.querySelector('.overview-facts-strip'))`);
    assert(hasFactsStrip, 'Expected .overview-facts-strip to be visible on Overview page');

    // Light mode verification
    await setTheme('light');
    await checkOverflow('Overview-Light', vp.width);
    await saveImage(`dept_overview_${vp.width}px.png`);

    // Dark mode verification
    await setTheme('dark');
    await checkOverflow('Overview-Dark', vp.width);
    await saveImage(`dept_overview_dark_${vp.width}px.png`);

    // Reset to light
    await setTheme('light');
  }

  console.log('\n--- 3. VERIFYING WORK QUEUE CASES VIEW (LIGHT & DARK MODES ACROSS ALL 5 VIEWPORTS) ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=queue` });
    await waitForSelector('.list-shell, .case-row');
    await delay(400);

    await assertUrl('view=queue');
    await assertPageHeader('Work queue');
    if (vp.width > 780) {
      await assertActiveNav('queue');
    }

    const caseRowCount = await evaluate(`document.querySelectorAll('.case-row').length`);
    assert(caseRowCount > 0, `Expected at least 1 case row in Work Queue, found ${caseRowCount}`);
    console.log(`    ✓ Case rows verified: ${caseRowCount} rows`);

    // Light mode
    await setTheme('light');
    await checkOverflow('WorkQueue-Cases-Light', vp.width);
    await saveImage(`dept_work_queue_cases_${vp.width}px.png`);

    // Dark mode
    await setTheme('dark');
    await checkOverflow('WorkQueue-Cases-Dark', vp.width);
    await saveImage(`dept_work_queue_cases_dark_${vp.width}px.png`);

    await setTheme('light');
  }

  console.log('\n--- 4. VERIFYING WORK QUEUE INDIVIDUAL REPORTS VIEW (LIGHT & DARK MODES ACROSS ALL 5 VIEWPORTS) ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=queue` });
    await waitForSelector('.segment, .viewbar');
    await delay(300);

    // Switch to Individual Reports mode
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('.segment button'));
        const reportsBtn = buttons.find(b => /reports|individual/i.test(b.innerText));
        if (reportsBtn) reportsBtn.click();
      })()
    `);
    await delay(500);

    const isReportsActive = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.segment button')).find(b => /reports|individual/i.test(b.innerText));
        return btn ? btn.classList.contains('active') : false;
      })()
    `);
    assert(isReportsActive, 'Expected Individual Reports segment button to be active');

    const reportRowCount = await evaluate(`document.querySelectorAll('.case-row').length`);
    assert(reportRowCount > 0, `Expected report rows in Individual Reports mode, found ${reportRowCount}`);
    console.log(`    ✓ Individual report rows: ${reportRowCount} items`);

    // Light mode
    await setTheme('light');
    await checkOverflow('WorkQueue-Reports-Light', vp.width);
    await saveImage(`dept_work_queue_reports_${vp.width}px.png`);

    // Dark mode
    await setTheme('dark');
    await checkOverflow('WorkQueue-Reports-Dark', vp.width);
    await saveImage(`dept_work_queue_reports_dark_${vp.width}px.png`);

    await setTheme('light');
  }

  console.log('\n--- 5. VERIFYING WORK QUEUE SEARCH DEBOUNCE & FILTER ---');
  await setViewport(1440, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department?view=queue` });
  await waitForSelector('.searchbox input');
  await evaluate(`
    (() => {
      const search = document.querySelector('.searchbox input');
      if (search) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(search, 'University');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await delay(600);
  const filteredCaseCount = await evaluate(`document.querySelectorAll('.case-row').length`);
  assert(filteredCaseCount > 0, 'Expected filtered case rows for search "University"');
  console.log(`    ✓ Search filtered cases: ${filteredCaseCount} matching cases`);
  await saveImage('dept_work_queue_search_filter.png');

  console.log('\n--- 6. VERIFYING CASE DETAIL PAGE (ALL 4 REAL TABS & BACK NAVIGATION) ---');
  // Open first case
  await setViewport(1440, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department?view=queue` });
  await waitForSelector('.case-row[data-open]');
  const expectedTitle = await evaluate(`
    (() => {
      const firstCase = document.querySelector('.case-row[data-open]');
      if (!firstCase) return '';
      const titleEl = firstCase.querySelector('.case-title');
      return titleEl ? (titleEl.getAttribute('title') || titleEl.innerText.replace(/●\s*Urgent/i, '').trim()) : '';
    })()
  `);
  console.log(`    Opening case: "${expectedTitle}"`);
  await evaluate(`
    (() => {
      const firstCase = document.querySelector('.case-row[data-open]');
      if (firstCase) firstCase.click();
    })()
  `);
  await waitForSelector('.case-detail-container', 15000);
  await delay(500);

  // Assert Case Detail view opened
  const isCaseDetailRendered = await evaluate(`Boolean(document.querySelector('.case-detail-container'))`);
  assert(isCaseDetailRendered, 'Case detail container failed to render');
  await assertPageHeader(expectedTitle ? expectedTitle.substring(0, 15) : 'Open manhole');
  console.log('    ✓ Case Detail successfully opened');

  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await checkOverflow('CaseDetail-Overview-Light', vp.width);
    await saveImage(`dept_case_detail_overview_${vp.width}px.png`);

    await setTheme('dark');
    await checkOverflow('CaseDetail-Overview-Dark', vp.width);
    await saveImage(`dept_case_detail_overview_dark_${vp.width}px.png`);
    await setTheme('light');
  }

  // Tab 1: Overview Tab assertion
  await setViewport(1440, 900);
  const overviewSummaryVisible = await evaluate(`Boolean(document.querySelector('.detail-brief'))`);
  assert(overviewSummaryVisible, 'Expected .detail-brief in Overview tab');
  console.log('    ✓ Tab 1 (Overview) asserted and verified');

  // Tab 2: Reports Tab
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.detail-tabs button'));
      const t = tabs.find(b => /reports/i.test(b.innerText));
      if (t) t.click();
    })()
  `);
  await delay(600);
  const reportsTabSelected = await evaluate(`
    (() => {
      const tab = Array.from(document.querySelectorAll('.detail-tabs button')).find(b => /reports/i.test(b.innerText));
      return tab ? (tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active')) : false;
    })()
  `);
  assert(reportsTabSelected, 'Reports tab failed to become active');
  const hasReportItems = await evaluate(`Boolean(document.querySelector('.report-line, .empty-state'))`);
  assert(hasReportItems, 'Expected report rows or empty state in Reports tab');
  console.log('    ✓ Tab 2 (Reports) asserted and verified');
  await saveImage('dept_case_detail_reports_tab_1440px.png');

  // Tab 3: Activity Tab
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.detail-tabs button'));
      const t = tabs.find(b => /activity/i.test(b.innerText));
      if (t) t.click();
    })()
  `);
  await delay(600);
  const activityTabSelected = await evaluate(`
    (() => {
      const tab = Array.from(document.querySelectorAll('.detail-tabs button')).find(b => /activity/i.test(b.innerText));
      return tab ? (tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active')) : false;
    })()
  `);
  assert(activityTabSelected, 'Activity tab failed to become active');
  console.log('    ✓ Tab 3 (Activity) asserted and verified');
  await saveImage('dept_case_detail_activity_tab_1440px.png');

  // Tab 4: Work / Action Tab
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.detail-tabs button'));
      const t = tabs.find(b => /work/i.test(b.innerText));
      if (t) t.click();
    })()
  `);
  await delay(600);
  const workTabSelected = await evaluate(`
    (() => {
      const tab = Array.from(document.querySelectorAll('.detail-tabs button')).find(b => /work/i.test(b.innerText));
      return tab ? (tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active')) : false;
    })()
  `);
  assert(workTabSelected, 'Work tab failed to become active');
  console.log('    ✓ Tab 4 (Work) asserted and verified');
  await saveImage('dept_case_detail_work_tab_1440px.png');

  // Back button navigation
  await evaluate(`
    (() => {
      const back = document.querySelector('.case-detail-container .back-link, button.back-link');
      if (back) back.click();
    })()
  `);
  await delay(600);
  const returnedToList = await evaluate(`Boolean(document.querySelector('.list-shell'))`);
  assert(returnedToList, 'Back button failed to return to Work Queue');
  console.log('    ✓ Case Detail back navigation successfully verified');

  console.log('\n--- 7. VERIFYING AREAS COVERAGE PAGE (LIGHT & DARK MODES ACROSS ALL 5 VIEWPORTS) ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=areas` });
    await waitForSelector('.area-row, .area-head');
    await delay(400);

    await assertUrl('view=areas');
    await assertPageHeader('Areas');
    if (vp.width > 780) {
      await assertActiveNav('areas');
    }

    const miniStatCount = await evaluate(`document.querySelectorAll('.mini-stat').length`);
    assert(miniStatCount === 3, `Expected 3 mini-stat KPI cards, found ${miniStatCount}`);
    const areaRowCount = await evaluate(`document.querySelectorAll('.area-row').length`);
    assert(areaRowCount > 0, `Expected area rows, found ${areaRowCount}`);

    // Verify KPI height is not excessive
    const statHeight = await evaluate(`document.querySelector('.mini-stat').getBoundingClientRect().height`);
    assert(statHeight <= 95, `Areas KPI card height ${statHeight}px exceeds 95px maximum threshold`);
    console.log(`    ✓ Mini stat height checked: ${statHeight}px (compact, not excessive)`);

    // Light mode
    await setTheme('light');
    await checkOverflow('Areas-Light', vp.width);
    await saveImage(`dept_areas_${vp.width}px.png`);

    // Dark mode
    await setTheme('dark');
    await checkOverflow('Areas-Dark', vp.width);
    await saveImage(`dept_areas_dark_${vp.width}px.png`);

    await setTheme('light');
  }

  console.log('\n--- 8. VERIFYING PRIORITY ESCALATION QUEUE (LIGHT & DARK MODES ACROSS ALL 5 VIEWPORTS) ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=priority` });
    await waitForSelector('.ops-priority-toolbar, .tabbar, h1');
    await delay(400);

    await assertUrl('view=priority');
    await assertPageHeader('Priority queue');
    if (vp.width > 780) {
      await assertActiveNav('priority');
    }

    // Verify priority CTA button text and icon wrapping
    const ctaWrapCheck = await evaluate(`
      (() => {
        const btn = document.querySelector('.ops-open-case');
        if (!btn) return { exists: false };
        const svg = btn.querySelector('svg');
        const btnRect = btn.getBoundingClientRect();
        const svgRect = svg ? svg.getBoundingClientRect() : null;
        return {
          exists: true,
          btnHeight: btnRect.height,
          svgAligned: svgRect ? Math.abs((btnRect.top + btnRect.height / 2) - (svgRect.top + svgRect.height / 2)) < 8 : true
        };
      })()
    `);
    if (ctaWrapCheck.exists) {
      assert(ctaWrapCheck.btnHeight <= 48, `Priority CTA button height ${ctaWrapCheck.btnHeight}px indicates wrapping`);
      assert(ctaWrapCheck.svgAligned, 'Priority CTA SVG icon appears vertically displaced or wrapped');
      console.log('    ✓ Priority CTA icon layout verified: no wrapping');
    }

    // Light mode
    await setTheme('light');
    await checkOverflow('Priority-Light', vp.width);
    await saveImage(`dept_priority_${vp.width}px.png`);

    // Dark mode
    await setTheme('dark');
    await checkOverflow('Priority-Dark', vp.width);
    await saveImage(`dept_priority_dark_${vp.width}px.png`);

    await setTheme('light');
  }

  console.log('\n--- 9. VERIFYING KMC CLARIFICATION & ROUTING REVIEW QUEUE (ACTUALLY SHOWS REVIEW QUEUE) ---');
  for (const vp of VIEWPORTS) {
    await setViewport(vp.width, vp.height);
    await request('Page.navigate', { url: `${ORIGIN}/department?view=review` });
    await waitForSelector('.page-heading h1');
    await delay(400);

    await assertUrl('view=review');
    await assertPageHeader('Review Queue');
    if (vp.width > 780) {
      await assertActiveNav('review');
    }

    const headingText = await evaluate(`document.querySelector('.page-heading h1').innerText.trim()`);
    assert(headingText === 'Review Queue', `Expected h1 to be 'Review Queue', found '${headingText}'`);
    console.log(`    ✓ Review Queue confirmed visible with correct title: "${headingText}"`);

    // Light mode
    await setTheme('light');
    await checkOverflow('ReviewQueue-Light', vp.width);
    await saveImage(`dept_review_queue_${vp.width}px.png`);

    // Dark mode
    await setTheme('dark');
    await checkOverflow('ReviewQueue-Dark', vp.width);
    await saveImage(`dept_review_queue_dark_${vp.width}px.png`);

    await setTheme('light');
  }

  console.log('\n--- 10. VERIFYING MOBILE DRAWER ON 393px ---');
  await setViewport(393, 852);
  await request('Page.navigate', { url: `${ORIGIN}/department?view=overview` });
  await waitForSelector('button.mobile-menu');
  await delay(300);

  // Click hamburger menu
  const burgerClicked = await evaluate(`
    (() => {
      const burger = document.querySelector('button.mobile-menu');
      if (burger) {
        burger.click();
        return true;
      }
      return false;
    })()
  `);
  assert(burgerClicked, 'Could not find or click button.mobile-menu');
  await delay(400);

  const isDrawerOpen = await evaluate(`
    (() => {
      const sidebar = document.getElementById('sidebar');
      const shade = document.getElementById('mobileShade');
      return Boolean(sidebar && sidebar.classList.contains('mobile-open') && shade && !shade.hidden);
    })()
  `);
  assert(isDrawerOpen, 'Mobile drawer failed to open on hamburger click');
  console.log('    ✓ Mobile drawer opened and asserted');
  await saveImage('dept_mobile_drawer_393px.png');

  // Close drawer
  await evaluate(`
    (() => {
      const shade = document.getElementById('mobileShade');
      if (shade) shade.click();
    })()
  `);
  await delay(300);

  console.log('\n--- 11. VERIFYING DESKTOP SIDEBAR COLLAPSE ON 1440px ---');
  await setViewport(1440, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department?view=overview` });
  await waitForSelector('#collapseButton');
  await delay(300);

  await evaluate(`
    (() => {
      const toggle = document.getElementById('collapseButton');
      if (toggle) toggle.click();
    })()
  `);
  await delay(400);

  const isCollapsed = await evaluate(`
    (() => {
      const sidebar = document.getElementById('sidebar');
      return Boolean(sidebar && sidebar.classList.contains('collapsed'));
    })()
  `);
  assert(isCollapsed, 'Sidebar failed to collapse on toggle click');
  console.log('    ✓ Sidebar collapse asserted');
  await saveImage('dept_desktop_sidebar_collapsed_1440px.png');

  // Restore sidebar
  await evaluate(`
    (() => {
      const toggle = document.getElementById('collapseButton') || document.querySelector('.collapse-btn');
      if (toggle) toggle.click();
    })()
  `);
  await delay(300);

  // Clean shutdown
  if (viteProc.pid) await killProcessTree(viteProc.pid);
  if (chromeProc.pid) await killProcessTree(chromeProc.pid);

  console.log('\n=== ALL V13.16.1 REAL BROWSER QA TESTS & STRICT ASSERTIONS PASSED ===');
}

main().catch(async (err) => {
  console.error('\n❌ QA Test Failure:', err);
  process.exit(1);
});
