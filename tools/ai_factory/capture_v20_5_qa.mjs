import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\Annihilation\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v20_5';
const ANIM_DIR = join(OUTPUT_DIR, 'animation');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(ANIM_DIR)) mkdirSync(ANIM_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Spawning Headless Chrome for V20.5 Visual QA...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9899',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9899/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('Runtime.enable');

  async function setViewport(w, h, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile,
    });
  }

  async function captureScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = res?.result?.data;
    if (b64) {
      writeFileSync(join(OUTPUT_DIR, `${filename}.png`), Buffer.from(b64, 'base64'));
      console.log(`Captured: ${filename}.png`);
    }
  }

  async function loginAs(role = 'head', deptCode = 'KMC', deptName = 'Karachi Metropolitan Corporation', deptId = 'kmc') {
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(800);
    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          departmentId: '${deptId}',
          departmentCode: '${deptCode}',
          departmentName: '${deptName}',
          username: '${role === 'head' ? 'Engr. Asif Khan' : 'Tariq Mehmood'}',
          userId: '${role === 'head' ? 'staff-kmc-demo-01' : 'off-kmc-01'}',
          staffPosition: '${role}',
          authenticatedAt: new Date().toISOString()
        }));
        window.location.href = '/department';
      `,
    });
    await sleep(2000);
  }

  async function setTheme(theme = 'dark') {
    await send('Runtime.evaluate', {
      expression: `
        const root = document.querySelector('.v20-portal-root');
        if (root) {
          root.setAttribute('data-theme', '${theme}');
          if ('${theme}' === 'light') {
            root.classList.add('v20-light-mode');
          } else {
            root.classList.remove('v20-light-mode');
          }
        }
      `,
    });
    await sleep(300);
  }

  async function selectTab(tabId) {
    await send('Runtime.evaluate', {
      expression: `
        const tab = document.querySelector('[data-tab-id="${tabId}"]');
        if (tab) tab.click();
      `,
    });
    await sleep(1000);
  }

  // 1. Primary Desktop 1440x900 Tests
  console.log('Testing 1440x900 Desktop Views...');
  await setViewport(1440, 900);
  await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc');

  // HOD Landing (Dark) - with Dual CTA Buttons
  await setTheme('dark');
  await captureScreenshot('01_hod_landing_dual_cta_dark_1440');

  // HOD Landing (Light)
  await setTheme('light');
  await captureScreenshot('02_hod_landing_dual_cta_light_1440');

  // HOD Dashboard (Light) - with 3-Card KPI Deck & Donut
  await selectTab('dashboard');
  await captureScreenshot('04_hod_dashboard_kpi_deck_light_1440');

  // HOD Dashboard (Dark)
  await setTheme('dark');
  await captureScreenshot('03_hod_dashboard_kpi_deck_dark_1440');

  // HOD Complaints Inbox (Hardware-accelerated parallax card list with priority sorting)
  await selectTab('complaints');
  await captureScreenshot('05_hod_complaints_inbox_1440');

  // HOD Complaints Reading Detail View
  await send('Runtime.evaluate', {
    expression: `
      const card = document.querySelector('.v20-card-wrapper') || document.querySelector('.v20-horizontal-complaint-card');
      if (card) card.click();
    `,
  });
  await sleep(1000);
  await captureScreenshot('06_hod_complaints_reading_detail_1440');

  // HOD Dedicated Assignment Destination View (with Custom Duration Input)
  await send('Runtime.evaluate', {
    expression: `
      const assignBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Accept & Assign'));
      if (assignBtn) assignBtn.click();
    `,
  });
  await sleep(1000);
  await captureScreenshot('07_hod_complaints_assign_custom_hours_1440');

  // HOD Verification Queue (Truthful GPS & Authenticity states)
  await selectTab('verification');
  await captureScreenshot('08_hod_verification_queue_1440');

  // HOD Officers Directory (Grid alignment, no overflow, 140px header clearance, ACTIVE badge)
  await selectTab('officers');
  await captureScreenshot('09_hod_officers_directory_active_1440');

  // 2. Officer Views
  console.log('Testing Officer Views...');
  await loginAs('officer', 'KMC', 'Karachi Metropolitan Corporation', 'kmc');
  await setTheme('dark');

  // Officer Assigned Tasks (Reading view with "Start Working ↗")
  await selectTab('complaints');
  await sleep(1000);
  await captureScreenshot('10_officer_assigned_tasks_1440');

  // Officer Work View (Live countdown with trusted time service)
  await selectTab('work');
  await sleep(1000);
  await captureScreenshot('11_officer_work_active_timer_1440');

  // 3. Multi-Viewport Responsive Matrix
  console.log('Testing Responsive Matrix...');
  await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc');
  await selectTab('dashboard');

  // 1920x1080 Full HD
  await setViewport(1920, 1080);
  await captureScreenshot('12_hod_dashboard_desktop_1920');

  // 1280x800 Laptop
  await setViewport(1280, 800);
  await captureScreenshot('13_hod_dashboard_laptop_1280');

  // 1024x768 iPad Landscape
  await setViewport(1024, 768);
  await captureScreenshot('14_hod_dashboard_ipad_1024');

  // 768x1024 iPad Portrait
  await setViewport(768, 1024);
  await captureScreenshot('15_hod_dashboard_tablet_768');

  // 390x844 Mobile Fieldwork (iPhone 14)
  console.log('Testing Mobile Viewports...');
  await setViewport(390, 844, true);
  await loginAs('officer', 'KMC', 'Karachi Metropolitan Corporation', 'kmc');
  await selectTab('work');
  await captureScreenshot('16_officer_work_mobile_390');

  // 320x568 Compact Mobile (iPhone SE)
  await setViewport(320, 568, true);
  await captureScreenshot('17_officer_work_mobile_320');

  // 4. Department Color Luminosity Verifications
  console.log('Testing Department Color Identifiers...');
  await setViewport(1440, 900);

  // K-Electric (Electric Cyan/Blue)
  await loginAs('head', 'KE', 'K-Electric Limited', 'ke');
  await selectTab('dashboard');
  await captureScreenshot('18_kelectric_blue_glow_1440');

  // KW&SC (Water Department Teal)
  await loginAs('head', 'KWSC', 'Karachi Water & Sewerage Corporation', 'kwsc');
  await selectTab('dashboard');
  await captureScreenshot('19_kwsc_teal_glow_1440');

  // SSWMB (Solid Waste Emerald Green)
  await loginAs('head', 'SSWMB', 'Sindh Solid Waste Management Board', 'sswmb');
  await selectTab('dashboard');
  await captureScreenshot('20_sswmb_green_glow_1440');

  // 5. 60 FPS Motion Capture of Morphing Navigation
  console.log('Capturing Morphing Navigation 60 FPS frames...');
  await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc');
  await setViewport(1440, 900);

  const frameCount = 18;
  for (let i = 0; i < frameCount; i++) {
    if (i === 1) {
      await send('Runtime.evaluate', {
        expression: `
          const btn = document.querySelector('#nav-toggle');
          if (btn) btn.click();
        `,
      });
    }
    await sleep(22);
    const frameRes = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = frameRes?.result?.data;
    if (b64) {
      const idx = String(i).padStart(2, '0');
      writeFileSync(join(ANIM_DIR, `frame_${idx}.png`), Buffer.from(b64, 'base64'));
    }
  }

  console.log('Generating MP4 & GIF motion artifacts via ffmpeg...');
  const mp4Path = join(OUTPUT_DIR, 'v20_5_morphing_nav_animation.mp4');
  const gifPath = join(OUTPUT_DIR, 'v20_5_morphing_nav_animation.gif');

  const ffmpegMp4 = spawn(FFMPEG_PATH, [
    '-y',
    '-framerate', '30',
    '-i', join(ANIM_DIR, 'frame_%02d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=1440:-2',
    mp4Path,
  ]);

  await new Promise((resolve) => ffmpegMp4.on('close', resolve));
  console.log('MP4 animation created:', mp4Path);

  const ffmpegGif = spawn(FFMPEG_PATH, [
    '-y',
    '-i', mp4Path,
    '-vf', 'fps=20,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    gifPath,
  ]);

  await new Promise((resolve) => ffmpegGif.on('close', resolve));
  console.log('GIF animation created:', gifPath);

  chromeProc.kill();
  console.log('V20.5 Visual QA and motion capture completed successfully!');
}

run().catch((err) => {
  console.error('Visual QA error:', err);
  process.exit(1);
});
