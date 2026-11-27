import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_4';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Spawning Headless Chrome for V21.4 Visual QA Verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9896',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9896/json');
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
    return res.result?.result?.value !== undefined ? res.result.result.value : res.result?.value;
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

    /* ========================================================================
       1. MORPHING NAVBAR VERIFICATION (Collapsed, Expanded, Hover, 50 Cycles)
       ======================================================================== */
    console.log('\n--- 1. Morphing Navbar Engineering ---');
    await setViewport(1920, 1080);
    await sleep(500);

    // Collapsed State
    await capture('v21_4_navbar_collapsed_desktop_1920');

    // Expand via click
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await capture('v21_4_navbar_expanded_desktop_1920');

    // Close via click
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await capture('v21_4_navbar_closed_after_click_1920');

    // 50-Cycle Real Chrome Immunity Test
    console.log('Executing 50 consecutive open/close cycles in real Chrome...');
    let stuckCount = 0;
    for (let i = 1; i <= 50; i++) {
      await evaluate(`document.getElementById('nav-toggle')?.click();`);
      await sleep(180);
      const isOpen = await evaluate(`document.getElementById('header')?.classList.contains('open');`);
      if (!isOpen) stuckCount++;

      await evaluate(`document.getElementById('nav-toggle')?.click();`);
      await sleep(180);
      const isClosed = await evaluate(`!document.getElementById('header')?.classList.contains('open');`);
      if (!isClosed) stuckCount++;
    }
    console.log(`50-Cycle Real Chrome Immunity Result: ${stuckCount} stuck states detected.`);

    /* ========================================================================
       2. CURSOR SPOTLIGHT GLOW EFFECT (Dark Mode & Light Mode)
       ======================================================================== */
    console.log('\n--- 2. Cursor Spotlight Glow Effect ---');
    await evaluate(`
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 680, clientY: 420 }));
    `);
    await sleep(300);
    await capture('v21_4_spotlight_dark_mode_1920');

    // Switch to Light Mode
    await evaluate(`document.getElementById('theme')?.click();`);
    await sleep(800);
    await capture('v21_4_spotlight_light_mode_1920');

    /* ========================================================================
       3. COMPLETE LIGHT MODE SYSTEMATIC VERIFICATION (All Views)
       ======================================================================== */
    console.log('\n--- 3. Light Mode Color & Contrast Verification ---');
    // Landing (Light Mode)
    await capture('v21_4_landing_light_mode_1920');

    // Dashboard (Light Mode)
    await evaluate(`
      const navBtn = document.querySelector('[data-go="dashboard"]');
      if (navBtn) navBtn.click();
      else document.querySelector('[data-testid="v20-landing-dashboard-btn"]')?.click();
    `);
    await sleep(1500);
    await capture('v21_4_dashboard_light_mode_1920');

    // Complaints (Light Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="complaints"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_complaints_light_mode_1920');

    // Verification (Light Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="verification"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_verification_light_mode_1920');

    // Officers Directory (Light Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="officers"]')?.click();`);
    await sleep(1800);
    await capture('v21_4_officers_directory_light_mode_1920');

    // Officer Detail Personnel File (Light Mode)
    await evaluate(`
      const firstCard = document.querySelector('.v20-officer-card');
      firstCard?.click();
    `);
    await sleep(1500);
    await capture('v21_4_officer_detail_light_mode_1920');

    // Notifications (Light Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="notifications"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_notifications_light_mode_1920');

    // Profile (Light Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="profile"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_profile_light_mode_1920');

    // Switch back to Dark Mode for Dark Mode Verification
    await evaluate(`document.getElementById('theme')?.click();`);
    await sleep(800);
    await capture('v21_4_profile_dark_mode_1920');

    // Officers Directory (Dark Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="officers"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_officers_directory_dark_mode_1920');

    // Dashboard (Dark Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="dashboard"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_dashboard_dark_mode_1920');

    // Landing (Dark Mode)
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="home"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_landing_dark_mode_1920');

    /* ========================================================================
       4. MOBILE RESPONSIVENESS VERIFICATION (1440, 768, 390, 320)
       ======================================================================== */
    console.log('\n--- 4. Mobile Responsiveness Across Viewports ---');

    // 1440 Widescreen Laptop
    await setViewport(1440, 900);
    await capture('v21_4_landing_desktop_1440');

    // 768 Tablet Portrait
    await setViewport(768, 1024);
    await capture('v21_4_landing_tablet_768');
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await capture('v21_4_navbar_expanded_tablet_768');
    await evaluate(`document.querySelector('[data-go="dashboard"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_dashboard_tablet_768');
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await evaluate(`document.querySelector('[data-go="officers"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_officers_tablet_768');

    // 390 Mobile Standard (iPhone 14 / Pixel)
    await setViewport(390, 844, true);
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="home"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_landing_mobile_390');

    // Expanded Navbar on Mobile
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await capture('v21_4_navbar_expanded_mobile_390');

    // Dashboard Mobile
    await evaluate(`document.querySelector('[data-go="dashboard"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_dashboard_mobile_390');

    // Officers Mobile
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await evaluate(`document.querySelector('[data-go="officers"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_officers_mobile_390');

    // Profile Mobile
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await evaluate(`document.querySelector('[data-go="profile"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_profile_mobile_390');

    // 320 Mobile Minimum (iPhone SE Compact)
    await setViewport(320, 568, true);
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-go="home"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_landing_mobile_320');

    // Dashboard 320
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await evaluate(`document.querySelector('[data-go="dashboard"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_dashboard_mobile_320');

    // Officers 320
    await evaluate(`document.getElementById('nav-toggle')?.click();`);
    await sleep(800);
    await evaluate(`document.querySelector('[data-go="officers"]')?.click();`);
    await sleep(1500);
    await capture('v21_4_officers_mobile_320');

    console.log('\nAll V21.4 Visual QA verification captures completed successfully!');
  } catch (err) {
    console.error('Visual QA error:', err);
  } finally {
    ws.close();
    chromeProc.kill();
  }
}

run();
