import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/routing_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/routing_qa';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_review_modal_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9295',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5173/department/login?dept=kmc',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9295/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9295');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9295/json/list');
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
    await sleep(2000);

    // Login as roads-01
    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#username', 'roads-01');
      setVal('#accessKey', '${roadsStaff.accessKey}');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3500);

    // Click on Review Queue filter in sidebar
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reviewQueueBtn = btns.find(b => b.textContent.includes('Review Queue'));
      if (reviewQueueBtn) reviewQueueBtn.click();
    })()`);
    await sleep(1500);
    await capture('05_department_portal_review_queue_selected');

    // Click on "Review & Assign Department" button to open modal
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reviewModalBtn = btns.find(b => b.textContent.includes('Review & Assign Department') || b.textContent.includes('Review complaint'));
      if (reviewModalBtn) reviewModalBtn.click();
    })()`);
    await sleep(1200);
    await capture('06_classification_review_assignment_modal_open');

    console.log('Review Queue screenshots captured successfully!');
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill('SIGTERM');
    } catch {}
  }
}

run();
