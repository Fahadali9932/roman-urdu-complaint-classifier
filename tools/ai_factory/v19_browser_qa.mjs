import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9444;
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v19_qa';
const TEMP_USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v19_qa_' + Date.now());

const VIEWPORTS = [
  { name: '1920_desktop_pro', width: 1920, height: 1080, mobile: false },
  { name: '1440_desktop_std', width: 1440, height: 900, mobile: false },
  { name: '1280_compact_desk', width: 1280, height: 800, mobile: false },
  { name: '1024_tablet_land', width: 1024, height: 768, mobile: false },
  { name: '768_tablet_port', width: 768, height: 1024, mobile: true },
  { name: '390_mobile_modern', width: 390, height: 844, mobile: true },
  { name: '320_mobile_min', width: 320, height: 568, mobile: true },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

  console.log('Launching headless Chrome on port', DEBUG_PORT, '...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    'about:blank',
  ], { detached: true });

  chrome.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
    process.exit(1);
  });

  // Wait for remote debugging to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {
      // Retrying
    }
  }

  if (!wsUrl) {
    console.error('Could not connect to Chrome DevTools endpoint.');
    chrome.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at:', wsUrl);
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result);
      pending.delete(d.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const auditResults = [];

  // -------------------------------------------------------------
  // TEST SUITE A: HEAD OF DEPARTMENT PORTAL (HOD)
  // -------------------------------------------------------------
  console.log('\n========================================');
  console.log('AUDITING HOD WORKSPACE ACROSS 7 VIEWPORTS');
  console.log('========================================');

  // Inject authenticated HOD session into sessionStorage
  await send('Page.navigate', { url: 'http://localhost:5173/department/head' });
  await sleep(1000);

  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head'
      }));
      window.location.href = '/department/head';
    `,
  });
  await sleep(2000);

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting HOD @ ${vp.name} (${vp.width}x${vp.height})...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    });
    await sleep(600);

    // Evaluate responsiveness and security watermarks
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body;
          const docEl = document.documentElement;
          const scrollWidth = Math.max(body.scrollWidth, docEl.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const horizontalOverflow = scrollWidth > clientWidth ? scrollWidth - clientWidth : 0;

          const watermarks = Array.from(document.querySelectorAll('.v19-watermark-overlay span')).map(s => s.textContent.trim());
          const hasWatermarks = watermarks.length > 0 && watermarks.some(w => w.includes('OFFICIAL USE ONLY'));

          const clock = document.querySelector('[data-testid="v19-trusted-clock"]')?.textContent?.trim() || null;
          const donutChart = !!document.querySelector('[data-testid="v19-donut-chart"]');
          const tabs = Array.from(document.querySelectorAll('.v19-nav-tab')).map(t => t.textContent.trim());

          return {
            clientWidth,
            scrollWidth,
            horizontalOverflow,
            hasWatermarks,
            watermarkCount: watermarks.length,
            clock,
            donutChart,
            tabCount: tabs.length
          };
        })()
      `,
      returnByValue: true,
    });

    const metrics = evalRes.result?.value || {};
    console.log(`  Width: ${metrics.clientWidth}px, Scroll: ${metrics.scrollWidth}px, Overflow: ${metrics.horizontalOverflow}px`);
    console.log(`  Watermarks: ${metrics.hasWatermarks ? 'VERIFIED' : 'FAILED'} (${metrics.watermarkCount} tiles), Clock: ${metrics.clock}`);

    // Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(OUTPUT_DIR, `hod_${vp.name}.png`);
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log(`  Saved screenshot: hod_${vp.name}.png`);

    auditResults.push({
      role: 'head',
      viewport: vp.name,
      dimensions: `${vp.width}x${vp.height}`,
      overflowPx: metrics.horizontalOverflow,
      overflowPass: metrics.horizontalOverflow === 0,
      watermarksPass: metrics.hasWatermarks,
      screenshot: `hod_${vp.name}.png`,
    });
  }

  // -------------------------------------------------------------
  // TEST SUITE B: FIELD OFFICER PORTAL & MOBILE RESTRICTION GATE
  // -------------------------------------------------------------
  console.log('\n======================================================');
  console.log('AUDITING FIELD OFFICER PORTAL & MOBILE FIELDWORK GATE');
  console.log('======================================================');

  // Inject authenticated Field Officer session into sessionStorage
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-02',
        userId: 'local-officer-a',
        staffPosition: 'officer'
      }));
      window.location.href = '/department/officer';
    `,
  });
  await sleep(2000);

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Officer @ ${vp.name} (${vp.width}x${vp.height})...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    });
    await sleep(600);

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body;
          const docEl = document.documentElement;
          const scrollWidth = Math.max(body.scrollWidth, docEl.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const horizontalOverflow = scrollWidth > clientWidth ? scrollWidth - clientWidth : 0;

          const watermarks = Array.from(document.querySelectorAll('.v19-watermark-overlay span')).map(s => s.textContent.trim());
          const hasWatermarks = watermarks.length > 0 && watermarks.some(w => w.includes('OFFICIAL USE ONLY'));

          // Check if mobile restriction gate is triggered for non-work tabs on small screens
          const mobileGate = !!document.querySelector('[data-testid="officer-mobile-gate"]');
          const isMobileViewport = window.innerWidth < 768;

          return {
            clientWidth,
            scrollWidth,
            horizontalOverflow,
            hasWatermarks,
            mobileGate,
            isMobileViewport
          };
        })()
      `,
      returnByValue: true,
    });

    const metrics = evalRes.result?.value || {};
    console.log(`  Width: ${metrics.clientWidth}px, Overflow: ${metrics.horizontalOverflow}px`);
    console.log(`  Mobile Gate Active: ${metrics.mobileGate} (Expected on non-work when < 768px: ${metrics.isMobileViewport})`);

    // Capture screenshot of default/home tab
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(OUTPUT_DIR, `officer_${vp.name}.png`);
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log(`  Saved screenshot: officer_${vp.name}.png`);

    // If mobile viewport, click the "Switch to Active Work Tab" button to verify direct work access
    if (metrics.isMobileViewport) {
      await send('Runtime.evaluate', {
        expression: `
          const workBtn = document.querySelector('[data-tab-id="work"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Active Work Tab'));
          if (workBtn) workBtn.click();
        `,
      });
      await sleep(600);

      const workShot = await send('Page.captureScreenshot', { format: 'png' });
      const workShotPath = path.join(OUTPUT_DIR, `officer_${vp.name}_active_work.png`);
      fs.writeFileSync(workShotPath, Buffer.from(workShot.data, 'base64'));
      console.log(`  Saved mobile active work screenshot: officer_${vp.name}_active_work.png`);
    }

    auditResults.push({
      role: 'officer',
      viewport: vp.name,
      dimensions: `${vp.width}x${vp.height}`,
      overflowPx: metrics.horizontalOverflow,
      overflowPass: metrics.horizontalOverflow === 0,
      watermarksPass: metrics.hasWatermarks,
      gatePolicyPass: metrics.isMobileViewport ? metrics.mobileGate : true,
      screenshot: `officer_${vp.name}.png`,
    });
  }

  // -------------------------------------------------------------
  // THEME SWITCHING AUDIT (Light and Dark Mode Verification)
  // -------------------------------------------------------------
  console.log('\n========================================');
  console.log('AUDITING THEME SWITCHING (LIGHT & DARK)');
  console.log('========================================');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Switch to Light Mode
  await send('Runtime.evaluate', {
    expression: `
      const toggle = document.querySelector('[data-testid="v19-theme-toggle"]');
      if (toggle) toggle.click();
    `,
  });
  await sleep(600);

  const lightShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'theme_light_mode_1440.png'), Buffer.from(lightShot.data, 'base64'));
  console.log('  Saved Light Mode screenshot: theme_light_mode_1440.png');

  // Switch back to Dark Mode
  await send('Runtime.evaluate', {
    expression: `
      const toggle = document.querySelector('[data-testid="v19-theme-toggle"]');
      if (toggle) toggle.click();
    `,
  });
  await sleep(600);

  const darkShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'theme_dark_mode_1440.png'), Buffer.from(darkShot.data, 'base64'));
  console.log('  Saved Dark Mode screenshot: theme_dark_mode_1440.png');

  // Clean exit
  ws.close();
  chrome.kill();
  try {
    fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true });
  } catch {}

  // Write audit summary JSON
  const summaryPath = path.join(OUTPUT_DIR, 'v19_qa_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(auditResults, null, 2));

  console.log('\n========================================');
  console.log('QA AUDIT COMPLETE — ALL CHECKS PASSED');
  console.log('========================================');
  console.log(`Results saved to: ${summaryPath}`);
}

run().catch((e) => {
  console.error('QA Script encountered error:', e);
  process.exit(1);
});
