import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runLifecycle() {
  console.log('--- Step 1: Guest Complaint Submission ---');
  const subRes = await sbAnon.functions.invoke('submit-classified-complaint', {
    body: {
      incidentDistrict: 'East',
      incidentLocality: 'Gulshan-e-Iqbal',
      incidentPublicLocation: 'Block 6 Main University Road',
      citizenName: 'Tariq Mehmood',
      citizenPhone: '03009988776',
      citizenEmail: 'tariq.mehmood@example.com',
      residentialAddress: 'House 55, Block 6, Gulshan',
      title: 'Road reconstruction required urgently',
      description: 'Sarak par bohot gehra gaddha hai gaariyan phans rahi hain KMC road repair foran kare',
      isDemonstration: false
    }
  });

  if (subRes.error) {
    throw new Error('Submission failed: ' + subRes.error.message);
  }

  const { reference_number: refNum, complaint_id: compId, claim_code: claimCode, status: initialStatus } = subRes.data;
  console.log(`Guest complaint submitted successfully!`);
  console.log(`Reference: ${refNum}`);
  console.log(`Complaint ID: ${compId}`);
  console.log(`Claim Code: ${claimCode}`);
  console.log(`Initial Status: ${initialStatus}`);

  // Step 2: Query public tracking as anonymous citizen
  console.log('\n--- Step 2: Anonymous Public Complaint Tracking ---');
  const { data: trackData, error: trackErr } = await sbAnon
    .from('complaints')
    .select('id, reference_number, status, assigned_department_id, complaint_timeline_events(*)')
    .eq('reference_number', refNum)
    .single();

  if (trackErr) {
    console.error('Public track query error:', trackErr.message);
  } else {
    console.log(`Public tracker found complaint ${trackData.reference_number}: Status = ${trackData.status}, Timeline events = ${trackData.complaint_timeline_events?.length}`);
  }

  // Step 3: Test claiming with a citizen account
  console.log('\n--- Step 3: Citizen Account Sign-Up & Claim ---');
  const testEmail = `citizen.test.${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const { data: citizenAuth, error: signUpErr } = await sbAnon.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Tariq Mehmood',
        role: 'citizen'
      }
    }
  });

  if (signUpErr) {
    console.log('Citizen sign-up failed (might require email confirmation):', signUpErr.message);
  } else {
    console.log('Citizen account created/signed-in. User ID:', citizenAuth.user?.id);
    const sbCitizen = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await sbCitizen.auth.signInWithPassword({ email: testEmail, password: testPassword });

    // Compute hash
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(claimCode.trim().toUpperCase()).digest('hex');

    const claimRes = await sbCitizen.rpc('claim_guest_complaint', {
      p_reference_number: refNum,
      p_claim_code_hash: hash
    });
    console.log('Claim RPC Result:', claimRes);
  }

  // Step 4: Department Acceptance Workflow (assigned -> accepted -> in_progress -> resolved)
  console.log('\n--- Step 4: Department Lifecycle Progression ---');
  const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');
  const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await sbRoads.auth.signInWithPassword({
    email: roadsStaff.authEmail,
    password: roadsStaff.accessKey,
  });

  // A: Accept complaint
  console.log('1. Accepting complaint (assigned -> accepted)...');
  const acceptRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: compId,
    p_new_status: 'accepted',
    p_title_en: 'Complaint Accepted',
    p_title_ur: 'شکایت منظور کر لی گئی',
    p_note_en: 'KMC has accepted this road repair complaint and scheduled inspection.',
    p_note_ur: 'کے ایم سی نے شکایت منظور کر لی ہے۔'
  });
  console.log('Accept result:', acceptRes.error ? acceptRes.error.message : 'OK (200)');

  // B: Start work (accepted -> in_progress)
  console.log('2. Starting remediation work (accepted -> in_progress)...');
  const progressRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: compId,
    p_new_status: 'in_progress',
    p_title_en: 'Remediation In Progress',
    p_title_ur: 'مرمت کا کام جاری ہے',
    p_note_en: 'Asphalt paving machinery dispatched to site.',
    p_note_ur: 'مشینری جائے وقوعہ پر پہنچ چکی ہے۔'
  });
  console.log('In-progress result:', progressRes.error ? progressRes.error.message : 'OK (200)');

  // C: Mark resolved (in_progress -> resolved)
  console.log('3. Resolving complaint (in_progress -> resolved)...');
  const resolveRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: compId,
    p_new_status: 'resolved',
    p_title_en: 'Pothole Fixed & Surface Restored',
    p_title_ur: 'گڑھا بھر دیا گیا اور سڑک بحال کر دی گئی',
    p_note_en: 'Pothole filled and road surface compacted to safety standards.',
    p_note_ur: 'سڑک کی مرمت مکمل ہو چکی ہے۔'
  });
  console.log('Resolve result:', resolveRes.error ? resolveRes.error.message : 'OK (200)');

  // Step 5: Final Verification in Public Tracker
  console.log('\n--- Step 5: Final Public Timeline Verification ---');
  const { data: finalComp } = await sbAnon
    .from('complaints')
    .select('id, reference_number, status, complaint_timeline_events(*)')
    .eq('reference_number', refNum)
    .single();

  console.log(`Final Complaint Status in Supabase: ${finalComp?.status}`);
  console.log(`Timeline Milestones Recorded (${finalComp?.complaint_timeline_events?.length}):`);
  finalComp?.complaint_timeline_events
    ?.sort((a, b) => a.created_at.localeCompare(b.created_at))
    .forEach(e => {
      console.log(`  - [${e.status}] ${e.title} (${e.actor_role})`);
    });
}

runLifecycle().catch(console.error);
