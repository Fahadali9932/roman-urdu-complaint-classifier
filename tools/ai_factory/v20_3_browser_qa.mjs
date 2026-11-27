import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9448;
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v20_3';
const TEMP_USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v20_3_qa_' + Date.now());

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
    await sleep(500);
    const snap = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const fullPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(snap.data, 'base64'));
    console.log(`Saved screenshot: ${filename} (${width}x${height})`);
  }

  // =========================================================================
  // 1. HOD PORTAL SUITE (KMC Head of Department)
  // =========================================================================
  console.log('\n--- 1. Setting up HOD Session (KMC Municipal Head) ---');
  await send('Page.navigate', { url: 'http://localhost:5173/department' });
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
      window.location.href = '/department';
    `,
  });
  await sleep(2500);

  // 1. Landing Page
  console.log('\n--- Capturing HOD Landing Page (Enlarged greeting, serif name, clean clock) ---');
  await capture('01_hod_landing_1920.png', 1920, 1080);
  await capture('02_hod_landing_1440.png', 1440, 900);

  // 2. Navigation Morphing States
  console.log('\n--- Capturing TopEdgeMorphingNav Notch States ---');
  await capture('03_nav_notch_collapsed_1440.png', 1440, 900);

  await send('Runtime.evaluate', {
    expression: `
      const notch = document.querySelector('.v20-notch-shell');
      if (notch) notch.click();
    `,
  });
  await sleep(600);
  await capture('04_nav_notch_expanded_1440.png', 1440, 900);

  // 3. Cardless Dashboard (Screenshot 655 layout)
  console.log('\n--- Capturing HOD Dashboard (Cardless bold numbers, NameThatUI donut) ---');
  await send('Runtime.evaluate', {
    expression: `
      const dashTab = document.querySelector('[data-tab-id="dashboard"]');
      if (dashTab) dashTab.click();
    `,
  });
  await sleep(1000);
  await capture('05_hod_dashboard_1920.png', 1920, 1080);
  await capture('06_hod_dashboard_1440.png', 1440, 900);

  // 4. Light Mode Dashboard
  console.log('\n--- Capturing Light Mode Dashboard ---');
  await send('Runtime.evaluate', {
    expression: `
      const themeBtn = document.querySelector('[data-testid="v20-theme-toggle"]');
      if (themeBtn) themeBtn.click();
    `,
  });
  await sleep(600);
  await capture('07_hod_dashboard_light_1440.png', 1440, 900);

  // Restore dark theme
  await send('Runtime.evaluate', {
    expression: `
      const themeBtn = document.querySelector('[data-testid="v20-theme-toggle"]');
      if (themeBtn) themeBtn.click();
    `,
  });
  await sleep(600);

  // 5. Complaints Inbox with Large Horizontal Glass Cards
  console.log('\n--- Capturing HOD Complaints Inbox (Horizontal cards, priority badges, arrow ↗) ---');
  await send('Runtime.evaluate', {
    expression: `
      const compTab = document.querySelector('[data-tab-id="complaints"]');
      if (compTab) compTab.click();
    `,
  });
  await sleep(1000);
  await capture('08_hod_complaints_inbox_1440.png', 1440, 900);

  // 6. Dedicated Full-Width Complaint Reading View
  console.log('\n--- Capturing HOD Dedicated Reading View (Expanding first card) ---');
  await send('Runtime.evaluate', {
    expression: `
      const firstCard = document.querySelector('.v20-horizontal-complaint-card') || document.querySelector('.v19-parallax-card');
      if (firstCard) firstCard.click();
    `,
  });
  await sleep(800);
  await capture('09_hod_complaint_reading_view_1440.png', 1440, 900);

  // Go back to complaints list
  await send('Runtime.evaluate', {
    expression: `
      const backBtn = document.querySelector('.v20-back-btn');
      if (backBtn) backBtn.click();
    `,
  });
  await sleep(600);

  // 7. HOD Verification View
  console.log('\n--- Capturing HOD Verification View (Dual before/after, 30m GPS badge) ---');
  await send('Runtime.evaluate', {
    expression: `
      const verifTab = document.querySelector('[data-tab-id="verification"]');
      if (verifTab) verifTab.click();
    `,
  });
  await sleep(1000);
  await capture('10_hod_verification_queue_1440.png', 1440, 900);

  // 8. HOD Officers Roster View
  console.log('\n--- Capturing HOD Officers Personnel Roster ---');
  await send('Runtime.evaluate', {
    expression: `
      const offTab = document.querySelector('[data-tab-id="officers"]');
      if (offTab) offTab.click();
    `,
  });
  await sleep(1000);
  await capture('11_hod_officers_roster_1440.png', 1440, 900);

  // =========================================================================
  // 2. OFFICER PORTAL SUITE (KMC Field Officer: roads-02 / local-officer-a)
  // =========================================================================
  console.log('\n--- 2. Setting up Field Officer Session (roads-02 / local-officer-a) ---');
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-02',
        userId: 'local-officer-a',
        staffPosition: 'officer',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `,
  });
  await sleep(2500);

  // Officer Work View
  console.log('\n--- Capturing Officer Work Console (Countdown timer, GPS validation) ---');
  await send('Runtime.evaluate', {
    expression: `
      const workTab = document.querySelector('[data-tab-id="work"]');
      if (workTab) workTab.click();
    `,
  });
  await sleep(1000);
  await capture('12_officer_work_console_1440.png', 1440, 900);

  // Officer Performance View
  console.log('\n--- Capturing Officer Performance View (Scorecard, bold numbers) ---');
  await send('Runtime.evaluate', {
    expression: `
      const perfTab = document.querySelector('[data-tab-id="performance"]');
      if (perfTab) perfTab.click();
    `,
  });
  await sleep(1000);
  await capture('13_officer_performance_1440.png', 1440, 900);

  // Officer Notifications View
  console.log('\n--- Capturing Officer Notifications View ---');
  await send('Runtime.evaluate', {
    expression: `
      const notifTab = document.querySelector('[data-tab-id="notifications"]');
      if (notifTab) notifTab.click();
    `,
  });
  await sleep(1000);
  await capture('14_officer_notifications_1440.png', 1440, 900);

  // =========================================================================
  // 3. RESPONSIVE VIEWPORTS SUITE (Tablet 768px, Mobile 390px, 320px)
  // =========================================================================
  console.log('\n--- 3. Capturing Responsive Viewports (Tablet 768px, Mobile 390px, 320px) ---');
  // Tablet Officer Work
  await capture('15_officer_work_tablet_768.png', 768, 1024, true);

  // Mobile Modern (390x844) - Work Tab Allowed for Fieldwork
  await capture('16_officer_work_mobile_390.png', 390, 844, true);

  // Mobile Min (320x568) - Work Tab Allowed for Fieldwork
  await capture('17_officer_work_mobile_320.png', 320, 568, true);

  // Switch to HOD for Mobile Viewport Gate Check (Desktop-restricted with clean fallback)
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
      window.location.href = '/department';
    `,
  });
  await sleep(2500);

  await capture('18_hod_landing_mobile_390.png', 390, 844, true);
  await capture('19_hod_landing_mobile_320.png', 320, 568, true);

  console.log('\nAll V20.3 screenshots captured successfully in:', OUTPUT_DIR);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during V20.3 browser QA:', err);
  process.exit(1);
});
