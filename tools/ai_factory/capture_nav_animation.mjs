import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9450;
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v20_gate_a\\animation';
const TEMP_USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v20_anim_' + Date.now());

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  await send('Page.navigate', { url: 'http://localhost:5173/department/dashboard' });
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
      window.location.href = '/department/dashboard';
    `,
  });
  await sleep(2500);

  // Capture collapsed resting state (Frame 00)
  console.log('Capturing collapsed resting frame...');
  const f0 = await send('Page.captureScreenshot', { format: 'png', clip: { x: 300, y: 0, width: 840, height: 140, scale: 1 } });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'frame_00.png'), Buffer.from(f0.data, 'base64'));

  // Trigger expansion
  console.log('Triggering expansion and recording 10 morphing frames...');
  await send('Runtime.evaluate', {
    expression: `
      const notch = document.querySelector('.v20-notch-shell');
      if (notch) notch.click();
    `,
  });

  // Capture 10 frames during the transition
  for (let i = 1; i <= 10; i++) {
    await sleep(40);
    const snap = await send('Page.captureScreenshot', { format: 'png', clip: { x: 300, y: 0, width: 840, height: 140, scale: 1 } });
    const pad = String(i).padStart(2, '0');
    fs.writeFileSync(path.join(OUTPUT_DIR, `frame_${pad}.png`), Buffer.from(snap.data, 'base64'));
  }

  // Capture final resting expanded frame
  await sleep(200);
  const fFinal = await send('Page.captureScreenshot', { format: 'png', clip: { x: 300, y: 0, width: 840, height: 140, scale: 1 } });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'frame_11.png'), Buffer.from(fFinal.data, 'base64'));

  console.log('Captured 12 animation frames in:', OUTPUT_DIR);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
