import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');

const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probe() {
  console.log('=== V8 LIVE SCHEMA AUDIT ON akbwiedtmxjxcjscgitw ===\n');

  // Sign in as roads-01
  const { data: auth, error: authErr } = await sbRoads.auth.signInWithPassword({
    email: roadsStaff.authEmail,
    password: roadsStaff.accessKey,
  });

  if (authErr) {
    console.error('Auth error for roads-01:', authErr.message);
    return;
  }
  console.log('roads-01 authenticated. User ID:', auth.user.id);

  // 1. Probe incident_cases table
  const { data: casesData, error: casesErr } = await sbRoads
    .from('incident_cases')
    .select('id, case_number, department_id, title, work_status')
    .limit(5);

  if (casesErr) {
    console.log('[PROBE 1] incident_cases table error:', casesErr.code, casesErr.message);
  } else {
    console.log('[PROBE 1] incident_cases table EXISTS! Found rows:', casesData.length);
    console.log(casesData);
  }

  // 2. Probe incident_case_reports table
  const { data: icrData, error: icrErr } = await sbRoads
    .from('incident_case_reports')
    .select('id, case_id, complaint_id, reference_number')
    .limit(5);

  if (icrErr) {
    console.log('[PROBE 2] incident_case_reports table error:', icrErr.code, icrErr.message);
  } else {
    console.log('[PROBE 2] incident_case_reports table EXISTS! Found rows:', icrData.length);
    console.log(icrData);
  }

  // 3. Probe staff_accept_incident_case_reports RPC
  const { data: rpcData, error: rpcErr } = await sbRoads.rpc('staff_accept_incident_case_reports', {
    p_case_id: '00000000-0000-0000-0000-000000000000',
    p_idempotency_key: 'probe-test-key-' + Date.now(),
    p_operator_note: 'probe test'
  });

  if (rpcErr) {
    console.log('[PROBE 3] staff_accept_incident_case_reports RPC response:', rpcErr.code, rpcErr.message);
  } else {
    console.log('[PROBE 3] staff_accept_incident_case_reports RPC success:', rpcData);
  }

  // 4. Probe get_guest_complaint_status RPC
  const { data: guestRpcData, error: guestRpcErr } = await sbAnon.rpc('get_guest_complaint_status', {
    p_tracking_hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  });

  if (guestRpcErr) {
    console.log('[PROBE 4] get_guest_complaint_status RPC error:', guestRpcErr.code, guestRpcErr.message);
  } else {
    console.log('[PROBE 4] get_guest_complaint_status RPC EXISTS! Response:', guestRpcData);
  }

  // 5. Probe guest_tracking_hash column on public.complaints
  const { data: colData, error: colErr } = await sbRoads
    .from('complaints')
    .select('id, reference_number, guest_tracking_hash')
    .limit(3);

  if (colErr) {
    console.log('[PROBE 5] complaints.guest_tracking_hash column error:', colErr.code, colErr.message);
  } else {
    console.log('[PROBE 5] complaints.guest_tracking_hash column EXISTS!');
    console.log(colData);
  }
}

probe();
