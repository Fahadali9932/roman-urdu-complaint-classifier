import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');

const sbRoads = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probeTables() {
  await sbRoads.auth.signInWithPassword({
    email: roadsStaff.authEmail,
    password: roadsStaff.accessKey,
  });

  const tablesToProbe = [
    'complaints',
    'departments',
    'department_memberships',
    'profiles',
    'complaint_timeline_events',
    'complaint_privacy_records',
    'staff_access_requests',
    'staff_audit_logs',
    'citizen_guest_claims',
    'complaint_priority_overrides',
    'incident_cases',
    'incident_case_reports',
    'incident_case_events',
    'case_batch_operations'
  ];

  console.log('--- Probing Tables ---');
  for (const table of tablesToProbe) {
    const { data, error } = await sbRoads.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table ${table}: ${error.code} ${error.message}`);
    } else {
      console.log(`✓ Table ${table}: EXISTS (count: ${data})`);
    }
  }

  // Probe columns of complaints
  console.log('\n--- Probing complaints table columns ---');
  const { data: sampleComplaint, error: cErr } = await sbRoads
    .from('complaints')
    .select('*')
    .limit(1);

  if (cErr) {
    console.error('Error selecting complaint:', cErr);
  } else if (sampleComplaint && sampleComplaint.length > 0) {
    console.log('Columns in public.complaints:');
    console.log(Object.keys(sampleComplaint[0]));
  }
}

probeTables();
