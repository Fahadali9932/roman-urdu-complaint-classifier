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
  console.log('=== PHASE V13.5: RESPONSIVE BROWSER VERIFICATION & TWO-DEPT POLICY SUITE ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v13_5_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9297',
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
      const res = await fetch('http://localhost:9297/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9297');
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error('Failed to connect to Chrome on port 9297');
    process.exit(1);
  }

  const targetsRes = await fetch('http://localhost:9297/json/list');
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

  // 1. Desktop 1280px Homepage & Submit Page in Local AI Test Mode
  console.log('Navigating to http://localhost:5173/submit?mode=local-ai-test');
  await send('Page.navigate', { url: 'http://localhost:5173/submit?mode=local-ai-test' });
  await sleep(2500);

  // Set Model Candidate dropdown to v13_5_candidate
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const select = document.querySelector('select');
        if (select) {
          select.value = 'v13_5_candidate';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `,
  });
  await sleep(600);

  console.log('Capturing Desktop 1280px...');
  await capture('v13_5_01_desktop_1280.png', 1280, 800);

  // 2. Tablet 768px
  console.log('Capturing Tablet 768px...');
  await capture('v13_5_02_tablet_768.png', 768, 1024);

  // 3. Mobile 390px
  console.log('Capturing Mobile 390px...');
  await capture('v13_5_03_mobile_390.png', 390, 844);

  // 4. Small Mobile 320px
  console.log('Capturing Small Mobile 320px...');
  await capture('v13_5_04_small_mobile_320.png', 320, 640);

  // 5. Test Case 1: Angry/Abusive Dual-Issue Complaint (e.g. K-Electric + KMC Road)
  console.log('Testing Angry/Abusive Dual Issue submission in real UI...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Select v13_5_candidate and fill in abusive dual issue
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const select = document.querySelector('select');
        if (select) {
          select.value = 'v13_5_candidate';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Fill citizen details
        const nameInput = document.querySelector('input[placeholder*="Muhammad"]') || document.querySelector('input[type="text"]');
        if (nameInput) {
          nameInput.value = 'Tariq Mehmood';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const phoneInput = document.querySelector('input[placeholder*="03"]') || document.querySelectorAll('input[type="text"]')[1];
        if (phoneInput) {
          phoneInput.value = '03219876543';
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Click Next to Stage 2
        const nextBtns = Array.from(document.querySelectorAll('button'));
        const continueBtn = nextBtns.find(b => b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue')));
        if (continueBtn) continueBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Stage 2: Location
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        if (inputs.length >= 2) {
          inputs[0].value = 'Gulshan-e-Iqbal Block 13D';
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[1].value = 'Main University Road near Civic Center';
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
        const selects = Array.from(document.querySelectorAll('select'));
        const distSelect = selects.find(s => Array.from(s.options).some(o => o.text.includes('East')));
        if (distSelect) {
          distSelect.value = 'District East';
          distSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nextBtns = Array.from(document.querySelectorAll('button'));
        const continueBtn = nextBtns.find(b => b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue')));
        if (continueBtn) continueBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Stage 3: Abusive dual-department text
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          textareas[0].value = 'SHARAM KARO KMC AUR K-ELECTRIC WALO! Transformer blast hone se 24 ghante se bijli ghayab hai aur sath mein road par itnay khaday hain ke rozana hadsat ho rahe hain!';
          textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Submit Test Complaint') || b.textContent.includes('Submit Complaint')));
        if (submitBtn) submitBtn.click();
      })()
    `,
  });
  await sleep(2000);

  console.log('Capturing Modal for Abusive Dual-Issue Complaint...');
  await capture('v13_5_05_modal_abusive_dual_issue.png', 1280, 900);

  // Close modal
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Close') || b.textContent.includes('Back') || b.textContent.includes('Done')));
        if (closeBtn) closeBtn.click();
      })()
    `,
  });
  await sleep(800);

  // 6. Test Case 2: Three-Department Safety Escalation (Water + Electric + Gas)
  console.log('Testing Three-Department Safety Escalation in real UI...');
  // Reload /submit?mode=local-ai-test
  await send('Page.navigate', { url: 'http://localhost:5173/submit?mode=local-ai-test' });
  await sleep(2000);

  // Select v13_5_candidate and fill citizen details
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const select = document.querySelector('select');
        if (select) {
          select.value = 'v13_5_candidate';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nameInput = document.querySelector('input[placeholder*="Muhammad"]') || document.querySelector('input[type="text"]');
        if (nameInput) {
          nameInput.value = 'Zubair Farooqi';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const phoneInput = document.querySelector('input[placeholder*="03"]') || document.querySelectorAll('input[type="text"]')[1];
        if (phoneInput) {
          phoneInput.value = '03337654321';
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const nextBtns = Array.from(document.querySelectorAll('button'));
        const continueBtn = nextBtns.find(b => b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue')));
        if (continueBtn) continueBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Stage 2
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        if (inputs.length >= 2) {
          inputs[0].value = 'Keamari Jackson Bazaar';
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[1].value = 'Near Jackson Market';
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
        const selects = Array.from(document.querySelectorAll('select'));
        const distSelect = selects.find(s => Array.from(s.options).some(o => o.text.includes('Keamari')));
        if (distSelect) {
          distSelect.value = 'District Keamari';
          distSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nextBtns = Array.from(document.querySelectorAll('button'));
        const continueBtn = nextBtns.find(b => b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue')));
        if (continueBtn) continueBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Stage 3: Three-Department text
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          textareas[0].value = 'Mohtaram afsaran, Keamari Jackson Bazaar (District Keamari) mein aik sath teen mukhtalif idaron ke masail hain. Awwal ye ke peenay ke saaf paani ki supply pichle pandrah din se band hai aur tanker mafia se paani lena par raha hai, doyam ye ke bijli ke taar toot kar zameen par gir chuke hain aur live wire se curren lagne ka shadid khatra hai, aur soyam mazeed ye ke gali ke main gas connection mein gas ka low pressure hai jis se geyser aur chulhe thap hain. In teeno alag alag masail ka fori jaeza le kar karrawai farmai jaye.';
          textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Submit Test Complaint') || b.textContent.includes('Submit Complaint')));
        if (submitBtn) submitBtn.click();
      })()
    `,
  });
  await sleep(2200);

  console.log('Capturing Modal for Three-Department Safety Escalation...');
  await capture('v13_5_06_modal_three_dept_safety.png', 1280, 900);

  console.log('\nAll 6 browser screenshots captured successfully!');
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
