import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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
  console.log('=== PHASE V13.8.1: AUTHENTICATION HARDENING & PRODUCTION SAFETY BROWSER VERIFICATION ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v13_8_1_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9299',
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
      const res = await fetch('http://localhost:9299/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9299');
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error('Failed to connect to Chrome on port 9299');
    process.exit(1);
  }

  const targetsRes = await fetch('http://localhost:9299/json/list');
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

  const checkOverflow = async (label, width) => {
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
          bodyScrollWidth: document.body.scrollWidth
        })
      `,
      returnByValue: true,
    });
    const info = evalRes.result.value;
    console.log(`[Overflow Check] ${label} (${width}px): scrollWidth=${info.scrollWidth}, innerWidth=${info.innerWidth}, hasOverflow=${info.hasOverflow}`);
    if (info.hasOverflow) {
      console.warn(`WARNING: Horizontal overflow detected on ${label} at ${width}px!`);
    }
    return info;
  };

  // =========================================================================
  // 1. VERIFY ATTACK BLOCKING: /dashboard?demo=true MUST REDIRECT TO /login
  // =========================================================================
  console.log(`\n--- 1. Testing Attack Parameter Rejection at http://localhost:${PORT}/dashboard?demo=true ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard?demo=true` });
  await sleep(2000);

  const authBlockCheck = await send('Runtime.evaluate', {
    expression: `
      ({
        currentPath: window.location.pathname,
        isLogin: window.location.pathname === '/login',
        hasLoginForm: Boolean(document.querySelector('input[type="email"]') || document.querySelector('button[type="submit"]'))
      })
    `,
    returnByValue: true,
  });
  console.log('Authentication Attack Block Result:', JSON.stringify(authBlockCheck.result.value, null, 2));
  if (!authBlockCheck.result.value.isLogin) {
    throw new Error('SECURITY VIOLATION: /dashboard?demo=true did not redirect to /login!');
  }
  console.log('PASS: /dashboard?demo=true was strictly blocked and redirected to /login.');

  // =========================================================================
  // 2. DEV HARNESS VERIFICATION: /dev/harness/citizen-dashboard
  // =========================================================================
  console.log(`\n--- 2. Testing Isolated Dev Harness at http://localhost:${PORT}/dev/harness/citizen-dashboard ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/dev/harness/citizen-dashboard` });
  await sleep(1500);

  // Seed sample complaints into localStorage
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const mockComplaints = [
          {
            id: 'c-v138-01',
            citizenId: 'cit-demo-bilal-2026',
            referenceNumber: 'KHI-2026-CIT-9901',
            title: 'Sewerage line burst and severe road flooding on Main University Road',
            description: 'Main University Road par sewer line phat chuki hai aur bohot ganda pani sadak par jam gaya hai jiski wajah se traffic jam ho raha hai aur logon ko shaded takleef hai.',
            detectedLanguage: 'roman_urdu',
            status: 'under_review',
            assignedDepartmentId: 'kwsc',
            assignedDepartmentName: 'Karachi Water & Sewerage Corporation',
            assignedDepartmentIds: ['kwsc'],
            district: 'District East',
            locality: 'Gulshan-e-Iqbal',
            publicLocation: 'Near Sir Syed University Block 5',
            submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
            timeline: [
              {
                id: 't-1',
                status: 'submitted',
                title: 'Complaint Registered',
                titleUrdu: 'شکایت موصول ہو گئی',
                description: 'Registered into civic triage system.',
                descriptionUrdu: 'بلدیاتی شکایات کے نظام میں درج ہو گئی۔',
                timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
                actorRole: 'citizen'
              },
              {
                id: 't-2',
                status: 'under_review',
                title: 'Assigned for Technical Inspection',
                titleUrdu: 'تکنیکی معائنے کے لیے تفویض',
                description: 'KW&SC field inspection team assigned to assess pipeline rupture.',
                descriptionUrdu: 'واٹر بورڈ کی ٹیم کو روانہ کر دیا گیا ہے۔',
                timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
                actorRole: 'department_officer'
              }
            ],
            isDemonstration: false
          },
          {
            id: 'c-v138-02',
            citizenId: 'cit-demo-bilal-2026',
            referenceNumber: 'KHI-2026-CIT-9902',
            title: 'Fallen 11kV power line and damaged pedestrian footpath',
            description: 'Bijli ka taar gir gaya hai aur footpath toot gaya hai. Khatra hai koi hadsa na ho jaye.',
            detectedLanguage: 'roman_urdu',
            status: 'in_progress',
            assignedDepartmentId: 'ke',
            assignedDepartmentIds: ['ke', 'kmc'],
            assignedDepartmentName: 'K-Electric',
            district: 'District South',
            locality: 'Saddar',
            publicLocation: 'Zaibunnisa Street near Empress Market',
            submittedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            timeline: [
              {
                id: 't-3',
                status: 'submitted',
                title: 'Hazard Reported',
                titleUrdu: 'خطرہ رپورٹ ہوا',
                description: 'Emergency electrical hazard logged.',
                descriptionUrdu: 'ہنگامی برقی خطرہ درج کیا گیا۔',
                timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
                actorRole: 'citizen'
              },
              {
                id: 't-4',
                status: 'in_progress',
                title: 'Rapid Response Dispatched',
                titleUrdu: 'ریپڈ رسپانس ٹیم روانہ',
                description: 'K-Electric IBC field crew isolating power feed.',
                descriptionUrdu: 'کے الیکٹرک کی ٹیم بجلی منقطع کر رہی ہے۔',
                timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
                actorRole: 'department_officer'
              }
            ],
            isDemonstration: false
          }
        ];
        localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify(mockComplaints));
      })()
    `,
  });

  // Reload dev harness so MockComplaintService reads seeded complaints
  await send('Page.navigate', { url: `http://localhost:${PORT}/dev/harness/citizen-dashboard` });
  await sleep(2500);

  const harnessMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const banner = document.querySelector('[role="status"]');
        const folderCards = document.querySelectorAll('.civic-depth-card, [role="button"]');
        return {
          harnessBannerFound: Boolean(banner && banner.textContent.includes('DEMONSTRATION HARNESS')),
          bannerText: banner ? banner.textContent.trim().substring(0, 100) : null,
          totalCardsRendered: folderCards.length
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Dev Harness Metrics:', JSON.stringify(harnessMetrics.result.value, null, 2));

  // Capture Dashboard Across All 4 Viewports
  console.log('Capturing v13_8_1_05_dashboard_desktop_1280.png...');
  await capture('v13_8_1_05_dashboard_desktop_1280.png', 1280, 850);
  await checkOverflow('Dashboard Desktop', 1280);

  console.log('Capturing v13_8_1_06_dashboard_tablet_768.png...');
  await capture('v13_8_1_06_dashboard_tablet_768.png', 768, 1024);
  await checkOverflow('Dashboard Tablet', 768);

  console.log('Capturing v13_8_1_07_dashboard_mobile_390.png...');
  await capture('v13_8_1_07_dashboard_mobile_390.png', 390, 844);
  await checkOverflow('Dashboard Mobile', 390);

  console.log('Capturing v13_8_1_08_dashboard_small_320.png...');
  await capture('v13_8_1_08_dashboard_small_320.png', 320, 640);
  await checkOverflow('Dashboard Small Mobile', 320);

  // =========================================================================
  // 3. COMPLAINT DETAILS MODAL VIA DEV HARNESS
  // =========================================================================
  console.log('\n--- 3. Testing Complaint Details Modal in Dev Harness ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 850,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(500);

  const modalOpened = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const folder = Array.from(document.querySelectorAll('.civic-depth-card, [role="button"]'))
          .find(el => el.getAttribute('aria-label')?.includes('Complaint'));
        if (folder) {
          folder.click();
          return true;
        }
        return false;
      })()
    `,
    returnByValue: true,
  });
  console.log('Modal trigger click returned:', modalOpened.result.value);
  await sleep(1200);

  console.log('Capturing v13_8_1_09_complaint_modal_desktop_1280.png...');
  await capture('v13_8_1_09_complaint_modal_desktop_1280.png', 1280, 850);

  console.log('Capturing v13_8_1_10_complaint_modal_mobile_390.png...');
  await capture('v13_8_1_10_complaint_modal_mobile_390.png', 390, 844);
  await checkOverflow('Modal Mobile', 390);

  // Close modal
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const closeBtn = document.querySelector('[aria-label="Close case file"], [aria-label="Close"]');
        if (closeBtn) closeBtn.click();
      })()
    `,
  });
  await sleep(500);

  // =========================================================================
  // 4. GUEST COMPLAINT TRACKER: http://localhost:5174/track
  // =========================================================================
  console.log(`\n--- 4. Testing Guest Complaint Tracker at http://localhost:${PORT}/track ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/track` });
  await sleep(2000);

  console.log('Capturing v13_8_1_11_guest_tracker_desktop_1280.png...');
  await capture('v13_8_1_11_guest_tracker_desktop_1280.png', 1280, 850);
  await checkOverflow('Guest Tracker Desktop', 1280);

  // =========================================================================
  // 5. FAQ PAGE & REDUCED MOTION: http://localhost:5174/faq
  // =========================================================================
  console.log(`\n--- 5. Testing FAQ Page at http://localhost:${PORT}/faq ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/faq` });
  await sleep(2000);

  console.log('Capturing v13_8_1_01_faq_desktop_1280.png...');
  await capture('v13_8_1_01_faq_desktop_1280.png', 1280, 950);
  await checkOverflow('FAQ Desktop', 1280);

  console.log('Emulating prefers-reduced-motion: reduce...');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await sleep(500);

  console.log('Capturing v13_8_1_12_reduced_motion_faq_1280.png...');
  await capture('v13_8_1_12_reduced_motion_faq_1280.png', 1280, 850);

  console.log('\n=== ALL V13.8.1 BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY ===');

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
