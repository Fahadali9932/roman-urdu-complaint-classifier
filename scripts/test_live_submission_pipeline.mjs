import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');

const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPipeline() {
  console.log('=== TEST 1: LIVE CITIZEN SUBMISSION TO SUPABASE ===\n');

  const submissionPayload = {
    title: 'University road khadda',
    description: 'NED University ke samne road par bohot bara khadda hai aur traffic block ho raha hai',
    incidentDistrict: 'District East',
    incidentLocality: 'Gulshan-e-Iqbal',
    incidentPublicLocation: 'University Road near NED University',
    citizenName: 'Fahad Test Citizen',
    citizenPhone: '03009876543',
    citizenEmail: 'citizen.test@awaaz.local',
    residentialAddress: 'House 42, Block 4, Gulshan-e-Iqbal',
    isDemonstration: false
  };

  console.log('Invoking submit-classified-complaint Edge Function...');
  const submitRes = await sbAnon.functions.invoke('submit-classified-complaint', {
    body: submissionPayload
  });

  if (submitRes.error) {
    console.error('Submission failed with error:', submitRes.error);
    return;
  }

  console.log('Submission response:', submitRes.data);
  const refNum = submitRes.data.reference_number;
  const complaintId = submitRes.data.complaint_id;
  const assignedDept = submitRes.data.assigned_department_id || submitRes.data.predicted_department_id;
  console.log(`✓ Complaint submitted! Reference: ${refNum}, ID: ${complaintId}, Dept: ${assignedDept}`);

  // Authenticate as KMC road staff
  console.log('\n=== TEST 2: VERIFY KMC STAFF QUERY CAN SEE NEW COMPLAINT ===\n');
  await sbRoads.auth.signInWithPassword({
    email: roadsStaff.authEmail,
    password: roadsStaff.accessKey,
  });

  const { data: compRows, error: compErr } = await sbRoads
    .from('complaints')
    .select('*, complaint_timeline_events(*)')
    .eq('id', complaintId);

  if (compErr) {
    console.error('Failed to query complaint as roads-01:', compErr);
    return;
  }

  if (compRows && compRows.length > 0) {
    console.log('✓ Found complaint in Supabase as roads-01:');
    console.log({
      id: compRows[0].id,
      ref: compRows[0].reference_number,
      heading: compRows[0].generated_heading,
      sanitized: compRows[0].sanitized_description,
      status: compRows[0].status,
      assigned_dept: compRows[0].assigned_department_id,
      timelineEventsCount: compRows[0].complaint_timeline_events?.length || 0,
    });
  } else {
    console.error('❌ Complaint not found in public.complaints for roads-01!');
  }

  // Update status as roads-01
  console.log('\n=== TEST 3: UPDATE STATUS TO ACCEPTED VIA RPC ===\n');
  const updateRes = await sbRoads.rpc('staff_update_complaint_status', {
    p_complaint_id: complaintId,
    p_new_status: 'accepted',
    p_title_en: 'Complaint Accepted by KMC',
    p_title_ur: 'شکایت کے ایم سی نے قبول کر لی',
    p_note_en: 'Inspection team assigned to NED University crossing.',
    p_note_ur: 'معائنہ ٹیم روانہ کر دی گئی ہے۔'
  });

  if (updateRes.error) {
    console.error('Failed to update status:', updateRes.error);
  } else {
    console.log('✓ Status updated to accepted successfully via RPC!');
  }

  // Verify updated status in public query
  const { data: updatedRows } = await sbRoads
    .from('complaints')
    .select('status, updated_at, complaint_timeline_events(*)')
    .eq('id', complaintId);

  console.log('Updated row in Supabase:');
  console.log({
    status: updatedRows[0].status,
    timeline: updatedRows[0].complaint_timeline_events.map(t => ({
      status: t.status,
      title: t.title,
      at: t.created_at
    }))
  });
}

testPipeline();
