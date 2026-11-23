import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const HTML_FILE = path.join(ARTIFACT_DIR, 'V13_21_CALM_OPERATIONS_SPEC_AND_VISUAL_PROPOSALS.html');
const OUT_DIR = path.join(ARTIFACT_DIR, 'screenshots/v13_21_proposals');

fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9444;

const chromeProcess = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${BROWSER_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:/temp/chrome-profile-v21-proposals',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

await new Promise((r) => setTimeout(r, 1500));

async function getWSEndpoint() {
  const res = await fetch(`http://127.0.0.1:${BROWSER_PORT}/json/list`);
  const list = await res.json();
  return list[0].webSocketDebuggerUrl;
}

const wsUrl = await getWSEndpoint();
const ws = new WebSocket(wsUrl);

let msgId = 1;
const pending = new Map();

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(data.error);
    else resolve(data.result);
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((r) => (ws.onopen = r));
await send('Page.enable');
await send('DOM.enable');

const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
await send('Page.navigate', { url: fileUrl });
await new Promise((r) => setTimeout(r, 1200));

const views = [
  'head-focus',
  'officer-myday',
  'admin-overview',
  'themed-login',
  'weekly-calendar',
  'context-nav',
];

for (const theme of ['light', 'dark']) {
  // set theme
  await send('Runtime.evaluate', {
    expression: `
      document.documentElement.setAttribute('data-theme', '${theme}');
      document.getElementById('themeBtn').innerHTML = '${theme === 'light' ? '☀️ Light' : '🌙 Dark'}';
    `,
  });

  for (const view of views) {
    await send('Runtime.evaluate', {
      expression: `switchView('${view}');`,
    });
    await new Promise((r) => setTimeout(r, 300));

    // set viewport to 1440x900
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const outFile = path.join(OUT_DIR, `v21_prop_${view}_${theme}_1440.png`);
    fs.writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
    console.log(`Captured: ${outFile}`);
  }
}

ws.close();
chromeProcess.kill('SIGTERM');
console.log('All proposal screenshots generated successfully!');
