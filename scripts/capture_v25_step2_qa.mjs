import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'docs', 'v25_step2', 'screenshots');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2/screenshots/v25_step2';
const BASE_URL = 'http://127.0.0.1:5173';
const CDP_PORT = 9277;

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== V25 STEP 2: CAPTURING AUTHENTICATION VERIFICATION SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v25_step2_' + Date.now());
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

  let connected = false;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        console.log(`Connected to Chrome CDP on port ${CDP_PORT}`);
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error('Failed to connect to headless Chrome.');
    process.exit(1);
  }

  const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
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
    await sleep(300);
  }

  async function navigate(url, waitMs = 1500) {
    await send('Page.navigate', { url });
    await sleep(waitMs);
  }

  async function evalJs(expr) {
    return send('Runtime.evaluate', { expression: expr, returnByValue: true });
  }

  async function capture(filename, width = 1280, height = 800) {
    await setViewport(width, height);
    await sleep(400);
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const localPath = path.join(WORKTREE_DIR, filename);
    const artPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artPath, buffer);
    console.log(`✓ Saved ${filename} (${width}x${height}, ${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Department Login (KMC) - Desktop 1280px (Head role)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Department Login: KMC Roads (Desktop 1280px) ---');
    await navigate(`${BASE_URL}/department/login?dept=kmc`);
    await capture('v25_step2_01_dept_kmc_head_1280.png', 1280, 800);

    // -------------------------------------------------------------------------
    // 2. Department Login (KMC) - Desktop 1280px (Click "Operations Officer" tab)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Department Login: Toggle to Operations Officer (Desktop 1280px) ---');
    await evalJs(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const officerBtn = buttons.find(b => b.textContent && b.textContent.includes('Operations Officer'));
        if (officerBtn) officerBtn.click();
      })()
    `);
    await sleep(500);
    await capture('v25_step2_02_dept_kmc_officer_1280.png', 1280, 800);

    // -------------------------------------------------------------------------
    // 3. Department Login (KMC) - Tablet (768x1024)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Department Login: KMC Tablet (768x1024) ---');
    await capture('v25_step2_03_dept_kmc_tablet_768.png', 768, 1024);

    // -------------------------------------------------------------------------
    // 4. Department Login (KMC) - Mobile (390x844)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Department Login: KMC Mobile (390x844) ---');
    await capture('v25_step2_04_dept_kmc_mobile_390.png', 390, 844);

    // -------------------------------------------------------------------------
    // 5. Department Login (KMC) - Small Mobile (320x650)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Department Login: KMC Small Mobile (320x650) ---');
    await capture('v25_step2_05_dept_kmc_mobile_320.png', 320, 650);

    // -------------------------------------------------------------------------
    // 6. Other Department (K-Electric) - Desktop (1280x800)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Department Login: K-Electric (Desktop 1280px) ---');
    await navigate(`${BASE_URL}/department/login?dept=kelectric`);
    await capture('v25_step2_06_dept_kelectric_1280.png', 1280, 800);

    // -------------------------------------------------------------------------
    // 7. Main Administrator Login - Desktop (1280x800)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Main Admin Login: Desktop (1280x800) ---');
    await navigate(`${BASE_URL}/admin/login`);
    await capture('v25_step2_07_admin_login_1280.png', 1280, 800);

    // -------------------------------------------------------------------------
    // 8. Main Administrator Login - Tablet (768x1024)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Main Admin Login: Tablet (768x1024) ---');
    await capture('v25_step2_08_admin_login_tablet_768.png', 768, 1024);

    // -------------------------------------------------------------------------
    // 9. Main Administrator Login - Mobile (390x844)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Main Admin Login: Mobile (390x844) ---');
    await capture('v25_step2_09_admin_login_mobile_390.png', 390, 844);

    // -------------------------------------------------------------------------
    // 10. Main Administrator Login - Small Mobile (320x650)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Main Admin Login: Small Mobile (320x650) ---');
    await capture('v25_step2_10_admin_login_mobile_320.png', 320, 650);

    // -------------------------------------------------------------------------
    // 11. Main Administrator Login - Form Validation Error Alert
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Main Admin Login: Validation Error ---');
    await setViewport(1280, 800);
    await evalJs(`
      (() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(500);
    await capture('v25_step2_11_admin_validation_error_1280.png', 1280, 800);

    // -------------------------------------------------------------------------
    // 12. Citizen Sign-In - Desktop (1280x800)
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Citizen Login: Desktop (1280x800) ---');
    await navigate(`${BASE_URL}/login`);
    await capture('v25_step2_12_citizen_login_1280.png', 1280, 800);

    // -------------------------------------------------------------------------
    // 13. Citizen Sign-In - Mobile (390x844)
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Citizen Login: Mobile (390x844) ---');
    await capture('v25_step2_13_citizen_login_mobile_390.png', 390, 844);

    console.log('\n✓ All 13 verification screenshots successfully captured and saved.');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    try {
      ws.close();
      process.kill(-chromeProcess.pid);
    } catch {}
    try {
      chromeProcess.kill();
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    process.exit(0);
  }
}

run();
