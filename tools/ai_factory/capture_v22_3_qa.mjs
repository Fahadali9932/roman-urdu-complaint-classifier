import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v22_3';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureViteServer() {
  try {
    const res = await fetch('http://localhost:5173/');
    if (res.ok || res.status === 200 || res.status === 304) {
      console.log('Vite dev server is already running on port 5173.');
      return null;
    }
  } catch (err) {
    // not running, spawn below
  }

  console.log('Spawning Vite server on port 5173...');
  const viteProc = spawn('npx.cmd', ['vite', '--port', '5173'], {
    cwd: 'D:\\RomanUrdu_V13_19_Review',
    stdio: 'ignore',
    shell: true,
  });

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://localhost:5173/');
      if (res.status === 200 || res.status === 304) {
        console.log('Vite server ready!');
        return viteProc;
      }
    } catch {}
  }
  return viteProc;
}

async function run() {
  const viteProc = await ensureViteServer();

  console.log('Spawning Headless Chrome for V22.3 QA Capture...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9898',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9898/json');
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
    const filePath = join(OUTPUT_DIR, `${name}.png`);
    writeFileSync(filePath, buffer);
    console.log(`[Captured] ${name}.png`);
  }

  async function evaluate(expression) {
    return await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
  }

  async function navigate(url) {
    await send('Page.navigate', { url });
    await sleep(1000);
  }

  try {
    console.log('\n--- 1. NEUTRAL ROLE CHOICE GATEWAY (/department/login) ---');
    await navigate('http://localhost:5173/department/login');
    await setViewport(1920, 1080);
    await capture('v22_3_desktop_1920_role_choice_dark');

    await evaluate(`document.querySelector('[data-testid="role-choice-theme-toggle"]')?.click()`);
    await sleep(400);
    await capture('v22_3_desktop_1920_role_choice_light');

    // Reset to dark
    await evaluate(`document.querySelector('[data-testid="role-choice-theme-toggle"]')?.click()`);
    await sleep(300);

    // Mobile Role Choice
    await setViewport(390, 844, true);
    await capture('v22_3_mobile_390_role_choice_dark');

    console.log('\n--- 2. STAGE 1: DEPARTMENT HEAD SELECTION (/department/head/login) ---');
    await navigate('http://localhost:5173/department/head/login');
    await setViewport(1920, 1080);
    await capture('v22_3_desktop_1920_hod_stage1_selection_dark');

    await evaluate(`document.querySelector('[data-testid="stage1-theme-toggle"]')?.click()`);
    await sleep(400);
    await capture('v22_3_desktop_1920_hod_stage1_selection_light');

    // Reset to dark
    await evaluate(`document.querySelector('[data-testid="stage1-theme-toggle"]')?.click()`);
    await sleep(300);

    // Tablet 768
    await setViewport(768, 1024);
    await capture('v22_3_tablet_768_hod_stage1_selection_dark');

    // Mobile 390
    await setViewport(390, 844, true);
    await capture('v22_3_mobile_390_hod_stage1_selection_dark');

    // Mobile 320
    await setViewport(320, 568, true);
    await capture('v22_3_mobile_320_hod_stage1_selection_dark');

    console.log('\n--- 3. STAGE 1: FIELD OFFICER SELECTION (/department/officer/login) ---');
    await navigate('http://localhost:5173/department/officer/login');
    await setViewport(1920, 1080);
    await capture('v22_3_desktop_1920_officer_stage1_selection_dark');

    await evaluate(`document.querySelector('[data-testid="stage1-theme-toggle"]')?.click()`);
    await sleep(400);
    await capture('v22_3_desktop_1920_officer_stage1_selection_light');

    // Reset to dark
    await evaluate(`document.querySelector('[data-testid="stage1-theme-toggle"]')?.click()`);
    await sleep(300);

    // Mobile 390
    await setViewport(390, 844, true);
    await capture('v22_3_mobile_390_officer_stage1_selection_dark');

    // Mobile 320
    await setViewport(320, 568, true);
    await capture('v22_3_mobile_320_officer_stage1_selection_dark');

    console.log('\n--- 4. STAGE 2: HOD ASYMMETRIC SIGN-IN ACROSS ALL 6 DEPARTMENTS ---');
    const departments = ['kmc', 'kelectric', 'kwsc', 'sswmb', 'gas', 'sbca'];

    for (const dept of departments) {
      await navigate(`http://localhost:5173/department/head/login?dept=${dept}`);
      await setViewport(1920, 1080);
      await capture(`v22_3_desktop_1920_hod_login_${dept}_dark`);

      if (dept === 'kmc' || dept === 'sswmb') {
        await evaluate(`document.querySelector('[data-testid="hod-login-theme-toggle"]')?.click()`);
        await sleep(400);
        await capture(`v22_3_desktop_1920_hod_login_${dept}_light`);
        // Reset
        await evaluate(`document.querySelector('[data-testid="hod-login-theme-toggle"]')?.click()`);
        await sleep(300);
      }
    }

    // Laptop 1366
    await setViewport(1366, 768);
    await navigate('http://localhost:5173/department/head/login?dept=kelectric');
    await capture('v22_3_laptop_1366_hod_login_kelectric_dark');

    // Desktop Required Restriction on Mobile/Tablet for HOD
    await setViewport(768, 1024);
    await navigate('http://localhost:5173/department/head/login?dept=sswmb');
    await capture('v22_3_tablet_768_hod_restricted_sswmb_dark');

    await setViewport(390, 844, true);
    await navigate('http://localhost:5173/department/head/login?dept=sbca');
    await capture('v22_3_mobile_390_hod_restricted_sbca_dark');

    console.log('\n--- 5. STAGE 2: OFFICER CENTERED SIGN-IN ACROSS DEPARTMENTS ---');
    for (const dept of departments) {
      await navigate(`http://localhost:5173/department/officer/login?dept=${dept}`);
      await setViewport(1920, 1080);
      await capture(`v22_3_desktop_1920_officer_login_${dept}_dark`);

      // Mobile 390
      await setViewport(390, 844, true);
      await capture(`v22_3_mobile_390_officer_login_${dept}_dark`);

      if (dept === 'kmc' || dept === 'sswmb') {
        await evaluate(`document.querySelector('[data-testid="officer-login-theme-toggle"]')?.click()`);
        await sleep(400);
        await capture(`v22_3_mobile_390_officer_login_${dept}_light`);
        // Reset
        await evaluate(`document.querySelector('[data-testid="officer-login-theme-toggle"]')?.click()`);
        await sleep(300);
      }
    }

    // Mobile 320 for Officer
    await setViewport(320, 568, true);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_3_mobile_320_officer_login_kmc_dark');

    console.log('\n--- 6. ROLE SEPARATION & MISMATCH VERIFICATION ---');
    // Attempt HOD login with officer account
    await setViewport(1920, 1080);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await evaluate(`
      const u = document.querySelector('[data-testid="hod-login-username-input"]');
      const p = document.querySelector('[data-testid="hod-login-password-input"]');
      if (u) { u.value = 'roads-02'; u.dispatchEvent(new Event('input', { bubbles: true })); }
      if (p) { p.value = 'LocalStaff2026!'; p.dispatchEvent(new Event('input', { bubbles: true })); }
      document.querySelector('[data-testid="hod-login-submit-button"]')?.click();
    `);
    await sleep(1200);
    await capture('v22_3_desktop_1920_hod_login_role_mismatch_alert');

    // Attempt Officer login with HOD account
    await setViewport(390, 844, true);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await evaluate(`
      const u = document.querySelector('[data-testid="officer-login-username-input"]');
      const p = document.querySelector('[data-testid="officer-login-password-input"]');
      if (u) { u.value = 'roads-01'; u.dispatchEvent(new Event('input', { bubbles: true })); }
      if (p) { p.value = 'LocalStaff2026!'; p.dispatchEvent(new Event('input', { bubbles: true })); }
      document.querySelector('[data-testid="officer-login-submit-button"]')?.click();
    `);
    await sleep(1200);
    await capture('v22_3_mobile_390_officer_login_role_mismatch_alert');

    console.log('\n--- 7. INPUT FOCUS AND AUTOFILL PROOF ---');
    await setViewport(1920, 1080);
    await navigate('http://localhost:5173/department/head/login?dept=kelectric');
    await evaluate(`
      const u = document.querySelector('[data-testid="hod-login-username-input"]');
      if (u) {
        u.focus();
        u.value = 'electricity-01';
        u.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(500);
    await capture('v22_3_desktop_1920_hod_input_focus_styling');

    console.log('\nAll V22.3 QA screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    ws.close();
    chromeProc.kill();
    if (viteProc) viteProc.kill();
  }
}

run();
