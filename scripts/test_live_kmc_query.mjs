import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const roadsStaff = credentials.departments.find(d => d.departmentId === 'kmc');

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSync() {
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: roadsStaff.authEmail,
    password: roadsStaff.accessKey,
  });

  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  console.log('Authenticated as roads-01');

  // Test the exact query from syncWithSupabase
  const deptId = 'kmc';
  const { data, error } = await sb
    .from('complaints')
    .select('*')
    .or(`assigned_department_id.eq.${deptId},predicted_department_id.eq.${deptId}`);

  console.log('Error:', error);
  console.log('Complaints count returned for KMC:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('Sample complaint from live Supabase:');
    console.log({
      id: data[0].id,
      ref: data[0].reference_number,
      title: data[0].title,
      heading: data[0].generated_heading,
      status: data[0].status,
      assigned_dept: data[0].assigned_department_id,
      locality: data[0].incident_locality,
      location: data[0].incident_public_location,
    });
  }
}

testSync();
