import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'docs', 'v8', 'screenshots');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/v8_verification';
const BASE_URL = 'http://localhost:5173';
const CDP_PORT = 9266;

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== V8 VERIFICATION: CAPTURING 6 EVIDENCE SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v8_verify_' + Date.now());
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

    // 1. Overview Page with 4-state lifecycle facts strip (104 total cases)
    console.log('Capturing 01_v8_overview_updated_1440...');
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('01_v8_overview_updated_1440.png', 1440, 900);

    // 2. Sidebar showing NO Settings and NO Preferences section
    console.log('Capturing 02_v8_sidebar_no_settings_1440...');
    await capture('02_v8_sidebar_no_settings_1440.png', 1440, 900);

    // 3. Topbar Avatar Dropdown with Account Info, Theme Toggle, Password Action, Sign Out
    console.log('Capturing 03_v8_topbar_avatar_dropdown_1440...');
    await evalJs(`
      (() => {
        const btn = document.querySelector('.avatar-btn');
        if (btn) btn.click();
      })()
    `);
    await sleep(600);
    await capture('03_v8_topbar_avatar_dropdown_1440.png', 1440, 900);

    // 4. Change Password Modal Opened from Topbar Dropdown
    console.log('Capturing 04_v8_password_modal_opened_1440...');
    await evalJs(`
      (() => {
        const items = Array.from(document.querySelectorAll('button'));
        const pwdBtn = items.find(b => b.textContent && b.textContent.includes('Change password'));
        if (pwdBtn) pwdBtn.click();
      })()
    `);
    await sleep(600);
    await capture('04_v8_password_modal_opened_1440.png', 1440, 900);

    // Close password modal
    await evalJs(`
      (() => {
        const closeBtn = document.querySelector('.modal-card button[aria-label="Close dialog"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(400);

    // 5. Work Queue with Live Incident Cases
    console.log('Capturing 05_v8_work_queue_live_cases_1440...');
    await navigate(`${BASE_URL}/department?view=queue`, 2000);
    await capture('05_v8_work_queue_live_cases_1440.png', 1440, 900);

    // 6. Public Citizen Tracker
    console.log('Capturing 06_v8_citizen_tracking_live_1440...');
    await navigate(`${BASE_URL}/track`, 2000);
    await capture('06_v8_citizen_tracking_live_1440.png', 1440, 900);

    console.log('\n=== ALL 6 V8 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    ws.close();
    try {
      chromeProcess.kill('SIGTERM');
    } catch {}
  }
}

run();
