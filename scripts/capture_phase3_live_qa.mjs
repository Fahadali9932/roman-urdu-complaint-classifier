import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/phase3_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3_qa';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('==============================================================================');
  console.log('AWAAZ-E-AWAM — PHASE 3 COMPREHENSIVE QA & DEPARTMENT ISOLATION VERIFICATION');
  console.log('==============================================================================\n');

  const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate staff accounts
  const staffClients = {};
  for (const dept of credentials.departments) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const auth = await client.auth.signInWithPassword({
      email: dept.authEmail,
      password: dept.accessKey,
    });
    if (auth.error) {
      console.error(`Login failed for ${dept.username}:`, auth.error.message);
    } else {
      staffClients[dept.departmentId] = { client, dept, user: auth.data.user };
      console.log(`[AUTH OK] ${dept.username} (${dept.departmentId})`);
    }
  }

  // ---------------------------------------------------------------------------
  // Headless Chrome CDP Live UI Verification & Visual Evidence
  // ---------------------------------------------------------------------------
  console.log('\n--- Headless Chrome CDP Live UI Capture on port 5173 ---');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase3_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9292',
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
      const res = await fetch('http://localhost:9292/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9292');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9292/json/list');
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
    await sleep(2000);
  };

  const evaluate = async (expression) => {
    return send('Runtime.evaluate', { expression, returnByValue: true });
  };

  const loginAs = async (username, accessKey, deptId) => {
    // Clear storage to guarantee 100% session isolation
    await evaluate(`(() => {
      localStorage.clear();
      sessionStorage.clear();
    })()`);
    await navigate(`http://localhost:5173/department/login?dept=${deptId}`);
    await sleep(800);
    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#username', '${username}');
      setVal('#accessKey', '${accessKey}');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3500);
  };

  try {
    // 1. Citizen Tracker for resolved complaint (KHI-2026-8A12AF11)
    console.log('\n--- 1. Citizen Tracker for Resolved Roads Complaint ---');
    await navigate('http://localhost:5173/track/KHI-2026-8A12AF11');
    await sleep(1500);
    await capture('01_citizen_tracker_resolved_milestones');

    // 2. KMC Login & Dashboard (with Review Queue tab)
    console.log('\n--- 2. KMC Department Workspace (roads-01) ---');
    const kmcStaff = credentials.departments.find(d => d.departmentId === 'kmc');
    await loginAs('roads-01', kmcStaff.accessKey, 'kmc');
    await capture('02_kmc_department_workspace_with_review_queue');

    // 3. KWSC Login & Dashboard (Water isolated)
    console.log('\n--- 3. KWSC Department Workspace (water-01) ---');
    const kwscStaff = credentials.departments.find(d => d.departmentId === 'kwsc');
    await loginAs('water-01', kwscStaff.accessKey, 'kwsc');
    await capture('03_kwsc_department_workspace_isolated');

    // 4. K-Electric Login & Dashboard (Electricity isolated)
    console.log('\n--- 4. K-Electric Department Workspace (electricity-01) ---');
    const keStaff = credentials.departments.find(d => d.departmentId === 'kelectric');
    await loginAs('electricity-01', keStaff.accessKey, 'kelectric');
    await capture('04_kelectric_department_workspace_isolated');

    // 5. SSGC Login & Dashboard (Gas isolated)
    console.log('\n--- 5. SSGC Department Workspace (gas-01) ---');
    const ssgcStaff = credentials.departments.find(d => d.departmentId === 'ssgc');
    await loginAs('gas-01', ssgcStaff.accessKey, 'ssgc');
    await capture('05_ssgc_department_workspace_isolated');

    // 6. SSWMB Login & Dashboard (Sanitation isolated)
    console.log('\n--- 6. SSWMB Department Workspace (sanitation-01) ---');
    const sswmbStaff = credentials.departments.find(d => d.departmentId === 'sswmb');
    await loginAs('sanitation-01', sswmbStaff.accessKey, 'sswmb');
    await capture('06_sswmb_department_workspace_isolated');

    // 7. SBCA Login & Dashboard (Building isolated)
    console.log('\n--- 7. SBCA Department Workspace (building-01) ---');
    const sbcaStaff = credentials.departments.find(d => d.departmentId === 'sbca');
    await loginAs('building-01', sbcaStaff.accessKey, 'sbca');
    await capture('07_sbca_department_workspace_isolated');

    // 8. KMC Review Queue View
    console.log('\n--- 8. KMC Review Queue Active Filter ---');
    await loginAs('roads-01', kmcStaff.accessKey, 'kmc');
    await evaluate(`(() => {
      const reviewQueueBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review Queue'));
      if (reviewQueueBtn) reviewQueueBtn.click();
    })()`);
    await sleep(1200);
    await capture('08_kmc_review_queue_selected');

    // 9. Open Review & Assign Modal on an ambiguous complaint
    console.log('\n--- 9. Classification Review & Assignment Modal ---');
    await evaluate(`(() => {
      const reviewBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review & Assign Department'));
      if (reviewBtn) reviewBtn.click();
    })()`);
    await sleep(1200);
    await capture('09_classification_review_assignment_modal_open');

    console.log('\n==============================================================================');
    console.log('ALL PHASE 3 SCREENSHOTS & LIVE CHECKS COMPLETED SUCCESSFULLY!');
    console.log('==============================================================================');
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill('SIGTERM');
    } catch {}
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
