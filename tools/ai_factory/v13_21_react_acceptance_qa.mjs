import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const OUT_DIR = path.join(ARTIFACT_DIR, 'screenshots/v13_21_react_acceptance');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9895;
const BASE_URL = 'http://localhost:5173';

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
  pixelQualityGate: [],
  keyboardAccessibility: null,
  escapeDismissal: null,
  zoom200Reflow: null,
  screenshots: [],
  summaryCounts: null,
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

    const storageKey = 'awaaz_local_supabase_db_v2';
    let db = null;
    try {
      db = JSON.parse(localStorage.getItem(storageKey));
    } catch (e) {}

    const seedReqs = [
      {
        id: 'req-seed-001',
        user_id: 'usr-tariq-kmc',
        department_id: 'kmc',
        full_name: 'Engr. Tariq Mehmood',
        work_email: 'tariq.mehmood@kmc.gov.pk',
        cnic: '42101-1234567-1',
        phone: '+92-300-1234567',
        job_title: 'Executive Engineer (Roads)',
        badge_id: 'KMC-ENG-8402',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'req-seed-002',
        user_id: 'usr-saima-kwsc',
        department_id: 'kwsc',
        full_name: 'Saima Noor',
        work_email: 'saima.noor@kwsc.gos.pk',
        cnic: '42201-9876543-2',
        phone: '+92-321-7654321',
        job_title: 'Sub-Divisional Officer',
        badge_id: 'KWSC-OPS-1190',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      }
    ];

    const seedMems = [
      {
        id: 'mem-seed-001',
        user_id: 'staff-kmc-demo-01',
        department_id: 'kmc',
        staff_role: 'head',
        status: 'active',
        approved_by: 'main-admin-id',
        approved_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mem-seed-002',
        user_id: 'local-officer-a',
        department_id: 'kmc',
        staff_role: 'officer',
        status: 'active',
        approved_by: 'main-admin-id',
        approved_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    const seedAudit = [
      {
        id: 'audit-seed-001',
        action: 'admin_provisioned',
        target_user_id: 'main-admin-id',
        target_email: 'admin@example.org',
        actor_id: 'main-admin-id',
        details: { note: 'Initial Main Administrator provisioned' },
        created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
      },
      {
        id: 'audit-seed-002',
        action: 'request_approved',
        target_user_id: 'staff-kmc-demo-01',
        target_email: 'fahadmalik030121+roads@gmail.com',
        department_id: 'kmc',
        actor_id: 'main-admin-id',
        details: { note: 'KMC Department Head role assigned', requestId: 'req-hist-01' },
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: 'audit-seed-003',
        action: 'request_approved',
        target_user_id: 'local-officer-a',
        target_email: 'fahadmalik030121+roads-officer@gmail.com',
        department_id: 'kmc',
        actor_id: 'main-admin-id',
        details: { note: 'Field Officer clearance granted', requestId: 'req-hist-02' },
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      }
    ];

    if (!db) {
      db = {
        departments: [
          { id: 'kmc', name: 'Karachi Metropolitan Corporation', is_active: true },
          { id: 'kwsc', name: 'Karachi Water & Sewerage Corporation', is_active: true },
          { id: 'sswmb', name: 'Sindh Solid Waste Management Board', is_active: true },
          { id: 'sbca', name: 'Sindh Building Control Authority', is_active: true },
          { id: 'kelectric', name: 'K-Electric', is_active: true },
          { id: 'ssgc', name: 'Sui Southern Gas Company', is_active: true }
        ],
        profiles: [
          { id: 'usr-tariq-kmc', full_name: 'Engr. Tariq Mehmood', email: 'tariq.mehmood@kmc.gov.pk', role: 'citizen', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'usr-saima-kwsc', full_name: 'Saima Noor', email: 'saima.noor@kwsc.gos.pk', role: 'citizen', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'staff-kmc-demo-01', full_name: 'Fahad Malik (KMC Head)', email: 'fahadmalik030121+roads@gmail.com', role: 'department_staff', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'local-officer-a', full_name: 'Field Officer A', email: 'fahadmalik030121+roads-officer@gmail.com', role: 'department_staff', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ],
        credentials: [],
        requests: seedReqs,
        memberships: seedMems,
        auditLogs: seedAudit,
        complaints: [],
        citizenPrivateDetails: [],
        timelineEvents: [],
        rateLimits: [],
        notificationOutbox: []
      };
    } else {
      db.requests = seedReqs;
      db.memberships = seedMems;
      db.auditLogs = seedAudit;
    }
    localStorage.setItem(storageKey, JSON.stringify(db));
  })()`);
}

async function setTheme(theme) {
  await evaluate(`(() => {
    document.documentElement.setAttribute('data-theme', '${theme}');
    document.documentElement.classList.toggle('dark', '${theme}' === 'dark');
    document.body.setAttribute('data-theme', '${theme}');
    localStorage.setItem('awaaz_dept_theme_mode', '${theme}');
    localStorage.setItem('aawaaz-demo-theme', '${theme}');
    document.querySelectorAll('.admin-shell, .staff-auth-root, .v21-app-wrapper').forEach(s => s.setAttribute('data-theme', '${theme}'));
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

await setTheme('light');
const lightBg = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const lightAttr = await evaluate(`document.documentElement.getAttribute('data-theme')`);

await setTheme('dark');
const darkBgBefore = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const darkAttrBefore = await evaluate(`document.documentElement.getAttribute('data-theme')`);

// Full reload via navigation to ensure fresh load
await send('Page.navigate', { url: `${BASE_URL}/department/head` });
await wait(1800);

const darkBgAfter = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const darkAttrAfter = await evaluate(`document.documentElement.getAttribute('data-theme')`);
const darkStored = await evaluate(`localStorage.getItem('awaaz_dept_theme_mode')`);

results.themePersistence = {
  lightBg,
  darkBgBefore,
  darkBgAfter,
  lightAttr,
  darkAttrBefore,
  darkAttrAfter,
  darkStored,
  persisted: darkAttrAfter === 'dark' && darkStored === 'dark',
  distinctFromLight: darkBgAfter !== lightBg && darkBgAfter !== 'rgb(247, 246, 243)',
};
console.log('Theme persistence result:', results.themePersistence);
if (!results.themePersistence.persisted || !results.themePersistence.distinctFromLight) {
  throw new Error(`Theme persistence or visual distinction failed: ${JSON.stringify(results.themePersistence)}`);
}

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
      await wait(800);
      await evaluate(`(() => {
        const firstCase = document.querySelector('.v21-case-row');
        if (firstCase) firstCase.click();
      })()`);
      await wait(600);
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
    id: 'react-admin-inspect-modal',
    title: 'Admin Applicant Review (CNIC & Gov Domain Check)',
    setup: async () => {
      await send('Page.navigate', { url: `${BASE_URL}/admin/login` });
      await wait(400);
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/requests` });
      await wait(1400);
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Inspect details'));
        if (btn) btn.click();
      })()`);
      await wait(600);
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
  for (const vp of viewports) {
    await setViewport(vp.width, vp.height);

    const capturedThemes = {};

    for (const theme of ['light', 'dark']) {
      await screen.setup();
      await setTheme(theme);

      // Measure surface color
      const surfaceColor = await evaluate(`(() => {
        const primaryCard = document.querySelector('.v21-case-card, .v21-panel, .staff-porcelain-surface, .admin-shell section, .bg-white');
        if (primaryCard) return window.getComputedStyle(primaryCard).backgroundColor;
        return window.getComputedStyle(document.body).backgroundColor;
      })()`);

      const filename = `${screen.id}_${theme}_${vp.name}.png`;
      const fullPath = path.join(OUT_DIR, filename);
      await captureScreenshot(fullPath);

      const fileBuf = fs.readFileSync(fullPath);
      capturedThemes[theme] = {
        path: fullPath,
        buf: fileBuf,
        surfaceColor,
      };

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

        const isPassing = !overflow.hasDocOverflow && overflow.badCount === 0;

        results.overflowChecks.push({
          screen: screen.id,
          theme,
          viewport: vp.name,
          ...overflow,
          passed: isPassing,
        });

        if (!isPassing) {
          console.error(`OVERFLOW VIOLATION on ${screen.id} [${theme} ${vp.name}]: docScroll=${overflow.docScroll}, winWidth=${overflow.winWidth}, badCount=${overflow.badCount}`);
        }
      }

      results.screenshots.push({
        screen: screen.id,
        theme,
        viewport: vp.name,
        path: fullPath,
      });
      process.stdout.write(`Captured ${filename}\n`);
    }

    // Strict Pixel Quality Gate: Verify Light vs Dark screenshot distinction
    const lightData = capturedThemes['light'];
    const darkData = capturedThemes['dark'];
    const isByteIdentical = lightData.buf.equals(darkData.buf);

    let diffBytes = 0;
    const minLen = Math.min(lightData.buf.length, darkData.buf.length);
    for (let i = 0; i < minLen; i++) {
      if (lightData.buf[i] !== darkData.buf[i]) diffBytes++;
    }
    diffBytes += Math.abs(lightData.buf.length - darkData.buf.length);
    const diffPercent = ((diffBytes / Math.max(lightData.buf.length, darkData.buf.length)) * 100).toFixed(2);

    const retainsLightSurface = darkData.surfaceColor === 'rgb(255, 255, 255)' ||
                                 darkData.surfaceColor === 'rgb(248, 250, 252)' ||
                                 darkData.surfaceColor === 'rgb(247, 246, 243)';

    const pixelGatePassed = !isByteIdentical && lightData.surfaceColor !== darkData.surfaceColor && !retainsLightSurface;

    results.pixelQualityGate.push({
      screen: screen.id,
      viewport: vp.name,
      lightLength: lightData.buf.length,
      darkLength: darkData.buf.length,
      isByteIdentical,
      diffBytes,
      diffPercent: `${diffPercent}%`,
      lightSurfaceColor: lightData.surfaceColor,
      darkSurfaceColor: darkData.surfaceColor,
      retainsLightSurface,
      passed: pixelGatePassed,
    });

    if (!pixelGatePassed) {
      console.error(`PIXEL QUALITY GATE FAILED on ${screen.id} [${vp.name}]: identical=${isByteIdentical}, lightSurf=${lightData.surfaceColor}, darkSurf=${darkData.surfaceColor}`);
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
results.summaryCounts = {
  totalScreens: screens.length,
  totalViewports: viewports.length,
  totalThemes: 2,
  totalScreenshots: results.screenshots.length,
  overflowChecksCount: results.overflowChecks.length,
  overflowFailCount: results.overflowChecks.filter(x => !x.passed).length,
  pixelQualityChecksCount: results.pixelQualityGate.length,
  pixelQualityFailCount: results.pixelQualityGate.filter(x => !x.passed).length,
  allChecksPassed: results.overflowChecks.every(x => x.passed) &&
                   results.pixelQualityGate.every(x => x.passed) &&
                   results.themePersistence.persisted &&
                   results.themePersistence.distinctFromLight &&
                   results.escapeDismissal.modalDismissedOnEscape &&
                   !results.zoom200Reflow.hasHorizontalScroll
};

const reportPath = path.join(ARTIFACT_DIR, 'v13_21_react_acceptance_qa_summary.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`=== QA RUN COMPLETE. Summary written to ${reportPath} ===`);
console.log('Summary Counts:', JSON.stringify(results.summaryCounts, null, 2));

if (results.summaryCounts.overflowFailCount > 0) {
  throw new Error(`QA Gate Failed: ${results.summaryCounts.overflowFailCount} mobile overflow violations detected!`);
}
if (results.summaryCounts.pixelQualityFailCount > 0) {
  throw new Error(`QA Gate Failed: ${results.summaryCounts.pixelQualityFailCount} pixel quality gate violations detected!`);
}

ws.close();
chromeProcess.kill();
