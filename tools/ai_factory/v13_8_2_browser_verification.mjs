/** Responsive and demonstration-isolation smoke test. Requires a running Vite dev server. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.env.AWAAZ_DEV_URL || 'http://localhost:5180';
const browserPath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/chromium');
const debugPort = 9392;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1382-chrome-'));
const browserArguments = [
  '--headless=new', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${directory}`, 'about:blank',
];
if (process.platform !== 'win32') browserArguments.unshift('--no-sandbox');
const browser = spawn(browserPath, browserArguments, { stdio: 'ignore' });
const screenshotDirectory = path.resolve('docs/v11/screenshots');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let requestId = 0;
const pending = new Map();

async function command(method, params = {}) {
  const id = ++requestId;
  return await new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const output = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (output.exceptionDetails) {
    console.error('Evaluate Exception:', output.exceptionDetails);
    throw new Error(output.exceptionDetails.exception?.description || output.exceptionDetails.text);
  }
  return output.result.value;
}

async function navigate(page) {
  await command('Page.navigate', { url: `${url}${page}` });
  await sleep(1400);
}

const results = [];

try {
  let tabs;
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        tabs = await response.json();
        break;
      }
    } catch { /* Browser startup can take a moment. */ }
    await sleep(250);
  }
  if (!tabs) throw new Error('Chromium did not open its debugging endpoint');

  ws = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const value = JSON.parse(event.data);
    const callback = pending.get(value.id);
    if (!callback) return;
    pending.delete(value.id);
    if (value.error) callback.reject(new Error(value.error.message));
    else callback.resolve(value.result);
  };
  await command('Page.enable');
  await command('Runtime.enable');

  await navigate('/dashboard?demo=true');
  const unauthorized = await evaluate('window.location.pathname === "/login"');
  if (!unauthorized) throw new Error('Authentication bypass regression: /dashboard?demo=true was allowed');

  await navigate('/dev/harness/citizen-dashboard');
  const disclaimer = await evaluate(`Boolean(document.querySelector('[aria-label="Demonstration mode notice"]')?.textContent?.includes("Fictional / Test Data Only"))`);
  if (!disclaimer) throw new Error('Fictional-data disclaimer missing from dev harness');

  // Deliberately seed an unrelated record. The harness must render only its
  // deterministic fixtures and never display a browser-stored complaint.
  await evaluate('localStorage.setItem("awaaz_complaints_store_v1", JSON.stringify([{id:"sensitive",referenceNumber:"LEAK-SENTINEL-9512",title:"PRIVATE_RECORD",citizenId:"another-user"}]))');
  await navigate('/dev/harness/citizen-dashboard');
  const isolated = await evaluate('({ fictional: document.body.textContent.includes("DEMO-KHI-0001"), leaked: document.body.textContent.includes("LEAK-SENTINEL-9512") })');
  if (!isolated.fictional || isolated.leaked) throw new Error(`Demo fixture isolation failed: ${JSON.stringify(isolated)}`);

  for (const width of [1280, 768, 390, 320]) {
    const height = width === 320 ? 640 : width === 390 ? 844 : width === 768 ? 1024 : 900;
    await command('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: width < 768,
    });
    await sleep(800);
    const stats = await evaluate(`(() => {
      const rightEdge = ${width};
      const offenders = [...document.querySelectorAll('body *')]
        .filter((node) => {
          if (!(node instanceof HTMLElement)) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width > 0 && rect.right > rightEdge + 1 && rect.left >= -1;
        })
        .slice(0, 12)
        .map((node) => ({ tag: node.tagName, className: String(node.className).slice(0, 90), right: Math.round(node.getBoundingClientRect().right) }));
      return {
        targetWidth: rightEdge,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        visualWidth: window.visualViewport?.width ?? null,
        offenders,
      };
    })()`);
    const hasOverflow = stats.scrollWidth > width + 1 || stats.bodyWidth > width + 1;
    results.push({ width, ...stats, hasOverflow });
    console.log(`Responsive ${width}px: ${JSON.stringify(stats)}`);
    fs.mkdirSync(screenshotDirectory, { recursive: true });
    const artifactDirectory = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2/screenshots';
    fs.mkdirSync(artifactDirectory, { recursive: true });
    const screenshot = await command('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(screenshotDirectory, `v13_8_2_dashboard_${width}.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    fs.writeFileSync(path.join(artifactDirectory, `v13_8_2_dashboard_${width}.png`), Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot: ${screenshotPath}`);
  }
  if (results.some((r) => r.hasOverflow)) {
    throw new Error('Detected horizontal overflow relative to the requested device width');
  }
  console.log('PASS: authentication guard, fictional-only harness, and four responsive viewports');
} finally {
  ws?.close();
  browser.kill();
  for (const item of pending.values()) item.reject(new Error('Browser session closed'));
  // Windows can briefly hold a Chrome profile file open after SIGTERM.
  await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), sleep(1800)]);
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Temporary Chrome profile could not be removed automatically: ${directory}`, error);
  }
}
