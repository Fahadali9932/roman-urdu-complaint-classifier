import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9446;
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v20_gate_a';
const TEMP_USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v20_qa_' + Date.now());

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

  console.log('Launching headless Chrome on port', DEBUG_PORT, '...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    'about:blank',
  ], { detached: true });

  chrome.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
    process.exit(1);
  });

  // Wait for remote debugging to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {
      // Retrying
    }
  }

  if (!wsUrl) {
    console.error('Could not connect to Chrome DevTools endpoint.');
    chrome.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at:', wsUrl);
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result);
      pending.delete(d.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function capture(filename, width = 1440, height = 900, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
    await sleep(400);
    const snap = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const fullPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(snap.data, 'base64'));
    console.log(`Saved screenshot: ${filename} (${width}x${height})`);
  }

  // 1. Initial Navigation to set sessionStorage
  console.log('\nSetting up authenticated session for KMC Head of Department...');
  await send('Page.navigate', { url: 'http://localhost:5173/department/dashboard' });
  await sleep(1000);

  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department/dashboard';
    `,
  });
  await sleep(2500);

  // -----------------------------------------------------------------
  // 1. KMC LANDING PAGE (Desktop Pro 1920x1080 & Standard 1440x900)
  // -----------------------------------------------------------------
  console.log('\n--- 1. Capturing KMC Landing Page (Zero stats, calm entry) ---');
  await capture('01_kmc_landing_1920.png', 1920, 1080);
  await capture('02_kmc_landing_1440.png', 1440, 900);

  // -----------------------------------------------------------------
  // 2. TOP-EDGE MORPHING NAVIGATION (Collapsed & Expanded States)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Capturing Top-Edge Morphing Navigation States ---');
  // Collapsed state
  await capture('05_nav_collapsed_1440.png', 1440, 900);

  // Trigger expansion by clicking the notch
  await send('Runtime.evaluate', {
    expression: `
      const notch = document.querySelector('.v20-notch-shell');
      if (notch) notch.click();
    `,
  });
  await sleep(600);
  await capture('06_nav_expanded_1440.png', 1440, 900);

  // -----------------------------------------------------------------
  // 3. KMC CARDLESS DASHBOARD (Standalone numbers + NameThatUI Donut)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Capturing KMC Cardless Dashboard (Screenshot 655 Layout) ---');
  // Click "Open Dashboard" button or Dashboard tab
  await send('Runtime.evaluate', {
    expression: `
      const dashBtn = document.querySelector('[data-testid="v20-cta-dashboard"]') || document.querySelector('[data-tab-id="dashboard"]');
      if (dashBtn) dashBtn.click();
    `,
  });
  await sleep(800);
  await capture('03_kmc_dashboard_1920.png', 1920, 1080);
  await capture('04_kmc_dashboard_1440.png', 1440, 900);

  // -----------------------------------------------------------------
  // 4. LIGHT MODE COMPARISON
  // -----------------------------------------------------------------
  console.log('\n--- 4. Capturing Light Mode Dashboard ---');
  await send('Runtime.evaluate', {
    expression: `
      const themeBtn = document.querySelector('[data-testid="v20-theme-toggle"]');
      if (themeBtn) themeBtn.click();
    `,
  });
  await sleep(600);
  await capture('07_kmc_dashboard_light_1440.png', 1440, 900);

  // Switch back to Dark Mode
  await send('Runtime.evaluate', {
    expression: `
      const themeBtn = document.querySelector('[data-testid="v20-theme-toggle"]');
      if (themeBtn) themeBtn.click();
    `,
  });
  await sleep(600);

  // -----------------------------------------------------------------
  // 5. K-ELECTRIC THEME EQUIVALENT (Electric Blue Atmosphere)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Capturing K-Electric Department Theme ---');
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kelectric',
        departmentCode: 'KE',
        departmentName: 'K-Electric (Infrastructure & Distribution)',
        username: 'electricity-01',
        userId: 'staff-kelectric-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department/dashboard?dept=kelectric';
    `,
  });
  await sleep(2500);

  // K-Electric Landing
  await capture('08_kelectric_landing_1440.png', 1440, 900);

  // Navigate to Dashboard
  await send('Runtime.evaluate', {
    expression: `
      const dashBtn = document.querySelector('[data-testid="v20-cta-dashboard"]') || document.querySelector('[data-tab-id="dashboard"]');
      if (dashBtn) dashBtn.click();
    `,
  });
  await sleep(800);
  await capture('09_kelectric_dashboard_1440.png', 1440, 900);

  // Switch back to KMC for responsive viewports
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department/dashboard';
    `,
  });
  await sleep(2500);

  // -----------------------------------------------------------------
  // 6. RESPONSIVE VIEWPORTS (Tablet 768px, Mobile 390px, 320px)
  // -----------------------------------------------------------------
  console.log('\n--- 6. Capturing Responsive Viewports ---');
  // Tablet Portrait (768x1024)
  await capture('10_kmc_landing_tablet_768.png', 768, 1024, true);
  await send('Runtime.evaluate', {
    expression: `
      const dashBtn = document.querySelector('[data-testid="v20-cta-dashboard"]') || document.querySelector('[data-tab-id="dashboard"]');
      if (dashBtn) dashBtn.click();
    `,
  });
  await sleep(600);
  await capture('11_kmc_dashboard_tablet_768.png', 768, 1024, true);

  // Mobile Modern (390x844)
  await send('Runtime.evaluate', {
    expression: `
      const homeBtn = document.querySelector('[data-tab-id="home"]');
      if (homeBtn) homeBtn.click();
    `,
  });
  await sleep(600);
  await capture('12_kmc_landing_mobile_390.png', 390, 844, true);

  await send('Runtime.evaluate', {
    expression: `
      const dashBtn = document.querySelector('[data-testid="v20-cta-dashboard"]') || document.querySelector('[data-tab-id="dashboard"]');
      if (dashBtn) dashBtn.click();
    `,
  });
  await sleep(600);
  await capture('13_kmc_dashboard_mobile_390.png', 390, 844, true);

  // Mobile Min (320x568)
  await send('Runtime.evaluate', {
    expression: `
      const homeBtn = document.querySelector('[data-tab-id="home"]');
      if (homeBtn) homeBtn.click();
    `,
  });
  await sleep(600);
  await capture('14_kmc_landing_mobile_320.png', 320, 568, true);

  await send('Runtime.evaluate', {
    expression: `
      const dashBtn = document.querySelector('[data-testid="v20-cta-dashboard"]') || document.querySelector('[data-tab-id="dashboard"]');
      if (dashBtn) dashBtn.click();
    `,
  });
  await sleep(600);
  await capture('15_kmc_dashboard_mobile_320.png', 320, 568, true);

  console.log('\nAll Gate A browser screenshots captured successfully in:', OUTPUT_DIR);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during Gate A browser QA:', err);
  process.exit(1);
});
