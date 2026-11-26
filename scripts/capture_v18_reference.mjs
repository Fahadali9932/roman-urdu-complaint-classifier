import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v18_reference';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9339;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const tmpProfile = path.join(process.env.TEMP || 'C:\\Temp', `chrome_v18_cdp_${Date.now()}`);
  console.log(`Starting Chrome with CDP on port ${PORT}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await res.json();
        if (list.length > 0 && list[0].webSocketDebuggerUrl) {
          wsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch (e) {
        await sleep(200);
      }
    }

    if (!wsUrl) {
      throw new Error('Failed to obtain Chrome WebSocket debugger URL.');
    }

    console.log(`Connected to Chrome WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const resolve = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) {
          console.error(`CDP Error for ${data.id}:`, data.error);
        }
        resolve(data.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Initial navigation to seed session
    console.log('Navigating to root to seed session...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    await send('Runtime.evaluate', {
      expression: `
        window.localStorage.setItem('awaaz_dept_theme_mode', 'light');
        window.localStorage.setItem('aawaaz-demo-theme', 'light');
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          userId: 'staff-kmc-demo-01',
          username: 'roads-01',
          departmentId: 'kmc',
          departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
          departmentCode: 'KMC',
          mustChangePassword: false,
          authenticatedAt: new Date().toISOString()
        }));
        localStorage.setItem('awaaz_head_desktop_dismiss:staff-kmc-demo-01', '1');
        localStorage.setItem('awaaz_staff_prefs_v7:staff-kmc-demo-01', JSON.stringify({
          density: 'comfortable',
          startPage: 'overview',
          defaultQueueView: 'needs',
          defaultQueueSort: 'attention'
        }));
      `,
    });

    // Helper for taking screenshots
    async function takeScreenshot(filename, width = 1440, height = 900, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      await sleep(300);
      const res = await send('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        const filepath = path.join(OUT_DIR, filename);
        fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
        console.log(`Saved screenshot: ${filename} (${width}x${height})`);
      } else {
        console.error(`Failed to capture ${filename}`);
      }
    }

    // --- SCREENSHOT 1: Department Overview Light (1440px) ---
    console.log('Capturing 01_department_overview_light_1440...');
    await send('Runtime.evaluate', {
      expression: `
        window.localStorage.setItem('awaaz_dept_theme_mode', 'light');
        window.localStorage.setItem('aawaaz-demo-theme', 'light');
      `,
    });
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(2500);
    await takeScreenshot('01_department_overview_light_1440.png', 1440, 900);

    // --- SCREENSHOT 2: Department Overview Dark (1440px) ---
    console.log('Capturing 02_department_overview_dark_1440...');
    await send('Runtime.evaluate', {
      expression: `
        const themeBtn = document.querySelector('[data-testid="v15-home-theme-toggle"]');
        if (themeBtn) themeBtn.click();
      `,
    });
    await sleep(800);
    await takeScreenshot('02_department_overview_dark_1440.png', 1440, 900);

    // --- SCREENSHOT 3: Complaints Page Light (1440px) ---
    console.log('Capturing 03_complaints_list_light_1440...');
    await send('Runtime.evaluate', {
      expression: `
        window.localStorage.setItem('awaaz_dept_theme_mode', 'light');
        window.localStorage.setItem('aawaaz-demo-theme', 'light');
      `,
    });
    await send('Page.navigate', { url: 'http://localhost:5173/department?view=queue' });
    await sleep(2500);
    await takeScreenshot('03_complaints_list_light_1440.png', 1440, 900);

    // --- SCREENSHOT 4: Complaints Page Dark (1440px) ---
    console.log('Capturing 04_complaints_list_dark_1440...');
    await send('Runtime.evaluate', {
      expression: `
        const themeBtn = document.querySelector('[data-testid="v15-home-theme-toggle"]');
        if (themeBtn) themeBtn.click();
      `,
    });
    await sleep(800);
    await takeScreenshot('04_complaints_list_dark_1440.png', 1440, 900);

    // Switch back to Overview for responsive viewports (light mode)
    await send('Runtime.evaluate', {
      expression: `
        window.localStorage.setItem('awaaz_dept_theme_mode', 'light');
        window.localStorage.setItem('aawaaz-demo-theme', 'light');
      `,
    });
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(2000);
    await send('Runtime.evaluate', {
      expression: `
        const root = document.querySelector('.rf-portal-shell');
        if (root && root.getAttribute('data-theme') === 'dark') {
          const themeBtn = document.querySelector('[data-testid="v15-home-theme-toggle"]');
          if (themeBtn) themeBtn.click();
        }
      `,
    });
    await sleep(500);

    // --- RESPONSIVE VIEWPORTS ---
    console.log('Capturing responsive viewports...');
    await takeScreenshot('05_overview_1920.png', 1920, 1080);
    await takeScreenshot('06_overview_1280.png', 1280, 800);
    await takeScreenshot('07_overview_1024.png', 1024, 768);
    await takeScreenshot('08_overview_768.png', 768, 1024);
    await takeScreenshot('09_overview_390.png', 390, 844, true);
    await takeScreenshot('10_overview_320.png', 320, 568, true);

    // --- MOTION & INTERACTION FRAMES ---
    console.log('Capturing motion & interaction states...');
    // Reset to 1440
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(300);

    // Motion 1: Hovering Complaints Navigation Capsule (showing preview popover)
    await send('Runtime.evaluate', {
      expression: `
        const complaintsBtn = Array.from(document.querySelectorAll('.lg-nav-pill')).find(b => b.textContent.includes('Complaints'));
        if (complaintsBtn) {
          complaintsBtn.parentElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      `,
    });
    await sleep(600);
    await takeScreenshot('motion_01_ribbon_nav_capsule.png', 1440, 900);

    // Motion 2: Thursday Hatched Bar & Lime Tooltip Detail
    await send('Runtime.evaluate', {
      expression: `
        const bar = document.querySelector('.highlighted-hatched');
        if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      `,
    });
    await sleep(500);
    await takeScreenshot('motion_02_thursday_hatched_tooltip.png', 1440, 900);

    // Motion 3: Heatmap Zone Matrix Hover
    await send('Runtime.evaluate', {
      expression: `
        const cells = document.querySelectorAll('.rf-heatmap-cell.level-3');
        if (cells.length > 0) {
          cells[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      `,
    });
    await sleep(400);
    await takeScreenshot('motion_03_heatmap_zone_matrix.png', 1440, 900);

    // Motion 4: Drivery Row Detail
    await send('Page.navigate', { url: 'http://localhost:5173/department?view=queue' });
    await sleep(2000);
    await send('Runtime.evaluate', {
      expression: `
        const row = document.querySelector('.rf-drivery-row');
        if (row) {
          row.classList.add('selected');
        }
      `,
    });
    await sleep(400);
    await takeScreenshot('motion_04_drivery_row_detail.png', 1440, 900);

    console.log('All screenshots and motion frames captured successfully!');
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
