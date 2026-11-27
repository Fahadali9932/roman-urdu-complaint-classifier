import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v22_3_1';

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
  } catch (err) {}

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

  console.log('Spawning Headless Chrome for V22.3.1 QA Capture...');
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
    await sleep(1500);
    for (let i = 0; i < 20; i++) {
      const res = await evaluate(`!!document.querySelector('[data-testid="staff-department-selection-page"]') || !!document.querySelector('.v20-glass-card') || !!document.querySelector('main')`);
      if (res.result?.value) break;
      await sleep(250);
    }
  }

  try {
    console.log('\n--- 1. HOD STAGE 1 SELECTION: ASYMMETRIC 2-COLUMN EDITORIAL GRID ---');
    await navigate('http://localhost:5173/department/head/login');
    await setViewport(1920, 1080);
    await capture('v22_3_1_desktop_1920_hod_stage1_selection_dark');

    // Light mode
    await evaluate(`document.querySelector('[data-testid="staff-selection-theme-toggle"]')?.click()`);
    await sleep(400);
    await capture('v22_3_1_desktop_1920_hod_stage1_selection_light');

    // Reset to dark
    await evaluate(`document.querySelector('[data-testid="staff-selection-theme-toggle"]')?.click()`);
    await sleep(300);

    // Other Desktop viewports
    await setViewport(1440, 900);
    await capture('v22_3_1_desktop_1440_hod_stage1_selection_dark');

    await setViewport(1024, 768);
    await capture('v22_3_1_desktop_1024_hod_stage1_selection_dark');

    console.log('\n--- 2. OFFICER STAGE 1 SELECTION: CENTERED COMPOSITION ---');
    await navigate('http://localhost:5173/department/officer/login');
    await setViewport(1920, 1080);
    await capture('v22_3_1_desktop_1920_officer_stage1_selection_dark');

    // Light mode
    await evaluate(`document.querySelector('[data-testid="staff-selection-theme-toggle"]')?.click()`);
    await sleep(400);
    await capture('v22_3_1_desktop_1920_officer_stage1_selection_light');

    // Reset to dark
    await evaluate(`document.querySelector('[data-testid="staff-selection-theme-toggle"]')?.click()`);
    await sleep(300);

    // Tablet 768 (2 cols x 3 rows)
    await setViewport(768, 1024);
    await capture('v22_3_1_tablet_768_officer_stage1_selection_dark');

    // Mobile 390 (1 col x 6 rows)
    await setViewport(390, 844, true);
    await capture('v22_3_1_mobile_390_officer_stage1_selection_dark');

    // Mobile 320 (1 col x 6 rows)
    await setViewport(320, 568, true);
    await capture('v22_3_1_mobile_320_officer_stage1_selection_dark');

    console.log('\n--- 3. HOD STAGE 2 CREDENTIALS: ALL 6 DEPARTMENTS ---');
    await setViewport(1920, 1080);

    const departments = ['kmc', 'kelectric', 'kwsc', 'sswmb', 'gas', 'sbca'];
    for (const dept of departments) {
      await navigate(`http://localhost:5173/department/head/login?dept=${dept}`);
      await capture(`v22_3_1_desktop_1920_hod_login_${dept}_dark`);
      if (dept === 'kmc') {
        // Test light mode
        await evaluate(`document.querySelector('[data-testid="hod-login-theme-toggle"]')?.click()`);
        await sleep(400);
        await capture(`v22_3_1_desktop_1920_hod_login_${dept}_light`);
        await evaluate(`document.querySelector('[data-testid="hod-login-theme-toggle"]')?.click()`);
        await sleep(300);
      }
    }

    // HOD Mobile viewport -> Desktop Required Screen
    await setViewport(390, 844, true);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await capture('v22_3_1_mobile_390_hod_desktop_required_kmc');

    console.log('\n--- 4. OFFICER STAGE 2 CREDENTIALS: DESKTOP & MOBILE ---');
    await setViewport(1920, 1080);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_3_1_desktop_1920_officer_login_kmc_dark');

    // Light mode desktop
    await evaluate(`document.querySelector('[data-testid="officer-login-theme-toggle"]')?.click()`);
    await sleep(400);
    await capture('v22_3_1_desktop_1920_officer_login_kmc_light');
    await evaluate(`document.querySelector('[data-testid="officer-login-theme-toggle"]')?.click()`);
    await sleep(300);

    // Mobile 390 all 6 departments
    await setViewport(390, 844, true);
    for (const dept of departments) {
      await navigate(`http://localhost:5173/department/officer/login?dept=${dept}`);
      await capture(`v22_3_1_mobile_390_officer_login_${dept}_dark`);
      if (dept === 'kmc') {
        await evaluate(`document.querySelector('[data-testid="officer-login-theme-toggle"]')?.click()`);
        await sleep(400);
        await capture(`v22_3_1_mobile_390_officer_login_${dept}_light`);
        await evaluate(`document.querySelector('[data-testid="officer-login-theme-toggle"]')?.click()`);
        await sleep(300);
      }
    }

    // Mobile 320 compact test
    await setViewport(320, 568, true);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_3_1_mobile_320_officer_login_kmc_dark');

    console.log('\n--- 5. STRICT ROLE MISMATCH VERIFICATION (WITHOUT CROSS-ROLE LINKS) ---');
    // HOD portal rejecting officer credentials
    await setViewport(1920, 1080);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await evaluate(`
      const u = document.querySelector('[data-testid="hod-login-username-input"]');
      const p = document.querySelector('[data-testid="hod-login-password-input"]');
      if (u && p) {
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setVal.call(u, 'roads-02');
        u.dispatchEvent(new Event('input', { bubbles: true }));
        setVal.call(p, 'LocalDemo2026!');
        p.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('[data-testid="hod-login-submit-button"]')?.click();
      }
    `);
    await sleep(1800);
    await capture('v22_3_1_desktop_1920_hod_login_role_mismatch_strict');

    // Officer portal rejecting head credentials on mobile 390
    await setViewport(390, 844, true);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await evaluate(`
      const u = document.querySelector('[data-testid="officer-login-username-input"]');
      const p = document.querySelector('[data-testid="officer-login-password-input"]');
      if (u && p) {
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setVal.call(u, 'roads-01');
        u.dispatchEvent(new Event('input', { bubbles: true }));
        setVal.call(p, 'LocalDemo2026!');
        p.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('[data-testid="officer-login-submit-button"]')?.click();
      }
    `);
    await sleep(1800);
    await capture('v22_3_1_mobile_390_officer_login_role_mismatch_strict');

    console.log('\n=== ALL V22.3.1 VISUAL QA SCREENSHOTS CAPTURED SUCCESSFULLY ===\n');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    try {
      ws.close();
      chromeProc.kill();
      if (viteProc) viteProc.kill();
    } catch {}
  }
}

run();
