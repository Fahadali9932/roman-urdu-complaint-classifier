import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

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
  console.log('=== PHASE V13.8: KINETIC CIVIC DESIGN BROWSER VERIFICATION ===\n');

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v13_8_' + Date.now());
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

  // ==========================================
  // 1. FAQ PAGE CHECKS & SCREENSHOTS
  // ==========================================
  console.log(`\n--- 1. Testing FAQ Page at http://localhost:${PORT}/faq ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/faq` });
  await sleep(2500);

  // Measure FAQ typography, header contrast, and footer gap
  const faqMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const h1 = document.querySelector('h1');
        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const searchInput = document.querySelector('input[type="text"]');
        const searchStyle = searchInput ? window.getComputedStyle(searchInput) : null;
        const firstCard = document.querySelector('.civic-depth-card button, [data-scroll-depth] button');
        const cardStyle = firstCard ? window.getComputedStyle(firstCard) : null;
        const brand = document.querySelector('header a, header span');
        const brandColor = brand ? window.getComputedStyle(brand).color : 'unknown';
        const navLink = document.querySelector('header nav a, header button');
        const navColor = navLink ? window.getComputedStyle(navLink).color : 'unknown';

        // Check for 40vh-50vh footer spacer
        const allSpacers = Array.from(document.querySelectorAll('div')).filter(el => {
          const cls = el.className || '';
          return typeof cls === 'string' && (cls.includes('40vh') || cls.includes('50vh'));
        });

        return {
          h1FontSize: h1Style ? h1Style.fontSize : null,
          h1LineHeight: h1Style ? h1Style.lineHeight : null,
          searchMinHeight: searchStyle ? searchStyle.minHeight : null,
          cardButtonMinHeight: cardStyle ? cardStyle.minHeight : null,
          cardButtonPadding: cardStyle ? cardStyle.padding : null,
          brandColor,
          navColor,
          spacerCount: allSpacers.length,
          has40vhSpacer: allSpacers.length > 0
        };
      })()
    `,
    returnByValue: true,
  });

  console.log('FAQ Visual Metrics:', JSON.stringify(faqMetrics.result.value, null, 2));

  // Desktop 1280px FAQ screenshot
  console.log('Capturing v13_8_01_faq_desktop_1280.png...');
  await capture('v13_8_01_faq_desktop_1280.png', 1280, 950);
  await checkOverflow('FAQ Desktop', 1280);

  // Tablet 768px FAQ screenshot
  console.log('Capturing v13_8_02_faq_tablet_768.png...');
  await capture('v13_8_02_faq_tablet_768.png', 768, 1024);
  await checkOverflow('FAQ Tablet', 768);

  // Mobile 390px FAQ screenshot
  console.log('Capturing v13_8_03_faq_mobile_390.png...');
  await capture('v13_8_03_faq_mobile_390.png', 390, 844);
  await checkOverflow('FAQ Mobile', 390);

  // Small Mobile 320px FAQ screenshot
  console.log('Capturing v13_8_04_faq_small_320.png...');
  await capture('v13_8_04_faq_small_320.png', 320, 640);
  await checkOverflow('FAQ Small Mobile', 320);

  // ==========================================
  // 2. SEED CITIZEN COMPLAINTS & TEST DASHBOARD
  // ==========================================
  console.log(`\n--- 2. Testing My Complaints Dashboard at http://localhost:${PORT}/dashboard?demo=true ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard?demo=true` });
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
                title: 'Dual Issue Registered',
                titleUrdu: 'شکایت موصول ہو گئی',
                description: 'Independent issues mapped to K-Electric and KMC.',
                descriptionUrdu: 'کے الیکٹرک اور کے ایم سی دونوں کو تفویض۔',
                timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
                actorRole: 'citizen'
              },
              {
                id: 't-4',
                status: 'in_progress',
                title: 'Emergency Crew On Site',
                titleUrdu: 'ہنگامی ٹیم روانہ',
                description: 'K-Electric emergency crew dispatched to isolate cable.',
                descriptionUrdu: 'کے الیکٹرک کی ٹیم موقع پر موجود ہے۔',
                timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
                actorRole: 'department_officer'
              }
            ],
            isDemonstration: false
          }
        ];
        localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify(mockComplaints));
        localStorage.setItem('awaaz_mock_citizen_complaints', JSON.stringify(mockComplaints));
        localStorage.setItem('awaaz_mock_citizen_auth', 'true');
      })()
    `,
  });

  // Reload dashboard so MockComplaintService reads seeded complaints
  await send('Page.navigate', { url: `http://localhost:${PORT}/dashboard?demo=true` });
  await sleep(2500);

  const dashMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const h1 = document.querySelector('h1');
        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const folders = Array.from(document.querySelectorAll('.civic-depth-card, [role="button"]'))
          .filter(el => el.getAttribute('aria-label')?.includes('Complaint'));
        const firstFolder = folders[0];
        const folderStyle = firstFolder ? window.getComputedStyle(firstFolder) : null;
        const folderTitle = firstFolder ? firstFolder.querySelector('h3') : null;
        const folderTitleStyle = folderTitle ? window.getComputedStyle(folderTitle) : null;
        const allSpacers = Array.from(document.querySelectorAll('div')).filter(el => {
          const cls = el.className || '';
          return typeof cls === 'string' && (cls.includes('40vh') || cls.includes('50vh'));
        });
        const metricNumbers = Array.from(document.querySelectorAll('.text-3xl, .sm\\:text-5xl, .text-5xl')).map(el => el.textContent.trim());

        return {
          h1FontSize: h1Style ? h1Style.fontSize : null,
          folderCount: folders.length,
          folderPadding: folderStyle ? folderStyle.padding : null,
          folderTitleFontSize: folderTitleStyle ? folderTitleStyle.fontSize : null,
          has40vhSpacer: allSpacers.length > 0,
          metricNumbers
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Dashboard Rendered Metrics:', JSON.stringify(dashMetrics.result.value, null, 2));

  // Capture Dashboard Across All 4 Viewports
  console.log('Capturing v13_8_05_dashboard_desktop_1280.png...');
  await capture('v13_8_05_dashboard_desktop_1280.png', 1280, 850);
  await checkOverflow('Dashboard Desktop', 1280);

  console.log('Capturing v13_8_06_dashboard_tablet_768.png...');
  await capture('v13_8_06_dashboard_tablet_768.png', 768, 1024);
  await checkOverflow('Dashboard Tablet', 768);

  console.log('Capturing v13_8_07_dashboard_mobile_390.png...');
  await capture('v13_8_07_dashboard_mobile_390.png', 390, 844);
  await checkOverflow('Dashboard Mobile', 390);

  console.log('Capturing v13_8_08_dashboard_small_320.png...');
  await capture('v13_8_08_dashboard_small_320.png', 320, 640);
  await checkOverflow('Dashboard Small Mobile', 320);

  // ==========================================
  // 3. COMPLAINT DETAILS MODAL
  // ==========================================
  console.log('\n--- 3. Testing Complaint Details Modal ---');
  // Reset to 1280px for modal
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 850,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(500);

  // Open modal by clicking first complaint card
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

  // Measure Modal Metrics
  const modalMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const modal = document.querySelector('[role="dialog"]');
        const modalBox = modal ? modal.querySelector('.max-w-4xl, .bg-white') : null;
        const modalStyle = modalBox ? window.getComputedStyle(modalBox) : null;
        const modalTitle = modal ? modal.querySelector('#complaint-details-title') : null;
        const modalTitleStyle = modalTitle ? window.getComputedStyle(modalTitle) : null;
        return {
          modalFound: Boolean(modal),
          modalMaxWidth: modalStyle ? modalStyle.maxWidth : null,
          modalTitleFontSize: modalTitleStyle ? modalTitleStyle.fontSize : null
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Modal Rendered Metrics:', JSON.stringify(modalMetrics.result.value, null, 2));

  console.log('Capturing v13_8_09_complaint_modal_desktop_1280.png...');
  await capture('v13_8_09_complaint_modal_desktop_1280.png', 1280, 850);

  // Modal on 390px mobile
  console.log('Capturing v13_8_10_complaint_modal_mobile_390.png...');
  await capture('v13_8_10_complaint_modal_mobile_390.png', 390, 844);
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

  // ==========================================
  // 4. GUEST COMPLAINT TRACKER
  // ==========================================
  console.log(`\n--- 4. Testing Guest Complaint Tracker at http://localhost:${PORT}/track ---`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/track` });
  await sleep(2000);

  const trackerMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const h1 = document.querySelector('h1');
        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const input = document.querySelector('#tracking-number-input, input[placeholder*="8041"]');
        const inputStyle = input ? window.getComputedStyle(input) : null;
        const submitBtn = document.querySelector('button[type="submit"]');
        const btnStyle = submitBtn ? window.getComputedStyle(submitBtn) : null;
        return {
          h1FontSize: h1Style ? h1Style.fontSize : null,
          inputMinHeight: inputStyle ? inputStyle.minHeight : null,
          btnMinHeight: btnStyle ? btnStyle.minHeight : null
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Tracker Rendered Metrics:', JSON.stringify(trackerMetrics.result.value, null, 2));

  console.log('Capturing v13_8_11_guest_tracker_desktop_1280.png...');
  await capture('v13_8_11_guest_tracker_desktop_1280.png', 1280, 850);
  await checkOverflow('Guest Tracker Desktop', 1280);

  // ==========================================
  // 5. SCROLL-LINKED 3D DEPTH MOTION & REDUCED MOTION
  // ==========================================
  console.log('\n--- 5. Testing 3D Depth Motion & Reduced-Motion Accessibility ---');
  await send('Page.navigate', { url: `http://localhost:${PORT}/faq` });
  await sleep(2000);

  // Scroll down to trigger scroll reveal observer
  await send('Runtime.evaluate', {
    expression: `window.scrollTo({ top: 400, behavior: 'instant' });`,
  });
  await sleep(600);

  const motionMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const depthCards = Array.from(document.querySelectorAll('[data-scroll-depth], .civic-depth-card'));
        const hasTransforms = depthCards.some(card => {
          const style = window.getComputedStyle(card);
          return style.transform && style.transform !== 'none';
        });
        const rootVars = {
          tilt: getComputedStyle(document.documentElement).getPropertyValue('--civic-parallax-tilt'),
          y: getComputedStyle(document.documentElement).getPropertyValue('--civic-parallax-y')
        };
        return {
          totalDepthCards: depthCards.length,
          hasTransforms,
          rootVars
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Scroll Depth Motion Metrics:', JSON.stringify(motionMetrics.result.value, null, 2));

  // Test reduced-motion emulation
  console.log('Emulating prefers-reduced-motion: reduce...');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await sleep(500);

  const reducedMetrics = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const depthCard = document.querySelector('.civic-depth-card, [data-scroll-depth]');
        const style = depthCard ? window.getComputedStyle(depthCard) : null;
        return {
          prefersReducedMotionMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          cardTransform: style ? style.transform : null
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Reduced Motion Metrics:', JSON.stringify(reducedMetrics.result.value, null, 2));

  console.log('Capturing v13_8_12_reduced_motion_faq_1280.png...');
  await capture('v13_8_12_reduced_motion_faq_1280.png', 1280, 850);

  console.log('\n=== ALL 12 V13.8 BROWSER SCREENSHOTS & ACCESSIBILITY CHECKS COMPLETED SUCCESSFULLY ===');

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
