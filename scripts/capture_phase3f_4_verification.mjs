import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase3f_4');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3f_4';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE 3F.4: CAPTURING FULL VERIFICATION SCREENSHOT SUITE ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase3f4_' + Date.now());
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
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  const setViewport = async (width, height, isMobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await sleep(400);
  };

  const capture = async (name, width, height, isMobile = false) => {
    await setViewport(width, height, isMobile);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const localFile = path.join(WORKTREE_DIR, `${name}.png`);
    const brainFile = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(localFile, buffer);
    fs.writeFileSync(brainFile, buffer);
    console.log(`[CAPTURED] ${name}.png (${width}x${height})`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(2500);
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

    // Ensure we are on Overview
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="dashboard"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    // 1. Overview 1920x1080 (Desktop Light) - target reference 01_DASHBOARD_TARGET.png
    console.log('Capturing 01_kmc_overview_1920x1080...');
    await capture('01_kmc_overview_1920x1080', 1920, 1080);

    // 2. Overview 1440x900 (Laptop Light)
    console.log('Capturing 02_kmc_overview_1440x900...');
    await capture('02_kmc_overview_1440x900', 1440, 900);

    // 3. Switch to Dark Mode in Settings and capture Overview Dark
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
      const ovBtn = document.querySelector('button[data-view="dashboard"]');
      if (ovBtn) ovBtn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 03_kmc_overview_dark_1440x900...');
    await capture('03_kmc_overview_dark_1440x900', 1440, 900);

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

    // 4. Complaints View - All Complaints (1440x900) - target reference 01_PROPOSED_CONCEPT_DESIGN.png
    console.log('Navigating to Complaints (All)...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="complaints"]');
      if (btn) btn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 04_kmc_complaints_all_1440x900...');
    await capture('04_kmc_complaints_all_1440x900', 1440, 900);

    // 5. Complaints View - Filtered to Awaiting acceptance
    console.log('Filtering Complaints to Awaiting acceptance...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('Awaiting acceptance'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 05_kmc_complaints_awaiting_1440x900...');
    await capture('05_kmc_complaints_awaiting_1440x900', 1440, 900);

    // Switch back to All complaints and open first complaint detail
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('All complaints'));
      if (tab) tab.click();
    })()`);
    await sleep(800);

    // 6. Complaint Detail - Overview Tab - target reference 03_COMPLAINT_DETAIL_TARGET.png
    console.log('Opening Complaint Detail View (Overview Tab)...');
    await evaluate(`(() => {
      const firstRowBtn = document.querySelector('table.complaints-table button.subject-link');
      if (firstRowBtn) firstRowBtn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 06_kmc_detail_overview_1440x900...');
    await capture('06_kmc_detail_overview_1440x900', 1440, 900);

    // 7. Complaint Detail - Full Complaint Tab
    console.log('Switching to Full complaint tab...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('Full complaint'));
      if (tab) tab.click();
    })()`);
    await sleep(800);
    console.log('Capturing 07_kmc_detail_full_complaint_1440x900...');
    await capture('07_kmc_detail_full_complaint_1440x900', 1440, 900);

    // 8. Complaint Detail - Progress Tab
    console.log('Switching to Progress tab...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('Progress'));
      if (tab) tab.click();
    })()`);
    await sleep(800);
    console.log('Capturing 08_kmc_detail_progress_1440x900...');
    await capture('08_kmc_detail_progress_1440x900', 1440, 900);

    // 9. Complaint Detail - Priority Tab
    console.log('Switching to Priority tab...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('Priority'));
      if (tab) tab.click();
    })()`);
    await sleep(800);
    console.log('Capturing 09_kmc_detail_priority_1440x900...');
    await capture('09_kmc_detail_priority_1440x900', 1440, 900);

    // 10. Priority Queue - Urgent Tab - target reference 04_PRIORITY_QUEUE_TARGET.png
    console.log('Navigating to Priority Queue (Urgent Tab)...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="priority"]');
      if (btn) btn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 10_kmc_priority_queue_urgent_1440x900...');
    await capture('10_kmc_priority_queue_urgent_1440x900', 1440, 900);

    // 11. Priority Queue - Overdue Tab
    console.log('Switching Priority Queue to Overdue Tab...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('Overdue'));
      if (tab) tab.click();
    })()`);
    await sleep(800);
    console.log('Capturing 11_kmc_priority_queue_overdue_1440x900...');
    await capture('11_kmc_priority_queue_overdue_1440x900', 1440, 900);

    // 11b. Priority Queue - Needs Assessment Tab
    console.log('Switching Priority Queue to Needs assessment Tab...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button.tab-button')).find(b => b.textContent.includes('Needs assessment'));
      if (tab) tab.click();
    })()`);
    await sleep(800);
    console.log('Capturing 11b_kmc_priority_queue_assessment_1440x900...');
    await capture('11b_kmc_priority_queue_assessment_1440x900', 1440, 900);

    // 12. Review Queue (KMC clearinghouse)
    console.log('Navigating to Review Queue...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="review"]');
      if (btn) btn.click();
    })()`);
    await sleep(1200);
    console.log('Capturing 12_kmc_review_queue_1440x900...');
    await capture('12_kmc_review_queue_1440x900', 1440, 900);

    // 13. Settings View
    console.log('Navigating to Settings...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="settings"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 13_kmc_settings_1440x900...');
    await capture('13_kmc_settings_1440x900', 1440, 900);

    // 14. Sidebar Collapsed (72px)
    console.log('Collapsing Sidebar to 72px...');
    await evaluate(`(() => {
      const collapseBtn = document.getElementById('collapseButton');
      if (collapseBtn) collapseBtn.click();
      const ovBtn = document.querySelector('button[data-view="dashboard"]');
      if (ovBtn) ovBtn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 14_sidebar_collapsed_1440x900...');
    await capture('14_sidebar_collapsed_1440x900', 1440, 900);

    // Uncollapse Sidebar
    await evaluate(`(() => {
      const collapseBtn = document.getElementById('collapseButton');
      if (collapseBtn) collapseBtn.click();
    })()`);
    await sleep(800);

    // 15. Responsive Viewports
    console.log('Capturing Responsive Viewports...');
    // Desktop 1920x1080 (Complaints)
    await evaluate(`(() => {
      const btn = document.querySelector('button[data-view="complaints"]');
      if (btn) btn.click();
    })()`);
    await sleep(800);
    await capture('15_responsive_desktop_1920x1080', 1920, 1080);

    // Laptop 1366x768
    await capture('16_responsive_laptop_1366x768', 1366, 768);

    // Tablet 768x1024
    await capture('17_responsive_tablet_768x1024', 768, 1024);

    // Mobile 390x844
    await capture('18_responsive_mobile_390x844', 390, 844, true);

    // 16. Department Isolation Verification across 5 other municipal departments
    const otherDepts = [
      { id: 'kwsc', name: '19_dept_isolation_kwsc_water_1440x900' },
      { id: 'kelectric', name: '20_dept_isolation_kelectric_electricity_1440x900' },
      { id: 'ssgc', name: '21_dept_isolation_ssgc_gas_1440x900' },
      { id: 'sbca', name: '22_dept_isolation_sbca_building_1440x900' },
      { id: 'sswmb', name: '23_dept_isolation_sswmb_sanitation_1440x900' },
    ];

    for (const d of otherDepts) {
      const deptCred = credentials.departments.find((c) => c.departmentId === d.id);
      if (deptCred) {
        console.log(`Logging in as ${deptCred.username} (${d.id})...`);
        await loginAs(deptCred.username, deptCred.accessKey, d.id);
        await sleep(1500);
        // Ensure on overview
        await evaluate(`(() => {
          const btn = document.querySelector('button[data-view="dashboard"]');
          if (btn) btn.click();
        })()`);
        await sleep(1000);
        await capture(d.name, 1440, 900);

        if (d.id === 'kwsc') {
          console.log('Capturing KWSC Priority Queue (Urgent)...');
          await evaluate(`(() => {
            const btn = document.querySelector('button[data-view="priority"]');
            if (btn) btn.click();
          })()`);
          await sleep(1200);
          await capture('19b_kwsc_priority_queue_1440x900', 1440, 900);
        }
      }
    }

    console.log('\n=== ALL PHASE 3F.4 SCREENSHOTS SUCCESSFULLY CAPTURED ===');
  } catch (err) {
    console.error('Screenshot capture failed:', err);
  } finally {
    ws.close();
    try {
      chromeProcess.kill();
    } catch {}
  }
}

run();
