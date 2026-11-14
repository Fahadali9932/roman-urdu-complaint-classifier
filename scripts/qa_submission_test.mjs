import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/submission_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/submission_qa';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- Precision Citizen Submission Verification ---');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_sub_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9275',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5173/submit',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9275/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9275');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9275/json/list');
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

  const capture = async (filename, width = 1440, height = 900) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await sleep(800);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_DIR, `${filename}.png`), buffer);
    fs.writeFileSync(path.join(ARTIFACT_DIR, `${filename}.png`), buffer);
    console.log(`[CAPTURED] ${filename}.png (${width}x${height})`);
  };

  const evaluate = async (expression) => {
    return send('Runtime.evaluate', { expression, returnByValue: true });
  };

  try {
    await sleep(1500);

    // 1. Capture Step 1 initial
    console.log('Capturing Step 1 (Applicant details)...');
    await capture('01_citizen_submit_step1');

    // Fill Step 1
    await evaluate(`
      function setVal(id, val) {
        const el = document.getElementById(id);
        if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : (el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      setVal('citizenName', 'Muhammad Ali');
      setVal('citizenPhone', '03001234567');
      setVal('citizenEmail', 'ali.citizen@example.com');
    `);

    await sleep(400);
    // Click Continue on Step 1
    await evaluate(`
      document.querySelector('form button[type="submit"]')?.click();
    `);
    await sleep(1000);

    // 2. Capture Step 2
    console.log('Capturing Step 2 (Location details)...');
    await capture('02_citizen_submit_step2');

    // Fill Step 2
    await evaluate(`
      function setVal(id, val) {
        const el = document.getElementById(id);
        if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : (el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      setVal('locality', 'Gulshan-e-Iqbal');
      setVal('district', 'District East');
      setVal('publicLocation', 'Main University Road Gulshan block 13-D turn');
      setVal('applicantAddress', 'House 42, Block 13-D, Gulshan-e-Iqbal, Karachi');
    `);

    await sleep(400);
    // Click Continue on Step 2
    await evaluate(`
      document.querySelector('form button[type="submit"]')?.click();
    `);
    await sleep(1000);

    // 3. Capture Step 3
    console.log('Capturing Step 3 (Complaint description)...');
    await capture('03_citizen_submit_step3');

    // Fill Step 3
    await evaluate(`
      function setVal(id, val) {
        const el = document.getElementById(id);
        if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : (el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      setVal('description', 'Main University Road Gulshan block 13-D turn par bohot gehra garha ban chuka hai. Daily motorcycles slip hoti hain aur traffic block hota hai. Baraye meherbani foran repair karwayein.');
    `);

    await sleep(400);
    // Click Submit on Step 3
    await evaluate(`
      document.querySelector('form button[type="submit"]')?.click();
    `);
    await sleep(1500);

    // 4. Capture Step 3 with Auth Required Banner
    console.log('Capturing Step 3 with Auth Required Banner...');
    await capture('04_citizen_submit_auth_required_banner');

    console.log('Submission QA test executed successfully.');
  } finally {
    ws.close();
    chromeProcess.kill();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
