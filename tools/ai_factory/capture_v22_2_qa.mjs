import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v22_2';

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

  console.log('Spawning Headless Chrome for V22.2 QA Capture...');
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
    console.log(`[CAPTURED] ${name}.png (${buffer.length} bytes)`);
  }

  async function navigate(url) {
    await send('Page.navigate', { url });
    await sleep(1400);
  }

  async function evaluate(expression) {
    return await send('Runtime.evaluate', { expression, returnByValue: true });
  }

  try {
    console.log('--- 1. Separate HOD Sign-In View (Desktop & Theme Variations) ---');
    await setViewport(1920, 1080);

    // KMC Dark & Light
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'dark');`);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await capture('v22_2_desktop_1920_hod_login_kmc_dark');

    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'light');`);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await capture('v22_2_desktop_1920_hod_login_kmc_light');

    // All departments on HOD Login Dark
    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'dark');`);

    const depts = [
      { key: 'kelectric', name: 'kelectric' },
      { key: 'kwsc', name: 'kwsc' },
      { key: 'sswmb', name: 'sswmb' },
      { key: 'gas', name: 'gas' },
      { key: 'sbca', name: 'sbca' },
    ];

    for (const d of depts) {
      await navigate(`http://localhost:5173/department/head/login?dept=${d.key}`);
      await capture(`v22_2_desktop_1920_hod_login_${d.name}_dark`);
    }

    // Laptop 1366x768
    await setViewport(1366, 768);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await capture('v22_2_laptop_1366_hod_login_kmc_dark');

    console.log('--- 2. HOD Mobile & Tablet Device Restriction Boundary ---');
    // Tablet 768x1024
    await setViewport(768, 1024, true);
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await capture('v22_2_tablet_768_hod_login_restricted_dark');

    // Mobile 390x844 across all departments (verifying department color continuity, NOT grey!)
    await setViewport(390, 844, true);

    const mobileDepts = ['kmc', 'kelectric', 'kwsc', 'sswmb', 'gas', 'sbca'];
    for (const mDept of mobileDepts) {
      await navigate(`http://localhost:5173/department/head/login?dept=${mDept}`);
      await capture(`v22_2_mobile_390_hod_restricted_${mDept}_dark`);
    }

    // SSWMB Light Mode Restriction Screen (Emerald Green base, NOT grey)
    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'light');`);
    await navigate('http://localhost:5173/department/head/login?dept=sswmb');
    await capture('v22_2_mobile_390_hod_restricted_sswmb_light');

    console.log('--- 3. Dedicated Officer Sign-In View (Mobile & Desktop) ---');
    // Mobile 390x844 Dark & Light
    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'dark');`);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_2_mobile_390_officer_login_kmc_dark');

    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'light');`);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_2_mobile_390_officer_login_kmc_light');

    // Mobile 390 SSWMB & KE Officer Login
    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'dark');`);
    await navigate('http://localhost:5173/department/officer/login?dept=sswmb');
    await capture('v22_2_mobile_390_officer_login_sswmb_dark');

    await navigate('http://localhost:5173/department/officer/login?dept=kelectric');
    await capture('v22_2_mobile_390_officer_login_kelectric_dark');

    // Compact Mobile 320x568
    await setViewport(320, 568, true);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_2_mobile_320_officer_login_kmc_dark');

    // Desktop Officer Sign In 1920x1080
    await setViewport(1920, 1080);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await capture('v22_2_desktop_1920_officer_login_kmc_dark');

    console.log('--- 4. Role Mismatch Rejection & Redirection ---');
    // Officer credential entered at HOD login
    await navigate('http://localhost:5173/department/head/login?dept=kmc');
    await evaluate(`
      const u = document.querySelector('[data-testid="hod-login-username-input"]');
      const p = document.querySelector('[data-testid="hod-login-password-input"]');
      if (u && p) {
        u.value = 'roads-02';
        u.dispatchEvent(new Event('input', { bubbles: true }));
        p.value = 'RoadsChiefPass123!';
        p.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('[data-testid="hod-login-submit-button"]').click();
      }
    `);
    await sleep(1500);
    await capture('v22_2_desktop_1920_hod_login_role_mismatch');

    // Head credential entered at Officer login
    await setViewport(390, 844, true);
    await navigate('http://localhost:5173/department/officer/login?dept=kmc');
    await evaluate(`
      const u = document.querySelector('[data-testid="officer-login-username-input"]');
      const p = document.querySelector('[data-testid="officer-login-password-input"]');
      if (u && p) {
        u.value = 'roads-01';
        u.dispatchEvent(new Event('input', { bubbles: true }));
        p.value = 'RoadsChiefPass123!';
        p.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('[data-testid="officer-login-submit-button"]').click();
      }
    `);
    await sleep(1500);
    await capture('v22_2_mobile_390_officer_login_role_mismatch');

    console.log('--- 5. Mobile Officer Fieldwork Console (Color Continuity Verification) ---');
    // Authenticate demo officer for SSWMB and inspect mobile fieldwork console
    await evaluate(`
      sessionStorage.setItem('awaaz_department_session', JSON.stringify({
        departmentId: 'sswmb',
        departmentCode: 'SSWMB',
        departmentName: 'Sindh Solid Waste Management Board',
        userId: 'local-officer-sswmb',
        role: 'officer',
        authenticatedAt: new Date().toISOString()
      }));
    `);
    await navigate('http://localhost:5173/department/officer?dept=sswmb&tab=work');
    await capture('v22_2_mobile_390_officer_work_sswmb_dark');

    await evaluate(`localStorage.setItem('awaaz_dept_theme_mode', 'light');`);
    await navigate('http://localhost:5173/department/officer?dept=sswmb&tab=work');
    await capture('v22_2_mobile_390_officer_work_sswmb_light');

    console.log('QA visual capture completed successfully!');
  } catch (err) {
    console.error('Error during QA capture:', err);
  } finally {
    try {
      chromeProc.kill();
    } catch {}
    if (viteProc) {
      try {
        viteProc.kill();
      } catch {}
    }
    process.exit(0);
  }
}

run();
