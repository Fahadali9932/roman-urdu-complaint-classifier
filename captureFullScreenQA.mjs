import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/fullscreen_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/fullscreen_qa';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Capturing Full-Screen Edge-to-Edge Department Portal QA Screenshots on port 5173...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_fullscreen_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9258',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5173/department/login',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9258/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9258');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9258/json/list');
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
    // 1. First navigate to /department/login so the origin http://localhost:5173 is active
    await navigate('http://localhost:5173/department/login');

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

    // 2. Seed Roads session and complaints
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

    // 3. Navigate directly to /department with ref
    await navigate('http://localhost:5173/department?ref=KHI-2026-4412');

    // 4. Capture at 1440x900 (Mandatory)
    console.log('Capturing workspace_fullscreen_1440x900...');
    await capture('workspace_fullscreen_1440x900', 1440, 900);

    // 5. Capture at 1920x1080 (Mandatory)
    console.log('Capturing workspace_fullscreen_1920x1080...');
    await capture('workspace_fullscreen_1920x1080', 1920, 1080);

    // 6. Capture at 1366x768 (Laptop Standard)
    console.log('Capturing workspace_fullscreen_1366x768...');
    await capture('workspace_fullscreen_1366x768', 1366, 768);

    // 7. Capture at 1536x864 (Modern Laptop Standard)
    console.log('Capturing workspace_fullscreen_1536x864...');
    await capture('workspace_fullscreen_1536x864', 1536, 864);

    // 8. Capture Empty State at 1920x1080
    console.log('Capturing workspace_fullscreen_empty_1920x1080...');
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify([]));
      `,
    });
    await navigate('http://localhost:5173/department');
    await capture('workspace_fullscreen_empty_1920x1080', 1920, 1080);

    // 9. Capture Mobile Viewport (390x844)
    console.log('Capturing workspace_fullscreen_mobile_390x844...');
    await capture('workspace_fullscreen_mobile_390x844', 390, 844);

    console.log('All full-screen QA screenshots captured successfully!');
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
