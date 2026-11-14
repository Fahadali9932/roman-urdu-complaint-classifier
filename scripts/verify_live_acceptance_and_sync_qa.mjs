import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/critical_fixes_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/critical_fixes_qa';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- Precision QA Step 3 & Department Workspace ---');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_fixes_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9264',
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
      const res = await fetch('http://localhost:9264/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9264');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9264/json/list');
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

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(1500);
  };

  const evaluate = async (expression) => {
    return send('Runtime.evaluate', { expression, returnByValue: true });
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Citizen Form Step 3
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Navigating through Citizen Submission to Step 3 ---');
    await navigate('http://localhost:5173/submit');
    await sleep(1000);

    // Step 1: Name and Phone
    await evaluate(`
      (() => {
        function setReactValue(input, val) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setReactValue(document.getElementById('citizenName'), 'Syed Farhan Ali');
        setReactValue(document.getElementById('citizenPhone'), '03001234567');
      })()
    `);
    await sleep(400);

    // Click Continue to Stage 2
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue') || b.textContent.includes('آگے'));
        if (btn) btn.click();
      })()
    `);
    await sleep(800);

    // Step 2: Select Locality and fill Home Address
    await evaluate(`
      (() => {
        function setReactValue(input, val) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setReactValue(document.getElementById('applicantAddress'), 'Flat B-12, Al-Ghafoor Heights, Block 13-D');
        // Click first locality suggestion in list
        const option = document.querySelector('li[role="option"]') || Array.from(document.querySelectorAll('li')).find(l => l.textContent.includes('Gulshan-e-Iqbal'));
        if (option) option.click();
      })()
    `);
    await sleep(800);

    // Click Continue to Stage 3
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue') || b.textContent.includes('آگے'));
        if (btn) btn.click();
      })()
    `);
    await sleep(1000);

    // Fill Stage 3: Roman Urdu description
    await evaluate(`
      (() => {
        const textarea = document.getElementById('description') || document.querySelector('textarea');
        if (textarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(textarea, 'Main University Road Gulshan block 13-D ke turn par bohot gehra garha ban chuka hai. Daily motorcycles slip hoti hain aur barish ka pani khara rehta hai. Baraye meherbani foran repair karwayein.');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(800);

    await capture('01_citizen_submit_step3_no_demo_checkbox', 1280, 850);

    // -------------------------------------------------------------------------
    // 2. Department Portal Workspace Login & Populated View
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Logging in as roads-01 at /department/login?dept=kmc ---');
    await navigate('http://localhost:5173/department/login?dept=kmc');
    await sleep(1200);

    // Fill credentials form
    await evaluate(`
      (() => {
        function setReactValue(input, val) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const userInput = document.getElementById('username') || document.querySelector('input[type="text"]');
        const passInput = document.getElementById('accessKey') || document.querySelector('input[type="password"]');
        if (userInput) setReactValue(userInput, 'roads-01');
        if (passInput) setReactValue(passInput, 'Y5AcfXVDn9-rzqE!GY8bMyyenH4r');

        const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign in') || b.textContent.includes('Sign In'));
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(2500);

    await capture('02_department_workspace_pending_acceptance', 1440, 900);

    // Click Accept Complaint
    console.log('\n--- 3. Opening Accept Complaint Modal ---');
    await evaluate(`
      (() => {
        const acceptBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Accept Complaint');
        if (acceptBtn) acceptBtn.click();
      })()
    `);
    await sleep(800);
    await capture('03_department_accept_modal_view', 1440, 900);

    // Close modal
    await evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(500);

    // Click on Resolved complaint (KHI-2026-42DEA6C7)
    console.log('\n--- 4. Selecting Work Done Complaint (KHI-2026-42DEA6C7) ---');
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const allBtn = buttons.find(b => b.textContent.includes('All complaints') || b.textContent.includes('All Complaints'));
        if (allBtn) allBtn.click();
      })()
    `);
    await sleep(600);

    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('button'));
        const card = cards.find(c => c.textContent.includes('42DEA6C7'));
        if (card) card.click();
      })()
    `);
    await sleep(800);
    await capture('04_department_resolved_complaint_readonly', 1440, 900);

    console.log('\n--- Precision QA Capture Complete ---');
  } catch (err) {
    console.error('Error during QA execution:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
  }
}

run();
