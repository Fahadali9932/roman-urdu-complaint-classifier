import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_8';
const BASE_URL = 'http://localhost:5173';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('========================================================================');
  console.log('AWAAZ-E-AWAM V21.8 OFFICER FIELDWORK, RESOLUTION & THEME CDP QA');
  console.log('========================================================================\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9896',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9896/json');
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
      expression: `JSON.stringify((() => { return (${expression}); })())`,
      returnByValue: true,
    });
    const raw = res.result?.result?.value;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async function navigate(path) {
    await send('Page.navigate', { url: `${BASE_URL}${path}` });
    await sleep(1500);
  }

  async function setOfficerSession(theme = 'dark') {
    await evaluate(`
      (() => {
        sessionStorage.clear();
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          userId: 'local-officer-a',
          username: 'kmc-officer-a',
          displayName: 'Engr. Tariq Aziz',
          departmentId: 'kmc',
          departmentCode: 'KMC',
          departmentName: 'Karachi Municipal Corporation',
          authenticatedAt: new Date().toISOString()
        }));
        localStorage.clear();
        localStorage.setItem('department_auth_token', 'mock-valid-officer-session-token');
        localStorage.setItem('department_user_id', 'local-officer-a');
        localStorage.setItem('department_staff_username', 'kmc-officer-a');
        localStorage.setItem('department_staff_role', 'officer');
        localStorage.setItem('department_id', 'kmc');
        localStorage.setItem('department_code', 'KMC');
        localStorage.setItem('department_name', 'Karachi Municipal Corporation');
        localStorage.setItem('department_theme', '${theme}');
      })()
    `);
  }

  async function setHodSession() {
    await evaluate(`
      (() => {
        sessionStorage.clear();
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          userId: 'staff-kmc-demo-01',
          username: 'kmc-head',
          displayName: 'Dr. Farooq Sattar',
          departmentId: 'kmc',
          departmentCode: 'KMC',
          departmentName: 'Karachi Municipal Corporation',
          authenticatedAt: new Date().toISOString()
        }));
        localStorage.clear();
        localStorage.setItem('department_auth_token', 'mock-valid-hod-session-token');
        localStorage.setItem('department_user_id', 'staff-kmc-demo-01');
        localStorage.setItem('department_staff_username', 'kmc-head');
        localStorage.setItem('department_staff_role', 'head');
        localStorage.setItem('department_id', 'kmc');
        localStorage.setItem('department_code', 'KMC');
        localStorage.setItem('department_name', 'Karachi Municipal Corporation');
        localStorage.setItem('department_theme', 'dark');
      })()
    `);
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Desktop 1920x1080 - Officer Work List (Dark Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 1: Desktop 1920x1080 - Officer Work List (Dark Mode)...');
    await setViewport(1920, 1080, false, false);
    await navigate('/');
    await setOfficerSession('dark');
    await navigate('/department/officer');
    await sleep(2000);

    // Switch to Work tab
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.v20-top-edge-nav .v20-nav-tab, button'));
        const workTab = tabs.find(t => t.textContent && t.textContent.includes('Work'));
        if (workTab) workTab.click();
      })()
    `);
    await sleep(1000);
    await capture('v21_8_desktop_1920_officer_work_dark');

    // -------------------------------------------------------------------------
    // TEST 2: Desktop 1920x1080 - Officer Work List (Light Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 2: Desktop 1920x1080 - Officer Work List (Light Mode)...');
    await evaluate(`
      (() => {
        const themeBtn = document.querySelector('button[aria-label*="light mode"], button[aria-label*="dark mode"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(800);
    await capture('v21_8_desktop_1920_officer_work_light');

    // -------------------------------------------------------------------------
    // TEST 3: Desktop 1920x1080 - Full Complaint Detail Document (Light Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 3: Desktop 1920x1080 - Full Complaint Detail Document (Light Mode)...');
    await evaluate(`
      (() => {
        const openBtn = document.querySelector('button[data-testid*="open-complaint-btn"], .v20-work-card');
        if (openBtn) openBtn.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_8_desktop_1920_complaint_detail_light');

    // -------------------------------------------------------------------------
    // TEST 4: Desktop 1920x1080 - Full Complaint Detail Document (Dark Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 4: Desktop 1920x1080 - Full Complaint Detail Document (Dark Mode)...');
    await evaluate(`
      (() => {
        const themeBtn = document.querySelector('button[aria-label*="light mode"], button[aria-label*="dark mode"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(800);
    await capture('v21_8_desktop_1920_complaint_detail_dark');

    // Check Google Maps Links in document
    const mapsAudit = await evaluate(`
      (() => {
        const searchBtn = document.querySelector('a[data-testid="view-location-btn"]');
        const dirBtn = document.querySelector('a[data-testid="get-directions-btn"]');
        return {
          hasSearchUrl: Boolean(searchBtn && searchBtn.href.includes('google.com/maps/search/')),
          hasDirectionsUrl: Boolean(dirBtn && dirBtn.href.includes('google.com/maps/dir/')),
          searchHref: searchBtn ? searchBtn.href : null,
          directionsHref: dirBtn ? dirBtn.href : null,
        };
      })()
    `);
    console.log('  [Maps Audit]', JSON.stringify(mapsAudit));

    // -------------------------------------------------------------------------
    // TEST 5: Desktop 1920x1080 - Dedicated Work Resolution Form (Dark Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 5: Desktop 1920x1080 - Dedicated Work Resolution Form (Dark Mode)...');
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[data-testid="submit-completed-work-btn"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(1000);
    await capture('v21_8_desktop_1920_resolution_form_dark');

    // -------------------------------------------------------------------------
    // TEST 6: Desktop 1920x1080 - Dedicated Work Resolution Form (Light Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 6: Desktop 1920x1080 - Dedicated Work Resolution Form (Light Mode)...');
    await evaluate(`
      (() => {
        const themeBtn = document.querySelector('button[aria-label*="light mode"], button[aria-label*="dark mode"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(800);
    await capture('v21_8_desktop_1920_resolution_form_light');

    // Return to dark mode for subsequent modal test
    await evaluate(`
      (() => {
        const themeBtn = document.querySelector('button[aria-label*="light mode"], button[aria-label*="dark mode"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(400);

    // -------------------------------------------------------------------------
    // TEST 7: Desktop 1920x1080 - Centered Confirmation Modal Dialog
    // -------------------------------------------------------------------------
    console.log('Testing 7: Desktop 1920x1080 - Centered Confirmation Modal Dialog...');
    await evaluate(`
      (() => {
        // Mock capture photo input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          const dt = new DataTransfer();
          const file = new File(['mock proof'], 'repaired-drain.jpg', { type: 'image/jpeg' });
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(800);

    // Click submit for verification
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[data-testid="submit-for-verification-btn"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(1500);
    await capture('v21_8_desktop_1920_confirmation_modal');

    // Dismiss modal to return to work list
    await evaluate(`
      (() => {
        const backBtn = document.querySelector('button[data-testid="v21-8-back-to-work-btn"]');
        if (backBtn) backBtn.click();
      })()
    `);
    await sleep(800);

    // -------------------------------------------------------------------------
    // TEST 8: Mobile 430x932 (iPhone 14 Pro Max) - Officer Fieldwork
    // -------------------------------------------------------------------------
    console.log('Testing 8: Mobile 430x932 - Officer Fieldwork...');
    await setViewport(430, 932, true, true);
    await navigate('/department/officer');
    await sleep(1500);
    await capture('v21_8_mobile_430_officer_work');

    // -------------------------------------------------------------------------
    // TEST 9: Mobile 390x844 (iPhone 12/13/14) - Officer Fieldwork (Light Mode)
    // -------------------------------------------------------------------------
    console.log('Testing 9: Mobile 390x844 - Officer Fieldwork (Light Mode)...');
    await setViewport(390, 844, true, true);
    await evaluate(`
      (() => {
        const themeBtn = document.querySelector('header button[aria-label*="mode"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(800);
    await capture('v21_8_mobile_390_officer_work_light');

    // -------------------------------------------------------------------------
    // TEST 10: Mobile 390x844 - Officer Complaint Detail Document
    // -------------------------------------------------------------------------
    console.log('Testing 10: Mobile 390x844 - Officer Complaint Detail Document...');
    await evaluate(`
      (() => {
        const openBtn = document.querySelector('button[data-testid*="open-complaint-btn"], .v20-work-card');
        if (openBtn) openBtn.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_8_mobile_390_complaint_detail');

    // -------------------------------------------------------------------------
    // TEST 11: Mobile 390x844 - Officer Resolution Submission Form
    // -------------------------------------------------------------------------
    console.log('Testing 11: Mobile 390x844 - Officer Resolution Submission Form...');
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[data-testid="submit-completed-work-btn"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(1000);
    await capture('v21_8_mobile_390_resolution_form');

    // -------------------------------------------------------------------------
    // TEST 12: Mobile 360x800 (Android modern) - Officer Fieldwork
    // -------------------------------------------------------------------------
    console.log('Testing 12: Mobile 360x800 - Officer Fieldwork...');
    await setViewport(360, 800, true, true);
    await navigate('/department/officer');
    await sleep(1200);
    await capture('v21_8_mobile_360_officer_work');

    // -------------------------------------------------------------------------
    // TEST 13: Mobile 320x568 (Small mobile) - Officer Fieldwork
    // -------------------------------------------------------------------------
    console.log('Testing 13: Mobile 320x568 - Officer Fieldwork...');
    await setViewport(320, 568, true, true);
    await sleep(600);
    await capture('v21_8_mobile_320_officer_work');

    // Audit horizontal overflow on 320px
    const overflowCheck = await evaluate(`
      (() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { docW, winW, hasOverflow: docW > winW };
      })()
    `);
    console.log('  [320px Overflow Audit]', JSON.stringify(overflowCheck));

    // -------------------------------------------------------------------------
    // TEST 14: Tablet 768x1024 - HOD Desktop-First Restriction Screen
    // -------------------------------------------------------------------------
    console.log('Testing 14: Tablet 768x1024 - HOD Desktop-First Restriction Screen...');
    await setViewport(768, 1024, true, false);
    await setHodSession();
    await navigate('/department/hod');
    await sleep(1500);
    await capture('v21_8_tablet_768_hod_restricted');

    // -------------------------------------------------------------------------
    // TEST 15: Mobile 390x844 - Citizen Homepage (100% accessible)
    // -------------------------------------------------------------------------
    console.log('Testing 15: Mobile 390x844 - Citizen Homepage...');
    await setViewport(390, 844, true, true);
    await evaluate(`localStorage.clear(); sessionStorage.clear();`);
    await navigate('/');
    await sleep(1500);
    await capture('v21_8_mobile_390_citizen_homepage');

    console.log('\nAll 15 browser verification captures completed successfully!');
  } finally {
    try {
      ws.close();
    } catch {}
    chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('QA script error:', err);
  process.exit(1);
});
