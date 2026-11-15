import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase3f_1');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3f_1';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE 3F.1: CAPTURING REFINED CIVIC WORKSPACE & PRIORITY SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase3f1_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9296',
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

    // 1. Light Mode - All Complaints Table with Priority column & Exact PKT Timestamps
    console.log('Capturing Light Mode: All Complaints Full-Width with Priority & Timestamps (1440x900)...');
    await capture('01_light_all_complaints_priority_1440x900', 1440, 900);

    // 2. Collapse Sidebar: Test centered collapse button, tooltips, content expansion
    console.log('Collapsing Sidebar to 72px...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Collapse navigation"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    await capture('02_light_sidebar_collapsed_tooltips_1440x900', 1440, 900);

    // 3. Expand Sidebar back
    console.log('Expanding Sidebar back to 240px...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label*="Expand navigation"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    await capture('03_light_sidebar_expanded_1440x900', 1440, 900);

    // 4. Priority Filter Interaction: Filter by Critical
    console.log('Testing Priority Filter (Critical)...');
    await evaluate(`(() => {
      // Find priority trigger button
      const trigger = document.querySelector('#dept-priority-filter');
      if (trigger) trigger.click();
    })()`);
    await sleep(500);
    await evaluate(`(() => {
      const critOpt = Array.from(document.querySelectorAll('[role="option"]')).find(o => o.textContent.includes('Critical'));
      if (critOpt) critOpt.click();
    })()`);
    await sleep(1000);
    await capture('04_light_filter_priority_critical_1440x900', 1440, 900);

    // Reset priority filter to All
    await evaluate(`(() => {
      const trigger = document.querySelector('#dept-priority-filter');
      if (trigger) trigger.click();
    })()`);
    await sleep(500);
    await evaluate(`(() => {
      const allOpt = Array.from(document.querySelectorAll('[role="option"]')).find(o => o.textContent.includes('All Priorities'));
      if (allOpt) allOpt.click();
    })()`);
    await sleep(1000);

    // 5. Sort Order Interaction: Highest priority first
    console.log('Testing Sort Order (Highest priority first)...');
    await evaluate(`(() => {
      const sortTrigger = document.querySelector('#dept-sort');
      if (sortTrigger) sortTrigger.click();
    })()`);
    await sleep(500);
    await evaluate(`(() => {
      const opt = Array.from(document.querySelectorAll('[role="option"]')).find(o => o.textContent.includes('Highest priority first'));
      if (opt) opt.click();
    })()`);
    await sleep(1000);
    await capture('05_light_sort_highest_priority_1440x900', 1440, 900);

    // 6. Search for complaint
    console.log('Searching for complaint...');
    await evaluate(`(() => {
      const searchInp = document.querySelector('input[aria-label="Search complaints"]');
      if (searchInp) {
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(searchInp, 'road');
        searchInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await sleep(1000);
    await capture('06_light_search_complaint_1440x900', 1440, 900);

    // Clear search
    await evaluate(`(() => {
      const clearBtn = document.querySelector('button[aria-label="Clear search"]');
      if (clearBtn) clearBtn.click();
    })()`);
    await sleep(800);

    // 7. Full-Page Complaint Detail View
    console.log('Opening Full-Page Complaint Detail View...');
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await capture('07_light_complaint_detail_priority_1440x900', 1440, 900);

    // 8. Open Priority Adjustment Modal
    console.log('Opening Priority Adjustment Modal...');
    await evaluate(`(() => {
      const adjBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Adjust Priority'));
      if (adjBtn) adjBtn.click();
    })()`);
    await sleep(1000);
    await capture('08_light_priority_override_modal_1440x900', 1440, 900);

    // Close modal
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close modal"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(800);

    // 9. Back to Complaints button
    console.log('Returning to list via Back to All Complaints button...');
    await evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to All Complaints'));
      if (backBtn) backBtn.click();
    })()`);
    await sleep(1200);
    await capture('09_light_back_to_list_1440x900', 1440, 900);

    // 10. Review Queue (KMC Clearinghouse)
    console.log('Switching to Review Queue...');
    await evaluate(`(() => {
      const revBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review Queue'));
      if (revBtn) revBtn.click();
    })()`);
    await sleep(1500);
    await capture('10_light_review_queue_1440x900', 1440, 900);

    // 11. Operational Dashboard
    console.log('Navigating to Operational Dashboard...');
    await evaluate(`(() => {
      const dashBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dashboard'));
      if (dashBtn) dashBtn.click();
    })()`);
    await sleep(1500);
    await capture('11_light_operational_dashboard_1440x900', 1440, 900);

    // 12. Settings Page (Simplified, Notifications removed)
    console.log('Navigating to Settings...');
    await evaluate(`(() => {
      const setBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
      if (setBtn) setBtn.click();
    })()`);
    await sleep(1500);
    await capture('12_light_settings_simplified_1440x900', 1440, 900);

    // 13. Dark Mode Toggle from Settings
    console.log('Switching to Dark Mode from Settings...');
    await evaluate(`(() => {
      const darkBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dark Mode'));
      if (darkBtn) darkBtn.click();
    })()`);
    await sleep(1000);

    // Navigate to All Complaints in Dark Mode
    await evaluate(`(() => {
      const allCompBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All Complaints'));
      if (allCompBtn) allCompBtn.click();
    })()`);
    await sleep(1500);
    await capture('13_dark_all_complaints_priority_1440x900', 1440, 900);

    // 14. Dark Mode Complaint Detail View
    console.log('Viewing Complaint Detail in Dark Mode...');
    await evaluate(`(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    })()`);
    await sleep(1500);
    await capture('14_dark_complaint_detail_priority_1440x900', 1440, 900);

    // 15. Responsive Tablet (768x1024) in Light Mode
    console.log('Switching back to Light Mode and testing Tablet Viewport...');
    await evaluate(`(() => {
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
    })()`);
    await navigate('http://localhost:5173/department');
    await sleep(1500);
    await capture('15_tablet_768x1024', 768, 1024);

    // 16. Mobile Viewport (390x844) with Drawer Open
    console.log('Testing Mobile Viewport and Opening Drawer...');
    await setViewport(390, 844, true);
    await sleep(500);
    await evaluate(`(() => {
      const toggle = document.querySelector('button[aria-label="Toggle navigation menu"]');
      if (toggle) toggle.click();
    })()`);
    await sleep(1000);
    await capture('16_mobile_drawer_390x844', 390, 844, true);

    // Close drawer
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close menu"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(800);

    // 17. KWSC Department Isolation (water-01)
    console.log('Verifying KWSC Department Isolation (water-01)...');
    const kwscStaff = credentials.departments.find((d) => d.departmentId === 'kwsc');
    await loginAs('water-01', kwscStaff.accessKey, 'kwsc');
    await sleep(2000);
    await capture('17_kwsc_isolation_1440x900', 1440, 900);

    console.log('\nAll 17 Phase 3F.1 visual QA screenshots successfully captured!');
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
