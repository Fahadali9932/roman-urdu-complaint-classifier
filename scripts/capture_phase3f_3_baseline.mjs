import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase3f_3_baseline');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3f_3_baseline';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE 3F.3: CAPTURING CURRENT BASELINE SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_baseline_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9298',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5173/',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9298/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9298');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9298/json/list');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let reqId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  const setViewport = async (width, height, isMobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await sleep(400);
  };

  const capture = async (name, width, height, isMobile = false) => {
    await setViewport(width, height, isMobile);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const localFile = path.join(WORKTREE_DIR, `${name}.png`);
    const brainFile = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(localFile, buffer);
    fs.writeFileSync(brainFile, buffer);
    console.log(`[CAPTURED BASELINE] ${name}.png (${width}x${height})`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(2000);
  };

  const evaluate = async (expression) => {
    return send('Runtime.evaluate', { expression, returnByValue: true });
  };

  const loginAs = async (username, accessKey, deptId) => {
    await evaluate(`(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
    })()`);
    await navigate(`http://localhost:5173/department/login?dept=${deptId}`);
    await sleep(1500);
    await evaluate(`(() => {
      const setVal = (input, val) => {
        if (!input) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const userInp = document.querySelector('input[autocomplete="username"]') || document.querySelector('input[type="text"]');
      const passInp = document.querySelector('input[autocomplete="current-password"]') || document.querySelector('input[type="password"]');
      setVal(userInp, '${username}');
      setVal(passInp, '${accessKey}');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(4000);
  };

  try {
    const kmcStaff = credentials.departments.find((d) => d.departmentId === 'kmc');
    await loginAs('roads-01', kmcStaff.accessKey, 'kmc');
    await sleep(2000);

    // 1. Complaints 1440x900
    await capture('baseline_01_complaints_1440x900', 1440, 900);

    // 2. Complaints 1920x1080
    await capture('baseline_02_complaints_1920x1080', 1920, 1080);

    // 3. Complaints 390x844 (Mobile)
    await capture('baseline_03_complaints_390x844', 390, 844, true);

    // Reset viewport to desktop
    await setViewport(1440, 900);

    // 4. Detail Page
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await capture('baseline_04_detail_overview_1440x900', 1440, 900);

    // 5. Priority Queue
    await evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to'));
      if (backBtn) backBtn.click();
    })()`);
    await sleep(1000);
    await evaluate(`(() => {
      const pBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Priority Queue'));
      if (pBtn) pBtn.click();
    })()`);
    await sleep(1500);
    await capture('baseline_05_priority_queue_1440x900', 1440, 900);

    // 6. Dashboard
    await evaluate(`(() => {
      const dashBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dashboard'));
      if (dashBtn) dashBtn.click();
    })()`);
    await sleep(1500);
    await capture('baseline_06_dashboard_1440x900', 1440, 900);

    // 7. Settings
    await evaluate(`(() => {
      const setBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
      if (setBtn) setBtn.click();
    })()`);
    await sleep(1500);
    await capture('baseline_07_settings_1440x900', 1440, 900);

    console.log('\nAll baseline screenshots captured successfully!');
  } catch (err) {
    console.error('Error during baseline capture:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
  }
}

run();
