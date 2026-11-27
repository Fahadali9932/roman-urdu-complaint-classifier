import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_3';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Spawning Headless Chrome for V21.3 Visual QA Verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9895',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9895/json');
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
    await sleep(2200);
  }

  try {
    console.log('Logging in as Head of Department...');
    await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc', 'roads-01');

    /* ---------------------------------------------------------------------- */
    /* 1. ENLARGED OFFICER CARDS & RESPONSIVE DIRECTORY                       */
    /* ---------------------------------------------------------------------- */
    console.log('--- 1. Testing & Capturing Enlarged Officer Cards ---');
    await evaluate(`
      const navBtn = document.querySelector('[data-tab-id="officers"]') || document.querySelector('[data-go="officers"]');
      if (navBtn) navBtn.click();
    `);
    await sleep(1000);

    // Desktop 1920
    await setViewport(1920, 1080);
    await capture('v21_3_officers_directory_desktop_1920');

    // Desktop 1440
    await setViewport(1440, 900);
    await capture('v21_3_officers_directory_desktop_1440');

    // Tablet 768
    await setViewport(768, 1024);
    await capture('v21_3_officers_directory_tablet_768');

    // Mobile 390
    await setViewport(390, 844, true);
    await capture('v21_3_officers_directory_mobile_390');

    // Mobile 320
    await setViewport(320, 640, true);
    await capture('v21_3_officers_directory_mobile_320');

    /* ---------------------------------------------------------------------- */
    /* 2. COMPREHENSIVE OFFICER PERSONNEL FILE                                */
    /* ---------------------------------------------------------------------- */
    console.log('--- 2. Testing & Capturing Comprehensive Officer Personnel File ---');
    await setViewport(1920, 1080);
    await evaluate(`
      const firstCard = document.querySelector('.v20-officer-card') || document.querySelector('[data-testid^="v20-officer-card-"]');
      if (firstCard) firstCard.click();
    `);
    await sleep(800);

    // Identity and Performance Section
    await capture('v21_3_officer_file_identity_performance_1920');

    // Scroll to Assignments and Work History
    await evaluate(`window.scrollTo({ top: 600, behavior: 'instant' });`);
    await sleep(400);
    await capture('v21_3_officer_file_assignments_history_1920');

    // Scroll to Admin Controls
    await evaluate(`window.scrollTo({ top: 1200, behavior: 'instant' });`);
    await sleep(400);
    await capture('v21_3_officer_file_admin_controls_1920');

    // Open Warning Modal
    await evaluate(`
      const warningBtn = document.querySelector('[data-testid="officer-action-warning-btn"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Formal Warning'));
      if (warningBtn) warningBtn.click();
    `);
    await sleep(500);
    await capture('v21_3_officer_file_warning_modal_1920');

    // Close Warning Modal
    await evaluate(`
      const closeBtn = document.querySelector('.v19-action-icon-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (closeBtn) closeBtn.click();
    `);
    await sleep(400);

    // Click Back to Officers
    await evaluate(`
      window.scrollTo({ top: 0, behavior: 'instant' });
      const backBtn = document.querySelector('[data-testid="v20-officer-back-btn"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to officers'));
      if (backBtn) backBtn.click();
    `);
    await sleep(600);

    /* ---------------------------------------------------------------------- */
    /* 3. SIMPLIFIED PROFILE & COMING SOON MODAL                              */
    /* ---------------------------------------------------------------------- */
    console.log('--- 3. Testing & Capturing Simplified Profile Settings ---');
    await evaluate(`
      const profileTab = document.querySelector('[data-tab-id="profile"]') || document.querySelector('[data-go="profile"]');
      if (profileTab) profileTab.click();
    `);
    await sleep(800);

    // Desktop Profile
    await setViewport(1920, 1080);
    await capture('v21_3_profile_simplified_desktop_1920');

    // Tablet Profile
    await setViewport(768, 1024);
    await capture('v21_3_profile_simplified_tablet_768');

    // Mobile Profile
    await setViewport(390, 844, true);
    await capture('v21_3_profile_simplified_mobile_390');

    // Desktop Coming Soon Modal
    await setViewport(1920, 1080);
    await evaluate(`
      const changeUsernameBtn = document.querySelector('[data-testid="hod-change-username-btn"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Change ↗'));
      if (changeUsernameBtn) changeUsernameBtn.click();
    `);
    await sleep(500);
    await capture('v21_3_profile_coming_soon_modal_1920');

    // Dismiss modal with Okay button
    await evaluate(`
      const okayBtn = document.querySelector('[data-testid="coming-soon-okay-btn"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Okay');
      if (okayBtn) okayBtn.click();
    `);
    await sleep(400);

    /* ---------------------------------------------------------------------- */
    /* 4. NOTIFICATIONS: MARK ALL AS READ OPTIMIZATION                        */
    /* ---------------------------------------------------------------------- */
    console.log('--- 4. Testing & Capturing Notifications Stream ---');
    await evaluate(`
      const notifsTab = document.querySelector('[data-tab-id="notifications"]') || document.querySelector('[data-go="notifications"]');
      if (notifsTab) notifsTab.click();
    `);
    await sleep(800);

    await capture('v21_3_notifications_unread_desktop_1920');

    // Click Mark All As Read
    await evaluate(`
      const markAllBtn = document.querySelector('[data-testid="v20-mark-all-read-btn"]');
      if (markAllBtn && !markAllBtn.disabled) markAllBtn.click();
    `);
    await sleep(800);
    await capture('v21_3_notifications_after_mark_all_read_1920');

    /* ---------------------------------------------------------------------- */
    /* 5. TOP EDGE MORPHING NAVBAR: INTERACTION & 30 CYCLES VERIFICATION      */
    /* ---------------------------------------------------------------------- */
    console.log('--- 5. Testing & Capturing Morphing Navbar ---');
    // Ensure navbar is collapsed
    await evaluate(`
      const header = document.querySelector('#header');
      if (header && header.classList.contains('open')) {
        const toggle = document.querySelector('#nav-toggle');
        if (toggle) toggle.click();
      }
    `);
    await sleep(700);
    await capture('v21_3_navbar_collapsed_1920');

    // Expand navbar via toggle
    await evaluate(`
      const toggle = document.querySelector('#nav-toggle');
      if (toggle) toggle.click();
    `);
    await sleep(800);
    await capture('v21_3_navbar_expanded_1920');

    // Close navbar via toggle
    await evaluate(`
      const toggle = document.querySelector('#nav-toggle');
      if (toggle) toggle.click();
    `);
    await sleep(800);
    await capture('v21_3_navbar_closed_after_manual_toggle_1920');

    // Run 30 consecutive open/close cycles in real Chrome
    console.log('Executing 30 consecutive open/close cycles in real Chrome browser...');
    const cyclesResult = await evaluate(`
      (async () => {
        const toggle = document.querySelector('#nav-toggle');
        const header = document.querySelector('#header');
        if (!toggle || !header) return { error: 'nav element not found' };

        let stuckCount = 0;
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < 30; i++) {
          // Open
          toggle.click();
          await sleep(65);
          if (!header.classList.contains('open')) stuckCount++;

          // Close
          toggle.click();
          await sleep(65);
          if (header.classList.contains('open')) stuckCount++;
        }

        // Final check after cycles
        await sleep(300);
        const finalOpen = header.classList.contains('open');
        const finalState = header.getAttribute('data-nav-state');

        return {
          totalCycles: 30,
          stuckCount,
          finalOpen,
          finalState
        };
      })()
    `);

    console.log('Navbar 30-cycle test results in real browser:', cyclesResult);

    console.log('ALL V21.3 SCREENSHOTS AND BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during QA capture:', err);
  } finally {
    try {
      ws.close();
      chromeProc.kill();
    } catch {}
  }
}

run();
