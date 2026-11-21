/** Read-only visual smoke test. Uses a clean headless Chromium profile. No form submissions. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const origin = process.env.AWAAZ_QA_URL || 'http://127.0.0.1:5173';
const out = process.env.AWAAZ_QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13152-qa-'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13152-browser-'));
const port = 9397;
const exe = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium');
const child = spawn(exe, [
  ...(process.platform === 'win32' ? [] : ['--no-sandbox']),
  '--headless=new', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let counter = 0;
const pending = new Map();
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++counter;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evalInPage = async (expression) => {
  const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
};
const screenshot = async (name) => {
  const { data } = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, name), Buffer.from(data, 'base64'));
};
const verify = async (width, height, route, screenshotName) => {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await call('Page.navigate', { url: `${origin}${route}` });
  await delay(1200);
  const dimensions = await evalInPage(`({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth})`);
  if (dimensions.scrollWidth > width + 2 || dimensions.bodyWidth > width + 2) {
    throw new Error(`Horizontal overflow on ${route} at ${width}px: ${JSON.stringify(dimensions)}`);
  }
  await screenshot(screenshotName);
  console.log(`PASS ${width}×${height} ${route} (${dimensions.scrollWidth}px scroll width)`);
};

try {
  fs.mkdirSync(out, { recursive: true });
  let page;
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        page = (await response.json()).find((tab) => tab.type === 'page');
        if (page) break;
      }
    } catch { /* browser starting */ }
    await delay(200);
  }
  if (!page) throw new Error('Chromium did not start');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    }
  };
  await call('Page.enable');
  await call('Runtime.enable');
  for (const width of [1280, 768, 390, 320]) {
    const height = width === 1280 ? 900 : width === 768 ? 1024 : width === 390 ? 844 : 640;
    await verify(width, height, '/track', `track_${width}.png`);
    await verify(width, height, '/register', `register_${width}.png`);
    await verify(width, height, '/', `home_${width}.png`);
    if (width <= 390) {
      const stage = await evalInPage(`(() => {
        const stages = [...document.querySelectorAll('[data-mobile-journey-stage]')];
        return {count:stages.length, sticky:getComputedStyle(stages[0]?.firstElementChild).position};
      })()`);
      if (stage.count !== 4 || stage.sticky !== 'sticky') throw new Error(`Mobile pinned stages missing: ${JSON.stringify(stage)}`);
      await evalInPage(`window.scrollTo(0, document.querySelector('[data-mobile-journey-stage="review"]').getBoundingClientRect().top + window.scrollY - 80)`);
      await delay(600);
      await screenshot(`home_mobile_journey_${width}.png`);
      console.log(`PASS mobile pinned four-stage journey at ${width}px`);
    }
  }
  console.log(`Evidence screenshots in ${out}`);
} finally {
  ws?.close();
  child.kill();
  // Chrome may still be shutting down; leave the isolated temporary profile to OS cleanup.
}
