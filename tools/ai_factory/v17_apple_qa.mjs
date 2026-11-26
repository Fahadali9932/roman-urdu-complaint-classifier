import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const OUT_DIR = path.join(ARTIFACT_DIR, 'screenshots/v17_apple_qa');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9899;
const BASE_URL = 'http://localhost:5176';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const viteProcess = spawn(
  process.platform === 'win32' ? 'cmd.exe' : 'npm',
  process.platform === 'win32' ? ['/c', 'npm run dev -- --port 5176 --strictPort'] : ['run', 'dev', '--', '--port', '5176', '--strictPort'],
  { cwd: 'D:/RomanUrdu_V13_19_Review', stdio: 'ignore' }
);

let chromeProcess = null;
let ws = null;

async function cleanup() {
  try { ws?.close(); } catch {}
  try { chromeProcess?.kill(); } catch {}
  try {
    if (process.platform === 'win32' && viteProcess?.pid) {
      spawn('taskkill', ['/pid', String(viteProcess.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      viteProcess?.kill();
    }
  } catch {}
}

try {
  // Wait for Vite
  let viteReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE_URL);
      if (r.ok) { viteReady = true; break; }
    } catch {}
    await sleep(500);
  }
  if (!viteReady) throw new Error('Vite server on 5175 did not become ready');

  chromeProcess = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${BROWSER_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=C:/temp/chrome-profile-v17-${Date.now()}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  await sleep(1800);

  const list = await (await fetch(`http://127.0.0.1:${BROWSER_PORT}/json/list`)).json();
  ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 1;
  const pending = new Map();
  const pageErrors = [];
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.exceptionThrown') {
      pageErrors.push(data.params?.exceptionDetails?.text || 'Runtime exception');
    } else if (data.method === 'Console.messageAdded' && data.params?.message?.level === 'error') {
      const txt = data.params.message.text || '';
      if (!txt.includes('openstreetmap') && !txt.includes('favicon')) {
        consoleErrors.push(txt);
      }
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');
  await send('DOM.enable');

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return res.result?.value;
  };

  const setViewport = async (width, height) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await sleep(300);
  };

  const navigate = async (urlPath) => {
    await send('Page.navigate', { url: `${BASE_URL}${urlPath}` });
    await sleep(950);
  };

  const shot = async (filename, width, height) => {
    await setViewport(width, height);
    await sleep(350);
    const overflow = await evaluate(`document.documentElement.scrollWidth > window.innerWidth`);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(data, 'base64'));
    console.log(`Captured ${filename} (${width}x${height}) | overflow=${overflow}`);
    return overflow;
  };

  const setTheme = async (mode) => {
    await evaluate(`(() => {
      localStorage.setItem('awaaz_dept_theme_mode', '${mode}');
      localStorage.setItem('aawaaz-demo-theme', '${mode}');
      localStorage.setItem('awaaz_civic_theme', '${mode}');
      document.documentElement.setAttribute('data-theme', '${mode}');
      document.documentElement.classList.toggle('dark', '${mode}' === 'dark');
      document.body.setAttribute('data-theme', '${mode}');
    })()`);
    await sleep(250);
  };

  const overflows = [];

  // 1. Head & Officer Independent Logins (Light & Dark)
  await navigate('/department/head/login?dept=kmc');
  await setTheme('light');
  await navigate('/department/head/login?dept=kmc');
  overflows.push({ file: '01_head_login_light_1440.png', o: await shot('01_head_login_light_1440.png', 1440, 900) });
  await setTheme('dark');
  overflows.push({ file: '02_head_login_dark_1440.png', o: await shot('02_head_login_dark_1440.png', 1440, 900) });

  await setTheme('light');
  await navigate('/department/officer/login?dept=kmc');
  overflows.push({ file: '03_officer_login_light_390.png', o: await shot('03_officer_login_light_390.png', 390, 844) });
  await setTheme('dark');
  overflows.push({ file: '04_officer_login_dark_390.png', o: await shot('04_officer_login_dark_390.png', 390, 844) });

  // 2. Sign in as Head (roads-01)
  await setTheme('light');
  await navigate('/department/head/login?dept=kmc');
  await setViewport(1440, 900);
  const headSignedIn = await evaluate(`(async () => {
    const code = document.querySelector('details code')?.textContent?.trim() || '';
    const userInput = document.querySelector('input[type="text"]');
    const passInput = document.querySelector('input[type="password"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(userInput, 'roads-01');
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(passInput, code);
    passInput.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => /Sign In/i.test(b.textContent || ''));
    btn?.click();
    return Boolean(btn && code);
  })()`);
  console.log('Head login submitted:', headSignedIn);
  await sleep(1400);

  // 3. Head Home across all required viewports + Dark mode
  overflows.push({ file: '05_head_home_light_1440.png', o: await shot('05_head_home_light_1440.png', 1440, 900) });
  await setTheme('dark');
  overflows.push({ file: '06_head_home_dark_1440.png', o: await shot('06_head_home_dark_1440.png', 1440, 900) });
  await setTheme('light');
  overflows.push({ file: '07_head_home_light_1920.png', o: await shot('07_head_home_light_1920.png', 1920, 1080) });
  overflows.push({ file: '08_head_home_light_1366.png', o: await shot('08_head_home_light_1366.png', 1366, 768) });
  overflows.push({ file: '09_head_home_light_1024.png', o: await shot('09_head_home_light_1024.png', 1024, 768) });
  overflows.push({ file: '10_head_home_light_768.png', o: await shot('10_head_home_light_768.png', 768, 1024) });
  overflows.push({ file: '11_head_home_light_390.png', o: await shot('11_head_home_light_390.png', 390, 844) });
  overflows.push({ file: '12_head_home_light_320.png', o: await shot('12_head_home_light_320.png', 320, 740) });

  // 4. Interaction: Hover Complaints nav item for contextual Clear Liquid Glass preview
  await setViewport(1440, 900);
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.lg-nav-pill')).find(b => b.textContent?.includes('Complaints'));
    btn?.focus();
    btn?.parentElement?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  })()`);
  await sleep(300);
  overflows.push({ file: '13_nav_preview_hover_1440.png', o: await shot('13_nav_preview_hover_1440.png', 1440, 900) });

  // 5. Complaints List, Detail, Weekly Picker, Officers, Archive
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.lg-nav-pill')).find(b => b.textContent?.includes('Complaints'));
    btn?.click();
  })()`);
  await sleep(900);
  overflows.push({ file: '14_head_complaints_light_1440.png', o: await shot('14_head_complaints_light_1440.png', 1440, 900) });

  await evaluate(`(() => {
    const row = document.querySelector('[data-testid="v16-complaint-row"]');
    row?.click();
  })()`);
  await sleep(900);
  overflows.push({ file: '15_head_complaint_detail_1440.png', o: await shot('15_head_complaint_detail_1440.png', 1440, 900) });

  await evaluate(`(() => {
    const assignBtn = Array.from(document.querySelectorAll('button')).find(b => /Assign/i.test(b.textContent || ''));
    assignBtn?.click();
  })()`);
  await sleep(700);
  await evaluate(`(() => {
    const separateBtn = Array.from(document.querySelectorAll('button')).find(b => /separate work order/i.test(b.textContent || ''));
    separateBtn?.click();
  })()`);
  await sleep(500);
  await evaluate(`(() => {
    const trigger = document.querySelector('.deadline-picker-trigger');
    trigger?.click();
  })()`);
  await sleep(350);
  overflows.push({ file: '16_head_weekly_picker_1440.png', o: await shot('16_head_weekly_picker_1440.png', 1440, 900) });

  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.lg-nav-pill')).find(b => b.textContent?.includes('Officers'));
    btn?.click();
  })()`);
  await sleep(800);
  overflows.push({ file: '17_head_officers_light_1440.png', o: await shot('17_head_officers_light_1440.png', 1440, 900) });

  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.lg-nav-pill')).find(b => b.textContent?.includes('Archive'));
    btn?.click();
  })()`);
  await sleep(800);
  overflows.push({ file: '18_head_archive_light_1440.png', o: await shot('18_head_archive_light_1440.png', 1440, 900) });

  // 6. Field Officer Mobile Portal (390px Light/Dark & 320px Light)
  await evaluate(`sessionStorage.clear();`);
  await setTheme('light');
  await navigate('/department/officer/login?dept=kmc');
  await setViewport(390, 844);
  await evaluate(`(() => {
    const code = document.querySelector('details code')?.textContent?.trim() || '';
    const userInput = document.querySelector('input[type="text"]');
    const passInput = document.querySelector('input[type="password"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(userInput, 'roads-02');
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(passInput, code);
    passInput.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => /Sign In/i.test(b.textContent || ''));
    btn?.click();
  })()`);
  await sleep(1400);
  overflows.push({ file: '19_officer_mobile_light_390.png', o: await shot('19_officer_mobile_light_390.png', 390, 844) });
  await setTheme('dark');
  overflows.push({ file: '20_officer_mobile_dark_390.png', o: await shot('20_officer_mobile_dark_390.png', 390, 844) });
  await setTheme('light');
  overflows.push({ file: '21_officer_mobile_light_320.png', o: await shot('21_officer_mobile_light_320.png', 320, 740) });

  // 7. Citizen Portal Isolation Verification
  await navigate('/');
  overflows.push({ file: '22_citizen_home_light_1440.png', o: await shot('22_citizen_home_light_1440.png', 1440, 900) });

  const badOverflows = overflows.filter((x) => x.o);
  console.log('SUMMARY:', JSON.stringify({
    totalCaptures: overflows.length,
    overflowCount: badOverflows.length,
    badOverflows,
    pageErrors,
    consoleErrorsCount: consoleErrors.length,
  }, null, 2));
} finally {
  await cleanup();
}
