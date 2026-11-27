import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v22_0';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Spawning Headless Chrome for V22.0 Staff Security & Onboarding QA...');
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
    return res.result?.result?.value !== undefined ? res.result.result.value : res.result?.value;
  }

  try {
    /* ========================================================================
       1. MANDATORY FIRST-LOGIN EMAIL OTP ONBOARDING GATE (Dark & Light)
       ======================================================================== */
    console.log('\n--- 1. Mandatory First-Login Email OTP Onboarding Gate ---');
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(800);
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-new',
        displayName: 'Engr. Imran Tariq',
        userId: 'local-officer-unverified',
        staffPosition: 'officer',
        mustChangePassword: true,
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `);
    await sleep(2000);
    await setViewport(1920, 1080);
    await capture('v22_0_desktop_1920_onboarding_otp_gate_dark');

    // Switch to light mode on onboarding gate
    await evaluate(`
      document.documentElement.classList.add('v20-light-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    `);
    await sleep(500);
    await capture('v22_0_desktop_1920_onboarding_otp_gate_light');

    // Reset theme back to dark
    await evaluate(`
      document.documentElement.classList.remove('v20-light-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    `);
    await sleep(300);

    /* ========================================================================
       2. HOD PORTAL & CENTRALIZED OFFICER PROVISIONING
       ======================================================================== */
    console.log('\n--- 2. HOD Portal & Centralized Officer Provisioning ---');
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        displayName: 'Engr. Tariq Mahmood',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `);
    await sleep(2200);
    await setViewport(1920, 1080);
    await capture('v22_0_desktop_1920_hod_overview_dark');

    // Navigate to Officers tab
    await evaluate(`
      const navBtn = document.querySelector('[data-go="officers"]');
      if (navBtn) navBtn.click();
    `);
    await sleep(1500);
    await capture('v22_0_desktop_1920_hod_officers_directory_dark');

    /* ========================================================================
       3. OFFICER PORTAL: MY WORK, RESOLUTION FORM & NEUTRAL STYLING
       ======================================================================== */
    console.log('\n--- 3. Officer Portal: My Work, Resolution Form & GPS Verification ---');
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-02',
        displayName: 'Farhan Zaidi',
        userId: 'local-officer-a',
        staffPosition: 'officer',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department/officer';
    `);
    await sleep(2200);
    await setViewport(1920, 1080);

    // Switch to Work tab
    await evaluate(`
      const workTab = document.querySelector('[data-go="work"]') || document.querySelector('button[data-testid="officer-nav-work"]');
      if (workTab) workTab.click();
    `);
    await sleep(1200);
    await capture('v22_0_desktop_1920_officer_my_work_dark');

    // Open first complaint detail
    await evaluate(`
      const card = document.querySelector('.v20-order-card') || document.querySelector('[data-testid^="order-card-"]');
      if (card) card.click();
    `);
    await sleep(1200);

    // Click "Submit completed work" button to open resolution form
    await evaluate(`
      const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
      if (submitBtn) submitBtn.click();
    `);
    await sleep(1500);

    // Attach mock file so submit button is enabled and ready
    await evaluate(`
      const dt = new DataTransfer();
      const file = new File(['evidence'], 'repaired_pipe.jpg', { type: 'image/jpeg' });
      dt.items.add(file);
      const input = document.querySelector('input[type="file"]');
      if (input) {
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    await sleep(800);
    await capture('v22_0_desktop_1920_officer_resolution_form_dark');

    // Switch resolution form to Light Mode
    await evaluate(`
      document.documentElement.classList.add('v20-light-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    `);
    await sleep(500);
    await capture('v22_0_desktop_1920_officer_resolution_form_light');

    // Reset back to Dark Mode
    await evaluate(`
      document.documentElement.classList.remove('v20-light-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    `);
    await sleep(300);

    /* ========================================================================
       4. SYNCHRONIZED AUTHORITATIVE OFFICER PROFILE
       ======================================================================== */
    console.log('\n--- 4. Synchronized Authoritative Officer Profile ---');
    await evaluate(`
      const profileTab = document.querySelector('[data-go="profile"]');
      if (profileTab) profileTab.click();
    `);
    await sleep(1500);
    await capture('v22_0_desktop_1920_officer_profile_dark');

    await evaluate(`
      document.documentElement.classList.add('v20-light-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    `);
    await sleep(500);
    await capture('v22_0_desktop_1920_officer_profile_light');

    await evaluate(`
      document.documentElement.classList.remove('v20-light-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    `);
    await sleep(300);

    /* ========================================================================
       5. CROSS-VIEWPORT RESPONSIVE QA MATRIX
       ======================================================================== */
    console.log('\n--- 5. Cross-Viewport Responsive QA Matrix ---');

    // Return to work resolution form for viewport verification
    await evaluate(`
      const workTab = document.querySelector('[data-go="work"]');
      if (workTab) workTab.click();
    `);
    await sleep(1000);
    await evaluate(`
      const card = document.querySelector('.v20-order-card') || document.querySelector('[data-testid^="order-card-"]');
      if (card) card.click();
    `);
    await sleep(800);
    await evaluate(`
      const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
      if (submitBtn) submitBtn.click();
    `);
    await sleep(1000);

    // Laptop 1440x900
    await setViewport(1440, 900);
    await capture('v22_0_laptop_1440_resolution_form');

    // Laptop 1366x768
    await setViewport(1366, 768);
    await capture('v22_0_laptop_1366_resolution_form');

    // Tablet 1024x768
    await setViewport(1024, 768);
    await capture('v22_0_tablet_1024_resolution_form');

    // Tablet 768x1024 (HOD desktop restriction check)
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        displayName: 'Engr. Tariq Mahmood',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `);
    await sleep(1800);
    await setViewport(768, 1024);
    await capture('v22_0_tablet_768_hod_restricted');

    // Mobile Officer Fieldwork (390x844)
    await evaluate(`
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-02',
        displayName: 'Farhan Zaidi',
        userId: 'local-officer-a',
        staffPosition: 'officer',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department/officer';
    `);
    await sleep(1800);
    await setViewport(390, 844, true);
    await capture('v22_0_mobile_390_officer_work_dark');

    // Open resolution form on mobile 390
    await evaluate(`
      const card = document.querySelector('.v20-order-card') || document.querySelector('[data-testid^="order-card-"]');
      if (card) card.click();
    `);
    await sleep(800);
    await evaluate(`
      const submitBtn = document.querySelector('[data-testid="submit-completed-work-btn"]');
      if (submitBtn) submitBtn.click();
    `);
    await sleep(1200);
    await capture('v22_0_mobile_390_officer_resolution_form_dark');

    // Mobile Minimum (320x568)
    await setViewport(320, 568, true);
    await capture('v22_0_mobile_320_officer_resolution_form_dark');

    console.log('\nAll V22.0 Headless Chrome QA captures completed successfully!');
  } catch (err) {
    console.error('QA capture error:', err);
  } finally {
    ws.close();
    chromeProc.kill();
  }
}

run();
