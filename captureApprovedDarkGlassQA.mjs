import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/approved_dark_glass';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/approved_dark_glass';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Capturing Approved Dark Glass Workspace & Modal QA Screenshots...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_approved_dark_glass_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9252',
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
      const res = await fetch('http://localhost:9252/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9252');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9252/json/list');
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

  const capture = async (filename, width, height) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await sleep(800);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_DIR, `${filename}.png`), buffer);
    fs.writeFileSync(path.join(ARTIFACT_DIR, `${filename}.png`), buffer);
    console.log(`Saved: ${filename}.png (${width}x${height})`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(1200);
  };

  try {
    // 1. Department Chooser Modal - Desktop (1440x900)
    console.log('1. Capturing department_modal_desktop_1440...');
    await navigate('http://localhost:5185/department/login');
    await capture('department_modal_desktop_1440', 1440, 900);

    // 2. Department Chooser Modal - Mobile (390x844)
    console.log('2. Capturing department_modal_mobile_390...');
    await capture('department_modal_mobile_390', 390, 844);

    // 3. Workspace - Roads Empty State - Desktop (1440x900)
    console.log('3. Capturing workspace_roads_empty_1440...');
    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          userId: 'roads-officer-uuid-001',
          username: 'roads-01',
          email: 'farhan.rizvi@kmc.gos.pk',
          departmentId: 'kmc',
          departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
          departmentCode: 'KMC',
          authenticatedAt: new Date().toISOString()
        }));
        localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify([]));
      `,
    });
    await navigate('http://localhost:5185/department');
    await capture('workspace_roads_empty_1440', 1440, 900);

    // 4. Workspace - Roads Empty State - Mobile (390x844)
    console.log('4. Capturing workspace_roads_mobile_390...');
    await capture('workspace_roads_mobile_390', 390, 844);

    // 5. Workspace - Roads Populated State with Complaint Detail - Desktop (1440x900)
    console.log('5. Capturing workspace_roads_populated_1440...');
    const seedComplaints = [
      {
        id: 'c104-4412',
        citizenId: 'cit-demo-kashif-2026',
        referenceNumber: 'KHI-2026-4412',
        citizenName: 'Kashif Mehmood',
        district: 'District South',
        locality: 'Regal Chowk, Saddar',
        title: 'Shadeed kharab sadak aur traffic rawani mein rukawat',
        description: 'Regal Chowk Saddar ke turn par barish ke baad bohot gehray gadhay par gaye hain jin mein daily bikes gir rahi hain aur traffic ka shadeed jam rehta hai. Is chowk par hazaron log rozana guzar te hain. Asphalt carpeting ki sakht zaroorat hai.',
        detectedLanguage: 'roman_urdu',
        status: 'in_progress',
        assignedDepartmentId: 'kmc',
        assignedDepartmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
        predictedDepartmentId: 'kmc',
        predictionConfidence: 0.91,
        submittedAt: '2026-10-28T11:00:00Z',
        updatedAt: '2026-11-02T17:30:00Z',
        isDemonstration: true,
        timeline: [
          {
            id: 't-401',
            status: 'submitted',
            title: 'Complaint Registered',
            titleUrdu: 'شکایت درج ہو گئی',
            description: 'Road damage and traffic obstruction complaint received.',
            descriptionUrdu: 'سڑک ٹوٹ پھوٹ اور ٹریفک مسائل کی شکایت درج ہوئی۔',
            timestamp: '2026-10-28T11:00:00Z',
            actorRole: 'citizen',
          },
          {
            id: 't-402',
            status: 'assigned',
            title: 'Assigned to KMC Engineering Wing',
            titleUrdu: 'کے ایم سی انجینئرنگ ونگ کو تفویض',
            description: 'Assigned to KMC Road Rehabilitation Cell South.',
            descriptionUrdu: 'کے ایم سی روڈ ری ہیبلیٹیشن ونگ کو کام سونپ دیا گیا۔',
            timestamp: '2026-10-29T10:15:00Z',
            actorRole: 'department_officer',
            departmentCode: 'KMC',
          },
          {
            id: 't-403',
            status: 'in_progress',
            title: 'Patchwork & Carpeting Started',
            titleUrdu: 'مرمتی کام کا آغاز',
            description: 'Night shift asphalt patch crew deployed to resurface Regal Chowk intersection.',
            descriptionUrdu: 'رات کے اوقات میں اسفالٹ کارپٹنگ ٹیم نے کام شروع کر دیا۔',
            timestamp: '2026-10-31T23:00:00Z',
            actorRole: 'department_officer',
            departmentCode: 'KMC',
          }
        ],
      },
      {
        id: 'c104-5521',
        citizenId: 'cit-demo-faraz-2026',
        referenceNumber: 'KHI-2026-5521',
        citizenName: 'Faraz Ahmed',
        district: 'District Central',
        locality: '5 Star Chowrangi, North Nazimabad',
        title: 'Flyover slip road surface collapsed',
        description: 'Slip road heading towards Sakhi Hassan has sunken completely near the service lane. Heavy vehicles cannot pass.',
        detectedLanguage: 'roman_urdu',
        status: 'submitted',
        assignedDepartmentId: 'kmc',
        assignedDepartmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
        predictedDepartmentId: 'kmc',
        predictionConfidence: 0.94,
        submittedAt: '2026-11-10T14:20:00Z',
        updatedAt: '2026-11-10T14:20:00Z',
        isDemonstration: true,
        timeline: [
          {
            id: 't-501',
            status: 'submitted',
            title: 'Complaint Registered',
            titleUrdu: 'شکایت درج ہو گئی',
            description: 'Slip road structural subsidence reported.',
            descriptionUrdu: 'سلپ روڈ کے بیٹھ جانے کی اطلاع۔',
            timestamp: '2026-11-10T14:20:00Z',
            actorRole: 'citizen',
          }
        ],
      }
    ];

    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          userId: 'roads-officer-uuid-001',
          username: 'roads-01',
          email: 'farhan.rizvi@kmc.gos.pk',
          departmentId: 'kmc',
          departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
          departmentCode: 'KMC',
          authenticatedAt: new Date().toISOString()
        }));
        localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify(${JSON.stringify(seedComplaints)}));
      `,
    });

    await navigate('http://localhost:5185/department?ref=KHI-2026-4412');
    await capture('workspace_roads_populated_1440', 1440, 900);

    // 6. Status Update Modal - Desktop (1440x900)
    console.log('6. Capturing workspace_roads_status_modal_1440...');
    const clickRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Review complaint') || b.textContent.includes('Update Status'));
          if (btn) {
            btn.click();
            return 'clicked: ' + btn.textContent.trim();
          }
          return 'btn_not_found: ' + btns.map(b => b.textContent.trim()).join(' | ');
        })()
      `,
    });
    console.log('Click result:', clickRes.result.value);
    await sleep(800);
    await capture('workspace_roads_status_modal_1440', 1440, 900);

    // 7. Secondary Department Theme - Water & Sewerage (KWSC) Cyan Accent - Desktop (1440x900)
    console.log('7. Capturing workspace_other_department_theme_1440 (Water / KWSC)...');
    const waterComplaints = [
      {
        id: 'c201-8891',
        citizenId: 'cit-demo-salman-2026',
        referenceNumber: 'KHI-2026-8891',
        citizenName: 'Salman Qureshi',
        district: 'District East',
        locality: 'Gulshan-e-Iqbal Block 13-D',
        title: 'Main pipeline leak flooding street',
        description: 'Main 12-inch water distribution line near Disco Bakery is leaking profusely. Thousands of gallons drinking water wasted daily and road submerged.',
        detectedLanguage: 'roman_urdu',
        status: 'assigned',
        assignedDepartmentId: 'kwsc',
        assignedDepartmentName: 'Karachi Water & Sewerage Corporation (KWSC)',
        predictedDepartmentId: 'kwsc',
        predictionConfidence: 0.95,
        submittedAt: '2026-11-12T09:15:00Z',
        updatedAt: '2026-11-12T10:00:00Z',
        isDemonstration: true,
        timeline: [
          {
            id: 't-801',
            status: 'submitted',
            title: 'Complaint Registered',
            titleUrdu: 'شکایت درج ہو گئی',
            description: 'Water pipeline rupture reported.',
            descriptionUrdu: 'پانی کی مین پائپ لائن پھٹنے کی اطلاع۔',
            timestamp: '2026-11-12T09:15:00Z',
            actorRole: 'citizen',
          },
          {
            id: 't-802',
            status: 'assigned',
            title: 'Assigned to KWSC East Maintenance Cell',
            titleUrdu: 'کے ڈبلیو ایس سی مینٹیننس سیل کو تفویض',
            description: 'Dispatched to Gulshan-e-Iqbal Water Supply Sub-division.',
            descriptionUrdu: 'گلشن اقبال واٹر سپلائی سب ڈویژن کو تفویض۔',
            timestamp: '2026-11-12T10:00:00Z',
            actorRole: 'department_officer',
            departmentCode: 'KWSC',
          }
        ],
      }
    ];

    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
          userId: 'water-officer-uuid-001',
          username: 'water-01',
          email: 'tariq.aziz@kwsc.gos.pk',
          departmentId: 'kwsc',
          departmentName: 'Karachi Water & Sewerage Corporation (KWSC)',
          departmentCode: 'KWSC',
          authenticatedAt: new Date().toISOString()
        }));
        localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify(${JSON.stringify(waterComplaints)}));
      `,
    });

    await navigate('http://localhost:5185/department?ref=KHI-2026-8891');
    await capture('workspace_other_department_theme_1440', 1440, 900);

    console.log('All QA screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
    process.exit(0);
  }
}

run();
