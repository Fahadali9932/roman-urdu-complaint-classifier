import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const OUT_DIR = path.join(ARTIFACT_DIR, 'screenshots/v13_21_react_acceptance');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9895;
const BASE_URL = 'http://127.0.0.1:5173';

const chromeProcess = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${BROWSER_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:/temp/chrome-profile-v21-acc-final',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

await new Promise((r) => setTimeout(r, 2000));

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
await send('Runtime.enable');

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
  }
  return res.result?.value;
}

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}

async function captureScreenshot(filePath) {
  const res = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '393', width: 393, height: 852 },
  { name: '320', width: 320, height: 568 },
];

const results = {
  themePersistence: null,
  overflowChecks: [],
  keyboardAccessibility: null,
  escapeDismissal: null,
  zoom200Reflow: null,
  screenshots: [],
};

console.log('=== STARTING AWAAZ-E-AWAM V13.21 REACT ACCEPTANCE QA ===');

async function clearStorage() {
  await evaluate(`(() => {
    localStorage.clear();
    sessionStorage.clear();
  })()`);
}

async function setHeadSession() {
  await evaluate(`(() => {
    const deptSession = {
      userId: 'staff-kmc-demo-01',
      email: 'fahadmalik030121+roads@gmail.com',
      username: 'roads-01',
      departmentId: 'kmc',
      departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
      departmentCode: 'KMC',
      authenticatedAt: new Date().toISOString()
    };
    const staffSession = {
      userId: 'staff-kmc-demo-01',
      email: 'fahadmalik030121+roads@gmail.com',
      username: 'roads-01',
      fullName: 'Chief Engineer Roads',
      role: 'department_staff',
      departmentId: 'kmc',
      departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
      departmentCode: 'KMC',
      authenticatedAt: new Date().toISOString()
    };
    sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify(deptSession));
    localStorage.setItem('awaaz_staff_session_v2', JSON.stringify(staffSession));
    sessionStorage.setItem('awaaz_staff_session_v2', JSON.stringify(staffSession));
  })()`);
}

async function setOfficerSession() {
  await evaluate(`(() => {
    const deptSession = {
      userId: 'local-officer-a',
      email: 'fahadmalik030121+roads-officer@gmail.com',
      username: 'roads-02',
      departmentId: 'kmc',
      departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
      departmentCode: 'KMC',
      authenticatedAt: new Date().toISOString()
    };
    const staffSession = {
      userId: 'local-officer-a',
      email: 'fahadmalik030121+roads-officer@gmail.com',
      username: 'roads-02',
      fullName: 'Field Officer A',
      role: 'department_staff',
      departmentId: 'kmc',
      departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
      departmentCode: 'KMC',
      authenticatedAt: new Date().toISOString()
    };
    sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify(deptSession));
    localStorage.setItem('awaaz_staff_session_v2', JSON.stringify(staffSession));
    sessionStorage.setItem('awaaz_staff_session_v2', JSON.stringify(staffSession));
  })()`);
}

async function setAdminSession() {
  await evaluate(`(() => {
    const a = {
      userId: 'main-admin-id',
      email: 'admin@example.org',
      fullName: 'Central Administrator',
      role: 'main_admin',
      authenticatedAt: new Date().toISOString()
    };
    localStorage.setItem('awaaz_admin_session_v2', JSON.stringify(a));
    sessionStorage.setItem('awaaz_admin_session_v2', JSON.stringify(a));
  })()`);
}

async function setTheme(theme) {
  await evaluate(`(() => {
    document.documentElement.setAttribute('data-theme', '${theme}');
    document.documentElement.classList.toggle('dark', '${theme}' === 'dark');
    localStorage.setItem('awaaz_dept_theme_mode', '${theme}');
    localStorage.setItem('aawaaz-demo-theme', '${theme}');
    document.querySelectorAll('.admin-shell').forEach(s => s.setAttribute('data-theme', '${theme}'));
  })()`);
  await wait(150);
}

