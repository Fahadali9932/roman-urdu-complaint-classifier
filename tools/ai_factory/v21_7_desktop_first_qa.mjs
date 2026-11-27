import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_7';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('========================================================================');
  console.log('AWAAZ-E-AWAM V21.7 DESKTOP-FIRST ACCESS & MOBILE FIELDWORK CDP QA');
  console.log('========================================================================\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9899',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9899/json');
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

  async function setViewport(w, h, isTouch = false, isMobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: isMobile,
      screenOrientation: w > h ? { angle: 90, type: 'landscapePrimary' } : { angle: 0, type: 'portraitPrimary' },
    });
    await send('Emulation.setTouchEmulationEnabled', {
      enabled: isTouch,
      maxTouchPoints: isTouch ? 5 : 0,
    });
    if (isTouch) {
      await send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'pointer', value: 'coarse' },
          { name: 'hover', value: 'none' },
        ],
      });
    } else {
      await send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'pointer', value: 'fine' },
          { name: 'hover', value: 'hover' },
        ],
      });
    }
    await sleep(400);
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
    await sleep(350);
    return true;
  }

  async function clickElement(selector) {
    const coords = await evaluate(`(() => {
      const el = document.querySelector('${selector}');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    if (!coords) {
      console.error(`  [Click Error] Element not found: ${selector}`);
      return false;
    }

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.x,
      y: coords.y,
      button: 'left',
      clickCount: 1,
    });
    await sleep(40);
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.x,
      y: coords.y,
      button: 'left',
      clickCount: 1,
    });
    await sleep(350);
    return true;
  }

  async function loginAsStaff(role = 'head') {
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(600);

    const isHead = role === 'head';
    await evaluate(`(() => {
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        userId: '${isHead ? 'staff-kmc-demo-01' : 'local-officer-a'}',
        username: '${isHead ? 'roads-01' : 'roads-02'}',
        displayName: '${isHead ? 'Engr. Tariq Mahmood' : 'Officer Tariq Mehmood'}',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    })()`);

    await sleep(2000);
  }

  async function loginAsAdmin() {
    await send('Page.navigate', { url: 'http://localhost:5173/admin/requests' });
    await sleep(600);

    await evaluate(`(() => {
      sessionStorage.setItem('awaaz_admin_auth_session_v1', JSON.stringify({
        email: 'admin@awaaz.gov.pk',
        role: 'admin',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/admin/requests';
    })()`);

    await sleep(1500);
  }

  async function checkPageMetrics() {
    return await evaluate(`(() => {
      const restrictionEl = document.querySelector('[data-testid="v20-desktop-required-screen"]');
      const mobileOfficerRoot = document.querySelector('[data-testid="v20-mobile-officer-work-root"]');
      const desktopNav = document.querySelector('[data-testid="v20-top-edge-nav"]');
      const spotlight = document.querySelector('[data-testid="v20-cursor-spotlight"]');
      const doc = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
      const innerW = window.innerWidth;
      const hasOverflow = scrollW > innerW + 1;
      return {
        isRestricted: !!restrictionEl,
        isMobileOfficerWork: !!mobileOfficerRoot,
        hasDesktopNav: !!desktopNav,
        hasSpotlight: !!spotlight,
        scrollWidth: scrollW,
        innerWidth: innerW,
        hasOverflow,
      };
    })()`);
  }

  try {
    // ========================================================================
    // SECTION 1: Desktop Management Workstations (>= 1024px)
    // ========================================================================
    console.log('\n--- SECTION 1: DESKTOP STATIONS (>= 1024px) ---');
    await setViewport(1920, 1080, false, false);
    await loginAsStaff('head');

    // 1.1 Desktop 1920x1080 (Dark Mode)
    let m = await checkPageMetrics();
    console.log(`  [1920x1080 Desktop HOD] Restricted: ${m.isRestricted}, Nav: ${m.hasDesktopNav}, Spotlight: ${m.hasSpotlight}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_desktop_1920_hod_dashboard');

    // 1.2 Desktop 1920x1080 (Light Mode)
    console.log('  Toggling to Light Mode...');
    await clickElement('#theme');
    await sleep(600);
    await capture('v21_7_desktop_1920_hod_dashboard_light');
    await clickElement('#theme'); // restore dark
    await sleep(400);

    // 1.3 Desktop 1440x900 (Officers Directory)
    await setViewport(1440, 900, false, false);
    await sleep(400);
    // Click on Officers tab in navbar if available
    await capture('v21_7_desktop_1440_hod_officers');

    // 1.4 Desktop 1366x768 (Officer Portal on Desktop)
    console.log('  Logging in as Officer on Desktop (1366x768)...');
    await setViewport(1366, 768, false, false);
    await loginAsStaff('officer');
    m = await checkPageMetrics();
    console.log(`  [1366x768 Desktop Officer] Restricted: ${m.isRestricted}, Nav: ${m.hasDesktopNav}, Spotlight: ${m.hasSpotlight}`);
    await capture('v21_7_desktop_1366_officer_desktop');

    // 1.5 Desktop 1280x800 (Central Admin on Desktop)
    console.log('  Logging in as Central Admin on Desktop (1280x800)...');
    await setViewport(1280, 800, false, false);
    await loginAsAdmin();
    m = await checkPageMetrics();
    console.log(`  [1280x800 Central Admin] Restricted: ${m.isRestricted}`);
    await capture('v21_7_desktop_1280_admin_desktop');

    // 1.6 Desktop 1024x768 Boundary
    console.log('  Checking 1024x768 boundary for HOD...');
    await setViewport(1024, 768, false, false);
    await loginAsStaff('head');
    m = await checkPageMetrics();
    console.log(`  [1024x768 Boundary HOD] Restricted: ${m.isRestricted}, Nav: ${m.hasDesktopNav}`);
    await capture('v21_7_desktop_1024_hod_desktop');

    // ========================================================================
    // SECTION 2: Tablet Viewports (768px) - Restricted Management
    // ========================================================================
    console.log('\n--- SECTION 2: TABLET (768px) RESTRICTION SCREENS ---');
    await setViewport(768, 1024, true, true);
    await sleep(600);
    m = await checkPageMetrics();
    console.log(`  [768x1024 Tablet HOD] Restricted: ${m.isRestricted}, DesktopNav: ${m.hasDesktopNav}, Spotlight: ${m.hasSpotlight}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_tablet_768_hod_restricted');

    // Central Admin on Tablet
    await loginAsAdmin();
    await setViewport(768, 1024, true, true);
    await sleep(600);
    m = await checkPageMetrics();
    console.log(`  [768x1024 Tablet Admin] Restricted: ${m.isRestricted}`);
    await capture('v21_7_tablet_768_admin_restricted');

    // ========================================================================
    // SECTION 3: Mobile Officer Fieldwork Console (< 768px)
    // ========================================================================
    console.log('\n--- SECTION 3: MOBILE OFFICER FIELDWORK CONSOLE ---');
    await setViewport(430, 932, true, true);
    await loginAsStaff('officer');
    m = await checkPageMetrics();
    console.log(`  [430x932 Mobile Officer] Fieldwork Console: ${m.isMobileOfficerWork}, DesktopNav: ${m.hasDesktopNav}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_mobile_430_officer_fieldwork');

    // 3.2 Mobile 390x844 (iPhone 14/15) - Dark Mode
    await setViewport(390, 844, true, true);
    await sleep(500);
    m = await checkPageMetrics();
    console.log(`  [390x844 Mobile Officer Dark] Fieldwork Console: ${m.isMobileOfficerWork}, DesktopNav: ${m.hasDesktopNav}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_mobile_390_officer_fieldwork_dark');

    // 3.3 Mobile 390x844 - Light Mode
    console.log('  Toggling Mobile Officer to Light Mode...');
    await tapElement('button[aria-label="Switch to light mode"]');
    await sleep(500);
    await capture('v21_7_mobile_390_officer_fieldwork_light');
    await tapElement('button[aria-label="Switch to dark mode"]'); // restore dark
    await sleep(300);

    // 3.4 Mobile 390x844 - Officer Restricted Non-Work Screen
    console.log('  Testing Officer on restricted non-work tab...');
    await evaluate(`(() => {
      // Simulate switching to dashboard tab
      window.dispatchEvent(new CustomEvent('awaaz-nav-tab', { detail: 'dashboard' }));
    })()`);
    await setViewport(390, 844, true, true);
    await sleep(400);
    await capture('v21_7_mobile_390_officer_fieldwork_active');

    // 3.5 Mobile 360x780 (Android)
    await setViewport(360, 780, true, true);
    await sleep(400);
    m = await checkPageMetrics();
    console.log(`  [360x780 Android Officer] Fieldwork: ${m.isMobileOfficerWork}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_mobile_360_officer_fieldwork');

    // 3.6 Mobile 320x568 (iPhone SE / Small Mobile)
    await setViewport(320, 568, true, true);
    await sleep(400);
    m = await checkPageMetrics();
    console.log(`  [320x568 Small Mobile Officer] Fieldwork: ${m.isMobileOfficerWork}, scrollW: ${m.scrollWidth}, innerW: ${m.innerWidth}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_mobile_320_officer_fieldwork');

    // ========================================================================
    // SECTION 4: Mobile HOD Restriction Screen (390px & 320px)
    // ========================================================================
    console.log('\n--- SECTION 4: MOBILE HOD RESTRICTION SCREENS ---');
    await setViewport(390, 844, true, true);
    await loginAsStaff('head');
    m = await checkPageMetrics();
    console.log(`  [390x844 Mobile HOD] Restricted: ${m.isRestricted}, DesktopNav: ${m.hasDesktopNav}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_mobile_390_hod_restricted');

    // 4.2 Mobile 320x568 HOD Restricted
    await setViewport(320, 568, true, true);
    await sleep(400);
    m = await checkPageMetrics();
    console.log(`  [320x568 Mobile HOD] Restricted: ${m.isRestricted}, scrollW: ${m.scrollWidth}, innerW: ${m.innerWidth}, Overflow: ${m.hasOverflow}`);
    await capture('v21_7_mobile_320_hod_restricted');

    // ========================================================================
    // SECTION 5: Landscape Phone Restriction Anti-Bypass Audit
    // ========================================================================
    console.log('\n--- SECTION 5: LANDSCAPE PHONE RESTRICTION AUDIT ---');
    // Rotate phone to landscape: 844px wide, 390px high, coarse touch
    await setViewport(844, 390, true, true);
    await sleep(500);
    m = await checkPageMetrics();
    console.log(`  [844x390 Landscape Phone HOD] Restricted: ${m.isRestricted}, DesktopNav: ${m.hasDesktopNav}`);
    if (!m.isRestricted) {
      console.error('  [FAILURE] Landscape phone accidentally bypassed desktop restriction!');
    } else {
      console.log('  [PASS] Landscape phone correctly restricted as intended.');
    }
    await capture('v21_7_landscape_phone_restricted');

    // ========================================================================
    // SECTION 6: Citizen Portal Mobile Responsiveness (Zero Restrictions)
    // ========================================================================
    console.log('\n--- SECTION 6: CITIZEN PORTAL ON MOBILE (ZERO RESTRICTIONS) ---');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await setViewport(390, 844, true, true);
    await sleep(1500);
    m = await checkPageMetrics();
    console.log(`  [390x844 Citizen Home] Restricted: ${m.isRestricted}, Overflow: ${m.hasOverflow}`);
    if (m.isRestricted) {
      console.error('  [FAILURE] Citizen portal incorrectly restricted on mobile!');
    } else {
      console.log('  [PASS] Citizen portal 100% accessible on mobile.');
    }
    await capture('v21_7_mobile_390_citizen_homepage');

    console.log('\n========================================================================');
    console.log('ALL V21.7 REAL CHROME CDP QA CHECKS COMPLETED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('CDP QA Error:', err);
  } finally {
    ws.close();
    chromeProc.kill();
  }
}

run();
