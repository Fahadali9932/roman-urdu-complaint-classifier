import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = path.join(__dirname, '..', 'screenshots', 'phase3f_light_first');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/phase3f_light_first';
const CREDENTIALS_PATH = path.join(__dirname, '..', '.credentials', 'department_staff_credentials.json');

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE 3F REVISED: CAPTURING LIGHT-FIRST CIVIC WORKSPACE SCREENSHOTS ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase3f_light_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9295',
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

    // 1. Light Mode - Full-Width All Complaints (1440x900)
    console.log('Capturing Light Mode: All Complaints Full-Width (1440x900)...');
    await capture('01_light_all_complaints_fullwidth_1440x900', 1440, 900);

    // 2. Full HD Desktop (1920x1080)
    console.log('Capturing Full HD Desktop (1920x1080)...');
    await capture('02_light_fullhd_1920x1080', 1920, 1080);

    // 3. Laptop Desktop (1366x768)
    console.log('Capturing Laptop Desktop (1366x768)...');
    await capture('03_light_laptop_1366x768', 1366, 768);

    // 4. Collapsed Sidebar Mode
    console.log('Toggling Collapsed Sidebar...');
    await evaluate(`(() => {
      const collapseBtn = document.querySelector('button[title*="Collapse navigation"]');
      if (collapseBtn) collapseBtn.click();
    })()`);
    await sleep(1000);
    await capture('04_light_sidebar_collapsed_1440x900', 1440, 900);

    // Expand sidebar back
    await evaluate(`(() => {
      const expandBtn = document.querySelector('button[title*="Expand navigation"]');
      if (expandBtn) expandBtn.click();
    })()`);
    await sleep(800);

    // 5. Click first complaint -> Dedicated Full-Page Complaint Detail View
    console.log('Navigating to Full-Page Complaint Detail View...');
    await evaluate(`(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    })()`);
    await sleep(1500);
    await capture('05_light_complaint_detail_fullpage_1440x900', 1440, 900);

    // 6. Test Back to Complaints Button
    console.log('Testing Back to Complaints button...');
    await evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to Complaints'));
      if (backBtn) backBtn.click();
    })()`);
    await sleep(1200);

    // 7. Full-Width Classification Review Queue
    console.log('Switching to Review Queue...');
    await evaluate(`(() => {
      const reviewNav = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review Queue'));
      if (reviewNav) reviewNav.click();
    })()`);
    await sleep(1500);
    await capture('06_light_review_queue_fullwidth_1440x900', 1440, 900);

    // 8. Click under-review complaint -> Full-Page Detail & Open Assign Modal
    console.log('Opening Review Detail & Assignment Modal...');
    await evaluate(`(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    })()`);
    await sleep(1500);
    await capture('07_light_review_detail_fullpage_1440x900', 1440, 900);

    await evaluate(`(() => {
      const assignBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Assign Department'));
      if (assignBtn) assignBtn.click();
    })()`);
    await sleep(1000);
    await capture('08_light_review_assignment_modal_1440x900', 1440, 900);

    // Close modal & return to list
    await evaluate(`(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to Complaints'));
      if (backBtn) backBtn.click();
    })()`);
    await sleep(800);

    // 9. Operational Dashboard
    console.log('Navigating to Dashboard...');
    await evaluate(`(() => {
      const dashBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Dashboard');
      if (dashBtn) dashBtn.click();
    })()`);
    await sleep(1200);
    await capture('09_light_dashboard_1440x900', 1440, 900);

    // 10. Settings & Theme Switcher
    console.log('Navigating to Settings...');
    await evaluate(`(() => {
      const setBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Settings');
      if (setBtn) setBtn.click();
    })()`);
    await sleep(1200);
    await capture('10_light_settings_theme_switcher_1440x900', 1440, 900);

    // 11. Switch to DARK MODE from Settings
    console.log('Switching to Dark Mode from Settings...');
    await evaluate(`(() => {
      const darkBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dark Mode'));
      if (darkBtn) darkBtn.click();
    })()`);
    await sleep(1000);
    await capture('11_dark_settings_1440x900', 1440, 900);

    // 12. Dark Mode: All Complaints Full-Width
    console.log('Viewing All Complaints in Dark Mode...');
    await evaluate(`(() => {
      const allBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All Complaints'));
      if (allBtn) allBtn.click();
    })()`);
    await sleep(1200);
    await capture('12_dark_all_complaints_fullwidth_1440x900', 1440, 900);

    // 13. Dark Mode: Full-Page Detail View
    console.log('Viewing Full-Page Detail in Dark Mode...');
    await evaluate(`(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    })()`);
    await sleep(1200);
    await capture('13_dark_complaint_detail_fullpage_1440x900', 1440, 900);

    // Switch back to light mode for responsive captures
    await evaluate(`(() => {
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
    })()`);
    await navigate('http://localhost:5173/department');
    await sleep(1500);

    // 14. Tablet Viewport (768x1024)
    console.log('Capturing Tablet Viewport (768x1024)...');
    await capture('14_light_tablet_768x1024', 768, 1024);

    // 15. Mobile List (390x844)
    console.log('Capturing Mobile List Viewport (390x844)...');
    await capture('15_light_mobile_list_390x844', 390, 844);

    // 16. Mobile Detail (390x844)
    console.log('Clicking complaint on Mobile...');
    await evaluate(`(() => {
      const firstRow = document.querySelector('tbody tr');
      if (firstRow) firstRow.click();
    })()`);
    await sleep(1200);
    await capture('16_light_mobile_detail_390x844', 390, 844);

    // 17. KWSC Water Department Isolation Check
    const kwscStaff = credentials.departments.find((d) => d.departmentId === 'kwsc');
    console.log('Logging in as water-01 (KWSC)...');
    await loginAs('water-01', kwscStaff.accessKey, 'kwsc');
    console.log('Capturing KWSC Tasks in Light Mode (1440x900)...');
    await capture('17_light_kwsc_isolation_1440x900', 1440, 900);

    console.log('\nAll Light-First and Dark-Mode screenshots successfully captured!');
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
  }
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