// -----------------------------------------------------------------------------
// 1. Theme Persistence Across Page Reload
// -----------------------------------------------------------------------------
console.log('1. Testing Theme Persistence Across Page Reload...');
await setViewport(1440, 900);
await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
await wait(1200);
await setHeadSession();
await send('Page.navigate', { url: `${BASE_URL}/department/head` });
await wait(1500);

await setTheme('dark');
const darkBgBefore = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const darkAttrBefore = await evaluate(`document.documentElement.getAttribute('data-theme')`);

// Full reload
await send('Page.reload');
await wait(1500);

const darkBgAfter = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const darkAttrAfter = await evaluate(`document.documentElement.getAttribute('data-theme')`);
const darkStored = await evaluate(`localStorage.getItem('awaaz_dept_theme_mode')`);

results.themePersistence = {
  darkBgBefore,
  darkBgAfter,
  darkAttrBefore,
  darkAttrAfter,
  darkStored,
  persisted: darkAttrAfter === 'dark' && darkStored === 'dark',
};
console.log('Theme persistence result:', results.themePersistence);

// -----------------------------------------------------------------------------
// 2. Viewport Screenshots & Responsive Overflow Checks
// -----------------------------------------------------------------------------
console.log('2. Capturing React App Screenshots & Checking Overflow...');

const screens = [
  // Department Head Views
  {
    id: 'react-head-login',
    title: 'Department Head Login',
    setup: async () => {
      await clearStorage();
      await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
      await wait(1200);
    },
  },
  {
    id: 'react-head-focus',
    title: 'Department Head Focus Desk',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
      await wait(400);
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head` });
      await wait(1400);
    },
  },
  {
    id: 'react-head-queue',
    title: 'Department Head Queue',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
      await wait(400);
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head` });
      await wait(1000);
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent && b.textContent.includes('Queue'));
        if (btn) btn.click();
      })()`);
      await wait(1200);
    },
  },
  {
    id: 'react-head-dispatch',
    title: 'Head Dispatch Desk (5-Stage)',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
      await wait(400);
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head` });
      await wait(1000);
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent && b.textContent.includes('Dispatch'));
        if (btn) btn.click();
      })()`);
      await wait(1200);
    },
  },
  {
    id: 'react-head-verification',
    title: 'Head Proof Review',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
      await wait(400);
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head` });
      await wait(1000);
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent && b.textContent.includes('Proof Review'));
        if (btn) btn.click();
      })()`);
      await wait(1200);
    },
  },
  // Field Officer Views
  {
    id: 'react-officer-login',
    title: 'Field Officer Login',
    setup: async () => {
      await clearStorage();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer/login?dept=kmc` });
      await wait(1200);
    },
  },
  {
    id: 'react-officer-myday',
    title: 'Field Officer My Day',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/officer/login?dept=kmc` });
      await wait(400);
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer` });
      await wait(1400);
    },
  },
  {
    id: 'react-officer-evidence-modal',
    title: 'Officer Proof Upload & GPS Modal',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/officer/login?dept=kmc` });
      await wait(400);
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer` });
      await wait(1200);
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Submit field proof'));
        if (btn) btn.click();
      })()`);
      await wait(600);
    },
  },
  {
    id: 'react-officer-extension-modal',
    title: 'Officer Extension Request Modal',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/department/officer/login?dept=kmc` });
      await wait(400);
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer` });
      await wait(1200);
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Request extra time'));
        if (btn) btn.click();
      })()`);
      await wait(600);
    },
  },
  // Central Admin Views
  {
    id: 'react-admin-login',
    title: 'Central Admin Login',
    setup: async () => {
      await clearStorage();
      await send('Page.navigate', { url: `${BASE_URL}/admin/login` });
      await wait(1200);
    },
  },
  {
    id: 'react-admin-requests',
    title: 'Admin Applicant Review Queue',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/admin/login` });
      await wait(400);
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/requests` });
      await wait(1400);
    },
  },
  {
    id: 'react-admin-access',
    title: 'Admin Role & Department Permissions',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/admin/login` });
      await wait(400);
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/access` });
      await wait(1400);
    },
  },
  {
    id: 'react-admin-ai',
    title: 'Admin AI Routing Dispute & Telemetry',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/admin/login` });
      await wait(400);
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/ai` });
      await wait(1400);
    },
  },
];

