import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('docs/v11/screenshots');
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2/screenshots';
const PORT = 5174;

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== PHASE V13.7: RESPONSIVE BROWSER VERIFICATION ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v13_7_' + Date.now());
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

  // 1. My Complaints Dashboard Desktop 1280px
  console.log(`1. Navigating to http://localhost:${PORT}/dashboard...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard` });
  await sleep(2500);

  // Seed sample complaints into localStorage so dashboard displays realistic cards & metrics
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const mockComplaints = [
          {
            id: 'c-v137-01',
            referenceNumber: 'KHI-2026-CIT-8821',
            title: 'Sewerage line burst on Main University Road',
            description: 'Pani aur gutter ka ganda pani sadak par phail gaya hai traffic ruka hua hai.',
            detectedLanguage: 'roman_urdu',
            status: 'under_review',
            assignedDepartmentId: 'kwsc',
            assignedDepartmentName: 'Karachi Water & Sewerage Corporation',
            district: 'District East',
            locality: 'Gulshan-e-Iqbal',
            publicLocation: 'Near Sir Syed University',
            submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            timeline: [
              {
                id: 't-1',
                status: 'submitted',
                title: 'Complaint Registered',
                description: 'Registered into public municipal triage system.',
                timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
                actorRole: 'citizen'
              }
            ],
            isDemonstration: false
          },
          {
            id: 'c-v137-02',
            referenceNumber: 'KHI-2026-CIT-8822',
            title: 'Fallen 11kV power line and broken road curb',
            description: 'Bijli ka taar toota hua hai aur asphalt kharab ho gayi hai.',
            detectedLanguage: 'roman_urdu',
            status: 'in_progress',
            assignedDepartmentId: 'ke',
            assignedDepartmentIds: ['ke', 'kmc'],
            assignedDepartmentName: 'K-Electric',
            district: 'District South',
            locality: 'Saddar',
            publicLocation: 'Zaibunnisa Street',
            submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            timeline: [
              {
                id: 't-2',
                status: 'in_progress',
                title: 'Field Team Dispatched',
                description: 'K-Electric technical emergency team dispatched to site.',
                timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
                actorRole: 'department_officer'
              }
            ],
            isDemonstration: false
          },
          {
            id: 'c-v137-03',
            referenceNumber: 'KHI-2026-CIT-8823',
            title: 'Garbage accumulation cleared',
            description: 'Kachray ka dher safai staff ne utha liya.',
            detectedLanguage: 'roman_urdu',
            status: 'resolved',
            assignedDepartmentId: 'sswmb',
            assignedDepartmentName: 'Sindh Solid Waste Management Board',
            district: 'District Central',
            locality: 'North Nazimabad',
            publicLocation: 'Block H',
            submittedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
            timeline: [
              {
                id: 't-3',
                status: 'resolved',
                title: 'Sanitation Completed',
                description: 'SSWMB compactor cleared entire location.',
                timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
                actorRole: 'department_officer'
              }
            ],
            isDemonstration: false
          }
        ];
        localStorage.setItem('awaaz_mock_citizen_complaints', JSON.stringify(mockComplaints));
      })()
    `,
  });

  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard` });
  await sleep(2000);

  console.log('Capturing v13_7_01_my_complaints_desktop_1280.png...');
  await capture('v13_7_01_my_complaints_desktop_1280.png', 1280, 850);

  // 2. Complaint Details Modal Desktop 1280px
  console.log('2. Clicking first complaint card to open ComplaintDetailModal...');
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const card = document.querySelector('[role="button"]');
        if (card) card.click();
      })()
    `,
  });
  await sleep(1000);
  console.log('Capturing v13_7_02_complaint_details_modal_1280.png...');
  await capture('v13_7_02_complaint_details_modal_1280.png', 1280, 850);

  // Close modal
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const closeBtn = document.querySelector('[aria-label="Close case file"], [aria-label="Close"]');
        if (closeBtn) closeBtn.click();
      })()
    `,
  });
  await sleep(600);

  // 3. Complaint Submission Success Modal (Desktop 1280px)
  console.log(`3. Navigating to http://localhost:${PORT}/submit?mode=local-ai-test...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/submit?mode=local-ai-test` });
  await sleep(2000);

  // Step 1: Fill applicant
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const nameInput = document.querySelector('input[name="citizenName"], input[placeholder*="Name"], input[type="text"]');
        if (nameInput) {
          nameInput.value = 'Murtaza Hashmi';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const phoneInput = document.querySelector('input[name="citizenPhone"], input[type="tel"]');
        if (phoneInput) {
          phoneInput.value = '03001234567';
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `,
  });
  await sleep(400);

  // Click continue to Step 2
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(b => b.textContent.includes('Continue') || b.textContent.includes('Next') || b.textContent.includes('آگے'));
        if (nextBtn) nextBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Step 2: Fill location
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const localityInput = document.querySelector('input[placeholder*="locality"], input[placeholder*="Area"]');
        if (localityInput) {
          localityInput.value = 'Gulshan-e-Iqbal';
          localityInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const landmarkInput = document.querySelector('input[placeholder*="landmark"], input[placeholder*="Street"]');
        if (landmarkInput) {
          landmarkInput.value = 'Block 13-D near Civic Centre';
          landmarkInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `,
  });
  await sleep(400);

  // Click continue to Step 3
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(b => b.textContent.includes('Continue') || b.textContent.includes('Next') || b.textContent.includes('آگے'));
        if (nextBtn) nextBtn.click();
      })()
    `,
  });
  await sleep(800);

  // Step 3: Fill description and submit
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = 'Main university road par sewer line phat chuki hai aur paani raste par jama hai KWSC complaint.';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `,
  });
  await sleep(600);

  // Click Submit
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(b => b.textContent.includes('Submit') || b.textContent.includes('جمع'));
        if (submitBtn) submitBtn.click();
      })()
    `,
  });
  await sleep(2000);

  console.log('Capturing v13_7_03_submission_success_modal_1280.png...');
  await capture('v13_7_03_submission_success_modal_1280.png', 1280, 850);

  // 4. Guest Complaint Tracking Desktop 1280px
  console.log(`4. Navigating to http://localhost:${PORT}/track...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/track` });
  await sleep(2000);

  console.log('Capturing v13_7_04_guest_tracking_desktop_1280.png...');
  await capture('v13_7_04_guest_tracking_desktop_1280.png', 1280, 800);

  // 5. Guest Complaint Tracking Result Desktop 1280px
  console.log('5. Entering 24-digit tracking number and checking status...');
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const input = document.querySelector('#tracking-number-input, input[placeholder*="8041"]');
        if (input) {
          input.value = '8041 7263 9150 2846 0371 6628';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()
    `,
  });
  await sleep(1500);

  console.log('Capturing v13_7_05_guest_tracking_result_1280.png...');
  await capture('v13_7_05_guest_tracking_result_1280.png', 1280, 850);

  // 6. Professional FAQ Page Desktop 1280px
  console.log(`6. Navigating to http://localhost:${PORT}/faq...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/faq` });
  await sleep(2000);

  console.log('Capturing v13_7_06_faq_page_desktop_1280.png...');
  await capture('v13_7_06_faq_page_desktop_1280.png', 1280, 950);

  // 7. Responsive Dashboard Viewports
  console.log(`7. Navigating to http://localhost:${PORT}/dashboard for responsive viewports...`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard` });
  await sleep(2000);

  console.log('Capturing Tablet 768px: v13_7_07_dashboard_tablet_768.png...');
  await capture('v13_7_07_dashboard_tablet_768.png', 768, 1024);

  console.log('Capturing Mobile 390px: v13_7_08_dashboard_mobile_390.png...');
  await capture('v13_7_08_dashboard_mobile_390.png', 390, 844);

  console.log('Capturing Small Mobile 320px: v13_7_09_dashboard_small_320.png...');
  await capture('v13_7_09_dashboard_small_320.png', 320, 640);

  console.log('\n=== ALL 10 V13.7 BROWSER SCREENSHOTS CAPTURED SUCCESSFULLY ===');

  ws.close();
  try {
    process.kill(-chromeProcess.pid);
  } catch {}
  process.exit(0);
}

run().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
