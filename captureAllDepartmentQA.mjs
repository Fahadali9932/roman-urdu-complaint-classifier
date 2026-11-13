import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/final_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/final_qa';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for Comprehensive Final Visual QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_final_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9245',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5185/department/login',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9245/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9245');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9245/json/list');
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

  const capture = async (name, width, height, deviceScaleFactor = 2) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: width < 768,
    });
    await sleep(700);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_DIR, `${name}.png`), buf);
    fs.writeFileSync(path.join(ARTIFACT_DIR, `${name}.png`), buf);
    console.log(`Saved screenshot: ${name}.png (${width}x${height})`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(1000);
  };

  try {
    // 1. Department Selection Screen (1440x900 & 390x844)
    console.log('\n--- 1. Department Selection Screen ---');
    await navigate('http://localhost:5185/department/login');
    await capture('01_selection_desktop_1440', 1440, 900);
    await capture('02_selection_mobile_390', 390, 844);

    // 2. Department Selection Menu Modal
    console.log('\n--- 2. Selection Menu Modal ---');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('button[aria-haspopup="dialog"]').click()`,
    });
    await sleep(600);
    await capture('03_selection_modal_desktop_1440', 1440, 900);
    await capture('04_selection_modal_mobile_390', 390, 844);

    // 3. Roads & Infrastructure Login (kmc) Viewports
    console.log('\n--- 3. Roads & Infrastructure (KMC) Login ---');
    await navigate('http://localhost:5185/department/login?dept=kmc');
    await capture('05_roads_login_desktop_1440', 1440, 900);
    await capture('06_roads_login_laptop_1024', 1024, 768);
    await capture('07_roads_login_tablet_768', 768, 1024);
    await capture('08_roads_login_mobile_390', 390, 844);
    await capture('09_roads_login_mobile_320', 320, 568);

    // 4. Roads Revoked Warning Banner
    console.log('\n--- 4. Roads Revocation Alert State ---');
    await navigate('http://localhost:5185/department/login?dept=kmc&revoked=true&reason=Administrator%20revoked%20access');
    await capture('10_roads_revoked_notice_1440', 1440, 900);

    // 5. Electricity & Power (kelectric) Login
    console.log('\n--- 5. Electricity & Power (KE) Login ---');
    await navigate('http://localhost:5185/department/login?dept=kelectric');
    await capture('11_electricity_login_desktop_1440', 1440, 900);

    // 6. Water & Sewerage (kwsc) Login
    console.log('\n--- 6. Water & Sewerage (KWSC) Login ---');
    await navigate('http://localhost:5185/department/login?dept=kwsc');
    await capture('12_water_login_desktop_1440', 1440, 900);

    // 7. Gas Utility (ssgc) Login
    console.log('\n--- 7. Gas Utility (SSGC) Login ---');
    await navigate('http://localhost:5185/department/login?dept=ssgc');
    await capture('13_gas_login_desktop_1440', 1440, 900);

    // 8. Solid Waste Management (sswmb) Login
    console.log('\n--- 8. Solid Waste Management (SSWMB) Login ---');
    await navigate('http://localhost:5185/department/login?dept=sswmb');
    await capture('14_sanitation_login_desktop_1440', 1440, 900);

    // 9. Building Control Authority (sbca) Login
    console.log('\n--- 9. Building Control (SBCA) Login ---');
    await navigate('http://localhost:5185/department/login?dept=sbca');
    await capture('15_building_login_desktop_1440', 1440, 900);

    // 10. Department Workspace / Dashboard (Seed authenticated session in localStorage/sessionStorage)
    console.log('\n--- 10. Department Workspace / Dashboard ---');
    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('staff_auth_session', JSON.stringify({
          userId: 'test-roads-officer-uuid',
          email: 'officer@kmc.gos.pk',
          fullName: 'Engr. Farhan Rizvi',
          role: 'department_staff',
          departmentId: 'kmc',
          departmentName: 'Roads & Infrastructure',
          departmentCode: 'KMC',
          designation: 'Executive Engineer - Roads',
          membershipStatus: 'active',
          token: 'dummy-test-token',
          expiresAt: Date.now() + 86400000
        }));
      `,
    });
    await navigate('http://localhost:5185/department');
    await capture('16_department_workspace_desktop_1440', 1440, 900);
    await capture('17_department_workspace_mobile_390', 390, 844);

    // 11. Open Status Update Modal
    console.log('\n--- 11. Status Update Modal ---');
    await send('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Update Status'));
        if (btn) btn.click();
      `,
    });
    await sleep(600);
    await capture('18_status_update_modal_desktop_1440', 1440, 900);

    console.log('\nAll 18 visual QA audit screenshots captured successfully!');
  } catch (err) {
    console.error('Error during Visual QA capture:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
    process.exit(0);
  }
}

run();