for (const screen of screens) {
  for (const theme of ['light', 'dark']) {
    for (const vp of viewports) {
      await setViewport(vp.width, vp.height);
      await screen.setup();
      await setTheme(theme);

      const filename = `${screen.id}_${theme}_${vp.name}.png`;
      const fullPath = path.join(OUT_DIR, filename);
      await captureScreenshot(fullPath);

      // Check genuine horizontal overflow at 393 and 320
      if (vp.width <= 768) {
        const overflow = await evaluate(`(() => {
          const docScroll = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const badEls = [];
          document.querySelectorAll('*').forEach(el => {
            // Ignore hidden elements, SVGs or intentional scroll containers
            const style = window.getComputedStyle(el);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.display === 'none' || style.visibility === 'hidden') return;
            if (el.closest('[style*="overflow-x: auto"], [class*="overflow-x-auto"], nav, svg')) return;
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.right > winWidth + 2) {
              badEls.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className || '').toString().slice(0, 40),
                right: Math.round(r.right),
                overflow: Math.round(r.right - winWidth)
              });
            }
          });
          return {
            hasDocOverflow: docScroll > winWidth,
            docScroll,
            winWidth,
            badCount: badEls.length,
            worst: badEls[0] || null
          };
        })()`);

        results.overflowChecks.push({
          screen: screen.id,
          theme,
          viewport: vp.name,
          ...overflow,
        });
      }

      results.screenshots.push({
        screen: screen.id,
        theme,
        viewport: vp.name,
        path: fullPath,
      });
      process.stdout.write(`Captured ${filename}\n`);
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Real Keyboard Accessibility & Focus Order Check
// -----------------------------------------------------------------------------
console.log('3. Testing Keyboard Tab Order & Focus Rings...');
await setViewport(1440, 900);
await setHeadSession();
await send('Page.navigate', { url: `${BASE_URL}/department/head` });
await wait(1500);

const focusPath = [];
for (let i = 0; i < 12; i++) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await wait(60);

  const active = await evaluate(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = window.getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 30),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      hasVisibleRing: style.outlineStyle !== 'none' || style.boxShadow.includes('rgb')
    };
  })()`);
  if (active) focusPath.push(active);
}
results.keyboardAccessibility = {
  tabSteps: focusPath.length,
  focusPath,
};
console.log(`Tab traversed ${focusPath.length} interactive elements successfully.`);

// -----------------------------------------------------------------------------
// 4. Modal Escape Key Dismissal & Focus Return Check
// -----------------------------------------------------------------------------
console.log('4. Testing Modal Escape Key Dismissal...');
await setOfficerSession();
await send('Page.navigate', { url: `${BASE_URL}/department/officer` });
await wait(1500);

await evaluate(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Request extra time'));
  if (btn) btn.click();
})()`);
await wait(600);

const modalOpen = await evaluate(`Boolean(document.querySelector('.v21-modal-window, .field-dialog'))`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await wait(600);

const modalClosed = await evaluate(`!document.querySelector('.v21-modal-window, .field-dialog')`);
results.escapeDismissal = {
  modalOpened: modalOpen,
  modalDismissedOnEscape: modalClosed,
};
console.log('Escape dismissal result:', results.escapeDismissal);

// -----------------------------------------------------------------------------
// 5. 200% Zoom Layout Reflow Check
// -----------------------------------------------------------------------------
console.log('5. Testing 200% Zoom Layout Reflow...');
await setViewport(1440, 900);
await evaluate(`(() => {
  document.body.style.zoom = '200%';
})()`);
await wait(800);

const zoomOverflow = await evaluate(`(() => {
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
})()`);
results.zoom200Reflow = {
  zoomApplied: '200%',
  ...zoomOverflow,
};
console.log('200% Zoom Reflow result:', results.zoom200Reflow);

// Summary Write
const reportPath = path.join(ARTIFACT_DIR, 'v13_21_react_acceptance_qa_summary.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`=== QA RUN COMPLETE. Summary written to ${reportPath} ===`);

ws.close();
chromeProcess.kill();
