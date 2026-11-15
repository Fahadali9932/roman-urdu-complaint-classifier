import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase3f_2');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3f_2';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE 3F.2: CAPTURING SELECTIVE PRIORITY QUEUE & TABBED DETAILS SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase3f2_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9297',
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
      const res = await fetch('http://localhost:9297/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9297');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9297/json/list');
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
    await navigate(`http://localhost:5173/department/login?dept=${deptId}`);
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

    // 1. Light Mode - All Complaints Table with NO Priority Column & NO Priority Filter
    console.log('Capturing Light Mode: All Complaints Full-Width (No Priority Col) (1440x900)...');
    await capture('01_light_all_complaints_no_priority_col_1440x900', 1440, 900);

    // 2. Sidebar Expanded showing Priority Queue dynamic badge count
    console.log('Capturing Sidebar Expanded with Priority Queue badge (1440x900)...');
    await capture('02_light_sidebar_expanded_priority_queue_badge_1440x900', 1440, 900);

    // 3. Sidebar Collapsed: Centered icons, 72px width, expanded table
    console.log('Collapsing Sidebar to 72px...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Collapse navigation"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    await capture('03_light_sidebar_collapsed_tooltips_1440x900', 1440, 900);

    // Expand Sidebar back
    console.log('Expanding Sidebar back to 240px...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Expand navigation"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    // 4. Navigate to Priority Queue -> Urgent Tab
    console.log('Navigating to Priority Queue (Urgent Tab)...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Priority Queue'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);
    await capture('04_light_priority_queue_urgent_tab_1440x900', 1440, 900);

    // 5. Priority Queue -> Overdue Tab
    console.log('Switching to Priority Queue (Overdue Tab)...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Overdue'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('05_light_priority_queue_overdue_tab_1440x900', 1440, 900);

    // 6. Priority Queue -> Needs Assessment Tab
    console.log('Switching to Priority Queue (Needs Assessment Tab)...');
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Needs Assessment'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('06_light_priority_queue_needs_assessment_tab_1440x900', 1440, 900);

    // Return to All Complaints to open a complaint detail view
    console.log('Navigating back to All Complaints...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All Complaints'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    // 7. Full-Page Tabbed Complaint Detail View: Tab 1 (Overview)
    console.log('Opening Complaint Detail View (Tab 1: Overview)...');
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await capture('07_light_complaint_detail_tab1_overview_1440x900', 1440, 900);

    // 8. Tab 2 (Full Complaint)
    console.log('Switching to Tab 2: Full Complaint...');
    await evaluate(`(() => {
      const tab = document.querySelector('#tab-full_complaint');
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('08_light_complaint_detail_tab2_full_complaint_1440x900', 1440, 900);

    // 9. Tab 3 (Progress Timeline)
    console.log('Switching to Tab 3: Progress...');
    await evaluate(`(() => {
      const tab = document.querySelector('#tab-progress');
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('09_light_complaint_detail_tab3_progress_1440x900', 1440, 900);

    // 10. Tab 4 (Priority - Routine)
    console.log('Switching to Tab 4: Priority...');
    await evaluate(`(() => {
      const tab = document.querySelector('#tab-priority');
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('10_light_complaint_detail_tab4_priority_routine_1440x900', 1440, 900);

    // 11. Navigate to Priority Queue, click an Urgent complaint, and show Tab 4 (Priority - Urgent)
    console.log('Opening an urgent complaint from Priority Queue...');
    await evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to'));
      if (backBtn) backBtn.click();
    })()`);
    await sleep(1000);
    await evaluate(`(() => {
      const pBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Priority Queue'));
      if (pBtn) pBtn.click();
    })()`);
    await sleep(1500);
    // Click Urgent tab, then first row
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Urgent'));
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await evaluate(`(() => {
      const tab = document.querySelector('#tab-priority');
      if (tab) tab.click();
    })()`);
    await sleep(1000);
    await capture('11_light_complaint_detail_tab4_priority_urgent_1440x900', 1440, 900);

    // 12. Open Priority Override Modal
    console.log('Opening Priority Override Modal...');
    await evaluate(`(() => {
      const adjBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Adjust Priority'));
      if (adjBtn) adjBtn.click();
    })()`);
    await sleep(1000);
    await capture('12_light_priority_override_modal_1440x900', 1440, 900);

    // 13. Submit Priority Override with Reason and Verify Persistence in Timeline
    console.log('Submitting Priority Override...');
    await evaluate(`(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = 'urgent';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const proto = window.HTMLTextAreaElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(textarea, 'Public hospital access road crater poses immediate emergency ambulance hazard - escalated by Executive Engineer Roads');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Update Priority'));
      if (saveBtn) saveBtn.click();
    })()`);
    await sleep(2000);
    await capture('13_light_priority_override_applied_and_audited_1440x900', 1440, 900);

    // 14. Operational Dashboard
    console.log('Navigating to Operational Dashboard...');
    await evaluate(`(() => {
      const dashBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dashboard'));
      if (dashBtn) dashBtn.click();
    })()`);
    await sleep(1500);
    await capture('14_light_operational_dashboard_kpis_1440x900', 1440, 900);

    // 15. Review Queue (KMC Clearinghouse)
    console.log('Navigating to Review Queue...');
    await evaluate(`(() => {
      const revBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review Queue'));
      if (revBtn) revBtn.click();
    })()`);
    await sleep(1500);
    await capture('15_light_review_queue_1440x900', 1440, 900);

    // 16. Dark Mode - Priority Queue (Urgent Tab)
    console.log('Switching to Dark Mode from Settings...');
    await evaluate(`(() => {
      const setBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
      if (setBtn) setBtn.click();
    })()`);
    await sleep(1200);
    await evaluate(`(() => {
      const darkBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dark Mode'));
      if (darkBtn) darkBtn.click();
    })()`);
    await sleep(1000);

    console.log('Navigating to Priority Queue in Dark Mode...');
    await evaluate(`(() => {
      const pBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Priority Queue'));
      if (pBtn) pBtn.click();
    })()`);
    await sleep(1500);
    await capture('16_dark_priority_queue_urgent_1440x900', 1440, 900);

    // 17. Dark Mode - Tabbed Complaint Detail View
    console.log('Opening Tabbed Complaint Detail in Dark Mode...');
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await capture('17_dark_complaint_detail_tabbed_1440x900', 1440, 900);

    // Switch back to Light Mode for Responsive & Dept Isolation captures
    await evaluate(`(() => {
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
    })()`);
    await navigate('http://localhost:5173/department');
    await sleep(1500);

    // 18. Responsive Desktop 1920x1080
    console.log('Capturing Responsive Desktop 1920x1080...');
    await capture('18_responsive_desktop_1920x1080', 1920, 1080);

    // 19. Responsive Laptop 1366x768
    console.log('Capturing Responsive Laptop 1366x768...');
    await capture('19_responsive_laptop_1366x768', 1366, 768);

    // 20. Responsive Tablet 768x1024
    console.log('Capturing Responsive Tablet 768x1024...');
    await capture('20_responsive_tablet_768x1024', 768, 1024);

    // 21. Responsive Mobile 390x844 with Drawer Open
    console.log('Capturing Responsive Mobile 390x844 with Drawer...');
    await setViewport(390, 844, true);
    await sleep(500);
    await evaluate(`(() => {
      const toggle = document.querySelector('button[aria-label="Toggle navigation menu"]');
      if (toggle) toggle.click();
    })()`);
    await sleep(1000);
    await capture('21_responsive_mobile_drawer_390x844', 390, 844, true);

    // Close drawer
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close menu"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(800);

    // 22. KWSC Isolation (water-01)
    console.log('Verifying KWSC (water-01)...');
    const kwscStaff = credentials.departments.find((d) => d.departmentId === 'kwsc');
    await loginAs('water-01', kwscStaff.accessKey, 'kwsc');
    await sleep(2000);
    await capture('22_dept_isolation_kwsc_water_01_1440x900', 1440, 900);

    // 23. K-Electric Isolation (electricity-01)
    console.log('Verifying K-Electric (electricity-01)...');
    const keStaff = credentials.departments.find((d) => d.departmentId === 'kelectric');
    await loginAs('electricity-01', keStaff.accessKey, 'kelectric');
    await sleep(2000);
    await capture('23_dept_isolation_kelectric_electricity_01_1440x900', 1440, 900);

    // 24. SSGC Isolation (gas-01)
    console.log('Verifying SSGC (gas-01)...');
    const ssgcStaff = credentials.departments.find((d) => d.departmentId === 'ssgc');
    await loginAs('gas-01', ssgcStaff.accessKey, 'ssgc');
    await sleep(2000);
    await capture('24_dept_isolation_ssgc_gas_01_1440x900', 1440, 900);

    // 25. SBCA Isolation (building-01)
    console.log('Verifying SBCA (building-01)...');
    const sbcaStaff = credentials.departments.find((d) => d.departmentId === 'sbca');
    await loginAs('building-01', sbcaStaff.accessKey, 'sbca');
    await sleep(2000);
    await capture('25_dept_isolation_sbca_building_01_1440x900', 1440, 900);

    // 26. SSWMB Isolation (sanitation-01)
    console.log('Verifying SSWMB (sanitation-01)...');
    const sswmbStaff = credentials.departments.find((d) => d.departmentId === 'sswmb');
    await loginAs('sanitation-01', sswmbStaff.accessKey, 'sswmb');
    await sleep(2000);
    await capture('26_dept_isolation_sswmb_sanitation_01_1440x900', 1440, 900);

    console.log('\nAll 26 Phase 3F.2 visual QA screenshots successfully captured!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
  }
}

run();
