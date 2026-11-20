import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('docs/v11/screenshots');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2/screenshots';
const PORT = 5174;

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE V13.6.2: RESPONSIVE BROWSER & SHARED REVIEW VERIFICATION ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v13_6_2_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9299',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' }
  );

  let connected = false;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9299/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9299');
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error('Failed to connect to Chrome on port 9299');
    process.exit(1);
  }

  const targetsRes = await fetch('http://localhost:9299/json/list');
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
  await send('Runtime.enable');
  await send('DOM.enable');

  const capture = async (filename, width, height) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await sleep(800);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    const localPath = path.join(SCREENSHOT_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artifactPath, buffer);
    console.log(`Saved screenshot: ${filename} (${width}x${height})`);
  };

  // 0. Homepage Verification at 1280px
  console.log(`Navigating to http://localhost:${PORT}/ (Homepage)...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(2500);
  console.log('Capturing Homepage 1280px...');
  await capture('v13_6_2_00_homepage_desktop_1280.png', 1280, 800);

  // 1. Desktop 1280px Submit Page in Local AI Test Mode
  console.log(`Navigating to http://localhost:${PORT}/submit?mode=local-ai-test`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/submit?mode=local-ai-test` });
  await sleep(2500);

  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const select = document.querySelector('select');
        if (select) {
          select.value = 'v13_6_candidate';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `,
  });
  await sleep(600);

  console.log('Capturing Desktop 1280px Submit...');
  await capture('v13_6_2_01_submit_desktop_1280.png', 1280, 800);

  // 2. Tablet 768px Submit
  console.log('Capturing Tablet 768px Submit...');
  await capture('v13_6_2_02_submit_tablet_768.png', 768, 1024);

  // 3. Mobile 390px Submit
  console.log('Capturing Mobile 390px Submit...');
  await capture('v13_6_2_03_submit_mobile_390.png', 390, 844);

  // 4. Small Mobile 320px Submit
  console.log('Capturing Small Mobile 320px Submit...');
  await capture('v13_6_2_04_submit_small_mobile_320.png', 320, 640);

  // 5. Admin AI Control Center with Shared Review Queue
  console.log('Navigating to Admin Portal and Authenticating...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Inject authenticated admin session and seed a test review item into local storage
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        sessionStorage.setItem('awaaz_admin_session_v2', JSON.stringify({
          userId: 'admin-seed-uuid-001',
          email: 'admin@example.org',
          fullName: 'Main Administrator (Civic Oversight)',
          role: 'main_admin',
          token: 'mock-admin-token'
        }));
        // Seed a sample review item in local review queue for visual verification
        const sampleQueue = [
          {
            id: 'rev-v13-6-2-001',
            complaintId: 'comp-v13-test-101',
            referenceNumber: 'KHI-2026-KE88',
            text: 'Gulshan Block 13D mein transformer blast hone se bijli band hai aur road par gehra gaddha hai. 03219876543',
            originalDepartments: ['kelectric'],
            suggestedDepartment: 'kmc',
            flaggedByStaffId: 'staff-ke-01',
            flaggedByStaffName: 'K-Electric Field Supervisor',
            flaggedByDepartment: 'kelectric',
            flagReason: 'Bijli ke sath sadak par bhi shadid khada hai, KMC ki zimmadari banti hai.',
            flaggedAt: new Date().toISOString(),
            status: 'pending',
            piiScrubbed: true
          }
        ];
        localStorage.setItem('awaaz_ai_review_queue_v11', JSON.stringify(sampleQueue));
      })()
    `,
  });

  console.log(`Navigating to http://localhost:${PORT}/admin/ai (AI Control Center)...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/admin/ai` });
  await sleep(2500);

  // Switch to Review Queue tab if needed
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const buttons = Array.from(document.querySelectorAll('button'));
        const reviewBtn = buttons.find(b => b.textContent && b.textContent.includes('Review Queue'));
        if (reviewBtn) reviewBtn.click();
      })()
    `,
  });
  await sleep(1000);

  console.log('Capturing Admin AI Control Center 1280px...');
  await capture('v13_6_2_05_admin_ai_control_center_1280.png', 1280, 900);

  // 6. Department Portal Flag Modal
  console.log('Navigating to Department Portal and opening Flag Misclassification Modal...');
  // Seed a department session
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        sessionStorage.setItem('awaaz_dept_session', JSON.stringify({
          userId: 'staff-kwsc-01',
          username: 'Water Authority Operator',
          departmentId: 'kwsc',
          role: 'department_staff'
        }));
      })()
    `,
  });

  await send('Page.navigate', { url: `http://localhost:${PORT}/department` });
  await sleep(2500);

  // If there are complaints in work queue, open first complaint modal or inspect action
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const flagButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Flag'));
        if (flagButtons.length > 0) flagButtons[0].click();
      })()
    `,
  });
  await sleep(1200);

  console.log('Capturing Department Portal / Flag Modal...');
  await capture('v13_6_2_06_department_portal_1280.png', 1280, 900);

  console.log('\nAll V13.6.2 browser screenshots captured successfully!');
  ws.close();
  try {
    chromeProcess.kill();
  } catch {}
  process.exit(0);
}

run().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
