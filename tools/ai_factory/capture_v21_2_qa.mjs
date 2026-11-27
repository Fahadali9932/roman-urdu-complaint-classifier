import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_2';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Spawning Headless Chrome for V21.2 Visual QA Verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9897',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9897/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('Runtime.enable');

  async function setViewport(w, h, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile,
    });
    await sleep(300);
  }

  async function capture(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const path = join(OUTPUT_DIR, `${name}.png`);
    writeFileSync(path, buffer);
    console.log(`Captured: ${name}.png (${buffer.length} bytes)`);
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  async function loginAs(role = 'head', deptCode = 'KMC', deptName = 'Karachi Metropolitan Corporation', deptId = 'kmc', username = 'roads-01') {
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(800);
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: '${deptId}',
        departmentCode: '${deptCode}',
        departmentName: '${deptName}',
        username: '${username}',
        displayName: 'Engr. Tariq Mahmood',
        userId: '${role === 'head' ? 'staff-kmc-demo-01' : 'off-kmc-01'}',
        staffPosition: '${role}',
        authenticatedAt: new Date().toISOString()
      }));
      localStorage.setItem('awaaz_display_name_staff-kmc-demo-01', 'Engr. Tariq Mahmood');
      window.location.href = '/department';
    `);
    await sleep(2000);
  }

  try {
    console.log('Logging in as Head of Department with synchronized display name...');
    await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc', 'roads-01');

    // 1. Landing Page with Synced Display Name
    console.log('Capturing Landing Page after Display Name Sync...');
    await setViewport(1920, 1080);
    await capture('v21_2_landing_after_display_name_sync_1920');

    // 2. Switch to Officers Tab
    console.log('Switching to Officers tab...');
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const offTab = tabs.find(t => t.textContent.includes('Officers'));
      if (offTab) offTab.click();
    })()`);
    await sleep(1500);

    // Capture Officers Directory across desktop, tablet, and mobile
    await setViewport(1920, 1080);
    await capture('v21_2_officer_directory_desktop_1920');

    await setViewport(1440, 900);
    await capture('v21_2_officer_directory_desktop_1440');

    await setViewport(768, 1024);
    await capture('v21_2_officer_directory_tablet_768');

    await setViewport(390, 844, true);
    await capture('v21_2_officer_directory_mobile_390');

    await setViewport(320, 640, true);
    await capture('v21_2_officer_directory_mobile_320');

    // 3. Open Dedicated Full-Width Officer Detail View
    console.log('Opening dedicated full-width officer detail view...');
    await setViewport(1920, 1080);
    await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.v20-officer-card'));
      if (cards.length > 0) cards[0].click();
    })()`);
    await sleep(1500);
    await capture('v21_2_officer_detail_fullwidth_1920');

    // Switch to Work History tab in detail
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const histTab = tabs.find(t => t.textContent.includes('Work History'));
      if (histTab) histTab.click();
    })()`);
    await sleep(800);
    await capture('v21_2_officer_detail_work_history_1920');

    // Switch back to Active Tasks tab
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const actTab = tabs.find(t => t.textContent.includes('Active Tasks'));
      if (actTab) actTab.click();
    })()`);
    await sleep(500);

    // 4. Open Issue Warning Modal
    console.log('Opening Issue Warning modal...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const warnBtn = btns.find(b => b.textContent.includes('Issue Formal Warning'));
      if (warnBtn) warnBtn.click();
    })()`);
    await sleep(1000);
    await capture('v21_2_officer_detail_modal_warning_1920');

    // Close Warning Modal
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find(b => b.textContent === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(600);

    // 5. Open Extend Deadline Modal
    console.log('Opening Extend Deadline modal...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const extBtn = btns.find(b => b.textContent.includes('Extend ↗'));
      if (extBtn) extBtn.click();
    })()`);
    await sleep(1000);
    await capture('v21_2_officer_detail_modal_extend_1920');

    // Close Extend Modal
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find(b => b.textContent === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(600);

    // Return to officers directory
    console.log('Clicking Back to officers...');
    await evaluate(`(() => {
      const backBtn = document.querySelector('[data-testid="v20-officer-back-btn"]');
      if (backBtn) backBtn.click();
    })()`);
    await sleep(1000);

    // 6. Dedicated Full-Page Notifications View
    console.log('Navigating to Notifications full-page view...');
    await evaluate(`(() => {
      const bell = document.querySelector('button[aria-label*="notification" i], [data-testid="v20-notif-bell"], .v20-top-utility button');
      if (bell) bell.click();
    })()`);
    await sleep(1500);

    await setViewport(1920, 1080);
    await capture('v21_2_notifications_all_desktop_1920');

    await setViewport(768, 1024);
    await capture('v21_2_notifications_tablet_768');

    await setViewport(390, 844, true);
    await capture('v21_2_notifications_mobile_390');

    // Filter to Unread
    console.log('Filtering Notifications to Unread...');
    await setViewport(1920, 1080);
    await evaluate(`(() => {
      const unreadBtn = document.querySelector('[data-testid="v20-filter-unread-btn"]');
      if (unreadBtn) unreadBtn.click();
    })()`);
    await sleep(800);
    await capture('v21_2_notifications_unread_desktop_1920');

    // 7. Profile Page with Editable Display Name
    console.log('Navigating to Profile tab...');
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const profTab = tabs.find(t => t.textContent.includes('Profile'));
      if (profTab) profTab.click();
    })()`);
    await sleep(1500);

    await setViewport(1920, 1080);
    await capture('v21_2_profile_editable_display_name_1920');

    await setViewport(768, 1024);
    await capture('v21_2_profile_tablet_768');

    await setViewport(390, 844, true);
    await capture('v21_2_profile_mobile_390');

    console.log('ALL V21.2 VISUAL QA CAPTURES FINISHED SUCCESSFULLY!');
  } finally {
    ws.close();
    chromeProc.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Visual QA run failed:', err);
  process.exit(1);
});
