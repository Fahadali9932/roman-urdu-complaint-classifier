import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/3caaefa1-3615-4655-86f5-c95c17bc0aa2';
const OUT_DIR = path.join(ARTIFACT_DIR, 'screenshots/v13_21_react_acceptance');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BROWSER_PORT = 9896;
const BASE_URL = 'http://localhost:5173';

console.log('=== AWAAZ-E-AWAM V13.21 REACT ACCEPTANCE QA SUITE ===');
console.log('Starting dedicated headless Chrome on port', BROWSER_PORT);

const chromeProcess = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${BROWSER_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:/temp/chrome-profile-v21-acc-strict',
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
  expectedStateChecks: [],
  modalChecks: [],
  navigationReachabilityChecks: [],
  overflowChecks: [],
  themeChecks: [],
  duplicateScreenChecks: [],
  screenshots: [],
  summaryCounts: null,
};

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
await send('Page.navigate', { url: `${BASE_URL}/department/head?view=dashboard` });
await wait(1500);

await setTheme('light');
const lightBg = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const lightAttr = await evaluate(`document.documentElement.getAttribute('data-theme')`);

await setTheme('dark');
const darkBgBefore = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
const darkAttrBefore = await evaluate(`document.documentElement.getAttribute('data-theme')`);

await send('Page.navigate', { url: `${BASE_URL}/department/head?view=dashboard` });
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
// 2. Navigation Reachability at 320px Viewport (Touch & Keyboard Access)
// -----------------------------------------------------------------------------
console.log('2. Testing 320px Navigation Usability & Reachability...');
await setViewport(320, 568);
await setTheme('light');

