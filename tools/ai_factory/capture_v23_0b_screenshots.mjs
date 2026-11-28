import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9223;
const SCREENSHOT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v23_0b';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function launchChrome() {
  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + path.resolve('temp_chrome_profile_v23'),
  ];
  return spawn(CHROME_PATH, args);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function connectWebSocket(wsUrl) {
  const WS = globalThis.WebSocket;
  return new Promise((resolve, reject) => {
    const ws = new WS(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = reject;
  });
}

function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureScreen(ws, url, width, height, filename) {
  console.log(`Capturing ${filename} (${width}x${height}) -> ${url}...`);
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await sendCommand(ws, 'Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 1200));

  const screenshot = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const filePath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved: ${filePath}`);
}

async function run() {
  const chromeProc = launchChrome();
  console.log('Chrome launched, waiting for debugger...');
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = await connectWebSocket(pageTarget.webSocketDebuggerUrl);

    await sendCommand(ws, 'Page.enable');

    // 1. Citizen Home with Maroon Logo
    await captureScreen(ws, 'http://localhost:4173/', 1920, 1080, 'v23_0b_citizen_home_1920.png');
    await captureScreen(ws, 'http://localhost:4173/', 768, 1024, 'v23_0b_citizen_home_768.png');
    await captureScreen(ws, 'http://localhost:4173/', 390, 844, 'v23_0b_citizen_home_390.png');
    await captureScreen(ws, 'http://localhost:4173/', 320, 568, 'v23_0b_citizen_home_320.png');

    // 2. Citizen Login with Maroon Logo
    await captureScreen(ws, 'http://localhost:4173/login', 1920, 1080, 'v23_0b_citizen_login_1920.png');
    await captureScreen(ws, 'http://localhost:4173/login', 390, 844, 'v23_0b_citizen_login_390.png');

    // 3. Department Head Login with Maroon Logo
    await captureScreen(ws, 'http://localhost:4173/department/head/login', 1920, 1080, 'v23_0b_hod_login_1920.png');
    await captureScreen(ws, 'http://localhost:4173/department/head/login', 390, 844, 'v23_0b_hod_login_390.png');

    // 4. Field Officer Login with Maroon Logo
    await captureScreen(ws, 'http://localhost:4173/department/officer/login', 1920, 1080, 'v23_0b_officer_login_1920.png');
    await captureScreen(ws, 'http://localhost:4173/department/officer/login', 390, 844, 'v23_0b_officer_login_390.png');

    ws.close();
    console.log('All screenshots captured successfully.');
  } finally {
    chromeProc.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
