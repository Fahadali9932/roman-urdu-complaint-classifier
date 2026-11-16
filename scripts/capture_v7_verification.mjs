import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'docs', 'v7', 'screenshots');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/v7_verification';
const BASE_URL = 'http://localhost:5173';
const CDP_PORT = 9255;

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== V7 VERIFICATION: CAPTURING 12 EVIDENCE SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v7_verify_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      `${BASE_URL}/`,
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      if (res.ok) {
        console.log(`Connected to Chrome CDP on port ${CDP_PORT}`);
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch(`http://localhost:${CDP_PORT}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, (res) => {
        if (res.error) reject(new Error(res.error.message || JSON.stringify(res.error)));
        else resolve(res.result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  async function setViewport(width, height) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
  }

  async function navigate(url, waitMs = 1500) {
    await send('Page.navigate', { url });
    await sleep(waitMs);
  }

  async function evalJs(expr) {
    return send('Runtime.evaluate', { expression: expr, returnByValue: true });
  }

  async function capture(filename, width = 1440, height = 900) {
    await setViewport(width, height);
    await sleep(500);
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const localPath = path.join(WORKTREE_DIR, filename);
    const artPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artPath, buffer);
    console.log(`✓ Saved ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  try {
    // Setup staff session for KMC department
    await navigate(`${BASE_URL}/department/login`);
    await evalJs(`
      (() => {
        const kmcSession = {
          userId: 'kmc-staff-001',
          email: 'roads@kmc.gov.pk',
          username: 'roads-01',
          departmentId: 'kmc',
          departmentName: 'Karachi Metropolitan Corporation',
          departmentCode: 'KMC',
          authenticatedAt: new Date().toISOString()
        };
        const staffV2 = {
          userId: 'kmc-staff-001',
          email: 'roads@kmc.gov.pk',
          username: 'roads-01',
          fullName: 'Executive Engineer — Roads & Infrastructure',
          role: 'department_staff',
          departmentId: 'kmc',
          departmentName: 'Karachi Metropolitan Corporation',
          departmentCode: 'KMC',
          authenticatedAt: new Date().toISOString()
        };
        const prefs = {
          density: 'comfortable',
          startPage: 'overview',
          defaultQueueView: 'needs',
          defaultQueueSort: 'attention'
        };
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify(kmcSession));
        sessionStorage.setItem('awaaz_staff_session_v2', JSON.stringify(staffV2));
        sessionStorage.setItem('awaaz_selected_department', 'kmc');
        localStorage.setItem('awaaz_staff_session', JSON.stringify(staffV2));
        localStorage.setItem('awaaz_selected_department', 'kmc');
        localStorage.setItem('aawaaz-demo-theme', 'light');
        localStorage.setItem('awaaz_dept_theme_mode', 'light');
        localStorage.setItem('awaaz_staff_prefs_v7:kmc-staff-001', JSON.stringify(prefs));
      })()
    `);

    // 1. Overview Desktop 1440x900
    console.log('Capturing 01_v7_overview_desktop_1440...');
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('01_v7_overview_desktop_1440.png', 1440, 900);

    // 2. Overview Desktop 1366x768
    console.log('Capturing 02_v7_overview_desktop_1366...');
    await capture('02_v7_overview_desktop_1366.png', 1366, 768);

    // 3. Overview Dark Mode 1440x900
    console.log('Capturing 03_v7_overview_dark_1440...');
    await evalJs(`
      (() => {
        localStorage.setItem('aawaaz-demo-theme', 'dark');
        localStorage.setItem('awaaz_dept_theme_mode', 'dark');
      })()
    `);
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('03_v7_overview_dark_1440.png', 1440, 900);

    // Revert to light mode
    await evalJs(`
      (() => {
        localStorage.setItem('aawaaz-demo-theme', 'light');
        localStorage.setItem('awaaz_dept_theme_mode', 'light');
      })()
    `);

    // 4. Overview Mobile 390x844
    console.log('Capturing 04_v7_overview_mobile_390...');
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('04_v7_overview_mobile_390.png', 390, 844);

    // 5. Work Queue Comfortable Density 1440x900
    console.log('Capturing 05_v7_work_queue_comfortable_1440...');
    await evalJs(`
      (() => {
        const p = JSON.parse(localStorage.getItem('awaaz_staff_prefs_v7:kmc-staff-001') || '{}');
        p.density = 'comfortable';
        localStorage.setItem('awaaz_staff_prefs_v7:kmc-staff-001', JSON.stringify(p));
      })()
    `);
    await navigate(`${BASE_URL}/department?view=queue`, 2000);
    await capture('05_v7_work_queue_comfortable_1440.png', 1440, 900);

    // 6. Work Queue Compact Density 1440x900
    console.log('Capturing 06_v7_work_queue_compact_1440...');
    await evalJs(`
      (() => {
        const p = JSON.parse(localStorage.getItem('awaaz_staff_prefs_v7:kmc-staff-001') || '{}');
        p.density = 'compact';
        localStorage.setItem('awaaz_staff_prefs_v7:kmc-staff-001', JSON.stringify(p));
      })()
    `);
    await navigate(`${BASE_URL}/department?view=queue`, 2000);
    await capture('06_v7_work_queue_compact_1440.png', 1440, 900);

    // 7. Work Queue Mobile 390x844
    console.log('Capturing 07_v7_work_queue_mobile_390...');
    await capture('07_v7_work_queue_mobile_390.png', 390, 844);

    // 8. Settings Preferences (3 Cards) 1440x1280
    console.log('Capturing 08_v7_settings_preferences_1440...');
    await navigate(`${BASE_URL}/department?view=settings`, 2000);
    await capture('08_v7_settings_preferences_1440.png', 1440, 1280);

    // 9. Settings Password Modal Open 1440x900
    console.log('Capturing 09_v7_settings_password_modal_1440...');
    await evalJs(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const changePwdBtn = btns.find(b => b.textContent && b.textContent.includes('Change password'));
        if (changePwdBtn) changePwdBtn.click();
      })()
    `);
    await sleep(600);
    await capture('09_v7_settings_password_modal_1440.png', 1440, 900);

    // Close password modal
    await evalJs(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cancelBtn = btns.find(b => b.textContent && b.textContent.includes('Cancel'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(400);

    // 10. Case Detail 1440x900
    console.log('Capturing 10_v7_case_detail_1440...');
    await navigate(`${BASE_URL}/department?view=queue&case=C-2051`, 2000);
    await capture('10_v7_case_detail_1440.png', 1440, 900);

    // 11. Areas Page 1440x900
    console.log('Capturing 11_v7_areas_1440...');
    await navigate(`${BASE_URL}/department?view=areas`, 2000);
    await capture('11_v7_areas_1440.png', 1440, 900);

    // 12. Reduced Motion Overview 1440x900
    console.log('Capturing 12_v7_reduced_motion_1440...');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('12_v7_reduced_motion_1440.png', 1440, 900);

    console.log('\n=== ALL 12 V7 VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    try {
      ws.close();
    } catch {}
    chromeProcess.kill();
  }
}

run();
