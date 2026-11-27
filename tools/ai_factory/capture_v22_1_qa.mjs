import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v22_1';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureViteServer() {
  try {
    const res = await fetch('http://localhost:5173/');
    if (res.ok || res.status === 200 || res.status === 304) {
      console.log('Vite dev server is already running on port 5173.');
      return null;
    }
  } catch (err) {
    // not running, spawn below
  }

  console.log('Spawning Vite server on port 5173...');
  const viteProc = spawn('npx.cmd', ['vite', '--port', '5173'], {
    cwd: 'D:\\RomanUrdu_V13_19_Review',
    stdio: 'ignore',
    shell: true,
  });

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://localhost:5173/');
      if (res.status === 200 || res.status === 304) {
        console.log('Vite server ready!');
        return viteProc;
      }
    } catch {}
  }
  return viteProc;
}

async function run() {
  const viteProc = await ensureViteServer();

  console.log('Spawning Headless Chrome for V22.1 Department Identity & QA...');
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
  await send('Runtime.enable');

  async function setViewport(w, h, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile,
    });
    await sleep(300);
  }

  async function capture(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const path = join(OUTPUT_DIR, `${name}.png`);
    writeFileSync(path, buffer);
    console.log(`Captured: ${name}.png (${buffer.length} bytes)`);
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.result?.value !== undefined ? res.result.result.value : res.result?.value;
  }

  try {
    /* ========================================================================
       1. DEPARTMENT ATMOSPHERE PALETTES (Dark & Light)
       ======================================================================== */
    console.log('\n--- 1. Capturing All 7 Department Atmospheres in Dark & Light Modes ---');
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(1000);

    const departments = [
      { id: 'kmc', code: 'KMC', name: 'Karachi Municipal Corporation' },
      { id: 'sswmb', code: 'SSWMB', name: 'Sindh Solid Waste Management Board' },
      { id: 'kelectric', code: 'KE', name: 'K-Electric Power & Infrastructure' },
      { id: 'kwsc', code: 'KWSC', name: 'Karachi Water & Sewerage Corporation' },
      { id: 'gas', code: 'SSGC', name: 'Sui Southern Gas Company' },
      { id: 'sbca', code: 'SBCA', name: 'Sindh Building Control Authority' },
      { id: 'admin', code: 'ADMIN', name: 'Central Administration Oversight' },
    ];

    await setViewport(1920, 1080);

    for (const dept of departments) {
      // Dark Mode
      await evaluate(`
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          departmentId: '${dept.id}',
          departmentCode: '${dept.code}',
          departmentName: '${dept.name}',
          username: '${dept.id}-director',
          displayName: 'Director ${dept.code}',
          userId: 'local-hod-${dept.id}',
          staffPosition: 'head',
          authenticatedAt: new Date().toISOString()
        }));
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.remove('v20-light-mode');
        window.location.href = '/department';
      `);
      await sleep(1500);
      await capture(`v22_1_desktop_1920_${dept.id}_dark`);

      // Light Mode
      await evaluate(`
        const root = document.querySelector('.v20-portal-root') || document.body;
        root.classList.add('v20-light-mode');
        root.setAttribute('data-theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        const themeBtn = document.querySelector('[data-testid="v20-theme-toggle"]');
        if (themeBtn) themeBtn.click();
      `);
      await sleep(800);
      await capture(`v22_1_desktop_1920_${dept.id}_light`);
    }

    /* ========================================================================
       2. HOD OFFICERS DIRECTORY & PROFILE APPROVALS SUB-TAB
       ======================================================================== */
    console.log('\n--- 2. HOD Officers Directory & Profile Approvals Sub-Tab ---');
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Municipal Corporation',
        username: 'kmc-director',
        displayName: 'Director Municipal Services',
        userId: 'local-hod',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department?view=officers';
    `);
    await sleep(1600);
    await capture('v22_1_desktop_1920_hod_officers_directory_dark');

    // Switch to Profile Approvals sub-tab
    await evaluate(`
      const approvalsBtn = document.querySelector('[data-testid="hod-officers-subtab-approvals"]');
      if (approvalsBtn) approvalsBtn.click();
    `);
    await sleep(800);
    await capture('v22_1_desktop_1920_hod_profile_approvals_dark');

    // Light Mode Approvals
    await evaluate(`
      const root = document.querySelector('.v20-portal-root') || document.body;
      root.classList.add('v20-light-mode');
      root.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    `);
    await sleep(500);
    await capture('v22_1_desktop_1920_hod_profile_approvals_light');

    /* ========================================================================
       3. OFFICER PERFORMANCE SCORECARD IN LIGHT MODE (WCAG Contrast & Data Integrity)
       ======================================================================== */
    console.log('\n--- 3. Officer Performance Scorecard in Light Mode ---');
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Municipal Corporation',
        username: 'roads-01',
        displayName: 'Farhan Zaidi',
        userId: 'local-officer-a',
        staffPosition: 'officer',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department?view=performance';
    `);
    await sleep(1500);
    await evaluate(`
      const root = document.querySelector('.v20-portal-root') || document.body;
      root.classList.add('v20-light-mode');
      root.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    `);
    await sleep(600);
    await capture('v22_1_desktop_1920_officer_performance_light');

    // Dark Mode Scorecard
    await evaluate(`
      const root = document.querySelector('.v20-portal-root') || document.body;
      root.classList.remove('v20-light-mode');
      root.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    `);
    await sleep(600);
    await capture('v22_1_desktop_1920_officer_performance_dark');

    /* ========================================================================
       4. CROSS-VIEWPORT RESPONSIVENESS MATRIX
       ======================================================================== */
    console.log('\n--- 4. Cross-Viewport Visual QA Matrix ---');

    // Laptop (1366x768)
    await setViewport(1366, 768);
    await capture('v22_1_laptop_1366_sswmb_dark');

    // Tablet Landscape (1024x768)
    await setViewport(1024, 768);
    await capture('v22_1_tablet_1024_officer_work_dark');

    // Tablet Portrait (768x1024) - Testing Desktop Boundary on Head Portal
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Municipal Corporation',
        username: 'kmc-director',
        displayName: 'Director Municipal Services',
        userId: 'local-hod',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `);
    await sleep(1500);
    await setViewport(768, 1024);
    await capture('v22_1_tablet_768_hod_restricted');

    // Mobile Fieldwork (390x844)
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Municipal Corporation',
        username: 'roads-01',
        displayName: 'Farhan Zaidi',
        userId: 'local-officer-a',
        staffPosition: 'officer',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department/officer';
    `);
    await sleep(1500);
    await setViewport(390, 844, true);
    await capture('v22_1_mobile_390_officer_work_dark');

    // Compact Mobile (320x568)
    await setViewport(320, 568, true);
    await capture('v22_1_mobile_320_officer_work_dark');

    console.log('\nAll V22.1 Headless Chrome QA screenshots captured successfully!');
  } catch (err) {
    console.error('QA capture error:', err);
  } finally {
    ws.close();
    chromeProc.kill();
    if (viteProc) {
      viteProc.kill();
    }
  }
}

run();