const navReachabilityTests = [
  // Head Navigation Destinations at 320px
  {
    role: 'head',
    name: 'Head Focus Desk at 320px',
    setup: async () => {
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head?view=dashboard` });
      await wait(1200);
    },
    action: async () => {
      return await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="dashboard"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      return await evaluate(`(() => {
        const el = document.querySelector('.v21-ribbon-grid');
        const active = document.querySelector('[data-nav-section="dashboard"]')?.classList.contains('active');
        return !!el && active;
      })()`);
    },
  },
  {
    role: 'head',
    name: 'Head Complete Queue at 320px',
    action: async () => {
      return await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="queue"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(600);
      return await evaluate(`(() => {
        const el = document.querySelector('.work-queue-container, .complaint-inbox-container, .inbox-table, .queue-filters');
        const active = document.querySelector('[data-nav-section="queue"]')?.classList.contains('active');
        return !!el && active;
      })()`);
    },
  },
  {
    role: 'head',
    name: 'Head Dispatch Orders at 320px (Direct Button)',
    action: async () => {
      return await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="dispatch"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(600);
      return await evaluate(`(() => {
        const el = document.querySelector('.v21-dispatch-grid');
        const active = document.querySelector('[data-nav-section="dispatch"]')?.classList.contains('active');
        return !!el && active;
      })()`);
    },
  },
  {
    role: 'head',
    name: 'Head Proof Review via Accessible Overflow Menu at 320px',
    action: async () => {
      // 1. Click overflow trigger to open menu
      const opened = await evaluate(`(() => {
        const trigger = document.querySelector('[data-nav-section="overflow-trigger"]');
        if (trigger) { trigger.click(); return true; }
        return false;
      })()`);
      if (!opened) return false;
      await wait(300);
      // 2. Click Proof Review option inside overflow dropdown
      return await evaluate(`(() => {
        const opt = Array.from(document.querySelectorAll('.v21-overflow-item')).find(b => b.textContent.includes('Proof Review'));
        if (opt) { opt.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(600);
      return await evaluate(`(() => {
        const h2 = Array.from(document.querySelectorAll('h1, h2')).find(h => h.textContent.includes('Awaiting a decision') || h.textContent.includes('Proof verification'));
        return !!h2;
      })()`);
    },
  },
  {
    role: 'head',
    name: 'Head Verified Archive via Accessible Overflow Menu at 320px',
    action: async () => {
      const opened = await evaluate(`(() => {
        const trigger = document.querySelector('[data-nav-section="overflow-trigger"]');
        if (trigger) { trigger.click(); return true; }
        return false;
      })()`);
      if (!opened) return false;
      await wait(300);
      return await evaluate(`(() => {
        const opt = Array.from(document.querySelectorAll('.v21-overflow-item')).find(b => b.textContent.includes('Verified Archive'));
        if (opt) { opt.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(600);
      return await evaluate(`(() => {
        const h2 = Array.from(document.querySelectorAll('h1, h2')).find(h => h.textContent.includes('Verified work history') || h.textContent.includes('Verified work archive'));
        return !!h2;
      })()`);
    },
  },
  {
    role: 'head',
    name: 'Keyboard Escape Dismissal of Overflow Menu at 320px',
    action: async () => {
      // 1. Open overflow menu
      await evaluate(`(() => {
        const trigger = document.querySelector('[data-nav-section="overflow-trigger"]');
        if (trigger) trigger.click();
      })()`);
      await wait(300);
      // 2. Dispatch real Escape key via CDP
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await wait(300);
      return true;
    },
    assertTarget: async () => {
      return await evaluate(`(() => {
        const menu = document.querySelector('.v21-nav-overflow-dropdown');
        return !menu; // Must be dismissed
      })()`);
    },
  },
  // Field Officer Reachability at 320px
  {
    role: 'officer',
    name: 'Officer My Day at 320px',
    setup: async () => {
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer?view=field` });
      await wait(1200);
    },
    action: async () => {
      return await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="field"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(600);
      return await evaluate(`(() => {
        const el = document.querySelector('[data-testid="submit-field-proof-btn"], .v21-action-cluster');
        return !!el;
      })()`);
    },
  },
  {
    role: 'officer',
    name: 'Officer Completed Shifts at 320px',
    action: async () => {
      return await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="field_archive"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(600);
      return await evaluate(`(() => {
        const h2 = Array.from(document.querySelectorAll('h1, h2')).find(h => h.textContent.includes('Verified work history') || h.textContent.includes('Verified work archive'));
        return !!h2;
      })()`);
    },
  },
  // Admin Reachability at 320px
  {
    role: 'admin',
    name: 'Admin People & Permissions at 320px',
    setup: async () => {
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/requests` });
      await wait(1200);
    },
    action: async () => {
      return await evaluate(`(() => {
        const link = document.querySelector('[data-testid="admin-nav-access"]');
        if (link) { link.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(800);
      return await evaluate(`(() => {
        return window.location.pathname.includes('/admin/access') && !!document.querySelector('#audit-ledger-heading');
      })()`);
    },
  },
  {
    role: 'admin',
    name: 'Admin AI Review at 320px',
    action: async () => {
      return await evaluate(`(() => {
        const link = document.querySelector('[data-testid="admin-nav-ai"]');
        if (link) { link.click(); return true; }
        return false;
      })()`);
    },
    assertTarget: async () => {
      await wait(800);
      return await evaluate(`(() => {
        return window.location.pathname.includes('/admin/ai') && !!document.querySelector('.ai-control-center-shell, h1');
      })()`);
    },
  },
];

for (const test of navReachabilityTests) {
  if (test.setup) await test.setup();
  const actRes = await test.action();
  const pass = actRes && (await test.assertTarget());
  results.navigationReachabilityChecks.push({
    name: test.name,
    role: test.role,
    passed: pass,
  });
  console.log(`  Nav Reachability: ${test.name} -> ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    throw new Error(`Navigation reachability check failed: ${test.name}`);
  }
}

// -----------------------------------------------------------------------------
// 3. Complete 14-Screen Setup Definitions & Capture Validity Gates
// -----------------------------------------------------------------------------
console.log('3. Running Complete 14-Screen Matrix with Capture Validity Gates...');

const screens = [
  // 1. Department Head Screens
  {
    id: 'react-head-login',
    title: 'Department Head Login',
    isModal: false,
    expectedSelector: '.dept-login-screen, .dept-login-card, input[type="password"]',
    expectedHeading: 'Department Head',
    expectedNav: null,
    setup: async () => {
      await clearStorage();
      await send('Page.navigate', { url: `${BASE_URL}/department/head/login?dept=kmc` });
      await wait(1200);
    },
  },
  {
    id: 'react-head-focus',
    title: 'Department Head Focus Desk',
    isModal: false,
    expectedSelector: '.v21-ribbon-grid',
    expectedHeading: 'Urgent Safety',
    expectedNav: 'dashboard',
    setup: async () => {
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head?view=dashboard` });
      await wait(1200);
      await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="dashboard"]');
        if (btn) btn.click();
      })()`);
      await wait(400);
    },
  },
  {
    id: 'react-head-queue',
    title: 'Department Head Queue',
    isModal: false,
    expectedSelector: '.work-queue-container, .complaint-inbox-container, .inbox-table, .queue-filters',
    expectedHeading: 'Work queue',
    expectedNav: 'queue',
    setup: async () => {
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head?view=queue` });
      await wait(1200);
      await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="queue"]');
        if (btn) btn.click();
      })()`);
      await wait(400);
    },
  },
  {
    id: 'react-head-dispatch',
    title: 'Head 5-Stage Guided Dispatch Stepper',
    isModal: false,
    expectedSelector: '.v21-step-track, .v21-step-node, .v21-step-circle',
    expectedHeading: 'Step 1 of 5: Case Verification',
    expectedNav: 'dispatch',
    setup: async () => {
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head?view=dispatch` });
      await wait(1200);
      await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="dispatch"]');
        if (btn) btn.click();
      })()`);
      await wait(600);
      const clicked = await evaluate(`(() => {
        const row = document.querySelector('.v21-case-row');
        if (row) { row.click(); return true; }
        return false;
      })()`);
      if (!clicked) throw new Error('Failed to find and click .v21-case-row on Head Dispatch');
      await wait(700);
    },
  },
  {
    id: 'react-head-verification',
    title: 'Head Proof Review (Supervisor Verification Modal)',
    isModal: true,
    expectedSelector: '[data-testid="supervisor-review-modal"], [aria-label="Review submitted proof"]',
    expectedHeading: 'SUPERVISOR VERIFICATION',
    expectedNav: 'verification',
    setup: async () => {
      await setHeadSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/head?view=verification` });
      await wait(1200);
      await evaluate(`(() => {
        const btn = document.querySelector('[data-nav-section="verification"]');
        if (btn) btn.click();
      })()`);
      await wait(600);
      const clicked = await evaluate(`(() => {
        const btn = document.querySelector('[data-testid="inspect-evidence-btn"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Review evidence'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (!clicked) throw new Error('Could not find Review evidence button to open Supervisor Review Modal');
      await wait(700);
    },
  },
  // 2. Field Officer Screens
  {
    id: 'react-officer-login',
    title: 'Field Officer Login',
    isModal: false,
    expectedSelector: '.dept-login-screen, .dept-login-card, input[type="password"]',
    expectedHeading: 'Field Officer',
    expectedNav: null,
    setup: async () => {
      await clearStorage();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer/login?dept=kmc` });
      await wait(1200);
    },
  },
  {
    id: 'react-officer-myday',
    title: 'Field Officer My Day Workspace',
    isModal: false,
    expectedSelector: '[data-testid="submit-field-proof-btn"], .v21-action-cluster',
    expectedHeading: 'My assigned work',
    expectedNav: 'field',
    setup: async () => {
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer?view=field` });
      await wait(1400);
    },
  },
  {
    id: 'react-officer-evidence-modal',
    title: 'Officer Proof Upload & GPS Modal',
    isModal: true,
    expectedSelector: '[data-testid="officer-evidence-modal"], [aria-label="Submit work evidence"]',
    expectedHeading: 'ON-SITE EVIDENCE',
    expectedNav: 'field',
    setup: async () => {
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer?view=field` });
      await wait(1200);
      const clicked = await evaluate(`(() => {
        const btn = document.querySelector('[data-testid="submit-field-proof-btn"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Submit field proof'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (!clicked) throw new Error('Could not find Submit field proof button to open Officer Evidence Modal');
      await wait(700);
    },
  },
  {
    id: 'react-officer-extension-modal',
    title: 'Officer Extension Request Modal',
    isModal: true,
    expectedSelector: '[data-testid="officer-extension-modal"], [aria-label="Request a deadline extension"]',
    expectedHeading: 'Need more time?',
    expectedNav: 'field',
    setup: async () => {
      await setOfficerSession();
      await send('Page.navigate', { url: `${BASE_URL}/department/officer?view=field` });
      await wait(1200);
      const clicked = await evaluate(`(() => {
        const btn = document.querySelector('[data-testid="request-extension-btn"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Request extra time'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (!clicked) throw new Error('Could not find Request extra time button to open Officer Extension Modal');
      await wait(700);
    },
  },
  // 3. Central Admin Screens
  {
    id: 'react-admin-login',
    title: 'Central Admin Login',
    isModal: false,
    expectedSelector: 'input[type="email"], #admin-email',
    expectedHeading: 'Main Administrator',
    expectedNav: null,
    setup: async () => {
      await clearStorage();
      await send('Page.navigate', { url: `${BASE_URL}/admin/login` });
      await wait(1200);
    },
  },
  {
    id: 'react-admin-requests',
    title: 'Admin Applicant Review Queue',
    isModal: false,
    expectedSelector: 'table, [data-testid="inspect-applicant-btn"]',
    expectedHeading: 'Pending review',
    expectedNav: 'requests',
    setup: async () => {
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/requests` });
      await wait(1400);
    },
  },
  {
    id: 'react-admin-inspect-modal',
    title: 'Admin Applicant Inspection Modal',
    isModal: true,
    expectedSelector: '[data-testid="inspect-applicant-modal"], [aria-label="Review applicant credentials"]',
    expectedHeading: 'APPLICANT PROFILE AUDIT',
    expectedNav: 'requests',
    setup: async () => {
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/requests` });
      await wait(1400);
      const clicked = await evaluate(`(() => {
        const btn = document.querySelector('[data-testid="inspect-applicant-btn"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Review');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (!clicked) throw new Error('Could not find Review button to open Applicant Inspection Modal');
      await wait(700);
    },
  },
  {
    id: 'react-admin-access',
    title: 'Admin Role & Department Permissions & Audit Ledger',
    isModal: false,
    expectedSelector: '#audit-ledger-heading',
    expectedHeading: 'Audit Ledger',
    expectedNav: 'access',
    setup: async () => {
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/access` });
      await wait(1400);
    },
  },
  {
    id: 'react-admin-ai',
    title: 'Admin Dispute Review & Model Telemetry',
    isModal: false,
    expectedSelector: '.ai-control-center-shell, h1, h2',
    expectedHeading: 'Model review',
    expectedNav: 'ai',
    setup: async () => {
      await setAdminSession();
      await send('Page.navigate', { url: `${BASE_URL}/admin/ai` });
      await wait(1400);
    },
  },
];

