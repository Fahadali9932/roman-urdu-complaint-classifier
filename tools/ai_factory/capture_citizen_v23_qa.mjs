import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v23_citizen';

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

  console.log('Spawning Headless Chrome for V23 Citizen QA Capture...');
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

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let messageId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function setViewport(width, height, isMobile = false) {
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
      fitWindow: false,
    });
  }

  async function captureScreenshot(filename) {
    const { data } = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    const filePath = join(OUTPUT_DIR, filename);
    writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filename}`);
  }

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  try {
    await sendCommand('Page.enable');
    await sendCommand('DOM.enable');

    const viewports = [
      { name: 'desktop_1920', width: 1920, height: 1080, mobile: false },
      { name: 'tablet_768', width: 768, height: 1024, mobile: true },
      { name: 'mobile_390', width: 390, height: 844, mobile: true },
      { name: 'mobile_320', width: 320, height: 568, mobile: true },
    ];

    // 1. Landing Page - English & Urdu across all viewports
    for (const vp of viewports) {
      await setViewport(vp.width, vp.height, vp.mobile);

      // English Landing
      await sendCommand('Page.navigate', { url: 'http://localhost:5173/?lang=en' });
      await sleep(1200);
      await captureScreenshot(`v23_landing_${vp.name}_en.png`);

      // Urdu Landing (Pen alignment check!)
      await sendCommand('Page.navigate', { url: 'http://localhost:5173/?lang=ur' });
      await sleep(1200);
      await captureScreenshot(`v23_landing_${vp.name}_ur.png`);
    }

    // 2. Complaint Form Flow: Steps 1, 2, 3, 4 on Desktop (1920) and Mobile (390)
    for (const vp of [viewports[0], viewports[2]]) {
      await setViewport(vp.width, vp.height, vp.mobile);

      // Navigate to /submit with English
      await sendCommand('Page.navigate', { url: 'http://localhost:5173/submit?lang=en' });
      await sleep(1500);
      await captureScreenshot(`v23_form_step1_${vp.name}_en.png`);

      // Fill Step 1 using React prototype value setters
      await evaluate(`
        const nameInput = document.getElementById('citizenName');
        const phoneInput = document.getElementById('citizenPhone');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (nameInput) {
          setter.call(nameInput, 'Fatima Noor');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (phoneInput) {
          setter.call(phoneInput, '03001234567');
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await sleep(500);

      // Click Continue to advance to Step 2 (Photo Capture)
      await evaluate(`
        const btn = document.querySelector('form button[type="submit"]');
        if (btn) btn.click();
      `);
      await sleep(1000);
      await captureScreenshot(`v23_form_step2_photo_${vp.name}_en.png`);

      // Attach Photo
      await evaluate(`
        const input = document.getElementById('file-photo-input');
        if (input) {
          const file = new File(['test-image-content-bytes'], 'incident_road_damage.jpg', { type: 'image/jpeg' });
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await sleep(1000);
      await captureScreenshot(`v23_form_step2_photo_attached_${vp.name}_en.png`);

      // Click Continue to advance to Step 3 (Location)
      await evaluate(`
        const contBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Continue'));
        const lastBtn = contBtns[contBtns.length - 1];
        if (lastBtn) lastBtn.click();
      `);
      await sleep(1000);
      await captureScreenshot(`v23_form_step3_location_${vp.name}_en.png`);

      // Fill Step 3 location & address
      await evaluate(`
        const locInput = document.getElementById('locality');
        const pubInput = document.getElementById('publicLocation');
        const addrInput = document.getElementById('applicantAddress');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (locInput) {
          setter.call(locInput, 'Clifton');
          locInput.dispatchEvent(new Event('input', { bubbles: true }));
          locInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (pubInput) {
          setter.call(pubInput, 'Near Boat Basin Block 2');
          pubInput.dispatchEvent(new Event('input', { bubbles: true }));
          pubInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (addrInput) {
          setter.call(addrInput, 'House 42, Block 2, Clifton');
          addrInput.dispatchEvent(new Event('input', { bubbles: true }));
          addrInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await sleep(500);

      // Click Continue to advance to Step 4 (Complaint Description)
      await evaluate(`
        const form = document.querySelector('form');
        if (form) {
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.click();
        }
      `);
      await sleep(1000);
      await captureScreenshot(`v23_form_step4_complaint_${vp.name}_en.png`);

      // 3. Urdu Form Check for Mobile (390)
      if (vp.name === 'mobile_390') {
        await sendCommand('Page.navigate', { url: 'http://localhost:5173/submit?lang=ur' });
        await sleep(1500);
        await captureScreenshot(`v23_form_step1_mobile_390_ur.png`);
      }
    }

    console.log('All QA screenshots captured successfully!');
  } catch (err) {
    console.error('Error during QA capture:', err);
  } finally {
    ws.close();
    chromeProc.kill();
    if (viteProc) viteProc.kill();
  }
}

run();
