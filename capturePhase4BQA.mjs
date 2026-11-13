import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_SCREENSHOT_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/phase4b';
const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase4b';

if (!fs.existsSync(WORKTREE_SCREENSHOT_DIR)) fs.mkdirSync(WORKTREE_SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for Phase 4B Visual QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase4b_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9235',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5178/department/login',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9235/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9235');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9235/json/list');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let reqId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('DOM.enable');

  const capture = async (name, width, height, deviceScaleFactor = 2) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: width < 768,
    });
    await sleep(600);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_SCREENSHOT_DIR, `${name}.png`), buf);
    fs.writeFileSync(path.join(ARTIFACT_SCREENSHOT_DIR, `${name}.png`), buf);
    console.log(`Saved screenshot: ${name}.png (${width}x${height})`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(1000);
  };

  try {
    // 1. Department Selection Screen at 1440, 1024, 768, 390, 320
    console.log('\n--- Capturing Screen 1: Department Selection ---');
    await navigate('http://localhost:5178/department/login');
    await capture('01_department_selection_desktop_1440', 1440, 900);
    await capture('02_department_selection_desktop_1024', 1024, 768);
    await capture('03_department_selection_tablet_768', 768, 1024);
    await capture('04_department_selection_mobile_390', 390, 844);
    await capture('05_department_selection_mobile_320', 320, 640);

    // 2. Open Department Selection Modal
    console.log('\n--- Capturing Department Selection Modal ---');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('button[aria-haspopup="dialog"]').click()`,
    });
    await sleep(600);
    await capture('06_department_selection_modal_open_1440', 1440, 900);
    await capture('07_department_selection_modal_open_390', 390, 844);

    // 3. Roads Department Login Screen at 1440, 1024, 768, 390, 320
    console.log('\n--- Capturing Screen 2: Roads Department Login ---');
    await navigate('http://localhost:5178/department/login?dept=kmc');
    await capture('08_roads_login_desktop_1440', 1440, 900);
    await capture('09_roads_login_desktop_1024', 1024, 768);
    await capture('10_roads_login_tablet_768', 768, 1024);
    await capture('11_roads_login_mobile_390', 390, 844);
    await capture('12_roads_login_mobile_320', 320, 640);

    // 4. Roads Login with Revocation Alert
    console.log('\n--- Capturing Roads Login Revocation Alert ---');
    await navigate('http://localhost:5178/department/login?dept=kmc&revoked=true&reason=Annual+audit+and+personnel+rotation');
    await capture('13_roads_login_revoked_notice_1440', 1440, 900);

    console.log('\nAll Phase 4B visual QA screenshots captured successfully.');
  } catch (err) {
    console.error('QA Error:', err);
  } finally {
    ws.close();
    try {
      chromeProcess.kill();
    } catch {}
  }
}

run();
