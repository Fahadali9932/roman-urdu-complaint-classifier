import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'v6_baseline');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/v6_baseline';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== V6 BASELINE DISCOVERY: RUNNING SCREENSHOT CAPTURE ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v6_baseline_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9298',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5174/',
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
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.onopen = resolve);

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
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
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

  async function navigate(url, waitMs = 1200) {
    await send('Page.navigate', { url });
    await sleep(waitMs);
  }

  async function evalJs(expr) {
    return send('Runtime.evaluate', { expression: expr, returnByValue: true });
  }

  async function capture(filename, width = 1440, height = 900) {
    await setViewport(width, height);
    await sleep(400);
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.result.data, 'base64');
    const localPath = path.join(WORKTREE_DIR, filename);
    const artPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artPath, buffer);
    console.log(`✓ Saved ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  // 1. Citizen Register
  console.log('Capturing 01_baseline_citizen_register...');
  await navigate('http://localhost:5174/register');
  await capture('01_baseline_citizen_register.png');

  // 2. Citizen Login
  console.log('Capturing 02_baseline_citizen_login...');
  await navigate('http://localhost:5174/login');
  await capture('02_baseline_citizen_login.png');

  // 3. Citizen Write Complaint (Step 1)
  console.log('Capturing 03_baseline_citizen_submit_step1...');
  await navigate('http://localhost:5174/submit');
  await capture('03_baseline_citizen_submit_step1.png');

  // 4. Citizen Track
  console.log('Capturing 04_baseline_citizen_track...');
  await navigate('http://localhost:5174/track');
  await capture('04_baseline_citizen_track.png');

  // 5. Department Login
  console.log('Capturing 05_baseline_department_selection...');
  await navigate('http://localhost:5174/department/login');
  await capture('05_baseline_department_selection.png');

  // Setup KMC staff session in sessionStorage
  const kmcStaff = credentials.departments.find((d) => d.departmentId === 'kmc');
  await evalJs(`
    sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
      userId: '${kmcStaff.userId}',
      email: '${kmcStaff.authEmail}',
      username: '${kmcStaff.username}',
      departmentId: 'kmc',
      departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
      departmentCode: 'KMC',
      authenticatedAt: new Date().toISOString()
    }));
  `);

  // 6. Department Overview (Verifying blank overview state!)
  console.log('Capturing 06_baseline_department_overview_blank...');
  await navigate('http://localhost:5174/department?view=overview');
  await capture('06_baseline_department_overview_blank.png');

  // 7. Department Work Queue
  console.log('Capturing 07_baseline_department_work_queue...');
  await navigate('http://localhost:5174/department?view=queue');
  await capture('07_baseline_department_work_queue.png');

  // 8. Department Areas
  console.log('Capturing 08_baseline_department_areas...');
  await navigate('http://localhost:5174/department?view=areas');
  await capture('08_baseline_department_areas.png');

  // 9. Department Priority
  console.log('Capturing 09_baseline_department_priority...');
  await navigate('http://localhost:5174/department?view=priority');
  await capture('09_baseline_department_priority.png');

  // 10. Department Settings
  console.log('Capturing 10_baseline_department_settings...');
  await navigate('http://localhost:5174/department?view=settings');
  await capture('10_baseline_department_settings.png');

  console.log('\n=== ALL BASELINE SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  ws.close();
  try {
    process.kill(chromeProcess.pid);
  } catch {}
}

run().catch((e) => {
  console.error('Capture failed:', e);
  process.exit(1);
});