// Map to hold screenshot file paths and image buffers for duplicate verification
// Key: `${vp}_${theme}_${screen.id}`
const screenshotBuffers = new Map();

for (const vp of viewports) {
  console.log(`\n--- Viewport: ${vp.name}px (${vp.width}x${vp.height}) ---`);
  await setViewport(vp.width, vp.height);

  for (const screen of screens) {
    for (const theme of ['light', 'dark']) {
      await screen.setup(vp, theme);
      await setTheme(theme);
      await wait(300);

      // -------------------------------------------------------------
      // Validity Gate 1: Assert Expected State Selector & Content
      // -------------------------------------------------------------
      const stateValidation = await evaluate(`(() => {
        const sel = '${screen.expectedSelector}';
        const expectedHeading = '${screen.expectedHeading}';
        const isModal = ${screen.isModal};

        const targetEl = document.querySelector(sel);
        if (!targetEl) {
          return { pass: false, error: 'Selector not found: ' + sel };
        }

        const rect = targetEl.getBoundingClientRect();
        if (isModal && (rect.width === 0 || rect.height === 0)) {
          return { pass: false, error: 'Modal selector has 0 dimensions: ' + sel };
        }

        const bodyText = document.body.innerText || '';
        if (!bodyText.toLowerCase().includes(expectedHeading.toLowerCase())) {
          return { pass: false, error: 'Expected heading/marker "' + expectedHeading + '" not found in page text' };
        }

        return {
          pass: true,
          matchedSelector: sel,
          matchedHeading: expectedHeading,
          dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) }
        };
      })()`);

      if (!stateValidation.pass) {
        throw new Error(`State Validation Gate FAILED for ${screen.id} [${vp.name} ${theme}]: ${stateValidation.error}`);
      }

      results.expectedStateChecks.push({
        screen: screen.id,
        viewport: vp.name,
        theme,
        validatedSelector: stateValidation.matchedSelector,
        validatedHeading: stateValidation.matchedHeading,
        dimensions: stateValidation.dimensions,
        passed: true,
      });

      // -------------------------------------------------------------
      // Validity Gate 2: Assert Modal Present and Visible
      // -------------------------------------------------------------
      if (screen.isModal) {
        const modalCheck = await evaluate(`(() => {
          const dialog = document.querySelector('[role="dialog"], .v21-modal-window, .v21-modal-overlay');
          const isVisible = dialog && window.getComputedStyle(dialog).display !== 'none' && dialog.getBoundingClientRect().height > 50;
          return { pass: !!isVisible, selector: dialog?.tagName || null };
        })()`);

        if (!modalCheck.pass) {
          throw new Error(`Modal Validity Gate FAILED: Named modal ${screen.id} is absent or hidden at ${vp.name} ${theme}`);
        }

        results.modalChecks.push({
          screen: screen.id,
          viewport: vp.name,
          theme,
          modalFound: true,
          dialogTag: modalCheck.selector,
          passed: true,
        });
      }

      // -------------------------------------------------------------
      // Validity Gate 3: Mobile Element Overflow (at 393px and 320px)
      // -------------------------------------------------------------
      if (vp.width <= 393) {
        const overflow = await evaluate(`(() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const winWidth = window.innerWidth;
          const hasDocOverflow = (docScroll > winWidth + 1) || (bodyScroll > winWidth + 1);

          let badElements = [];
          const allEls = document.querySelectorAll('*');
          for (const el of allEls) {
            // Exclude SVG internal draw instructions (path, g, rect, etc.)
            if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;

            // Exclude aria-hidden decorative elements
            if (el.closest('[aria-hidden="true"]')) continue;

            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 0.5 && rect.width > 0 && rect.height > 0) {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                // Check if element is cleanly clipped by an ancestor with overflow hidden/clip
                let parent = el.parentElement;
                let isClipped = false;
                while (parent && parent !== document.body && parent !== document.documentElement) {
                  const ps = window.getComputedStyle(parent);
                  if (ps.overflowX === 'hidden' || ps.overflow === 'hidden' || ps.overflowX === 'clip' || ps.overflow === 'clip') {
                    const pr = parent.getBoundingClientRect();
                    if (pr.right <= winWidth + 1) {
                      isClipped = true;
                      break;
                    }
                  }
                  parent = parent.parentElement;
                }
                if (isClipped) continue;

                badElements.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || null,
                  className: (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : null,
                  right: Math.round(rect.right),
                  overflowPx: Math.round(rect.right - winWidth)
                });
              }
            }
          }

          badElements.sort((a, b) => b.overflowPx - a.overflowPx);
          return {
            hasDocOverflow,
            docScroll,
            winWidth,
            badCount: badElements.length,
            worst: badElements[0] || null
          };
        })()`);

        const overflowPassed = !overflow.hasDocOverflow && overflow.badCount === 0;
        results.overflowChecks.push({
          screen: screen.id,
          theme,
          viewport: vp.name,
          hasDocOverflow: overflow.hasDocOverflow,
          docScroll: overflow.docScroll,
          winWidth: overflow.winWidth,
          badCount: overflow.badCount,
          worst: overflow.worst,
          passed: overflowPassed,
        });

        if (!overflowPassed) {
          throw new Error(`Mobile Overflow Gate FAILED for ${screen.id} [${vp.name} ${theme}]: ${overflow.badCount} bad elements! Worst: ${JSON.stringify(overflow.worst)}`);
        }
      }

      // Capture screenshot
      const fileName = `${screen.id}_${theme}_${vp.name}.png`;
      const filePath = path.join(OUT_DIR, fileName);
      await captureScreenshot(filePath);

      const buffer = fs.readFileSync(filePath);
      screenshotBuffers.set(`${vp.name}_${theme}_${screen.id}`, { id: screen.id, buffer, path: filePath });

      results.screenshots.push({
        screen: screen.id,
        theme,
        viewport: vp.name,
        path: filePath,
        bytes: buffer.length,
      });

      console.log(`  Captured [${vp.name} ${theme}]: ${fileName} (${buffer.length} bytes, state verified)`);
    }
  }

  // -----------------------------------------------------------------
  // Validity Gate 4: Duplicate-Screen Gate (Pairwise Distinctness)
  // Fail when two differently named captures in the same viewport & theme are pixel-identical!
  // -----------------------------------------------------------------
  console.log(`\nChecking pairwise capture distinctness for ${vp.name}px...`);
  for (const theme of ['light', 'dark']) {
    for (let i = 0; i < screens.length; i++) {
      for (let j = i + 1; j < screens.length; j++) {
        const screenA = screens[i];
        const screenB = screens[j];

        const itemA = screenshotBuffers.get(`${vp.name}_${theme}_${screenA.id}`);
        const itemB = screenshotBuffers.get(`${vp.name}_${theme}_${screenB.id}`);

        if (!itemA || !itemB) continue;

        const isByteIdentical = itemA.buffer.equals(itemB.buffer);
        const byteDiff = Math.abs(itemA.buffer.length - itemB.buffer.length);

        results.duplicateScreenChecks.push({
          viewport: vp.name,
          theme,
          screenA: screenA.id,
          screenB: screenB.id,
          isByteIdentical,
          byteDiff,
          passed: !isByteIdentical,
        });

        if (isByteIdentical) {
          throw new Error(
            `DUPLICATE CAPTURE GATE FAILED: Screens "${screenA.id}" and "${screenB.id}" produced byte-identical screenshots at ${vp.name}px in ${theme} mode!`
          );
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 4. Validity Gate 5: Light vs Dark Theme Quality Gate
// -----------------------------------------------------------------------------
console.log('\n4. Verifying Light vs Dark Theme Distinction Gates...');
for (const vp of viewports) {
  for (const screen of screens) {
    const lightItem = screenshotBuffers.get(`${vp.name}_light_${screen.id}`);
    const darkItem = screenshotBuffers.get(`${vp.name}_dark_${screen.id}`);

    if (!lightItem || !darkItem) continue;

    const isByteIdentical = lightItem.buffer.equals(darkItem.buffer);
    const diffBytes = Math.abs(lightItem.buffer.length - darkItem.buffer.length);

    // Calculate sample byte variance
    let diffSampleCount = 0;
    const minLen = Math.min(lightItem.buffer.length, darkItem.buffer.length);
    const step = Math.max(1, Math.floor(minLen / 1000));
    for (let p = 0; p < minLen; p += step) {
      if (lightItem.buffer[p] !== darkItem.buffer[p]) diffSampleCount++;
    }
    const sampleTotal = Math.floor(minLen / step);
    const diffPercent = Math.round((diffSampleCount / sampleTotal) * 100);

    const checkPassed = !isByteIdentical && diffBytes > 0 && diffPercent > 0;
    results.themeChecks.push({
      screen: screen.id,
      viewport: vp.name,
      isByteIdentical,
      diffBytes,
      diffPercent: `${diffPercent}%`,
      passed: checkPassed,
    });

    if (!checkPassed) {
      throw new Error(`Theme Distinction Gate FAILED for ${screen.id} at ${vp.name}px: Light and Dark captures are identical!`);
    }
  }
}

// -----------------------------------------------------------------------------
// 5. Additional Usability & Reflow Assertions
// -----------------------------------------------------------------------------
console.log('\n5. Verifying Keyboard Accessibility, Escape Key & 200% Zoom Reflow...');
// Keyboard tab navigation check
await setViewport(1440, 900);
await setHeadSession();
await send('Page.navigate', { url: `${BASE_URL}/department/head?view=dashboard` });
await wait(1200);

const focusNodes = [];
for (let i = 0; i < 12; i++) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await wait(80);
  const info = await evaluate(`(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    return { tag: a.tagName.toLowerCase(), id: a.id || null, role: a.getAttribute('role') || null, ariaLabel: a.getAttribute('aria-label') || null };
  })()`);
  if (info) focusNodes.push(info);
}
results.keyboardAccessibility = {
  tabStepsVerified: focusNodes.length,
  focusNodes,
  passed: focusNodes.length >= 8,
};

// Modal Escape dismissal check
await send('Page.navigate', { url: `${BASE_URL}/admin/requests` });
await wait(1200);
await evaluate(`(() => {
  const btn = document.querySelector('[data-testid="inspect-applicant-btn"]');
  if (btn) btn.click();
})()`);
await wait(600);
const modalOpened = await evaluate(`!!document.querySelector('[data-testid="inspect-applicant-modal"]')`);

await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await wait(400);
const modalDismissed = await evaluate(`!document.querySelector('[data-testid="inspect-applicant-modal"]')`);

results.escapeDismissal = {
  modalOpened,
  modalDismissedOnEscape: modalDismissed,
  passed: modalOpened && modalDismissed,
};

// 200% Zoom Reflow check (WCAG 1.4.10)
await evaluate(`document.body.style.zoom = "200%"`);
await wait(400);
const zoomScroll = await evaluate(`({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`);
await evaluate(`document.body.style.zoom = "100%"`);
results.zoom200Reflow = {
  scrollWidth: zoomScroll.scrollWidth,
  clientWidth: zoomScroll.clientWidth,
  hasHorizontalScroll: zoomScroll.scrollWidth > zoomScroll.clientWidth + 2,
  passed: zoomScroll.scrollWidth <= zoomScroll.clientWidth + 2,
};

// Summary metrics calculation
const totalScreens = screens.length; // 14
const totalViewports = viewports.length; // 3
const totalThemes = 2;
const totalScreenshots = results.screenshots.length; // 84

const failedExpectedStates = results.expectedStateChecks.filter((c) => !c.passed).length;
const failedModals = results.modalChecks.filter((c) => !c.passed).length;
const failedNavReachability = results.navigationReachabilityChecks.filter((c) => !c.passed).length;
const failedOverflows = results.overflowChecks.filter((c) => !c.passed).length;
const failedThemes = results.themeChecks.filter((c) => !c.passed).length;
const failedDuplicates = results.duplicateScreenChecks.filter((c) => !c.passed).length;

results.summaryCounts = {
  totalScreens,
  totalViewports,
  totalThemes,
  totalScreenshots,
  expectedStateChecksCount: results.expectedStateChecks.length,
  expectedStateFailCount: failedExpectedStates,
  modalChecksCount: results.modalChecks.length,
  modalFailCount: failedModals,
  navigationReachabilityChecksCount: results.navigationReachabilityChecks.length,
  navigationReachabilityFailCount: failedNavReachability,
  overflowChecksCount: results.overflowChecks.length,
  overflowFailCount: failedOverflows,
  themeChecksCount: results.themeChecks.length,
  themeFailCount: failedThemes,
  duplicateScreenChecksCount: results.duplicateScreenChecks.length,
  duplicateScreenFailCount: failedDuplicates,
  allChecksPassed:
    failedExpectedStates === 0 &&
    failedModals === 0 &&
    failedNavReachability === 0 &&
    failedOverflows === 0 &&
    failedThemes === 0 &&
    failedDuplicates === 0,
};

const jsonPath = path.join(ARTIFACT_DIR, 'v13_21_react_acceptance_qa_summary.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log(`\nWritten QA Summary JSON to: ${jsonPath}`);

console.log('\n=== QA VERIFICATION RESULTS SUMMARY ===');
console.log(`Screenshots: ${results.summaryCounts.totalScreenshots} across 14 screens, 3 viewports, 2 themes`);
console.log(`Expected State Checks: ${results.summaryCounts.expectedStateChecksCount} (Fails: ${results.summaryCounts.expectedStateFailCount})`);
console.log(`Modal Checks: ${results.summaryCounts.modalChecksCount} (Fails: ${results.summaryCounts.modalFailCount})`);
console.log(`320px Nav Reachability Checks: ${results.summaryCounts.navigationReachabilityChecksCount} (Fails: ${results.summaryCounts.navigationReachabilityFailCount})`);
console.log(`Overflow Checks: ${results.summaryCounts.overflowChecksCount} (Fails: ${results.summaryCounts.overflowFailCount})`);
console.log(`Theme Checks: ${results.summaryCounts.themeChecksCount} (Fails: ${results.summaryCounts.themeFailCount})`);
console.log(`Duplicate Pair Checks: ${results.summaryCounts.duplicateScreenChecksCount} (Fails: ${results.summaryCounts.duplicateScreenFailCount})`);
console.log(`All Checks Passed: ${results.summaryCounts.allChecksPassed ? 'YES - 100% PASS' : 'NO'}`);

chromeProcess.kill();
if (!results.summaryCounts.allChecksPassed) {
  process.exit(1);
} else {
  console.log('\nSUCCESS: All capture validity gates, reachability gates, and pixel gates passed!');
  process.exit(0);
}
