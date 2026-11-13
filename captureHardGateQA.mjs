import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_SCREENSHOT_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/hardgate';
const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/hardgate';

if (!fs.existsSync(WORKTREE_SCREENSHOT_DIR)) fs.mkdirSync(WORKTREE_SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for Hard Gate Visual QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_hardgate_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9240',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5185/department/login',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9240/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9240');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9240/json/list');
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
    await sleep(700);
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
    // 1. Department Selection Screen (1440x900 & 390x844)
    console.log('\n--- Capturing Screen 1: Department Selection ---');
    await navigate('http://localhost:5185/department/login');
    await capture('01_department_selection_desktop_1440', 1440, 900);
    await capture('02_department_selection_mobile_390', 390, 844);

    // 2. Open Department Selection Modal
    console.log('\n--- Capturing Department Selection Modal ---');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('button[aria-haspopup="dialog"]').click()`,
    });
    await sleep(600);
    await capture('03_department_selection_modal_open_1440', 1440, 900);
    await capture('04_department_selection_modal_open_390', 390, 844);

    // 3. Roads Login Screen (1440x900 & 390x844)
    console.log('\n--- Capturing Screen 2: Roads Login ---');
    await navigate('http://localhost:5185/department/login?dept=kmc');
    await capture('05_roads_login_desktop_1440', 1440, 900);
    await capture('06_roads_login_mobile_390', 390, 844);

    // 4. Roads Revoked State (1440x900)
    console.log('\n--- Capturing Roads Revocation State ---');
    await navigate('http://localhost:5185/department/login?dept=kmc&revoked=true&reason=Administrator%20revoked%20access');
    await capture('07_roads_login_revoked_1440', 1440, 900);

    console.log('\nAll Hard Gate visual QA screenshots captured successfully!');
  } catch (err) {
    console.error('Error during Hard Gate capture:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
    process.exit(0);
  }
}

run();
