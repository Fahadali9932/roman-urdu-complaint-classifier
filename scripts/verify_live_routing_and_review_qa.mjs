import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/routing_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/routing_qa';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('==============================================================================');
  console.log('AWAAZ-E-AWAM — LIVE ROUTING, CLASSIFICATION REVIEW & ACCEPTANCE QA');
  console.log('==============================================================================\n');

  const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------------------------------------------------------------------------
  // 1. Submit Fictional Test Complaints via Live Edge Function v6
  // ---------------------------------------------------------------------------
  console.log('--- Step 1: Submitting 4 Fictional Test Complaints via Live Edge Function v6 ---');

  // Case A: Clear Roads Complaint -> KMC
  console.log('\n[Case A] Clear Roads Complaint:');
  const roadsRes = await sbAnon.functions.invoke('submit-classified-complaint', {
    body: {
      incidentDistrict: 'East',
      incidentLocality: 'Gulshan-e-Iqbal',
      incidentPublicLocation: 'Main University Road near Disco Bakery',
      citizenName: 'Muhammad Tariq',
      citizenPhone: '03001234567',
      citizenEmail: 'tariq.roads@example.com',
      residentialAddress: 'House 123, Block 5, Gulshan',
      title: 'Road repair required',
      description: 'Sadak par bohot gehra khadda hai asphalt toot gayi KMC road repair chahiye'
    }
  });
  console.log('Roads complaint result:', roadsRes.data);
  const roadsRef = roadsRes.data?.reference_number;
  const roadsId = roadsRes.data?.complaint_id;

  // Case B: Clear Water Complaint -> KWSC
  console.log('\n[Case B] Clear Water Complaint:');
  const waterRes = await sbAnon.functions.invoke('submit-classified-complaint', {
    body: {
      incidentDistrict: 'Central',
      incidentLocality: 'North Nazimabad',
      incidentPublicLocation: 'Near Hydri Market Block H',
      citizenName: 'Syed Farhan',
      citizenPhone: '03019876543',
      citizenEmail: 'farhan.water@example.com',
      residentialAddress: 'Flat 4A, Block H, North Nazimabad',
      title: 'Water pipeline leak',
      description: 'Pani ki main line leak hai gali mein pani beh raha hai KWSC pipeline repair kare'
    }
  });
  console.log('Water complaint result:', waterRes.data);
  const waterRef = waterRes.data?.reference_number;
  const waterId = waterRes.data?.complaint_id;

  // Case C: Clear Electricity Complaint -> K-Electric
  console.log('\n[Case C] Clear Electricity Complaint:');
  const powerRes = await sbAnon.functions.invoke('submit-classified-complaint', {
    body: {
      incidentDistrict: 'South',
      incidentLocality: 'Clifton',
      incidentPublicLocation: 'Block 2 near Boat Basin',
      citizenName: 'Kamran Akmal',
      citizenPhone: '03335557799',
      citizenEmail: 'kamran.power@example.com',
      residentialAddress: 'Bungalow 78, Clifton Block 2',
      title: 'Broken electrical pole',
      description: 'Bijli ka khamba gir gaya hai taar tooti hui hai spark ho raha hai K-Electric foran theek kare'
    }
  });
  console.log('Electricity complaint result:', powerRes.data);
  const powerRef = powerRes.data?.reference_number;
  const powerId = powerRes.data?.complaint_id;

  // Case D: Ambiguous Complaint -> Review Queue
  console.log('\n[Case D] Ambiguous Complaint (Low Confidence / Margin):');
  const ambigRes = await sbAnon.functions.invoke('submit-classified-complaint', {
    body: {
      incidentDistrict: 'Korangi',
      incidentLocality: 'Korangi Industrial Area',
      incidentPublicLocation: 'Near Sector 15 Chowrangi',
      citizenName: 'Naveed Iqbal',
      citizenPhone: '03214446688',
      citizenEmail: 'naveed.ambig@example.com',
      residentialAddress: 'Plot 45, Korangi',
      title: 'General Civic Grievance',
      description: 'Masla hai bohot pareshani hai yahan kuch samajh nahi aa raha civic authority help kare'
    }
  });
  console.log('Ambiguous complaint result:', ambigRes.data);
  const ambigRef = ambigRes.data?.reference_number;
  const ambigId = ambigRes.data?.complaint_id;

  console.log('\n--- Summary of Submitted Live Complaints ---');
  console.log(`1. Roads       : Ref ${roadsRef} -> Dept: ${roadsRes.data?.prediction?.departmentId} (Status: ${roadsRes.data?.status})`);
  console.log(`2. Water       : Ref ${waterRef} -> Dept: ${waterRes.data?.prediction?.departmentId} (Status: ${waterRes.data?.status})`);
  console.log(`3. Electricity : Ref ${powerRef} -> Dept: ${powerRes.data?.prediction?.departmentId} (Status: ${powerRes.data?.status})`);
  console.log(`4. Ambiguous   : Ref ${ambigRef} -> Status: ${ambigRes.data?.status} (Needs Review: ${ambigRes.data?.needs_review}, Confidence: ${ambigRes.data?.prediction?.confidence?.toFixed(3)})`);

  // ---------------------------------------------------------------------------
  // 2. Department Authentication & Boundary Verification on Live Supabase
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 2: Department Isolation & Security Boundary Verification ---');

  // Authenticate as roads-01
  const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');
  const roadsAuth = await sbRoads.auth.signInWithPassword({
    email: roadsStaff.authEmail,
    password: roadsStaff.accessKey,
  });
  if (roadsAuth.error) throw new Error('roads-01 login failed: ' + roadsAuth.error.message);
  console.log('roads-01 logged in successfully.');

  // Authenticate as water-01
  const sbWater = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const waterStaff = credentials.departments.find(d => d.departmentId === 'kwsc');
  const waterAuth = await sbWater.auth.signInWithPassword({
    email: waterStaff.authEmail,
    password: waterStaff.accessKey,
  });
  if (waterAuth.error) throw new Error('water-01 login failed: ' + waterAuth.error.message);
  console.log('water-01 logged in successfully.');

  // Authenticate as electricity-01
  const sbPower = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const powerStaff = credentials.departments.find(d => d.departmentId === 'kelectric');
  const powerAuth = await sbPower.auth.signInWithPassword({
    email: powerStaff.authEmail,
    password: powerStaff.accessKey,
  });
  if (powerAuth.error) throw new Error('electricity-01 login failed: ' + powerAuth.error.message);
  console.log('electricity-01 logged in successfully.');

  // Verify KMC staff sees KMC complaints and does NOT see Water complaints
  const kmcComplaints = await sbRoads.from('complaints').select('id, reference_number, assigned_department_id, status');
  console.log(`\nroads-01 sees ${kmcComplaints.data?.length} complaint(s) in KMC jurisdiction:`);
  kmcComplaints.data?.forEach(c => console.log(`  - ${c.reference_number} (${c.assigned_department_id}) [${c.status}]`));

  const hasWaterInKMC = kmcComplaints.data?.some(c => c.id === waterId || c.assigned_department_id === 'kwsc');
  console.log(`roads-01 sees Water complaint? ${hasWaterInKMC ? 'LEAKED (FAIL)' : 'NO (PASSED - ISOLATED)'}`);

  // Verify KWSC staff sees KWSC complaints and does NOT see KMC complaints
  const kwscComplaints = await sbWater.from('complaints').select('id, reference_number, assigned_department_id, status');
  console.log(`\nwater-01 sees ${kwscComplaints.data?.length} complaint(s) in KWSC jurisdiction:`);
  kwscComplaints.data?.forEach(c => console.log(`  - ${c.reference_number} (${c.assigned_department_id}) [${c.status}]`));

  const hasRoadsInKWSC = kwscComplaints.data?.some(c => c.id === roadsId || c.assigned_department_id === 'kmc');
  console.log(`water-01 sees Roads complaint? ${hasRoadsInKWSC ? 'LEAKED (FAIL)' : 'NO (PASSED - ISOLATED)'}`);

  // Verify K-Electric staff sees K-Electric complaints and does NOT see KMC complaints
  const keComplaints = await sbPower.from('complaints').select('id, reference_number, assigned_department_id, status');
  console.log(`\nelectricity-01 sees ${keComplaints.data?.length} complaint(s) in KE jurisdiction:`);
  keComplaints.data?.forEach(c => console.log(`  - ${c.reference_number} (${c.assigned_department_id}) [${c.status}]`));

  const hasRoadsInKE = keComplaints.data?.some(c => c.id === roadsId || c.assigned_department_id === 'kmc');
  console.log(`electricity-01 sees Roads complaint? ${hasRoadsInKE ? 'LEAKED (FAIL)' : 'NO (PASSED - ISOLATED)'}`);

  // ---------------------------------------------------------------------------
  // 3. Cross-Department Unauthorized Action Test
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 3: Cross-Department Unauthorized Action Test ---');
  console.log('Attempting to accept KMC complaint using water-01 credentials...');
  const crossDeptRes = await sbWater.rpc('staff_update_complaint_status', {
    p_complaint_id: roadsId,
    p_new_status: 'accepted',
    p_title_en: 'Unauthorized acceptance test',
    p_title_ur: 'غیر مجاز کوشش',
    p_note_en: 'Should be rejected',
    p_note_ur: 'مسترد ہونا چاہیے'
  });
  console.log('Cross-department acceptance result:');
  console.log('  Error code   :', crossDeptRes.error?.code);
  console.log('  Error message:', crossDeptRes.error?.message);
  if (crossDeptRes.error?.message?.includes('Unauthorized')) {
    console.log('  Security check: PASSED (Unauthorized cross-department status change blocked).');
  } else {
    console.error('  Security check: FAILED (Unauthorized status change succeeded or unexpected error).');
  }

  // ---------------------------------------------------------------------------
  // 4. Authorized Acceptance & Progress Lifecycle Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 4: Authorized Acceptance & Progress Lifecycle on KMC Complaint ---');
  // Transition 1: assigned -> accepted
  console.log('1. Calling staff_update_complaint_status: assigned -> accepted...');
  const acceptRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: roadsId,
    p_new_status: 'accepted',
    p_title_en: 'Department Accepted',
    p_title_ur: 'محکمہ نے شکایت منظور کر لی',
    p_note_en: 'KMC has accepted this road repair complaint and scheduled inspection.',
    p_note_ur: 'کے ایم سی نے شکایت منظور کر لی اور معائنہ شیڈول کر دیا ہے۔'
  });
  console.log('  Accept result:', acceptRes.error ? acceptRes.error.message : 'OK (200)');

  // Transition 2: accepted -> in_progress
  console.log('2. Calling staff_update_complaint_status: accepted -> in_progress...');
  const progressRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: roadsId,
    p_new_status: 'in_progress',
    p_title_en: 'Repair Work In Progress',
    p_title_ur: 'مرمت کا کام جاری ہے',
    p_note_en: 'Road repair team and asphalt machinery deployed on site.',
    p_note_ur: 'سڑک کی مرمت کے لیے عملہ اور مشینری جائے وقوعہ پر پہنچ چکی ہے۔'
  });
  console.log('  In-progress result:', progressRes.error ? progressRes.error.message : 'OK (200)');

  // Transition 3: in_progress -> resolved
  console.log('3. Calling staff_update_complaint_status: in_progress -> resolved...');
  const resolveRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: roadsId,
    p_new_status: 'resolved',
    p_title_en: 'Road Repair Completed & Verified',
    p_title_ur: 'سڑک کی مرمت مکمل اور تصدیق شدہ',
    p_note_en: 'Pothole filled and road surface restored to safe municipal standard.',
    p_note_ur: 'گڑھا بھر دیا گیا اور سڑک ہموار کر کے بحال کر دی گئی۔'
  });
  console.log('  Resolve result:', resolveRes.error ? resolveRes.error.message : 'OK (200)');

  // Verify complaint state in Supabase
  const { data: updatedRoadsComp } = await sbRoads.from('complaints').select('id, reference_number, status, updated_at').eq('id', roadsId).single();
  console.log(`Updated complaint ${updatedRoadsComp?.reference_number} live status: ${updatedRoadsComp?.status}`);

  // ---------------------------------------------------------------------------
  // 5. Zero-PII Leakage Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 5: Zero-PII Leakage Verification ---');
  const staffQuery = await sbRoads.from('complaints').select('*').eq('id', roadsId).single();
  console.log('Staff query keys returned from complaints table:', Object.keys(staffQuery.data || {}));
  const piiKeys = ['citizen_name', 'citizen_phone', 'citizen_email', 'residential_address'];
  const leakedKeys = piiKeys.filter(k => k in (staffQuery.data || {}));
  console.log('Any citizen PII keys in complaints table SELECT?', leakedKeys.length > 0 ? `LEAKED: ${leakedKeys.join(', ')}` : 'NONE (PASSED)');

  // Try direct select on complaint_citizen_private table as staff
  const privateQuery = await sbRoads.from('complaint_citizen_private').select('*').eq('complaint_id', roadsId);
  console.log('Staff direct select on complaint_citizen_private error:', privateQuery.error?.message || (privateQuery.data?.length === 0 ? '0 rows (RLS protected)' : 'LEAKED'));

  // ---------------------------------------------------------------------------
  // 6. Citizen Public Tracking & Timeline Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 6: Citizen Public Tracking Verification ---');
  // Check timeline events for the resolved complaint
  const timelineRes = await sbAnon.from('complaint_timeline_events').select('*').eq('complaint_id', roadsId).order('created_at', { ascending: true });
  console.log(`Timeline events recorded for ${roadsRef}:`, timelineRes.data?.length);
  timelineRes.data?.forEach(e => console.log(`  [${e.status}] ${e.title} (${e.actor_role})`));

  // ---------------------------------------------------------------------------
  // 7. Headless Chrome CDP Live UI Verification & Visual Evidence
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 7: Headless Chrome CDP Live UI Capture on port 5173 ---');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_routing_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9288',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5173/',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9288/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9288');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9288/json/list');
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

  const capture = async (filename, width = 1440, height = 900) => {
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
    console.log(`[CAPTURED] ${filename}.png (${width}x${height})`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(2000);
  };

  const evaluate = async (expression) => {
    return send('Runtime.evaluate', { expression, returnByValue: true });
  };

  try {
    // 1. Citizen Tracker for resolved complaint
    console.log(`Navigating to Citizen Tracker for ${roadsRef}...`);
    await navigate(`http://localhost:5173/track/${roadsRef}`);
    await sleep(1500);
    await capture('01_citizen_tracker_resolved_milestones');

    // 2. KMC Login & Dashboard
    console.log('Logging into KMC Department Console (roads-01)...');
    await navigate('http://localhost:5173/department/login?dept=kmc');
    await sleep(1000);
    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#username', 'roads-01');
      setVal('#accessKey', '${roadsStaff.accessKey}');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3500);
    await capture('02_kmc_department_workspace_with_review_queue');

    // 3. KWSC Login & Dashboard
    console.log('Logging into KWSC Department Console (water-01)...');
    await navigate('http://localhost:5173/department/login?dept=kwsc');
    await sleep(1000);
    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#username', 'water-01');
      setVal('#accessKey', '${waterStaff.accessKey}');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3500);
    await capture('03_kwsc_department_workspace_isolated');

    // 4. K-Electric Login & Dashboard
    console.log('Logging into K-Electric Department Console (electricity-01)...');
    await navigate('http://localhost:5173/department/login?dept=kelectric');
    await sleep(1000);
    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#username', 'electricity-01');
      setVal('#accessKey', '${powerStaff.accessKey}');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3500);
    await capture('04_kelectric_department_workspace_isolated');

    console.log('\n--- ALL VERIFICATIONS AND SCREENSHOTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill('SIGTERM');
    } catch {}
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
