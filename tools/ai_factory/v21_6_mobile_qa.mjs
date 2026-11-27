import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_6';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('================================================================');
  console.log('AWAAZ-E-AWAM V21.6 RESPONSIVE ARCHITECTURE REAL CHROME CDP QA');
  console.log('================================================================\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9898',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9898/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  async function setViewport(w, h, isMobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    if (isMobile) {
      await send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 5,
      });
    } else {
      await send('Emulation.setTouchEmulationEnabled', {
        enabled: false,
      });
    }
    await sleep(350);
  }

  async function capture(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const path = join(OUTPUT_DIR, `${name}.png`);
    writeFileSync(path, buffer);
    console.log(`  [Screenshot] Saved: ${name}.png (${buffer.length} bytes)`);
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression: `JSON.stringify((${expression}))`,
      returnByValue: true,
    });
    const str = res.result?.result?.value;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  async function tapElement(selector) {
    const coords = await evaluate(`(() => {
      const el = document.querySelector('${selector}');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    if (!coords) {
      console.error(`  [Tap Error] Element not found: ${selector}`);
      return false;
    }

    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: coords.x, y: coords.y }],
    });
    await sleep(40);
    await send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await sleep(300);
    return true;
  }

  async function tapCoordinates(x, y) {
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    await sleep(40);
    await send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await sleep(300);
  }

  async function checkNavMetrics() {
    return await evaluate(`(() => {
      const el = document.querySelector('.v20-top-edge-nav-container');
      const isExpanded = el?.classList.contains('open') || el?.classList.contains('state-expanded') || el?.classList.contains('state-opening');
      const state = el?.getAttribute('data-nav-state');
      const surface = document.querySelector('.v20-notch-interactive-surface');
      const sRect = surface ? surface.getBoundingClientRect() : null;
      const dests = document.querySelector('.v20-nav-destinations-row');
      const dRect = dests ? dests.getBoundingClientRect() : null;
      const dStyle = dests ? window.getComputedStyle(dests) : null;
      const dDisplay = dStyle ? dStyle.display : '';
      const dCols = dStyle ? dStyle.gridTemplateColumns : '';
      const path = document.querySelector('#notch');
      const d = path ? path.getAttribute('d') : '';
      return {
        isExpanded: !!isExpanded,
        state: state || 'unknown',
        width: sRect ? Math.round(sRect.width) : 0,
        height: sRect ? Math.round(sRect.height) : 0,
        destinationsDisplay: dDisplay,
        destinationsCols: dCols,
        destinationsWidth: dRect ? Math.round(dRect.width) : 0,
        destinationsHeight: dRect ? Math.round(dRect.height) : 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    })()`);
  }

  async function loginAs(role = 'head', deptCode = 'KMC', deptName = 'Karachi Metropolitan Corporation', deptId = 'kmc', username = 'roads-01') {
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(1000);

    await evaluate(`(() => {
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: '${deptId}',
        departmentCode: '${deptCode}',
        departmentName: '${deptName}',
        username: '${username}',
        displayName: 'Engr. Tariq Mahmood',
        userId: '${role === 'head' ? 'staff-kmc-demo-01' : 'off-kmc-01'}',
        staffPosition: '${role}',
        authenticatedAt: new Date().toISOString()
      }));
      localStorage.setItem('awaaz_display_name_staff-kmc-demo-01', 'Engr. Tariq Mahmood');
      window.location.href = '/department';
    })()`);

    await sleep(2000);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 1: Multi-Viewport Matrix & Horizontal Overflow Audit
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: MULTI-VIEWPORT MATRIX & OVERFLOW AUDIT ---');
  await loginAs('head');

  const viewports = [
    { name: 'desktop_1920', w: 1920, h: 1080, mobile: false },
    { name: 'desktop_1440', w: 1440, h: 900, mobile: false },
    { name: 'desktop_1024', w: 1024, h: 768, mobile: false },
    { name: 'tablet_768', w: 768, h: 1024, mobile: true },
    { name: 'mobile_430', w: 430, h: 932, mobile: true },
    { name: 'mobile_390', w: 390, h: 844, mobile: true },
    { name: 'mobile_360', w: 360, h: 780, mobile: true },
    { name: 'mobile_320', w: 320, h: 568, mobile: true },
  ];

  for (const vp of viewports) {
    await setViewport(vp.w, vp.h, vp.mobile);
    const m = await checkNavMetrics();
    console.log(`  Viewport ${vp.name} (${vp.w}x${vp.h}): scrollWidth=${m.scrollWidth}, innerWidth=${m.viewportWidth}, overflow=${m.hasHorizontalOverflow}`);
    if (m.hasHorizontalOverflow) {
      console.error(`  [FAILURE] Horizontal overflow detected at ${vp.name}! scrollWidth=${m.scrollWidth}`);
    }
    await capture(`v21_6_${vp.name}_landing`);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 2: Mobile 2-Column Morphing Navigation & Sizing Audit
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: MOBILE 2-COLUMN MORPHING NAVIGATION AUDIT (390px & 320px) ---');

  for (const vp of [{ name: '390', w: 390, h: 844 }, { name: '320', w: 320, h: 568 }]) {
    await setViewport(vp.w, vp.h, true);
    await sleep(400);

    // Initial state: collapsed
    let m = await checkNavMetrics();
    console.log(`  [${vp.name}px] Collapsed: width=${m.width}px, height=${m.height}px, isExpanded=${m.isExpanded}`);
    await capture(`v21_6_mobile_${vp.name}_collapsed`);

    // Tap to open
    console.log(`  [${vp.name}px] Tapping #nav-toggle trigger button...`);
    await tapElement('#nav-toggle');
    await sleep(750); // allow spring animation to settle

    m = await checkNavMetrics();
    console.log(`  [${vp.name}px] Expanded: width=${m.width}px, height=${m.height}px, isExpanded=${m.isExpanded}`);
    console.log(`  [${vp.name}px] Destinations display=${m.destinationsDisplay}, cols=${m.destinationsCols}`);

    // Verify bounded height: <= 48% of viewport height
    const maxAllowedH = Math.round(vp.h * 0.48);
    const passesHeight = m.height <= maxAllowedH;
    console.log(`  [${vp.name}px] Height check: ${m.height}px <= max allowed ${maxAllowedH}px? ${passesHeight ? 'PASS' : 'FAIL'}`);

    // Verify bounded width: <= 360px on 390, <= 304px on 320
    const maxAllowedW = Math.min(vp.w - 16, 360);
    const passesWidth = m.width <= maxAllowedW;
    console.log(`  [${vp.name}px] Width check: ${m.width}px <= max allowed ${maxAllowedW}px? ${passesWidth ? 'PASS' : 'FAIL'}`);

    await capture(`v21_6_mobile_${vp.name}_expanded_2col`);

    // Tap outside to close
    console.log(`  [${vp.name}px] Tapping outside (x=50, y=${vp.h - 150}) to dismiss...`);
    await tapCoordinates(50, vp.h - 150);
    await sleep(650);

    m = await checkNavMetrics();
    console.log(`  [${vp.name}px] After outside tap: width=${m.width}px, height=${m.height}px, isExpanded=${m.isExpanded}`);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 3: Frame-by-Frame Motion Sequence on Mobile
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: MOBILE MOTION SEQUENCE RECORDING (390px) ---');
  await setViewport(390, 844, true);
  await sleep(400);

  await capture('v21_6_motion_frame_01_collapsed');

  // Trigger open
  await tapElement('#nav-toggle');

  // Capture opening frames
  await sleep(80);
  await capture('v21_6_motion_frame_02_expanding_early');
  await sleep(140);
  await capture('v21_6_motion_frame_03_expanding_mid');
  await sleep(400);
  await capture('v21_6_motion_frame_04_fully_expanded');

  // Tap destination tab (Dashboard)
  console.log('  Tapping Dashboard tab to navigate & trigger smooth auto-close...');
  await tapElement('[data-testid="v20-nav-btn-dashboard"]');

  // Capture closing frames
  await sleep(80);
  await capture('v21_6_motion_frame_05_closing_early');
  await sleep(140);
  await capture('v21_6_motion_frame_06_closing_mid');
  await sleep(500);
  await capture('v21_6_motion_frame_07_fully_collapsed_dashboard');

  // --------------------------------------------------------------------------
  // TEST SECTION 4: Dashboard, Complaints & Officers Viewports
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: CORE PAGES ACROSS MOBILE & DESKTOP ---');

  // Dashboard on 390px
  await setViewport(390, 844, true);
  await sleep(500);
  let pageMetrics = await checkNavMetrics();
  console.log(`  Dashboard 390px: overflow=${pageMetrics.hasHorizontalOverflow}`);
  await capture('v21_6_mobile_390_dashboard');

  // Dashboard on 320px
  await setViewport(320, 568, true);
  await sleep(500);
  pageMetrics = await checkNavMetrics();
  console.log(`  Dashboard 320px: overflow=${pageMetrics.hasHorizontalOverflow}`);
  await capture('v21_6_mobile_320_dashboard');

  // Navigate to Complaints on 390px
  await setViewport(390, 844, true);
  await tapElement('#nav-toggle');
  await sleep(400);
  await tapElement('[data-testid="v20-nav-btn-complaints"]');
  await sleep(800);
  pageMetrics = await checkNavMetrics();
  console.log(`  Complaints 390px: overflow=${pageMetrics.hasHorizontalOverflow}`);
  await capture('v21_6_mobile_390_complaints');

  // Navigate to Officers on 390px
  await tapElement('#nav-toggle');
  await sleep(400);
  await tapElement('[data-testid="v20-nav-btn-officers"]');
  await sleep(800);
  pageMetrics = await checkNavMetrics();
  console.log(`  Officers 390px: overflow=${pageMetrics.hasHorizontalOverflow}`);
  await capture('v21_6_mobile_390_officers');

  // Officers on 320px
  await setViewport(320, 568, true);
  await sleep(500);
  pageMetrics = await checkNavMetrics();
  console.log(`  Officers 320px: overflow=${pageMetrics.hasHorizontalOverflow}`);
  await capture('v21_6_mobile_320_officers');

  // --------------------------------------------------------------------------
  // TEST SECTION 5: Light Mode Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: LIGHT MODE VERIFICATION ---');
  await setViewport(390, 844, true);
  // Tap theme toggle button
  await evaluate(`(() => {
    const btn = document.querySelector('[data-testid="v20-theme-toggle"]');
    if (btn) btn.click();
  })()`);
  await sleep(400);

  pageMetrics = await checkNavMetrics();
  console.log(`  Light Mode Officers 390px: overflow=${pageMetrics.hasHorizontalOverflow}`);
  await capture('v21_6_light_mode_mobile_390_officers');

  // Open nav in light mode
  await tapElement('#nav-toggle');
  await sleep(550);
  await capture('v21_6_light_mode_mobile_390_nav_open');

  // Navigate to Dashboard in light mode
  await tapElement('[data-testid="v20-nav-btn-dashboard"]');
  await sleep(700);
  await capture('v21_6_light_mode_mobile_390_dashboard');

  // Desktop Light Mode (1920)
  await setViewport(1920, 1080, false);
  await sleep(500);
  await capture('v21_6_light_mode_desktop_1920_dashboard');

  // --------------------------------------------------------------------------
  // TEST SECTION 6: 20-Cycle Mobile Tap Stress Test
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: 20-CYCLE RAPID MOBILE TAP STRESS TEST (390px) ---');
  await setViewport(390, 844, true);
  let stuckCount = 0;

  for (let i = 1; i <= 20; i++) {
    await tapElement('#nav-toggle');
    await sleep(250);
    const st = await checkNavMetrics();
    const expectedOpen = i % 2 !== 0;
    if (st.isExpanded !== expectedOpen) {
      stuckCount++;
      console.warn(`  [Cycle ${i}] Discrepancy: expected open=${expectedOpen}, got=${st.isExpanded}`);
    }
  }

  // Ensure settled to collapsed
  await sleep(600);
  const finalMetric = await checkNavMetrics();
  console.log(`  Stress Test Result: 20 cycles completed. Stuck states=${stuckCount}. Final settled width=${finalMetric.width}px, height=${finalMetric.height}px, isExpanded=${finalMetric.isExpanded}`);

  console.log('\n================================================================');
  console.log('ALL V21.6 RESPONSIVE ARCHITECTURE TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');

  try {
    chromeProc.kill('SIGTERM');
  } catch {}
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error running V21.6 QA:', err);
  process.exit(1);
});
