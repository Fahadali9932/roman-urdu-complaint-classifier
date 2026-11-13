import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_SCREENSHOT_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/staff_auth_phase1';
const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/staff_auth_phase1';

if (!fs.existsSync(WORKTREE_SCREENSHOT_DIR)) fs.mkdirSync(WORKTREE_SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for Staff Auth Visual QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_staff_qa_' + Date.now());
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--user-data-dir=${tempDir}`,
    'http://localhost:5176/admin/login',
  ], { detached: true, stdio: 'ignore' });

  for (let i = 0; i < 25; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9230/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9230');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9230/json/list');
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

  async function capture(filename, width, height, url, prepareFn = null) {
    console.log(`Capturing ${filename} (${width}x${height}) at ${url}...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 600,
    });

    await send('Page.navigate', { url });
    await sleep(1500);

    if (prepareFn) {
      await prepareFn(send);
      await sleep(600);
    }

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_SCREENSHOT_DIR, filename), buffer);
    fs.writeFileSync(path.join(ARTIFACT_SCREENSHOT_DIR, filename), buffer);
    console.log(`Saved ${filename}`);
  }

  // 1. Admin Login Desktop 1440x1000 (Frame 35:1282)
  await capture('01_admin_login_desktop_1440.png', 1440, 1000, 'http://localhost:5176/admin/login');

  // 2. Admin Login Mobile 390x844 (Frame 35:1282 Mobile)
  await capture('02_admin_login_mobile_390.png', 390, 844, 'http://localhost:5176/admin/login');

  // 3. Admin Login Urdu RTL 1440x1000
  await capture('03_admin_login_urdu_rtl_1440.png', 1440, 1000, 'http://localhost:5176/admin/login', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EN / اردو') || b.textContent.includes('اردو / EN'));
        if (btn) btn.click();
      `,
    });
  });

  // 4. Department Sign-in Desktop 1440x1000 (Frames 35:1332 & 35:1363)
  await capture('04_department_signin_desktop_1440.png', 1440, 1000, 'http://localhost:5176/department/login');

  // 5. Department Sign-in Mobile 390x844
  await capture('05_department_signin_mobile_390.png', 390, 844, 'http://localhost:5176/department/login');

  // 6. Department Selector Open showing municipal agencies
  await capture('06_department_selector_open_1440.png', 1440, 1000, 'http://localhost:5176/department/login', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const selector = document.getElementById('req-department-select');
        if (selector) selector.click();
      `,
    });
  });

  // 7. Department Pending Approval State (Frame 35:1390)
  await capture('07_department_pending_approval_1440.png', 1440, 1000, 'http://localhost:5176/department/login', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const nameInput = document.getElementById('req-fullname');
        const emailInput = document.getElementById('req-email');
        const passInput = document.getElementById('req-password');
        if (nameInput) {
          nameInput.value = 'Tariq Mansoor';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (emailInput) {
          emailInput.value = 'tariq.mansoor@ke.com.pk';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passInput) {
          passInput.value = 'SecureStaffPass123';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Request Access'));
        if (submitBtn) submitBtn.click();
      `,
    });
  });

  // 8. Department Sign-in in Urdu RTL
  await capture('08_department_urdu_rtl_1440.png', 1440, 1000, 'http://localhost:5176/department/login', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EN / اردو') || b.textContent.includes('اردو / EN'));
        if (btn) btn.click();
      `,
    });
  });

  console.log('All 8 Staff Auth screenshots successfully captured!');
  await send('Browser.close');
  process.exit(0);
}

run().catch((e) => {
  console.error('Capture error:', e);
  process.exit(1);
});
