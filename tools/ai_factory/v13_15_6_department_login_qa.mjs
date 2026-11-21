import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT_DIR = 'D:\\Awaaz_V13_15_6_Review';
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'v11', 'screenshots', 'v13_15_6');
const ARTIFACT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v13_15_6';
const PORT = 5173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BROWSER_PORT = 9398;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let websocket;
let sequence = 0;
const pending = new Map();

const request = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  websocket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const result = await request('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const saveImage = async (name) => {
  const { data } = await request('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(data, 'base64');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, name), buf);
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), buf);
  console.log(`[Screenshot saved] ${name}`);
};

const setViewport = async (width, height) => {
  await request('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
};

async function waitForSelector(selector, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const found = await evaluate(`Boolean(document.querySelector('${selector}'))`);
      if (found) return true;
    } catch {}
    await delay(200);
  }
  throw new Error(`Timeout waiting for selector: ${selector}`);
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return true;
    } catch {}
    await delay(300);
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function startViteServer() {
  console.log('[Vite] Starting server on port', PORT, '...');
  const viteBin = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const viteProc = spawn(process.execPath, [viteBin, '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  await waitForServer(ORIGIN);
  console.log('[Vite] Server is running at', ORIGIN);
  return viteProc;
}

async function killProcessTree(pid) {
  try {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {}
}

async function main() {
  console.log('=== V13.15.6 DEPARTMENT STAFF LOGIN REAL BROWSER QA ===\n');

  // Start Vite in Demo Mode (no .env.local)
  const envLocalPath = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envLocalPath)) fs.unlinkSync(envLocalPath);

  let viteProc = await startViteServer();

  // Start Chrome
  const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13156-qa-'));
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${BROWSER_PORT}`,
    `--user-data-dir=${chromeProfile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  // Connect CDP
  let page;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${BROWSER_PORT}/json/list`);
      if (response.ok) {
        const tabs = await response.json();
        page = tabs.find((t) => t.type === 'page');
        if (page) break;
      }
    } catch {}
    await delay(200);
  }

  if (!page) throw new Error('Could not find Chrome page tab');
  websocket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { websocket.onopen = res; websocket.onerror = rej; });
  websocket.onmessage = (event) => {
    const packet = JSON.parse(event.data);
    const entry = pending.get(packet.id);
    if (!entry) return;
    pending.delete(packet.id);
    packet.error ? entry.reject(new Error(packet.error.message)) : entry.resolve(packet.result);
  };

  await request('Page.enable');
  await request('Runtime.enable');

  console.log('\n--- 1. TESTING OFFLINE DEMO MODE AT 1280px & 390px ---');
  await setViewport(1280, 900);
  await request('Page.navigate', { url: `${ORIGIN}/department/login?dept=kmc` });
  await waitForSelector('form');
  await delay(600);

  // Check demo notice
  const demoNoticeDesktop = await evaluate(`
    document.querySelector('[role="status"]')?.innerText || ''
  `);
  console.log('Desktop Demo Notice:', demoNoticeDesktop);
  if (!demoNoticeDesktop.includes('Local demonstration mode')) {
    throw new Error('Expected Local demonstration mode notice on desktop');
  }
  await saveImage('dept_kmc_demo_notice_1280.png');

  // Check 390px mobile
  await setViewport(390, 844);
  await delay(400);
  await saveImage('dept_kmc_demo_notice_390.png');

  // Back to desktop for interaction tests
  await setViewport(1280, 900);
  await delay(200);

  console.log('\n--- 2. TESTING INVALID ACCESS KEY (ANTI-ENUMERATION) ---');
  await evaluate(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const u = document.querySelector('input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      setVal(u, 'roads-01');
      setVal(p, 'WrongAccessKey123!');
      document.querySelector('form button[type="submit"]').click();
    })()
  `);
  await delay(800);

  const errorAlert = await evaluate(`
    document.querySelector('[role="alert"]')?.innerText || ''
  `);
  console.log('Error Alert on Wrong Key:', errorAlert);
  if (!errorAlert.includes('Invalid username or access key')) {
    throw new Error('Expected generic Invalid username or access key rejection');
  }
  await saveImage('dept_kmc_invalid_credentials.png');

  console.log('\n--- 3. TESTING WRONG DEPARTMENT ENFORCEMENT ---');
  // Attempting to sign in with KE username on KMC login
  await evaluate(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const u = document.querySelector('input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      setVal(u, 'electricity-01');
      setVal(p, 'DemoAccessKey2026!Secure');
      document.querySelector('form button[type="submit"]').click();
    })()
  `);
  await delay(800);

  const wrongDeptAlert = await evaluate(`
    document.querySelector('[role="alert"]')?.innerText || ''
  `);
  console.log('Wrong Department Alert:', wrongDeptAlert);
  if (!wrongDeptAlert.includes('Access Denied:') && !wrongDeptAlert.includes('Roads') && !wrongDeptAlert.includes('not authorized')) {
    throw new Error('Expected Wrong Department rejection alert');
  }
  await saveImage('dept_kmc_wrong_department.png');

  console.log('\n--- 4. TESTING SUCCESSFUL DEMO LOGIN & WORKSPACE ROUTING ---');
  await evaluate(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const u = document.querySelector('input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      setVal(u, 'roads-01');
      setVal(p, 'DemoAccessKey2026!Secure');
      document.querySelector('form button[type="submit"]').click();
    })()
  `);
  await delay(1200);

  const currentPath = await evaluate(`window.location.pathname`);
  console.log('Current Path after demo login:', currentPath);
  if (currentPath !== '/department') {
    throw new Error(`Expected navigation to /department, got ${currentPath}`);
  }
  await saveImage('dept_kmc_workspace_demo_success.png');

  console.log('\n--- 5. TESTING CONNECTED SUPABASE MODE (FROM .env.local) ---');
  // Kill current Vite
  if (viteProc.pid) await killProcessTree(viteProc.pid);
  await delay(1000);

  // Copy .env.local from primary workspace
  const srcEnv = 'D:\\RomanUrdu_ComplaintClassifier_staff_auth\\.env.local';
  if (fs.existsSync(srcEnv)) {
    fs.copyFileSync(srcEnv, envLocalPath);
    console.log('Copied .env.local to review worktree for connected test');
  } else {
    console.log('.env.local not found in primary repo; skipping live env test');
  }

  // Restart Vite with .env.local
  viteProc = await startViteServer();

  // Clear session & navigate
  await request('Page.navigate', { url: `${ORIGIN}/department/login?dept=kmc` });
  await waitForSelector('form');
  await delay(600);

  // In connected mode, demo notice should NOT be present
  const demoNoticeLive = await evaluate(`
    document.querySelector('[role="status"]')?.innerText || ''
  `);
  console.log('Live Connected Demo Notice (should be empty):', demoNoticeLive);
  if (demoNoticeLive.includes('Local demonstration mode')) {
    throw new Error('Expected Local demonstration mode notice to be HIDDEN when Supabase is configured');
  }
  await saveImage('dept_kmc_connected_live_mode.png');

  // Attempt sign in with roads-01 in connected mode
  console.log('\n--- 6. TESTING CONNECTED LOGIN REJECTION (PREVENTS DEMO FALLBACK) ---');
  await evaluate(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const u = document.querySelector('input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      setVal(u, 'roads-01');
      setVal(p, 'AnyUnprovisionedAccessKey2026!');
      document.querySelector('form button[type="submit"]').click();
    })()
  `);
  await delay(1500);

  const liveErrorAlert = await evaluate(`
    document.querySelector('[role="alert"]')?.innerText || ''
  `);
  console.log('Live Mode Rejection Alert:', liveErrorAlert);
  if (!liveErrorAlert.includes('Invalid username or access key')) {
    throw new Error('Expected generic rejection in live connected mode');
  }
  await saveImage('dept_kmc_connected_invalid_key.png');

  // Verify that we did NOT get authenticated into /department
  const livePath = await evaluate(`window.location.pathname`);
  console.log('Path after unprovisioned live login attempt:', livePath);
  if (livePath === '/department') {
    throw new Error('Security failure: Live login permitted unprovisioned access');
  }

  // Cleanup: remove .env.local from review tree to restore clean tree
  if (fs.existsSync(envLocalPath)) {
    fs.unlinkSync(envLocalPath);
    console.log('Removed temporary .env.local from review tree');
  }

  // Clean shutdown
  if (viteProc.pid) await killProcessTree(viteProc.pid);
  if (chromeProc.pid) await killProcessTree(chromeProc.pid);

  console.log('\n=== ALL V13.15.6 REAL BROWSER QA TESTS COMPLETED SUCCESSFULLY ===');
}

main().catch(async (err) => {
  console.error('QA Test Failure:', err);
  process.exit(1);
});
