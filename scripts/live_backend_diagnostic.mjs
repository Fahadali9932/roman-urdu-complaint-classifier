import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLiveStatus() {
  console.log('==============================================================================');
  console.log('AWAAZ-E-AWAM — PHASE 3B LIVE SUPABASE DIAGNOSTIC & VERIFICATION SUITE');
  console.log('Project Reference: akbwiedtmxjxcjscgitw');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('==============================================================================\n');

  // 1. Check live edge function inference
  console.log('--- 1. Testing Live Edge Function submit-classified-complaint ---');
  try {
    const testPayload = {
      title: 'Road crack test',
      description: 'Sarak kharab hai bohot baray gadhay hain',
      incidentDistrict: 'District East',
      incidentLocality: 'Gulshan-e-Iqbal',
      incidentPublicLocation: 'Main road near disco bakery',
      citizenName: 'Diagnostic Agent',
      citizenPhone: '03001234567',
      citizenEmail: 'diagnostic@example.com',
      residentialAddress: 'House 1, Gulshan',
      isDemonstration: false
    };

    const res = await sbAnon.functions.invoke('submit-classified-complaint', { body: testPayload });
    console.log('HTTP Status:', res.error ? 'Error / ' + res.error.message : '200 OK');
    console.log('Response Payload:', JSON.stringify(res.data, null, 2));

    if (res.data?.prediction?.confidence) {
      const conf = res.data.prediction.confidence;
      console.log(`Live Confidence: ${(conf * 100).toFixed(2)}%`);
      if (conf < 0.40) {
        console.log('DIAGNOSIS: Live Edge Function is running Version 6 (Legacy model, confidence ~34.3%).');
        console.log('The retrained model (expected confidence ~76.3%) is NOT yet deployed on the remote Edge Function.');
      } else {
        console.log('DIAGNOSIS: Live Edge Function is running the retrained model!');
      }
    }
  } catch (err) {
    console.error('Edge function call failed:', err);
  }

  // 2. Check live RPC staff_review_and_assign_complaint
  console.log('\n--- 2. Testing Live RPC public.staff_review_and_assign_complaint ---');
  try {
    // Authenticate as roads-01 (KMC)
    const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');
    const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await sbRoads.auth.signInWithPassword({
      email: roadsStaff.authEmail,
      password: roadsStaff.accessKey,
    });

    if (authError) {
      console.error('roads-01 login error:', authError.message);
    } else {
      console.log('roads-01 authenticated successfully. User ID:', authData.user.id);
      
      const rpcRes = await sbRoads.rpc('staff_review_and_assign_complaint', {
        p_complaint_id: '00000000-0000-0000-0000-000000000000',
        p_target_department_id: 'kmc',
        p_notes: 'Probe test',
      });

      console.log('RPC Response:', rpcRes);
      if (rpcRes.error?.code === 'PGRST202') {
        console.log('DIAGNOSIS: Function public.staff_review_and_assign_complaint NOT found in schema cache (PGRST202).');
        console.log('Migration 20261120000000_staff_classification_review_queue.sql has NOT been applied to live database.');
      } else {
        console.log('DIAGNOSIS: RPC exists! Error code:', rpcRes.error?.code, rpcRes.error?.message);
      }
    }
  } catch (err) {
    console.error('RPC check failed:', err);
  }

  // 3. Check existing live complaints table status distribution
  console.log('\n--- 3. Live public.complaints Table Status & Data State ---');
  try {
    const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');
    const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await sbRoads.auth.signInWithPassword({
      email: roadsStaff.authEmail,
      password: roadsStaff.accessKey,
    });

    const { data: kmcData, error: kmcError } = await sbRoads
      .from('complaints')
      .select('id, reference_number, assigned_department_id, status, created_at')
      .order('created_at', { ascending: false });

    if (kmcError) {
      console.error('Failed to query complaints as roads-01:', kmcError.message);
    } else {
      console.log(`roads-01 can select ${kmcData.length} complaint(s):`);
      const statusCounts = {};
      kmcData.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        console.log(`  - [${c.reference_number}] Status: ${c.status}, Dept: ${c.assigned_department_id}`);
      });
      console.log('Status breakdown:', statusCounts);
    }
  } catch (err) {
    console.error('Query complaints failed:', err);
  }

  // 4. Test 6-department login & isolation on live Supabase
  console.log('\n--- 4. Testing 6-Department Login & Isolation on Live Supabase ---');
  const depts = [
    { id: 'kmc', name: 'KMC (Roads & Infrastructure)' },
    { id: 'kwsc', name: 'KWSC (Water & Sewerage)' },
    { id: 'kelectric', name: 'K-Electric (Power & Grid)' },
    { id: 'ssgc', name: 'SSGC (Gas & Pipelines)' },
    { id: 'sswmb', name: 'SSWMB (Solid Waste)' },
    { id: 'sbca', name: 'SBCA (Building Control)' },
  ];

  for (const dept of depts) {
    const staff = credentials.departments.find(d => d.departmentId === dept.id);
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: loginErr } = await client.auth.signInWithPassword({
      email: staff.authEmail,
      password: staff.accessKey,
    });

    if (loginErr) {
      console.log(`[${dept.id.toUpperCase()}] Login FAILED: ${loginErr.message}`);
    } else {
      const { data: deptComplaints } = await client
        .from('complaints')
        .select('id, reference_number, assigned_department_id, status');
      
      const foreignComplaints = (deptComplaints || []).filter(
        c => c.assigned_department_id && c.assigned_department_id !== dept.id
      );

      console.log(`[${dept.id.toUpperCase()}] Login OK. Visible complaints: ${deptComplaints?.length || 0}. Foreign leaks: ${foreignComplaints.length}`);
    }
  }
}

checkLiveStatus().catch(console.error);
