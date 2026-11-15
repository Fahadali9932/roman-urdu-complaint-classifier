import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase3f_3');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3f_3';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE 3F.3: CAPTURING FULL VERIFICATION SCREENSHOT SUITE ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase3f3_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9296',
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
      const res = await fetch('http://localhost:9296/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9296');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9296/json/list');
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
    await sleep(4000);
  };

  try {
    const kmcStaff = credentials.departments.find((d) => d.departmentId === 'kmc');
    console.log('Logging in as roads-01 (KMC)...');
    await loginAs('roads-01', kmcStaff.accessKey, 'kmc');
    await sleep(2000);

    // 1. Light Mode - All Complaints Table with Horizontal Status Tabs and Topbar
    console.log('Capturing Light Mode: All Complaints with Horizontal Status Tabs (1440x900)...');
    await capture('01_kmc_complaints_light_1440x900', 1440, 900);

    // 2. Dark Mode - Complaints view
    console.log('Switching to Dark Theme via Topbar toggle...');
    await evaluate(`(() => {
      const topbarThemeBtn = document.querySelector('header button[aria-label*="Switch to Dark Mode"]');
      if (topbarThemeBtn) topbarThemeBtn.click();
    })()`);
    await sleep(1000);
    await capture('02_kmc_complaints_dark_1440x900', 1440, 900);

    // Switch back to Light Theme
    console.log('Switching back to Light Theme...');
    await evaluate(`(() => {
      const topbarThemeBtn = document.querySelector('header button[aria-label*="Switch to Light Mode"]');
      if (topbarThemeBtn) topbarThemeBtn.click();
    })()`);
    await sleep(1000);

    // 3. Sidebar Collapsed to 72px
    console.log('Collapsing Sidebar to 72px...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Collapse navigation"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    await capture('03_kmc_sidebar_collapsed_1440x900', 1440, 900);

    // Expand Sidebar back
    console.log('Expanding Sidebar back to 248px...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Expand navigation"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    // 4. Priority Queue -> Urgent Tab
    console.log('Navigating to Priority Queue (Urgent Tab)...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Priority Queue'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);
    await capture('04_kmc_priority_queue_urgent_1440x900', 1440, 900);

    // 5. Priority Queue -> Overdue Tab
    console.log('Switching to Priority Queue (Overdue Tab)...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Overdue'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('05_kmc_priority_queue_overdue_1440x900', 1440, 900);

    // 6. Priority Queue -> Needs Assessment Tab
    console.log('Switching to Priority Queue (Needs Assessment Tab)...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Needs Assessment'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('06_kmc_priority_queue_needs_assessment_1440x900', 1440, 900);

    // 7. Operational Dashboard View
    console.log('Navigating to Overview (Operational Dashboard)...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Overview'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);
    await capture('07_kmc_operational_dashboard_1440x900', 1440, 900);

    // Return to Complaints to open a complaint detail view
    console.log('Navigating back to Complaints list...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Complaints'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    // 8. Full-Page Tabbed Detail View: Tab 1 (Overview)
    console.log('Opening Complaint Detail View (Overview)...');
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await capture('08_kmc_detail_overview_tab_1440x900', 1440, 900);

    // 9. Tab 2 (Full Complaint)
    console.log('Switching to Detail Tab: Full Complaint...');
    await evaluate(`(() => {
      const tab = document.querySelector('button[value="full_complaint"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Full Complaint'));
      if (tab) {
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        tab.click();
      }
    })()`);
    await sleep(1200);
    await capture('09_kmc_detail_full_complaint_tab_1440x900', 1440, 900);

    // 10. Tab 3 (Progress Timeline)
    console.log('Switching to Detail Tab: Progress & Notes...');
    await evaluate(`(() => {
      const tab = document.querySelector('button[value="progress"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Progress'));
      if (tab) {
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        tab.click();
      }
    })()`);
    await sleep(1200);
    await capture('10_kmc_detail_progress_tab_1440x900', 1440, 900);

    // 11. Tab 4 (Priority & SLA)
    console.log('Switching to Detail Tab: Priority & SLA...');
    await evaluate(`(() => {
      const tab = document.querySelector('button[id*="-trigger-priority"]') || Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes('Priority'));
      if (tab) {
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        tab.click();
      }
    })()`);
    await sleep(1200);
    await capture('11_kmc_detail_priority_tab_1440x900', 1440, 900);

    // Return to dashboard and go to Settings
    console.log('Navigating to Settings...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Settings'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);
    await capture('12_kmc_settings_1440x900', 1440, 900);

    // Review Queue (KMC has Review Queue access)
    console.log('Navigating to Review Queue...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Review Queue'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);
    await capture('13_kmc_review_queue_1440x900', 1440, 900);

    // Responsive Viewports on Complaints Page
    console.log('Navigating to Complaints for Responsive Viewport Tests...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Complaints'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    console.log('Capturing Desktop 1920x1080...');
    await capture('14_responsive_desktop_1920x1080', 1920, 1080);

    console.log('Capturing Laptop 1366x768...');
    await capture('15_responsive_laptop_1366x768', 1366, 768);

    console.log('Capturing Tablet 768x1024...');
    await capture('16_responsive_tablet_768x1024', 768, 1024);

    console.log('Capturing Mobile Drawer 390x844...');
    await capture('17_responsive_mobile_drawer_390x844', 390, 844, true);

    // Multi-Department Isolation
    const deptLogins = [
      { id: 'kwsc', user: 'water-01', filename: '18_dept_isolation_kwsc_water_01_1440x900' },
      { id: 'kelectric', user: 'electricity-01', filename: '19_dept_isolation_kelectric_electricity_01_1440x900' },
      { id: 'ssgc', user: 'gas-01', filename: '20_dept_isolation_ssgc_gas_01_1440x900' },
      { id: 'sbca', user: 'building-01', filename: '21_dept_isolation_sbca_building_01_1440x900' },
      { id: 'sswmb', user: 'sanitation-01', filename: '22_dept_isolation_sswmb_sanitation_01_1440x900' },
    ];

    for (const d of deptLogins) {
      const cred = credentials.departments.find((c) => c.departmentId === d.id);
      console.log(`Logging in as ${d.user} (${d.id.toUpperCase()})...`);
      await loginAs(d.user, cred.accessKey, d.id);
      await sleep(2000);
      await capture(d.filename, 1440, 900);
    }

    console.log('\n=== ALL PHASE 3F.3 VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    ws.close();
    try {
      chromeProcess.kill();
    } catch {}
  }
}

run();
