import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\Annihilation\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const DEBUG_PORT = 9449;
const ANIM_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v20_3\\animation';
const TEMP_USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v20_3_anim_' + Date.now());

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  fs.mkdirSync(ANIM_DIR, { recursive: true });

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  await sleep(1500);
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const list = await res.json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

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
    return new Promise((r) => {
      const id = msgId++;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send('Page.navigate', { url: 'http://localhost:5173/department' });
  await sleep(1000);

  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `,
  });
  await sleep(2500);

  // Capture collapsed frame
  console.log('Capturing notch morphing frames...');
  const f0 = await send('Page.captureScreenshot', { format: 'png', clip: { x: 260, y: 0, width: 920, height: 160, scale: 1 } });
  fs.writeFileSync(path.join(ANIM_DIR, 'frame_00.png'), Buffer.from(f0.data, 'base64'));

  // Trigger expansion
  await send('Runtime.evaluate', {
    expression: `
      const notch = document.querySelector('.v20-notch-shell');
      if (notch) notch.click();
    `,
  });

  // Capture 12 transition frames
  for (let i = 1; i <= 12; i++) {
    await sleep(40);
    const snap = await send('Page.captureScreenshot', { format: 'png', clip: { x: 260, y: 0, width: 920, height: 160, scale: 1 } });
    const pad = String(i).padStart(2, '0');
    fs.writeFileSync(path.join(ANIM_DIR, `frame_${pad}.png`), Buffer.from(snap.data, 'base64'));
  }

  // Hold expanded state for a few frames
  for (let i = 13; i <= 16; i++) {
    await sleep(60);
    const snap = await send('Page.captureScreenshot', { format: 'png', clip: { x: 260, y: 0, width: 920, height: 160, scale: 1 } });
    const pad = String(i).padStart(2, '0');
    fs.writeFileSync(path.join(ANIM_DIR, `frame_${pad}.png`), Buffer.from(snap.data, 'base64'));
  }

  ws.close();
  chrome.kill();

  console.log('Morphing frames captured. Compiling to MP4 and GIF with ffmpeg...');
  const mp4Path = path.join(ANIM_DIR, '..', 'v20_3_morphing_nav_animation.mp4');
  const gifPath = path.join(ANIM_DIR, '..', 'v20_3_morphing_nav_animation.gif');

  const ffmpegArgsMp4 = [
    '-y',
    '-framerate', '10',
    '-i', path.join(ANIM_DIR, 'frame_%02d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    mp4Path,
  ];

  const ffmpegMp4 = spawn(FFMPEG_PATH, ffmpegArgsMp4);
  await new Promise((r) => ffmpegMp4.on('close', r));
  console.log('Saved MP4 animation to:', mp4Path);

  const ffmpegArgsGif = [
    '-y',
    '-framerate', '10',
    '-i', path.join(ANIM_DIR, 'frame_%02d.png'),
    '-vf', 'fps=10,scale=700:-1:flags=lanczos',
    gifPath,
  ];

  const ffmpegGif = spawn(FFMPEG_PATH, ffmpegArgsGif);
  await new Promise((r) => ffmpegGif.on('close', r));
  console.log('Saved GIF animation to:', gifPath);
}

run().catch((err) => {
  console.error('Animation capture failed:', err);
  process.exit(1);
});
