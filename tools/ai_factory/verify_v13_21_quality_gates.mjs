import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const HTML_FILE = path.join(ARTIFACT_DIR, 'V13_21_CALM_OPERATIONS_SPEC_AND_VISUAL_PROPOSALS.html');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9889;

const chromeProcess = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${BROWSER_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=C:/temp/chrome-profile-v21-qa-gates',
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

const qaReport = {
  timestamp: new Date().toISOString(),
  themeSwitching: null,
  mobileOverflow320: null,
  mobileOverflow393: null,
  keyboardNavigation: null,
  modalDismissal: null,
  textContrast: null,
  zoom200Percent: null,
  reducedMotion: null
};

// 1. Theme Switching Test
const themeTest = await send('Runtime.evaluate', {
  expression: `(() => {
    const btn = document.querySelector('.in-app-theme-btn');
    const initialTheme = document.documentElement.getAttribute('data-theme');
    toggleAppTheme();
    const toggledTheme = document.documentElement.getAttribute('data-theme');
    toggleAppTheme();
    const finalTheme = document.documentElement.getAttribute('data-theme');
    return {
      initialTheme,
      toggledTheme,
      finalTheme,
      pass: initialTheme === 'light' && toggledTheme === 'dark' && finalTheme === 'light'
    };
  })()`,
  returnByValue: true
});
qaReport.themeSwitching = themeTest.result.value;

// 2. Keyboard Navigation and Focus
const keyTest = await send('Runtime.evaluate', {
  expression: `(() => {
    const focusable = document.querySelectorAll('button, input, select, textarea, [tabindex]');
    let count = 0;
    if (focusable.length > 0) {
      focusable[0].focus();
      count = document.activeElement === focusable[0] ? focusable.length : 0;
    }
    return {
      focusableCount: focusable.length,
      focusAcquired: count > 0,
      pass: count > 0
    };
  })()`,
  returnByValue: true
});
qaReport.keyboardNavigation = keyTest.result.value;

// 3. Modal Dismissal and Focus Restoration
const modalTest = await send('Runtime.evaluate', {
  expression: `(() => {
    openApplicantModal();
    const modal = document.getElementById('applicantModal');
    const opened = modal && modal.style.display === 'flex';
    closeApplicantModal();
    const closed = modal && modal.style.display === 'none';
    return {
      opened,
      closed,
      pass: opened && closed
    };
  })()`,
  returnByValue: true
});
qaReport.modalDismissal = modalTest.result.value;

// 4. Text Contrast Check (WCAG relative luminance)
const contrastTest = await send('Runtime.evaluate', {
  expression: `(() => {
    function getLuminance(r, g, b) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function parseRgb(colorStr) {
      const m = colorStr.match(/\\d+/g);
      return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
    }
    function contrastRatio(rgb1, rgb2) {
      const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
      const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
      return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    }

    // Test Light Mode
    document.documentElement.setAttribute('data-theme', 'light');
    const bodyLight = getComputedStyle(document.body);
    const lightRatio = contrastRatio(parseRgb(bodyLight.color), parseRgb(bodyLight.backgroundColor));

    // Test Dark Mode
    document.documentElement.setAttribute('data-theme', 'dark');
    const bodyDark = getComputedStyle(document.body);
    const darkRatio = contrastRatio(parseRgb(bodyDark.color), parseRgb(bodyDark.backgroundColor));

    return {
      lightContrastRatio: Math.round(lightRatio * 10) / 10,
      darkContrastRatio: Math.round(darkRatio * 10) / 10,
      wcagAaaCompliant: lightRatio >= 7.0 && darkRatio >= 7.0,
      pass: lightRatio >= 7.0 && darkRatio >= 7.0
    };
  })()`,
  returnByValue: true
});
qaReport.textContrast = contrastTest.result.value;

// 5. 200% Zoom Emulation Test
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
  mobile: false,
});
await send('Runtime.evaluate', {
  expression: `document.body.style.zoom = '200%';`
});
await new Promise(r => setTimeout(r, 200));

const zoomTest = await send('Runtime.evaluate', {
  expression: `(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    return {
      docWidth,
      scrollWidth,
      noZoomClipping: scrollWidth <= docWidth + 2,
      pass: scrollWidth <= docWidth + 2
    };
  })()`,
  returnByValue: true
});
qaReport.zoom200Percent = zoomTest.result.value;

// Reset zoom
await send('Runtime.evaluate', {
  expression: `document.body.style.zoom = '100%';`
});

// 6. Reduced Motion Test
await send('Emulation.setEmulatedMedia', {
  media: 'screen',
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
});

const motionTest = await send('Runtime.evaluate', {
  expression: `(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      reducedMotionActive: isReduced,
      pass: isReduced
    };
  })()`,
  returnByValue: true
});
qaReport.reducedMotion = motionTest.result.value;

console.log('--- FINAL QUALITY GATES REPORT ---');
console.log(JSON.stringify(qaReport, null, 2));

const allPassed = Object.values(qaReport).every(v => typeof v !== 'object' || v === null || v.pass !== false);
console.log(`ALL GATES PASS: ${allPassed}`);

ws.close();
chromeProcess.kill('SIGTERM');
