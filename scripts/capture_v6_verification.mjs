import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'v6_verification');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/v6_verification';
const BASE_URL = 'http://localhost:5173';
const CDP_PORT = 9245;

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== V6 VERIFICATION: CAPTURING FULL EVIDENCE SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v6_verify_' + Date.now());
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
    // 1. Citizen Register
    console.log('Capturing 01_verification_citizen_register...');
    await navigate(`${BASE_URL}/register`);
    await capture('01_verification_citizen_register.png');

    // 2. Citizen Login
    console.log('Capturing 02_verification_citizen_login...');
    await navigate(`${BASE_URL}/login`);
    await capture('02_verification_citizen_login.png');

    // 3. Citizen Track Input
    console.log('Capturing 03_verification_citizen_track_input...');
    await navigate(`${BASE_URL}/track`);
    await capture('03_verification_citizen_track_input.png');

    // 4. Citizen Track Result
    console.log('Capturing 04_verification_citizen_track_result...');
    await evalJs(`
      (() => {
        const input = document.getElementById('tracking-number-input');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, '8041 7263 9150 2846 0371 6628');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          setTimeout(() => {
            const form = input.closest('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }, 200);
        }
      })()
    `);
    await sleep(2500);
    await capture('04_verification_citizen_track_result.png');

    // Setup staff session for department routes
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
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify(kmcSession));
        sessionStorage.setItem('awaaz_staff_session_v2', JSON.stringify(staffV2));
        sessionStorage.setItem('awaaz_selected_department', 'kmc');
        localStorage.setItem('awaaz_staff_session', JSON.stringify(staffV2));
        localStorage.setItem('awaaz_selected_department', 'kmc');
        localStorage.setItem('aawaaz-demo-theme', 'light');
        localStorage.setItem('awaaz_dept_theme_mode', 'light');
      })()
    `);

    // 5. Department Overview
    console.log('Capturing 05_verification_department_overview...');
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('05_verification_department_overview.png');

    // 6. Department Work Queue
    console.log('Capturing 06_verification_department_work_queue...');
    await navigate(`${BASE_URL}/department?view=queue`, 2000);
    await capture('06_verification_department_work_queue.png');

    // 7. Department Case Detail
    console.log('Capturing 07_verification_department_case_detail...');
    await navigate(`${BASE_URL}/department?view=queue&case=C-2051`, 2000);
    await capture('07_verification_department_case_detail.png');

    // 8. Department Areas
    console.log('Capturing 08_verification_department_areas...');
    await navigate(`${BASE_URL}/department?view=areas`, 2000);
    await capture('08_verification_department_areas.png');

    // 9. Department Priority Queue
    console.log('Capturing 09_verification_department_priority...');
    await navigate(`${BASE_URL}/department?view=priority`, 2000);
    await capture('09_verification_department_priority.png');

    // 10. Department Settings
    console.log('Capturing 10_verification_department_settings...');
    await navigate(`${BASE_URL}/department?view=settings`, 2000);
    await capture('10_verification_department_settings.png');

    // 11. Mobile Overview (390x844)
    console.log('Capturing 11_verification_mobile_overview...');
    await navigate(`${BASE_URL}/department?view=overview`, 2000);
    await capture('11_verification_mobile_overview.png', 390, 844);

    // 12. Mobile Queue (390x844)
    console.log('Capturing 12_verification_mobile_queue...');
    await navigate(`${BASE_URL}/department?view=queue`, 2000);
    await capture('12_verification_mobile_queue.png', 390, 844);

    console.log('\n=== ALL 12 V6 VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } finally {
    try {
      ws.close();
    } catch {}
    chromeProcess.kill();
  }
}

run().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
