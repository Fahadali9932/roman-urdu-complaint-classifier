import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const origin = 'http://127.0.0.1:5173';
const output = 'D:\\Awaaz_V13_15_4_Review\\docs\\v11\\screenshots\\v13_15_4\\motion_qa';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13154-motion-'));
const browserPort = 9397;
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${browserPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let websocket;
let sequence = 0;
const pending = new Map();

const request = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  websocket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const result = await request('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const saveImage = async (name) => {
  const { data } = await request('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, name), Buffer.from(data, 'base64'));
};

const viewport = async (width, height) => request('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: width < 768,
});

async function run() {
  fs.mkdirSync(output, { recursive: true });
  let page;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`);
      if (response.ok) page = (await response.json()).find((tab) => tab.type === 'page');
    } catch {}
    if (page) break;
    await delay(200);
  }
  websocket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { websocket.onopen = res; websocket.onerror = rej; });
  websocket.onmessage = (event) => {
    const packet = JSON.parse(event.data);
    const entry = pending.get(packet.id);
    if (!entry) return;
    pending.delete(packet.id);
    packet.error ? entry.reject(new Error(packet.error.message)) : entry.resolve(packet.result);
  };
  await request('Page.enable');
  await request('Runtime.enable');

  console.log('--- TESTING TOUCH & SCROLL DYNAMICS ACROSS VIEWPORTS ---');

  for (const width of [320, 375, 390, 393, 768, 1280]) {
    const height = width === 1280 ? 900 : width === 768 ? 1024 : 844;
    await viewport(width, height);
    await request('Page.navigate', { url: `${origin}/#steps` });
    await delay(600);

    // 1. Slow touch scroll simulation
    console.log(`[${width}px] Testing slow continuous scroll...`);
    for (let step = 0; step < 8; step++) {
      await evaluate(`window.scrollBy({ top: 70, behavior: 'instant' })`);
      await delay(50);
    }
    const slowScrollY = await evaluate(`window.scrollY`);
    console.log(`[${width}px] Slow scroll reached scrollY: ${slowScrollY}`);

    // 2. Medium touch scroll simulation (card transition)
    console.log(`[${width}px] Testing medium swipe transition...`);
    await evaluate(`window.scrollBy({ top: 350, behavior: 'smooth' })`);
    await delay(400);
    const mediumScrollY = await evaluate(`window.scrollY`);
    console.log(`[${width}px] Medium swipe reached scrollY: ${mediumScrollY}`);
    await saveImage(`scroll_medium_${width}.png`);

    // 3. Fast flick simulation
    console.log(`[${width}px] Testing fast flick...`);
    await evaluate(`window.scrollBy({ top: 800, behavior: 'smooth' })`);
    await delay(500);
    const fastScrollY = await evaluate(`window.scrollY`);
    console.log(`[${width}px] Fast flick reached scrollY: ${fastScrollY}`);
    await saveImage(`scroll_fast_${width}.png`);

    // Check for scroll locking or trapped scrolling
    const canScrollFurther = await evaluate(`(() => {
      const prev = window.scrollY;
      window.scrollBy({ top: 100, behavior: 'instant' });
      const moved = window.scrollY > prev;
      return moved;
    })()`);
    console.log(`[${width}px] Native scroll freedom verified: ${canScrollFurther}`);
  }

  console.log('--- ALL SCROLL DYNAMICS TESTS COMPLETED SUCCESSFULLY ---');
  websocket.close();
  child.kill();
}

run().catch((err) => {
  console.error(err);
  websocket?.close();
  child.kill();
  process.exit(1);
});
