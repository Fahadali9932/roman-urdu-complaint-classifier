import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('docs/v11/screenshots');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE V13.4: RESPONSIVE BROWSER VERIFICATION & SCREENSHOT SUITE ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v13_4_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9298',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' }
  );

  let connected = false;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9298/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9298');
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error('Failed to connect to Chrome on port 9298');
    process.exit(1);
  }

  const targetsRes = await fetch('http://localhost:9298/json/list');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let reqId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = reqId++;
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const capture = async (filename, width, height) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await sleep(800);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    const localPath = path.join(SCREENSHOT_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artifactPath, buffer);
    console.log(`Saved screenshot: ${filename} (${width}x${height})`);
  };

  // 1. Desktop 1280px Homepage & Submit Page
  console.log('Navigating to http://localhost:5173/submit?mode=local-ai-test');
  await send('Page.navigate', { url: 'http://localhost:5173/submit?mode=local-ai-test' });
  await sleep(2500);

  console.log('Capturing Desktop 1280px...');
  await capture('v13_4_01_desktop_1280.png', 1280, 800);

  // 2. Tablet 768px
  console.log('Capturing Tablet 768px...');
  await capture('v13_4_02_tablet_768.png', 768, 1024);

  // 3. Mobile 390px
  console.log('Capturing Mobile 390px...');
  await capture('v13_4_03_mobile_390.png', 390, 844);

  // 4. Small Mobile 320px
  console.log('Capturing Small Mobile 320px...');
  await capture('v13_4_04_small_mobile_320.png', 320, 640);

  // 5. Select V13.4 Candidate in Model Candidate selector and run Preset 2 (Causal: Power -> Water Motor)
  console.log('Testing V13.4 Candidate Causal Consequence in real UI...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Switch engine selector to v13_4_candidate and click preset 2
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const select = document.querySelector('select');
        if (select) {
          select.value = 'v13_4_candidate';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Click Preset 2: Causal (Power -> Water Motor)
        const buttons = Array.from(document.querySelectorAll('button'));
        const presetBtn = buttons.find(b => b.textContent && b.textContent.includes('2. Causal'));
        if (presetBtn) {
          presetBtn.click();
        }
      })()
    `,
  });
  await sleep(1000);

  // Step through stages 1 -> 2 -> 3 and submit
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const nextBtns = Array.from(document.querySelectorAll('button'));
        const continueBtn = nextBtns.find(b => b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue')));
        if (continueBtn) continueBtn.click();
      })()
    `,
  });
  await sleep(800);

  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const nextBtns = Array.from(document.querySelectorAll('button'));
        const continueBtn = nextBtns.find(b => b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue')));
        if (continueBtn) continueBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Submit Complaint
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Submit Test Complaint') || b.textContent.includes('Submit Complaint')));
        if (submitBtn) submitBtn.click();
      })()
    `,
  });
  await sleep(1800);

  console.log('Capturing Analysis Result Modal with V13.4 Causal Demotion...');
  await capture('v13_4_05_modal_causal_demotion.png', 1280, 900);

  console.log('\nAll 5 browser screenshots captured successfully!');
  ws.close();
  try {
    chromeProcess.kill();
  } catch {}
  process.exit(0);
}

run().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
