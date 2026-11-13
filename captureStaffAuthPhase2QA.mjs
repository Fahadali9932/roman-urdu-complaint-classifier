import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_SCREENSHOT_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/staff_auth_phase2';
const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/staff_auth_phase2';

if (!fs.existsSync(WORKTREE_SCREENSHOT_DIR)) fs.mkdirSync(WORKTREE_SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for Phase 2 Visual QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase2_qa_' + Date.now());
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--user-data-dir=${tempDir}`,
    'http://localhost:5178/admin/login',
  ], { detached: true, stdio: 'ignore' });

  for (let i = 0; i < 25; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9232/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9232');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9232/json/list');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let reqId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('DOM.enable');

  // Seed sample requests and memberships in browser localStorage
  await send('Page.navigate', { url: 'http://localhost:5178/admin/login' });
  await sleep(1000);

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Seed Admin Session
        const adminSession = {
          userId: 'admin-seed-uuid-001',
          email: 'admin@example.org',
          fullName: 'Syed Farooq (Provincial Inspector)',
          role: 'main_admin',
          authenticatedAt: new Date().toISOString()
        };
        sessionStorage.setItem('awaaz_admin_session_v2', JSON.stringify(adminSession));

        // Seed DB
        const now = new Date().toISOString();
        const db = {
          departments: [
            { id: 'kwsc', name: 'Karachi Water & Sewerage Corporation (KW&SC)', name_urdu: 'کراچی واٹر اینڈ سیوریج کارپوریشن', code: 'KWSC', is_active: true },
            { id: 'kelectric', name: 'K-Electric (Infrastructure & Distribution)', name_urdu: 'کے الیکٹرک (انفراسٹرکچر و تقسیم)', code: 'KE', is_active: true },
            { id: 'sswmb', name: 'Sindh Solid Waste Management Board (SSWMB)', name_urdu: 'سندھ سالڈ ویسٹ مینجمنٹ بورڈ', code: 'SSWMB', is_active: true },
            { id: 'ssgc', name: 'Sui Southern Gas Company (SSGC)', name_urdu: 'سوئی سدرن گیس کمپنی', code: 'SSGC', is_active: true },
            { id: 'kmc', name: 'Karachi Metropolitan Corporation (KMC / DMCs)', name_urdu: 'کراچی میٹروپولیٹن کارپوریشن', code: 'KMC', is_active: true },
            { id: 'sbca', name: 'Sindh Building Control Authority (SBCA)', name_urdu: 'سندھ بلڈنگ کنٹرول اتھارٹی', code: 'SBCA', is_active: true }
          ],
          profiles: [
            { id: 'admin-seed-uuid-001', full_name: 'Syed Farooq', email: 'admin@example.org', role: 'main_admin' },
            { id: 'user-001', full_name: 'Tariq Mansoor', email: 'tariq.mansoor@ke.com.pk', role: 'citizen' },
            { id: 'user-002', full_name: 'Asim Raza', email: 'asim.raza@kwsc.gov.pk', role: 'citizen' },
            { id: 'user-003', full_name: 'Kamran Akram', email: 'kamran.akram@sswmb.gos.pk', role: 'department_staff' },
            { id: 'user-004', full_name: 'Rashid Minhas', email: 'rashid.minhas@ssgc.com.pk', role: 'department_staff' }
          ],
          credentials: [
            { userId: 'admin-seed-uuid-001', email: 'admin@example.org', passwordHash: 'sha256_emulated_QWRtaW5QYXNzMTIzIQ==' },
            { userId: 'user-001', email: 'tariq.mansoor@ke.com.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' },
            { userId: 'user-002', email: 'asim.raza@kwsc.gov.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' },
            { userId: 'user-003', email: 'kamran.akram@sswmb.gos.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' },
            { userId: 'user-004', email: 'rashid.minhas@ssgc.com.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' }
          ],
          requests: [
            { id: 'req-001', user_id: 'user-001', department_id: 'kelectric', full_name: 'Tariq Mansoor', work_email: 'tariq.mansoor@ke.com.pk', status: 'pending', created_at: now, updated_at: now },
            { id: 'req-002', user_id: 'user-002', department_id: 'kwsc', full_name: 'Asim Raza', work_email: 'asim.raza@kwsc.gov.pk', status: 'pending', created_at: now, updated_at: now },
            { id: 'req-003', user_id: 'user-003', department_id: 'sswmb', full_name: 'Kamran Akram', work_email: 'kamran.akram@sswmb.gos.pk', status: 'approved', created_at: now, updated_at: now },
            { id: 'req-004', user_id: 'user-004', department_id: 'ssgc', full_name: 'Rashid Minhas', work_email: 'rashid.minhas@ssgc.com.pk', status: 'approved', created_at: now, updated_at: now }
          ],
          memberships: [
            { id: 'mem-001', user_id: 'user-003', department_id: 'sswmb', status: 'active', approved_by: 'admin-seed-uuid-001', approved_at: now, created_at: now, updated_at: now },
            { id: 'mem-002', user_id: 'user-004', department_id: 'ssgc', status: 'active', approved_by: 'admin-seed-uuid-001', approved_at: now, created_at: now, updated_at: now }
          ],
          auditLogs: []
        };
        localStorage.setItem('awaaz_local_supabase_db_v2', JSON.stringify(db));
      })();
    `
  });
  await sleep(500);

  async function capture(filename, width, height, url, prepareFn = null) {
    console.log(`Capturing ${filename} (${width}x${height}) at ${url}...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 600,
    });

    await send('Page.navigate', { url });
    await sleep(1500);

    if (prepareFn) {
      await prepareFn(send);
      await sleep(600);
    }

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_SCREENSHOT_DIR, filename), buffer);
    fs.writeFileSync(path.join(ARTIFACT_SCREENSHOT_DIR, filename), buffer);
    console.log(`Saved ${filename}`);
  }

  // 1. Admin Requests Desktop 1440x1000 (Figma Frame 35:1041)
  await capture('09_admin_requests_desktop_1440.png', 1440, 1000, 'http://localhost:5178/admin/requests');

  // 2. Admin Requests Mobile 390x844
  await capture('10_admin_requests_mobile_390.png', 390, 844, 'http://localhost:5178/admin/requests');

  // 3. Admin Requests Urdu RTL 1440x1000
  await capture('11_admin_requests_urdu_rtl_1440.png', 1440, 1000, 'http://localhost:5178/admin/requests', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('اردو'));
        if (btn) btn.click();
      `
    });
  });

  // 4. Admin Access Management Desktop 1440x1000 (Figma Frame 35:1105)
  await capture('12_admin_access_desktop_1440.png', 1440, 1000, 'http://localhost:5178/admin/access', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('English'));
        if (enBtn) enBtn.click();
      `
    });
  });

  // 5. Admin Access Revocation Modal Open 1440x1000 (Figma Frame 35:1154 / 35:1840)
  await capture('13_admin_access_revoke_modal_1440.png', 1440, 1000, 'http://localhost:5178/admin/access', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        // Ensure in English first
        const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('English'));
        if (enBtn) enBtn.click();

        // Click first revoke button
        const revokeBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Revoke access') || b.textContent.includes('رسائی منسوخ کریں')
        );
        if (revokeBtn) revokeBtn.click();
      `
    });
  });

  // 6. Department Login displaying Immediate Revocation Notice (Real-time lockout banner)
  await capture('14_department_revoked_notice_1440.png', 1440, 1000, 'http://localhost:5178/department/login?revoked=true&reason=Staff%20transferred%20out%20of%20municipal%20division');

  console.log('All Phase 2 screenshots successfully captured!');
  ws.close();
  proc.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Phase 2 Visual QA Error:', err);
  process.exit(1);
});
