import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\Annihilation\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_1';
const ANIM_DIR = join(OUTPUT_DIR, 'animation');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(ANIM_DIR)) mkdirSync(ANIM_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Spawning Headless Chrome for V21.1 QA Verification...');
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

  async function loginAs(role = 'head', deptCode = 'KMC', deptName = 'Karachi Metropolitan Corporation', deptId = 'kmc', username = 'roads-01') {
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(800);
    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          departmentId: '${deptId}',
          departmentCode: '${deptCode}',
          departmentName: '${deptName}',
          username: '${username}',
          userId: '${role === 'head' ? 'staff-kmc-demo-01' : 'off-kmc-01'}',
          staffPosition: '${role}',
          authenticatedAt: new Date().toISOString()
        }));
        window.location.href = '/department';
      `,
    });
    await sleep(1500);
  }

  async function clickElement(selector) {
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('${selector}');
          if (!el) return { success: false, error: 'Element not found: ${selector}' };
          el.click();
          return { success: true };
        })()
      `,
      returnByValue: true,
    });
    return res?.result?.value;
  }

  // 1. Landing Display Name Verification
  console.log('--- 1. Testing Landing Page Display Name ---');
  await setViewport(1440, 900);

  // A. Real Display Name: Engr. Tariq Mehmood
  await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc', 'Engr. Tariq Mehmood');
  await sleep(1000);
  await captureScreenshot('01_v21_1_landing_real_display_name_1440');

  // Verify rendered text and computed font style
  const realNameCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.querySelector('[data-testid="v20-landing-staff-name"]');
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontFamily: style.fontFamily,
          color: style.color
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Real name computed style:', realNameCheck?.result?.value);

  // B. Technical Handle Fallback: roads-01 -> "Admin"
  await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc', 'roads-01');
  await sleep(1000);
  await captureScreenshot('02_v21_1_landing_admin_fallback_1440');

  const adminNameCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.querySelector('[data-testid="v20-landing-staff-name"]');
        return el ? el.textContent : null;
      })()
    `,
    returnByValue: true,
  });
  console.log('Technical handle fallback text:', adminNameCheck?.result?.value);

  // 2. Navigation Dynamic Geometry & Button Click Verification
  console.log('--- 2. Testing Dynamic Morphing Navigation & Tab Clicks ---');

  // Open navigation by clicking toggle
  const openRes = await clickElement('#nav-toggle');
  console.log('Open toggle click:', openRes);
  await sleep(750); // Allow smooth opening transition

  // Check measured notch geometry and button coordinates
  const geometryCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const navRow = document.querySelector('#v20-nav-destinations');
        const notchPath = document.querySelector('#notch');
        const closeBtn = document.querySelector('#nav-toggle');
        const notifBtn = document.querySelector('[data-testid="v20-nav-btn-notifications"]');
        const homeBtn = document.querySelector('[data-testid="v20-nav-btn-home"]');

        const rowRect = navRow ? navRow.getBoundingClientRect() : null;
        const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
        const notifRect = notifBtn ? notifBtn.getBoundingClientRect() : null;
        const homeRect = homeBtn ? homeBtn.getBoundingClientRect() : null;
        const d = notchPath ? notchPath.getAttribute('d') : null;

        return {
          rowWidth: rowRect?.width,
          d,
          homeLeft: homeRect?.left,
          notifRight: notifRect?.right,
          closeLeft: closeRect?.left,
          gapBetweenNotifAndClose: closeRect && notifRect ? (closeRect.left - notifRect.right) : null
        };
      })()
    `,
    returnByValue: true,
  });
  console.log('Geometry audit:', geometryCheck?.result?.value);
  await captureScreenshot('03_v21_1_expanded_morphing_notch_1440');

  // Test clicking EVERY tab in real browser and record destination screenshot
  const tabsToTest = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'complaints', name: 'Complaints' },
    { id: 'verification', name: 'Verification' },
    { id: 'officers', name: 'Officers' },
    { id: 'profile', name: 'Profile' },
    { id: 'home', name: 'Home' },
  ];

  let stepIdx = 4;
  for (const tab of tabsToTest) {
    // Re-open nav
    await clickElement('#nav-toggle');
    await sleep(400);

    // Click tab
    const clickRes = await clickElement(`[data-tab-id="${tab.id}"]`);
    console.log(`Clicked tab ${tab.name}:`, clickRes);
    await sleep(800);

    // Verify active tab in content container
    const activeCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const content = document.querySelector('.v20-portal-content');
          return content ? content.getAttribute('data-active-tab') : null;
        })()
      `,
      returnByValue: true,
    });
    console.log(`Active tab after click: ${activeCheck?.result?.value}`);
    const numStr = String(stepIdx).padStart(2, '0');
    await captureScreenshot(`${numStr}_v21_1_active_${tab.id}_tab_1440`);
    stepIdx++;
  }

  // 3. Responsive Viewports Matrix
  console.log('--- 3. Testing Responsive Viewports Matrix ---');
  await loginAs('head', 'KMC', 'Karachi Metropolitan Corporation', 'kmc', 'Engr. Tariq Mehmood');

  // 1920x1080 (Desktop Large)
  await setViewport(1920, 1080);
  await sleep(600);
  await captureScreenshot('10_v21_1_landing_1920');

  // 1280x800 (Laptop)
  await setViewport(1280, 800);
  await sleep(600);
  await captureScreenshot('11_v21_1_landing_1280');

  // 1024x768 (iPad Landscape)
  await setViewport(1024, 768);
  await sleep(600);
  await captureScreenshot('12_v21_1_landing_1024');

  // 768x1024 (iPad Portrait)
  await setViewport(768, 1024);
  await sleep(600);
  await captureScreenshot('13_v21_1_landing_768');

  // 390x844 (Mobile)
  await setViewport(390, 844, true);
  await sleep(600);
  await captureScreenshot('14_v21_1_landing_mobile_390');

  // 320x568 (Mobile Compact)
  await setViewport(320, 568, true);
  await sleep(600);
  await captureScreenshot('15_v21_1_landing_mobile_320');

  // 4. Smooth 60 FPS Motion Capture & Video Compilation
  console.log('--- 4. Capturing Smooth 60 FPS Motion Frames ---');
  await setViewport(1440, 900);
  await sleep(600);

  // Trigger open animation and capture 24 sequential frames
  const frameCount = 24;
  await clickElement('#nav-toggle');

  for (let i = 0; i < frameCount; i++) {
    await sleep(28); // ~35 FPS sampling rate for buttery playback
    const frameRes = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = frameRes?.result?.data;
    if (b64) {
      const idx = String(i).padStart(2, '0');
      writeFileSync(join(ANIM_DIR, `frame_${idx}.png`), Buffer.from(b64, 'base64'));
    }
  }

  console.log('Compiling video and GIF using FFmpeg...');
  const mp4Path = join(OUTPUT_DIR, 'v21_1_morphing_nav_smooth.mp4');
  const gifPath = join(OUTPUT_DIR, 'v21_1_morphing_nav_smooth.gif');

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
  console.log('MP4 created:', mp4Path);

  const ffmpegGif = spawn(FFMPEG_PATH, [
    '-y',
    '-i', mp4Path,
    '-vf', 'fps=20,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    gifPath,
  ]);
  await new Promise((resolve) => ffmpegGif.on('close', resolve));
  console.log('GIF created:', gifPath);

  chromeProc.kill();
  console.log('=== V21.1 QA Verification Complete ===');
}

run().catch((err) => {
  console.error('QA Verification failed:', err);
  process.exit(1);
});
