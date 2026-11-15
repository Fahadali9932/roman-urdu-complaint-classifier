import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase5_case_ops');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase5_case_ops';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== CASE OPERATIONS DESK (V5): RUNNING AUTOMATED SCREENSHOT VERIFICATION ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v5_case_ops_' + Date.now());
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

  const setViewport = async (width, height, isMobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await sleep(300);
  };

  const capture = async (name, width = 1440, height = 900, isMobile = false) => {
    await setViewport(width, height, isMobile);
    await sleep(800);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    const localPath = path.join(WORKTREE_DIR, `${name}.png`);
    const artPath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artPath, buffer);
    console.log(`✓ Saved ${name}.png (${(buffer.length / 1024).toFixed(1)} KB)`);
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
      localStorage.setItem('aawaaz-demo-theme', 'light');
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
    })()`);
    await navigate(`http://localhost:5174/department/login?dept=${deptId}`);
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
    await sleep(3500);
  };

  try {
    const kmcStaff = credentials.departments.find((d) => d.departmentId === 'kmc');
    console.log('Logging in as roads-01 (KMC)...');
    await loginAs('roads-01', kmcStaff.accessKey, 'kmc');
    await sleep(2000);

    // 1. KMC Work Queue 1440x900 (Matches 10_CASES_WORK_QUEUE.png)
    console.log('Navigating to Work Queue...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="queue"]');
      if (btn) btn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 01_kmc_work_queue_1440x900...');
    await capture('01_kmc_work_queue_1440x900', 1440, 900);

    // 2. KMC Work Queue 1920x1080 (Desktop wide)
    console.log('Capturing 02_kmc_work_queue_1920x1080...');
    await capture('02_kmc_work_queue_1920x1080', 1920, 1080);

    // 3. KMC Work Queue Dark Theme
    console.log('Switching to Dark Mode via Settings...');
    await evaluate(`(() => {
      const settingsBtn = document.querySelector('button[data-view="settings"]');
      if (settingsBtn) settingsBtn.click();
    })()`);
    await sleep(1000);
    await evaluate(`(() => {
      const darkBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dark'));
      if (darkBtn) darkBtn.click();
    })()`);
    await sleep(800);
    await evaluate(`(() => {
      const qBtn = document.querySelector('button[data-view="queue"]');
      if (qBtn) qBtn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 03_kmc_work_queue_dark_1440x900...');
    await capture('03_kmc_work_queue_dark_1440x900', 1440, 900);

    // Switch back to Light Mode
    await evaluate(`(() => {
      const settingsBtn = document.querySelector('button[data-view="settings"]');
      if (settingsBtn) settingsBtn.click();
    })()`);
    await sleep(800);
    await evaluate(`(() => {
      const lightBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Light'));
      if (lightBtn) lightBtn.click();
    })()`);
    await sleep(800);
    await evaluate(`(() => {
      const qBtn = document.querySelector('button[data-view="queue"]');
      if (qBtn) qBtn.click();
    })()`);
    await sleep(1000);

    // 4. Case Detail Overview - Case C-2051 (Matches 11_CASE_DETAIL.png)
    console.log('Opening Case C-2051 Detail Page...');
    await evaluate(`(() => {
      // Find row for C-2051 or click first case row
      const cRow = document.querySelector('button.case-row[data-open="C-2051"]') || document.querySelector('button.case-row');
      if (cRow) cRow.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 04_kmc_case_detail_overview_1440x900...');
    await capture('04_kmc_case_detail_overview_1440x900', 1440, 900);

    // 5. Case Detail Reports Tab (50 linked reports)
    console.log('Switching to Reports Tab...');
    await evaluate(`(() => {
      const reportsTab = Array.from(document.querySelectorAll('div.detail-tabs button[role="tab"]')).find(b => b.textContent.includes('Reports'));
      if (reportsTab) reportsTab.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 05_kmc_case_detail_reports_1440x900...');
    await capture('05_kmc_case_detail_reports_1440x900', 1440, 900);

    // 6. Bulk Accept Confirmation Modal
    console.log('Opening Bulk Accept Confirmation Modal...');
    await evaluate(`(() => {
      const acceptBtn = document.querySelector('button[data-action="open-accept"]');
      if (acceptBtn) acceptBtn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 06_kmc_bulk_accept_modal_1440x900...');
    await capture('06_kmc_bulk_accept_modal_1440x900', 1440, 900);

    // 7. Post-Acceptance State (Execute Confirmed Acceptance & Switch to Activity Tab)
    console.log('Confirming Bulk Acceptance and Viewing Activity...');
    await evaluate(`(() => {
      const confirmBtn = document.querySelector('button[data-action="confirm-accept"]');
      if (confirmBtn) confirmBtn.click();
    })()`);
    await sleep(1500);
    // Switch to Activity Tab to view the logged event
    await evaluate(`(() => {
      const actTab = Array.from(document.querySelectorAll('div.detail-tabs button[role="tab"]')).find(b => b.textContent.includes('Activity'));
      if (actTab) actTab.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 07_kmc_after_bulk_accept_1440x900...');
    await capture('07_kmc_after_bulk_accept_1440x900', 1440, 900);

    // 8. Areas Page - Locality Workload (Matches 12_AREAS_OVERVIEW.png)
    console.log('Navigating to Areas Page...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="areas"]');
      if (btn) btn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 08_kmc_areas_overview_1440x900...');
    await capture('08_kmc_areas_overview_1440x900', 1440, 900);

    // 9. Priority Queue View
    console.log('Navigating to Priority View...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="priority"]');
      if (btn) btn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 09_kmc_priority_queue_1440x900...');
    await capture('09_kmc_priority_queue_1440x900', 1440, 900);

    // 10. Sidebar Collapsed (72px)
    console.log('Collapsing Sidebar to 72px...');
    await evaluate(`(() => {
      const qBtn = document.querySelector('button[data-view="queue"]');
      if (qBtn) qBtn.click();
    })()`);
    await sleep(800);
    await evaluate(`(() => {
      const collapseBtn = document.querySelector('#collapseButton');
      if (collapseBtn) collapseBtn.click();
    })()`);
    await sleep(800);
    console.log('Capturing 10_sidebar_collapsed_1440x900...');
    await capture('10_sidebar_collapsed_1440x900', 1440, 900);

    // Expand sidebar back
    await evaluate(`(() => {
      const collapseBtn = document.querySelector('#collapseButton');
      if (collapseBtn) collapseBtn.click();
    })()`);
    await sleep(600);

    // 11. Mobile Responsive Viewport (390x844 - Matches 13_MOBILE_WORK_QUEUE.png)
    console.log('Capturing 11_responsive_mobile_390x844...');
    await capture('11_responsive_mobile_390x844', 390, 844, true);

    // 12. Tablet Responsive Viewport (768x1024)
    console.log('Capturing 12_responsive_tablet_768x1024...');
    await capture('12_responsive_tablet_768x1024', 768, 1024, false);

    // Multi-Department Isolation Suite (All 5 other municipal authorities)
    const otherDepts = [
      { id: 'kwsc', name: 'KWSC — Water & Sewerage', user: 'water-01', filename: '13_dept_isolation_kwsc_water' },
      { id: 'kelectric', name: 'K-Electric — Power Grid', user: 'electricity-01', filename: '14_dept_isolation_kelectric_electricity' },
      { id: 'ssgc', name: 'SSGC — Gas Distribution', user: 'gas-01', filename: '15_dept_isolation_ssgc_gas' },
      { id: 'sbca', name: 'SBCA — Building Control', user: 'building-01', filename: '16_dept_isolation_sbca_building' },
      { id: 'sswmb', name: 'SSWMB — Solid Waste', user: 'sanitation-01', filename: '17_dept_isolation_sswmb_sanitation' },
    ];

    for (const dept of otherDepts) {
      const cred = credentials.departments.find((d) => d.departmentId === dept.id);
      console.log(`\nLogging into ${dept.name} (${dept.user})...`);
      await loginAs(dept.user, cred.accessKey, dept.id);
      await sleep(2000);
      await evaluate(`(() => {
        const btn = document.querySelector('button[data-view="queue"]');
        if (btn) btn.click();
      })()`);
      await sleep(1000);
      console.log(`Capturing ${dept.filename}.png...`);
      await capture(dept.filename, 1440, 900);
    }

    console.log('\n=== ALL 17 PHASE 5 VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Screenshot capture failed:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
  }
}

run();
