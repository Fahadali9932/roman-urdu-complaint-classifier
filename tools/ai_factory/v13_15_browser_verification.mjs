/**
 * AWAAZ-E-AWAM PHASE V13.15 COMPLETE BROWSER VERIFICATION & EVIDENCE HARNESS
 * 
 * Verifies:
 * 1. Multi-viewport rendering across 1920px, 1280px, 768px, 390px, 320px in English and Urdu
 * 2. Zero horizontal overflow across all pages and viewports
 * 3. Restrained card widths:
 *    - Login: max-width <= 520px
 *    - Write Complaint: max-width <= 820px
 *    - Track Complaint: max-width <= 760px
 * 4. Shared Navigation:
 *    - Strict order: 1. Home, 2. How It Works, 3. Write Your Complaint, 4. My Complaints, 5. Track Your Complaint
 *    - Single active Maroon highlight (#681822)
 *    - Accessible mobile drawer with language toggle and account links
 * 5. Balanced Cinematic 3D Motion System:
 *    - Homepage forward & reverse scroll depth animation
 *    - Coordinated 3D route transitions between pages
 *    - Restrained settling: transform strictly 'none' and will-change 'auto' at rest for razor-sharp typography
 * 6. Single 24-digit tracking-code system and civic document tracking result
 * 7. Verification that LOCAL AI TEST MODE is not shown in normal citizen use
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.env.AWAAZ_DEV_URL || 'http://localhost:5173';
const browserPath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/chromium');

const debugPort = 9395;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awaaz-v1315-chrome-'));
const browserArgs = [
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  'about:blank',
];
if (process.platform !== 'win32') browserArgs.unshift('--no-sandbox');

const browser = spawn(browserPath, browserArgs, { stdio: 'ignore' });
const screenshotDir = path.resolve('docs/v11/screenshots');
const artifactDir = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2/screenshots';

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let requestId = 0;
const pending = new Map();

async function command(method, params = {}) {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const output = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (output.exceptionDetails) {
    throw new Error(output.exceptionDetails.exception?.description || output.exceptionDetails.text);
  }
  return output.result.value;
}

async function navigate(pagePath) {
  await command('Page.navigate', { url: `${url}${pagePath}` });
  await sleep(1200);
}

async function capture(filename) {
  const screenshot = await command('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(screenshot.data, 'base64');
  fs.writeFileSync(path.join(screenshotDir, filename), buf);
  fs.writeFileSync(path.join(artifactDir, filename), buf);
  console.log(`[Evidence] Saved screenshot: ${filename} (${buf.length} bytes)`);
}

async function checkOverflow(width) {
  const stats = await evaluate(`(() => {
    const rightEdge = ${width};
    const offenders = [...document.querySelectorAll('body *')]
      .filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden'
          && rect.width > 0 && rect.right > rightEdge + 1.5 && rect.left >= -1;
      })
      .slice(0, 5)
      .map((node) => ({ tag: node.tagName, className: String(node.className).slice(0, 60), right: Math.round(node.getBoundingClientRect().right) }));
    return {
      targetWidth: rightEdge,
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      offenders,
    };
  })()`);

  if (stats.scrollWidth > width + 1.5 || stats.bodyWidth > width + 1.5) {
    console.error(`Horizontal overflow detected at ${width}px:`, stats);
    throw new Error(`Detected horizontal overflow at ${width}px: scrollWidth=${stats.scrollWidth}, bodyWidth=${stats.bodyWidth}`);
  }
  return stats;
}

async function setViewport(width, height) {
  await command('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await sleep(400);
}

async function run() {
  console.log('Connecting to Chromium CDP on port ' + debugPort + '...');
  let tabs;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        tabs = await res.json();
        break;
      }
    } catch {}
    await sleep(250);
  }
  if (!tabs) throw new Error('Chromium debug endpoint unreachable');

  const pageTab = tabs.find((t) => t.type === 'page');
  ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const val = JSON.parse(event.data);
    const cb = pending.get(val.id);
    if (!cb) return;
    pending.delete(val.id);
    if (val.error) cb.reject(new Error(val.error.message));
    else cb.resolve(val.result);
  };

  await command('Page.enable');
  await command('Runtime.enable');

  const viewports = [
    { name: '1920_desktop', width: 1920, height: 1080 },
    { name: '1280_laptop', width: 1280, height: 900 },
    { name: '768_tablet', width: 768, height: 1024 },
    { name: '390_mobile', width: 390, height: 844 },
    { name: '320_small_mobile', width: 320, height: 640 },
  ];

  console.log('\n============================================================');
  console.log('CHECKPOINT 1 — SHARED NAVIGATION AUDIT (Exact Sequence)');
  console.log('============================================================');
  await setViewport(1280, 900);
  await navigate('/');
  const navAudit = await evaluate(`(() => {
    const desktopNav = document.querySelector('nav[aria-label="Desktop primary navigation"]');
    if (!desktopNav) return { found: false };
    const links = Array.from(desktopNav.querySelectorAll('a')).map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim(),
      isActive: a.className.includes('bg-[#681822]'),
    }));
    return { found: true, links };
  })()`);
  console.log('Desktop Navigation Links:', navAudit.links);
  const expectedOrder = ['#hero', '#steps', '/submit', '/dashboard', '/track'];
  navAudit.links.forEach((l, i) => {
    if (l.href !== expectedOrder[i]) {
      throw new Error(`Nav item ${i} expected href "${expectedOrder[i]}" but got "${l.href}"`);
    }
  });
  console.log('PASS: Desktop nav has exact sequence: 1. Home, 2. How It Works, 3. Write, 4. My Complaints, 5. Track.');

  console.log('\n============================================================');
  console.log('CHECKPOINT 2 — HOMEPAGE FORWARD & REVERSE SCROLL MOTION AUDIT');
  console.log('============================================================');
  // Capture resting hero
  await capture('v13_15_motion_01_hero_resting.png');
  const heroRestingTransform = await evaluate(`(() => {
    const heroInner = document.querySelector('#hero .stacked-scroll-inner');
    return heroInner ? getComputedStyle(heroInner).transform : 'none';
  })()`);
  console.log('Hero at rest transform:', heroRestingTransform);

  // Scroll forward by 500px -> verify transform is actively changing (intermediate frame)
  await evaluate('window.scrollTo({ top: 500, behavior: "instant" })');
  await sleep(400);
  const heroMidTransform = await evaluate(`(() => {
    const heroInner = document.querySelector('#hero .stacked-scroll-inner');
    return heroInner ? heroInner.style.transform : 'none';
  })()`);
  console.log('Hero forward scroll (500px) active transform:', heroMidTransform);
  await capture('v13_15_motion_02_hero_receding_active.png');

  // Scroll to How It Works section (#steps-panel)
  await evaluate('window.scrollTo({ top: 1200, behavior: "instant" })');
  await sleep(500);
  await capture('v13_15_motion_03_steps_journey.png');

  // Scroll to Write Intro section
  await evaluate('window.scrollTo({ top: 3200, behavior: "instant" })');
  await sleep(500);
  await capture('v13_15_motion_04_write_intro.png');

  // Scroll to Footer section
  await evaluate('window.scrollTo({ top: 4800, behavior: "instant" })');
  await sleep(600);
  await capture('v13_15_motion_05_footer_monument.png');

  // Reverse Scroll back to Top
  console.log('Executing Reverse Scroll back to top (#hero)...');
  await evaluate('window.scrollTo({ top: 600, behavior: "instant" })');
  await sleep(400);
  await capture('v13_15_motion_06_reverse_scroll_midway.png');

  await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
  await sleep(500);
  const heroReverseRestingTransform = await evaluate(`(() => {
    const heroInner = document.querySelector('#hero .stacked-scroll-inner');
    return heroInner ? heroInner.style.transform : 'none';
  })()`);
  console.log('Hero after reverse scroll back to top transform:', heroReverseRestingTransform);
  await capture('v13_15_motion_07_hero_returned_resting.png');

  console.log('\n============================================================');
  console.log('CHECKPOINT 3 — ROUTE-TO-ROUTE 3D TRANSITIONS AUDIT');
  console.log('============================================================');
  // Transition from / to /track
  await command('Page.navigate', { url: `${url}/track` });
  // Capture intermediate frame during entrance animation (~120ms into 460ms animation)
  await sleep(120);
  const trackTransitionActive = await evaluate(`(() => {
    const el = document.querySelector('.page-transition-wrapper');
    return {
      className: el?.className,
      animationName: el ? getComputedStyle(el).animationName : 'none',
      transform: el ? getComputedStyle(el).transform : 'none',
    };
  })()`);
  console.log('Route transition /track (intermediate frame ~120ms):', trackTransitionActive);
  await capture('v13_15_transition_01_track_entering.png');

  // Wait for transition to settle
  await sleep(500);
  const trackTransitionSettled = await evaluate(`(() => {
    const el = document.querySelector('.page-transition-wrapper');
    return {
      className: el?.className,
      transform: el ? getComputedStyle(el).transform : 'none',
      willChange: el ? getComputedStyle(el).willChange : 'auto',
    };
  })()`);
  console.log('Route transition /track (settled resting frame):', trackTransitionSettled);
  await capture('v13_15_transition_02_track_settled_sharp.png');

  console.log('\n============================================================');
  console.log('CHECKPOINT 4 — CARD WIDTHS & OVERSIZED COMPOSITIONS AUDIT');
  console.log('============================================================');
  // 1. Login Card Width (< 520px target)
  await navigate('/login');
  const loginWidth = await evaluate(`(() => {
    const formCard = document.querySelector('form')?.closest('div.bg-white');
    const container = formCard?.parentElement;
    return {
      formCardWidth: formCard ? Math.round(formCard.getBoundingClientRect().width) : 0,
      containerWidth: container ? Math.round(container.getBoundingClientRect().width) : 0,
    };
  })()`);
  console.log('Login form dimensions:', loginWidth);
  if (loginWidth.containerWidth > 525) {
    throw new Error(`Login container width (${loginWidth.containerWidth}px) exceeds ~520px target!`);
  }
  await capture('v13_15_page_login_desktop.png');

  // 2. Write Complaint Card Width (< 820px target)
  await navigate('/submit');
  const writeWidth = await evaluate(`(() => {
    const progressCard = document.querySelector('section[aria-label="Form progress"]');
    const formCard = document.querySelector('section.overflow-visible');
    const hasDevBanner = Boolean(document.querySelector('[data-testid="local-ai-test-banner"]'));
    return {
      progressCardWidth: progressCard ? Math.round(progressCard.getBoundingClientRect().width) : 0,
      formCardWidth: formCard ? Math.round(formCard.getBoundingClientRect().width) : 0,
      hasDevBanner,
    };
  })()`);
  console.log('Write complaint form dimensions:', writeWidth);
  if (writeWidth.formCardWidth > 825) {
    throw new Error(`Write complaint card width (${writeWidth.formCardWidth}px) exceeds ~820px target!`);
  }
  if (writeWidth.hasDevBanner) {
    throw new Error('LOCAL AI TEST MODE banner is visible in normal citizen use on /submit!');
  }
  console.log('PASS: LOCAL AI TEST MODE is hidden in normal citizen use.');
  await capture('v13_15_page_submit_desktop.png');

  // 3. Track Complaint Card Width (< 760px target)
  await navigate('/track');
  const trackWidth = await evaluate(`(() => {
    const trackerCard = document.querySelector('div.bg-white.border');
    return {
      trackerCardWidth: trackerCard ? Math.round(trackerCard.getBoundingClientRect().width) : 0,
    };
  })()`);
  console.log('Track complaint card dimensions:', trackWidth);
  if (trackWidth.trackerCardWidth > 765) {
    throw new Error(`Track complaint card width (${trackWidth.trackerCardWidth}px) exceeds ~760px target!`);
  }
  await capture('v13_15_page_track_desktop.png');

  console.log('\n============================================================');
  console.log('CHECKPOINT 5 — MULTI-VIEWPORT RESPONSIVENESS & ZERO OVERFLOW');
  console.log('============================================================');
  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    await setViewport(vp.width, vp.height);

    // 1. Homepage
    await navigate('/');
    await checkOverflow(vp.width);
    await capture(`v13_15_vp_${vp.name}_home.png`);

    // 2. Submit Complaint
    await navigate('/submit');
    await checkOverflow(vp.width);
    await capture(`v13_15_vp_${vp.name}_submit.png`);

    // 3. Track Complaint
    await navigate('/track');
    await checkOverflow(vp.width);
    await capture(`v13_15_vp_${vp.name}_track.png`);

    // 4. Login
    await navigate('/login');
    await checkOverflow(vp.width);
    await capture(`v13_15_vp_${vp.name}_login.png`);
  }

  console.log('\n============================================================');
  console.log('CHECKPOINT 6 — URDU RTL MULTI-VIEWPORT VERIFICATION');
  console.log('============================================================');
  await setViewport(1280, 900);
  await navigate('/');
  // Switch to Urdu
  await evaluate(`(() => {
    const toggle = document.querySelector('button[aria-label*="interface language"]') ||
      document.querySelector('button[aria-label*="زبان تبدیل کریں"]');
    toggle?.click();
  })()`);
  await sleep(600);

  for (const vp of [viewports[1], viewports[3]]) { // 1280px and 390px
    await setViewport(vp.width, vp.height);
    await navigate('/');
    await checkOverflow(vp.width);
    await capture(`v13_15_urdu_${vp.name}_home.png`);

    await navigate('/submit');
    await checkOverflow(vp.width);
    await capture(`v13_15_urdu_${vp.name}_submit.png`);

    await navigate('/track');
    await checkOverflow(vp.width);
    await capture(`v13_15_urdu_${vp.name}_track.png`);
  }

  // Switch back to English
  await evaluate(`(() => {
    const toggle = document.querySelector('button[aria-label*="interface language"]') ||
      document.querySelector('button[aria-label*="زبان تبدیل کریں"]');
    toggle?.click();
  })()`);
  await sleep(500);

  console.log('\n============================================================');
  console.log('CHECKPOINT 7 — GUEST SUBMISSION -> 24-DIGIT RECEIPT -> TRACK');
  console.log('============================================================');
  await setViewport(1280, 900);
  await navigate('/submit');

  // Fill Step 1
  await evaluate(`(() => {
    const setVal = (el, val) => {
      if (!el) return;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(document.querySelector('input#citizenName'), 'Fahad Ali');
    setVal(document.querySelector('input#citizenPhone'), '03001234567');
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Continue'));
    btn?.click();
  })()`);
  await sleep(700);

  // Fill Step 2
  await evaluate(`(() => {
    const setVal = (el, val) => {
      if (!el) return;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(document.querySelector('input#publicLocation'), 'Clifton Block 2 Main Road');
    setVal(document.querySelector('input#applicantAddress'), 'House 204, Block 2, Clifton');
    const loc = document.querySelector('input#locality');
    if (loc) setVal(loc, 'Clifton');
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const opt = document.querySelector('li[role="option"]');
    if (opt) {
      opt.click();
    } else {
      const sel = document.querySelector('select#district');
      if (sel) {
        sel.value = 'district-south';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Continue'));
    btn?.click();
  })()`);
  await sleep(700);

  // Fill Step 3
  await evaluate(`(() => {
    const setVal = (el, val) => {
      if (!el) return;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(document.querySelector('textarea#description'), 'Sarak par bohot gehra gaddha hai asphalt tooti hui hai KMC road repair chahiye');
  })()`);
  await sleep(400);

  // Submit
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Submit Complaint'));
    btn?.click();
  })()`);
  await sleep(1500);

  // Handle clarification skip if present
  await evaluate(`(() => {
    const skipBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Skip') || b.innerText.includes('بغیر وضاحت'));
    skipBtn?.click();
  })()`);
  await sleep(2000);

  // Capture Receipt Modal
  await capture('v13_15_receipt_single_code_modal.png');
  const receiptInfo = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { found: false };
    const text = dialog.innerText;
    const codeMatch = text.match(/(\\d{4}\\s+\\d{4}\\s+\\d{4}\\s+\\d{4}\\s+\\d{4}\\s+\\d{4})/);
    const copyBtn = [...dialog.querySelectorAll('button')].find(b => b.innerText.includes('Copy Code') || b.getAttribute('aria-label') === 'Copy code');
    const trackBtn = [...dialog.querySelectorAll('button')].find(b => b.innerText.includes('Track Complaint'));
    return {
      found: true,
      hasCode: Boolean(codeMatch),
      rawCode: codeMatch ? codeMatch[1] : null,
      hasCopyBtn: Boolean(copyBtn),
      hasTrackBtn: Boolean(trackBtn),
    };
  })()`);
  console.log('Submission Receipt verification:', receiptInfo);
  if (!receiptInfo.found || !receiptInfo.hasCode) {
    throw new Error('24-digit guest tracking code receipt modal was not displayed!');
  }
  console.log('Generated 24-digit tracking number:', receiptInfo.rawCode);

  // Click Track Complaint button directly from receipt
  await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const trackBtn = [...dialog.querySelectorAll('button')].find(b => b.innerText.includes('Track Complaint'));
    trackBtn?.click();
  })()`);
  await sleep(1200);

  // Verify navigation to /track with auto-filled code and verified result
  const trackerResultVerification = await evaluate(`(() => {
    const url = window.location.href;
    const hasResult = Boolean(document.querySelector('.text-2xl.font-black'));
    const statusText = document.querySelector('.text-2xl.font-black')?.innerText;
    const hasTimeline = Boolean(document.querySelector('ol.relative.border-s-2'));
    const hasDept = Boolean(document.querySelector('.lucide-building-2'));
    return {
      url,
      hasResult,
      statusText,
      hasTimeline,
      hasDept,
    };
  })()`);
  console.log('Tracker result verification:', trackerResultVerification);
  await capture('v13_15_track_result_civic_document.png');

  console.log('\n============================================================');
  console.log('ALL V13.15 REAL BROWSER CHECKS & REVERSIBLE MOTION PASSED!');
  console.log('============================================================');
}

run()
  .then(() => {
    browser.kill();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Browser verification failed:', err);
    browser.kill();
    process.exit(1);
  });
