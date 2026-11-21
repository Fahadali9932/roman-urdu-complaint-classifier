/** Read-only V13.15.3 visual QA: responsive flow, sticky-stage legibility,
 * registration photo, reduced motion. Requires local Vite and Chrome. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const origin = process.env.AWAAZ_QA_URL || 'http://127.0.0.1:5173';
const output = process.env.AWAAZ_QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13153-qa-'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v13153-chrome-'));
const browserPort = 9398;
const chrome = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/chromium');
const child = spawn(chrome, [
  ...(process.platform === 'win32' ? [] : ['--no-sandbox']),
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
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const viewport = async (width, height) => request('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: width < 768,
});
const visit = async (route) => {
  await request('Page.navigate', { url: `${origin}${route}` });
  let result;
  for (let i = 0; i < 25; i++) {
    await delay(200);
    result = await evaluate(`({
      title:document.title,
      width:document.documentElement.clientWidth,
      overflow:Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)-window.innerWidth,
      content:document.querySelector('#root')?.textContent?.length||0,
      offenders: Array.from(document.querySelectorAll('*')).filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).map(el => ({
        tag: el.tagName,
        cls: typeof el.className === 'string' ? el.className.slice(0, 40) : '',
        right: el.getBoundingClientRect().right,
        w: el.getBoundingClientRect().width
      })).slice(0, 5)
    })`);
    if (result && result.content > 60) break;
  }
  assert(result && result.content > 60, `Blank or incomplete page: ${route}`);
  assert(result.overflow <= 2, `Horizontal overflow on ${route}: ${JSON.stringify(result)}`);
  return result;
};

try {
  fs.mkdirSync(output, { recursive: true });
  let page;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`);
      if (response.ok) page = (await response.json()).find((tab) => tab.type === 'page');
    } catch { /* Chrome starting */ }
    if (page) break;
    await delay(200);
  }
  if (!page) throw new Error('Chrome did not start; set CHROME_PATH to your Chrome executable');
  websocket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { websocket.onopen = resolve; websocket.onerror = reject; });
  websocket.onmessage = (event) => {
    const packet = JSON.parse(event.data);
    const entry = pending.get(packet.id);
    if (!entry) return;
    pending.delete(packet.id);
    packet.error ? entry.reject(new Error(packet.error.message)) : entry.resolve(packet.result);
  };
  await request('Page.enable');
  await request('Runtime.enable');

  const routes = ['/', '/about', '/faq', '/contact', '/submit', '/track', '/register', '/login'];
  for (const [width, height] of [[1280, 900], [768, 1024], [393, 852], [390, 844], [375, 667], [320, 640]]) {
    await viewport(width, height);
    for (const route of routes) {
      await visit(route);
      if (['/', '/register', '/track', '/submit', '/login'].includes(route)) {
        await saveImage(`${route === '/' ? 'home' : route.slice(1)}_${width}.png`);
      }
      if (route === '/register') {
        const photo = await evaluate(`(() => {
          const img=document.querySelector('[data-testid="registration-monument"]');
          return {loaded:!!img?.complete && img.naturalWidth>0, width:img?.getBoundingClientRect().width||0};
        })()`);
        assert(photo.loaded && photo.width > 150, `Registration monument missing at ${width}px: ${JSON.stringify(photo)}`);
      }
      console.log(`PASS ${width}x${height} ${route}: no overflow`);
    }

    if (width > 393) continue;
    await visit('/#steps');
    const initial = await evaluate(`(() => {
      const stages=[...document.querySelectorAll('[data-mobile-journey-stage]')];
      const card=stages[0]?.firstElementChild;
      return {count:stages.length, position:card && getComputedStyle(card).position,
        cardHeight:card?.getBoundingClientRect().height||0, screenHeight:innerHeight};
    })()`);
    assert(initial.count===4 && initial.position==='sticky', `Four native sticky stages missing at ${width}px`);
    assert(initial.cardHeight < height * 0.86, `Oversized mobile journey card: ${JSON.stringify(initial)}`);

    for (const key of ['write', 'review', 'route', 'track']) {
      const result = await evaluate(`(() => {
        const stage=document.querySelector('[data-mobile-journey-stage="${key}"]');
        window.scrollTo({top:stage.getBoundingClientRect().top+scrollY-86,behavior:'instant'});
        const card=stage.firstElementChild;
        const heading=card.querySelector('h3').getBoundingClientRect();
        const description=card.querySelector('p:not(:first-child)')?.getBoundingClientRect();
        const rect=card.getBoundingClientRect();
        return {cardTop:rect.top,cardBottom:rect.bottom,headingTop:heading.top,headingBottom:heading.bottom,
          descriptionBottom:description?.bottom||0, screen:innerHeight};
      })()`);
      assert(result.headingTop >= 0 && result.headingBottom < height - 24,
        `Unreadable ${key} mobile heading at ${width}px: ${JSON.stringify(result)}`);
      await delay(180);
      await saveImage(`mobile_${key}_${width}.png`);
      console.log(`PASS ${width}px ${key}: card fits visible mobile viewport`);
    }

    await request('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await visit('/#steps');
    const reduced = await evaluate(`getComputedStyle(document.querySelector('[data-mobile-journey-stage]')?.firstElementChild).position`);
    assert(reduced !== 'sticky', `Reduced motion still forces sticky choreography at ${width}px`);
    await saveImage(`mobile_reduced_motion_${width}.png`);
    await request('Emulation.setEmulatedMedia', { features: [] });
  }

  for (const width of [1280, 390]) {
    await viewport(width, width === 1280 ? 900 : 844);
    await visit('/?lang=ur');
    await saveImage(`urdu_home_${width}.png`);
    await visit('/register?lang=ur');
    await saveImage(`urdu_register_${width}.png`);
    console.log(`PASS ${width}px Urdu RTL: no overflow`);
  }

  console.log(`PASS V13.15.3 responsive browser smoke suite. Screenshots: ${output}`);
} finally {
  websocket?.close();
  child.kill();
}
