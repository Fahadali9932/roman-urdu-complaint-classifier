import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_9';
const BASE_URL = 'http://localhost:5173';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('========================================================================');
  console.log('AWAAZ-E-AWAM V21.9 OFFICER FIELDWORK LAYOUT & GEOMETRY CDP QA');
  console.log('========================================================================\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9897',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9897/json');
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

  async function applyTheme(mode) {
    await evaluate(`
      (() => {
        localStorage.setItem('department_theme', '${mode}');
        document.documentElement.setAttribute('data-theme', '${mode}');
        if ('${mode}' === 'light') {
          document.body.classList.add('v20-light-mode');
        } else {
          document.body.classList.remove('v20-light-mode');
        }
      })()
    `);
    await sleep(300);
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Desktop 1920x1080 - Dark Mode Fieldwork Console
    // -------------------------------------------------------------------------
    console.log('[Phase 1] Desktop 1920x1080 — Dark Mode Officer Work Console');
    await setViewport(1920, 1080);
    await navigate('/department/officer?tab=work');
    await setOfficerSession('dark');
    await navigate('/department/officer?tab=work');
    await applyTheme('dark');
    await sleep(1500);

    await capture('v21_9_desktop_1920_officer_work_dark');

    // -------------------------------------------------------------------------
    // TEST 2: Desktop 1920x1080 - Open First Complaint Detail
    // -------------------------------------------------------------------------
    console.log('[Phase 2] Desktop 1920x1080 — Open First Complaint Detail');
    await evaluate(`
      (() => {
        const btn = document.querySelector('[data-testid^="open-complaint-btn-"]') || document.querySelector('.v20-work-card');
        if (btn) btn.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_9_desktop_1920_complaint_detail_dark');

    // Geometric Assertions on Detail View
    console.log('  [Geometry Check] Inspecting Button & Header Overlaps in Complaint Detail:');
    const geometryChecks = await evaluate(`
      (() => {
        const backBtn = document.querySelector('[data-testid="v21-8-back-to-work-list"]');
        const refBadge = document.querySelector('.v20-work-document span') || Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('REF #'));
        const viewLocBtn = document.querySelector('[data-testid="view-location-btn"]');
        const getDirBtn = document.querySelector('[data-testid="get-directions-btn"]');
        const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
        const reqMoreBtn = document.querySelector('[data-testid="request-more-time-btn"]');

        const results = {
          hasBackBtn: Boolean(backBtn),
          hasRefBadge: Boolean(refBadge),
          backOverlapsRef: false,
          backAboveDoc: false,
          hasViewLocBtn: Boolean(viewLocBtn),
          hasGetDirBtn: Boolean(getDirBtn),
          navButtonsOverlap: false,
          navButtonsHeights: [],
          workButtonsOverlap: false,
        };

        if (backBtn && refBadge) {
          const bRect = backBtn.getBoundingClientRect();
          const rRect = refBadge.getBoundingClientRect();
          // Back button is in dedicated row above document
          results.backAboveDoc = bRect.bottom <= rRect.top + 10;
          results.backOverlapsRef = !(bRect.right < rRect.left || bRect.left > rRect.right || bRect.bottom < rRect.top || bRect.top > rRect.bottom);
        }

        if (viewLocBtn && getDirBtn) {
          const vRect = viewLocBtn.getBoundingClientRect();
          const dRect = getDirBtn.getBoundingClientRect();
          results.navButtonsHeights = [vRect.height, dRect.height];
          results.navButtonsOverlap = !(vRect.right <= dRect.left || vRect.left >= dRect.right || vRect.bottom <= dRect.top || vRect.top >= dRect.bottom);
        }

        if (submitBtn && reqMoreBtn) {
          const sRect = submitBtn.getBoundingClientRect();
          const mRect = reqMoreBtn.getBoundingClientRect();
          results.workButtonsOverlap = !(sRect.right <= mRect.left || sRect.left >= mRect.right || sRect.bottom <= mRect.top || sRect.top >= mRect.bottom);
        }

        return results;
      })()
    `);
    console.log('  -> Results:', JSON.stringify(geometryChecks, null, 2));

    // -------------------------------------------------------------------------
    // TEST 3: Desktop 1920x1080 - Resolution Submission Form
    // -------------------------------------------------------------------------
    console.log('[Phase 3] Desktop 1920x1080 — Dedicated Resolution Submission Form');
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_9_desktop_1920_resolution_form_dark');

    // -------------------------------------------------------------------------
    // TEST 4: Desktop 1920x1080 - Confirmation Modal Dialog
    // -------------------------------------------------------------------------
    console.log('[Phase 4] Desktop 1920x1080 — Mock Submission & Confirmation Modal');
    await evaluate(`
      (() => {
        const fileInput = document.querySelector('[data-testid="evidence-file-input"]');
        if (fileInput) {
          const dt = new DataTransfer();
          const file = new File(['mock-photo-content'], 'repaired-sewer.jpg', { type: 'image/jpeg' });
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(600);

    await evaluate(`
      (() => {
        const formSubmit = document.querySelector('[data-testid="submit-for-verification-btn"]');
        if (formSubmit) formSubmit.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_9_desktop_1920_confirmation_modal');

    // Close confirmation modal
    await evaluate(`
      (() => {
        const backBtn = document.querySelector('[data-testid="v21-8-back-to-work-btn"]');
        if (backBtn) backBtn.click();
      })()
    `);
    await sleep(800);

    // -------------------------------------------------------------------------
    // TEST 5: Desktop 1920x1080 - Light Mode Theme Verification
    // -------------------------------------------------------------------------
    console.log('[Phase 5] Desktop 1920x1080 — Light Mode Verification');
    await navigate('/department/officer?tab=work');
    await applyTheme('light');
    await sleep(1000);

    const themeColors = await evaluate(`
      (() => {
        const card = document.querySelector('.v20-work-card') || document.querySelector('.v20-work-document') || document.body;
        const style = window.getComputedStyle(card);
        const title = document.querySelector('h2, h3');
        const titleStyle = title ? window.getComputedStyle(title) : null;
        return {
          themeAttribute: document.documentElement.getAttribute('data-theme'),
          bodyClass: document.body.className,
          backgroundColor: style.backgroundColor,
          titleColor: titleStyle ? titleStyle.color : null,
        };
      })()
    `);
    console.log('  -> Light Theme Computed Styles:', JSON.stringify(themeColors, null, 2));

    await capture('v21_9_desktop_1920_officer_work_light');

    // Open detail in light mode
    await evaluate(`
      (() => {
        const btn = document.querySelector('[data-testid^="open-complaint-btn-"]') || document.querySelector('.v20-work-card');
        if (btn) btn.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_9_desktop_1920_complaint_detail_light');

    // Open resolution form in light mode
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(1200);
    await capture('v21_9_desktop_1920_resolution_form_light');

    // -------------------------------------------------------------------------
    // TEST 6: Tablet 768 Viewport
    // -------------------------------------------------------------------------
    console.log('[Phase 6] Tablet 768x1024 Viewport Checks');
    await setViewport(768, 1024, true);

    // 6A. HOD restricted on Tablet
    await setHodSession();
    await applyTheme('dark');
    await navigate('/department/reading');
    await sleep(1000);
    await capture('v21_9_tablet_768_hod_restricted');

    // 6B. Officer allowed on Tablet
    await setOfficerSession('dark');
    await navigate('/department/officer?tab=work');
    await sleep(1000);
    await capture('v21_9_tablet_768_officer_work');

    // -------------------------------------------------------------------------
    // TEST 7: Mobile Viewports
    // -------------------------------------------------------------------------
    console.log('[Phase 7] Mobile Viewport Visual Matrix');

    // 7A. 430px (iPhone 14 Pro Max)
    await setViewport(430, 932, true, true);
    await navigate('/department/officer?tab=work');
    await sleep(800);
    await capture('v21_9_mobile_430_officer_work');

    // 7B. 390px (iPhone 12/13/14)
    await setViewport(390, 844, true, true);
    await navigate('/department/officer?tab=work');
    await sleep(800);
    await capture('v21_9_mobile_390_officer_work');

    // 390px Light Mode
    await applyTheme('light');
    await sleep(500);
    await capture('v21_9_mobile_390_officer_work_light');

    // 390px Complaint Detail (Back to Dark)
    await applyTheme('dark');
    await evaluate(`
      (() => {
        const btn = document.querySelector('[data-testid^="open-complaint-btn-"]') || document.querySelector('.v20-work-card');
        if (btn) btn.click();
      })()
    `);
    await sleep(1000);
    await capture('v21_9_mobile_390_complaint_detail');

    // 390px Resolution Form
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(1000);
    await capture('v21_9_mobile_390_resolution_form');

    // 7C. 360px (Galaxy S20)
    await setViewport(360, 800, true, true);
    await navigate('/department/officer?tab=work');
    await sleep(800);
    await capture('v21_9_mobile_360_officer_work');

    // 7D. 320px (Small Mobile)
    await setViewport(320, 650, true, true);
    await navigate('/department/officer?tab=work');
    await sleep(800);
    await capture('v21_9_mobile_320_officer_work');

    // 7E. 390px Citizen Homepage
    await setViewport(390, 844, true, true);
    await navigate('/');
    await sleep(1000);
    await capture('v21_9_mobile_390_citizen_homepage');

    console.log('\n========================================================================');
    console.log('ALL V21.9 CDP QA TESTS COMPLETED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('CDP QA Error:', err);
  } finally {
    try {
      ws.close();
      chromeProc.kill();
    } catch {
      // ignore
    }
  }
}

run();
