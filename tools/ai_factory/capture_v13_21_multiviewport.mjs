import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const HTML_FILE = path.join(ARTIFACT_DIR, 'V13_21_CALM_OPERATIONS_SPEC_AND_VISUAL_PROPOSALS.html');
const OUT_DIR = path.join(ARTIFACT_DIR, 'screenshots/v13_21_final_revision');

fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9888;

const chromeProcess = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${BROWSER_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:/temp/chrome-profile-v21-corrected',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

await new Promise((r) => setTimeout(r, 1800));

async function getWSEndpoint() {
  const res = await fetch(`http://127.0.0.1:${BROWSER_PORT}/json/list`);
  const list = await res.json();
  return list[0].webSocketDebuggerUrl;
}

const wsUrl = await getWSEndpoint();
const ws = new WebSocket(wsUrl);

let msgId = 1;
const pending = new Map();

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(data.error);
    else resolve(data.result);
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((r) => (ws.onopen = r));
await send('Page.enable');
await send('DOM.enable');

const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
await send('Page.navigate', { url: fileUrl });
await new Promise((r) => setTimeout(r, 1200));

const viewports = [
  { width: 1440, height: 900, name: '1440' },
  { width: 393, height: 852, name: '393' },
  { width: 320, height: 620, name: '320' },
];

const screens = [
  'head-focus',
  'head-queue',
  'head-dispatch',
  'officer-myday',
  'officer-extension',
  'admin-requests',
  'admin-routing',
  'admin-audit',
  'themed-login-head',
  'themed-login-officer',
  'themed-login-admin',
  'staff-registration',
  'system-states',
  'context-menus',
];

const captureResults = [];
const overflowAuditResults = [];

for (const theme of ['light', 'dark']) {
  // Use IIFE to isolate scope and prevent global identifier redeclaration
  const themeRes = await send('Runtime.evaluate', {
    expression: `(() => {
      document.documentElement.setAttribute('data-theme', '${theme}');
      const btns = document.querySelectorAll('.in-app-theme-btn');
      btns.forEach(btn => {
        btn.innerHTML = '${theme === 'light' 
          ? '<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>Light</span>'
          : '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark</span>'}';
      });
      return {
        themeAttr: document.documentElement.getAttribute('data-theme'),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        bodyColor: getComputedStyle(document.body).color
      };
    })()`,
    returnByValue: true
  });

  if (themeRes.exceptionDetails) {
    throw new Error(`Theme evaluate exception: ${JSON.stringify(themeRes.exceptionDetails)}`);
  }
  console.log(`Switched to ${theme}:`, themeRes.result.value);

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });

    for (const s of screens) {
      await send('Runtime.evaluate', {
        expression: `(() => { showScreen('${s}'); })()`,
      });

      if (s === 'admin-requests') {
        await send('Runtime.evaluate', { expression: `(() => { openApplicantModal(); })()` });
      }

      await new Promise((r) => setTimeout(r, 200));

      // Programmatic Overflow Verification at 393px and 320px
      if (vp.width <= 768) {
        const overflowCheck = await send('Runtime.evaluate', {
          expression: `(() => {
            const docWidth = document.documentElement.clientWidth;
            const overflowing = [];
            const activeScreen = document.getElementById('screen-${s}');
            if (activeScreen) {
              const all = activeScreen.querySelectorAll('*');
              all.forEach(el => {
                // Ignore elements inside horizontal scroll containers or SVG graphics that are clipped by parent viewport/SVG
                if (el.closest('.app-nav-tabs') || el.closest('svg') || el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'defs') {
                  return;
                }
                const rect = el.getBoundingClientRect();
                if (rect.right > docWidth + 1.5 && el.offsetParent !== null) {
                  overflowing.push({
                    tagName: el.tagName,
                    className: typeof el.className === 'string' ? el.className : '',
                    right: Math.round(rect.right),
                    docWidth
                  });
                }
              });
            }
            return overflowing;
          })()`,
          returnByValue: true
        });

        const overflows = overflowCheck.result?.value || [];
        if (overflows.length > 0) {
          overflowAuditResults.push({ screen: s, theme, viewport: vp.name, overflows });
        }
      }

      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const outFile = path.join(OUT_DIR, `v21_${s}_${theme}_${vp.name}.png`);
      const buf = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(outFile, buf);
      captureResults.push({ screen: s, theme, viewport: vp.name, size: buf.length, file: outFile });

      if (s === 'admin-requests') {
        await send('Runtime.evaluate', { expression: `(() => { closeApplicantModal(); })()` });
      }
    }
    console.log(`Captured all screens for ${theme} at ${vp.name}px`);
  }
}

// PROGRAMMATIC PIXEL AND BYTE COMPARISON QUALITY GATE
console.log('\n--- VERIFYING LIGHT VS DARK SCREENSHOT DIFFERENTIATION ---');
let identicalFailures = 0;
let verifiedDistinct = 0;

for (const s of screens) {
  for (const vp of viewports) {
    const lightPath = path.join(OUT_DIR, `v21_${s}_light_${vp.name}.png`);
    const darkPath = path.join(OUT_DIR, `v21_${s}_dark_${vp.name}.png`);
    const bLight = fs.readFileSync(lightPath);
    const bDark = fs.readFileSync(darkPath);

    if (bLight.equals(bDark)) {
      console.error(`FAIL: Screen '${s}' at ${vp.name}px is BYTE-IDENTICAL in light and dark modes!`);
      identicalFailures++;
    } else {
      verifiedDistinct++;
    }
  }
}

console.log(`Distinct Light/Dark pairs: ${verifiedDistinct}/42`);
console.log(`Identical pairs: ${identicalFailures}/42`);

if (overflowAuditResults.length > 0) {
  console.warn(`WARNING: Found horizontal overflow on mobile viewports:`, JSON.stringify(overflowAuditResults, null, 2));
} else {
  console.log(`PASS: Zero horizontal overflow detected across all screens at 393px and 320px!`);
}

ws.close();
chromeProcess.kill('SIGTERM');

if (identicalFailures > 0) {
  throw new Error(`CRITICAL QUALITY GATE FAILURE: ${identicalFailures} light/dark pairs are identical!`);
}

console.log('All 84 multi-viewport screenshots captured and verified distinct!');
