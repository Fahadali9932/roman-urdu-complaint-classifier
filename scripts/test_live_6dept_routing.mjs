import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbwiedtmxjxcjscgitw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM';
const CREDENTIALS_PATH = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/.credentials/department_staff_credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cases = [
  {
    dept: 'kmc',
    name: 'KMC (Roads & Infrastructure)',
    title: 'Sadak par gehra khadda aur asphalt toot gaya',
    description: 'Main Shahrah-e-Faisal par bohot gehra khadda hai gaariyan phans rahi hain KMC road repair asphalt repair foran kare',
    district: 'East',
    locality: 'Gulshan-e-Iqbal',
    publicLocation: 'Main Shahrah-e-Faisal near Nursery',
  },
  {
    dept: 'kwsc',
    name: 'KWSC (Water & Sewerage)',
    title: 'Gutter ka pani ubal raha hai pipeline leak',
    description: 'Pani ki main line phat gayi hai aur sewerage gutter ka ganda pani sadak par beh raha hai KWSC water pipeline repair kare',
    district: 'Central',
    locality: 'North Nazimabad',
    publicLocation: 'Block H near Hydri Market',
  },
  {
    dept: 'kelectric',
    name: 'K-Electric (Power & Grid)',
    title: 'Bijli ka khamba gir gaya spark ho raha hai',
    description: 'Bijli ka transformer blast ho gaya taar zameen par giri hai current lagne ka khatra hai K-Electric power shutdown kare',
    district: 'South',
    locality: 'Clifton',
    publicLocation: 'Block 2 near Boat Basin',
  },
  {
    dept: 'ssgc',
    name: 'SSGC (Gas & Pipelines)',
    title: 'Gas pipeline leak shadeed badboo',
    description: 'Ghar ke bahar sui gas pipeline leak ho rahi hai gas ki shadeed badboo hai aag lagne ka khatra hai SSGC emergency team bheje',
    district: 'West',
    locality: 'SITE Area',
    publicLocation: 'Near Siemens Chowrangi',
  },
  {
    dept: 'sswmb',
    name: 'SSWMB (Solid Waste)',
    title: 'Kachray ka dher aur safai na hona',
    description: 'Gali mein bohot bara kachra aur gandagi ka dher laga hai kachray ka dabba bhar chuka hai SSWMB kachra uthaye garbage clean kare',
    district: 'Malir',
    locality: 'Malir Cantonment',
    publicLocation: 'Sector 5 near Market',
  },
  {
    dept: 'sbca',
    name: 'SBCA (Building Control)',
    title: 'Ghair qanooni imarat ki tameer',
    description: 'Humaare mohallay mein bila ijazat ghair qanooni commercial building chothi manzil ban rahi hai SBCA illegal construction rokay',
    district: 'Korangi',
    locality: 'Korangi Industrial Area',
    publicLocation: 'Sector 15 near Main Road',
  },
];

async function runTest() {
  console.log('--- Submitting 6 Fictional Test Complaints to Live Edge Function ---');
  const results = [];

  for (const c of cases) {
    console.log(`\nSubmitting complaint for target ${c.dept.toUpperCase()}...`);
    const res = await sbAnon.functions.invoke('submit-classified-complaint', {
      body: {
        incidentDistrict: c.district,
        incidentLocality: c.locality,
        incidentPublicLocation: c.publicLocation,
        citizenName: `Test Citizen (${c.dept})`,
        citizenPhone: '03001234567',
        citizenEmail: `citizen.${c.dept}@example.com`,
        residentialAddress: `House 123, ${c.locality}`,
        title: c.title,
        description: c.description,
        isDemonstration: false
      }
    });

    if (res.error) {
      console.error(`Submission error for ${c.dept}:`, res.error);
      results.push({ dept: c.dept, error: res.error.message });
    } else {
      console.log(`Result for ${c.dept}:`, {
        reference: res.data?.reference_number,
        complaintId: res.data?.complaint_id,
        predictedDept: res.data?.prediction?.departmentId,
        confidence: res.data?.prediction?.confidence ? (res.data.prediction.confidence * 100).toFixed(2) + '%' : undefined,
        status: res.data?.status,
        needsReview: res.data?.needs_review,
        claimCode: res.data?.claim_code
      });
      results.push({
        dept: c.dept,
        reference: res.data?.reference_number,
        id: res.data?.complaint_id,
        predicted: res.data?.prediction?.departmentId,
        confidence: res.data?.prediction?.confidence,
        status: res.data?.status,
        needsReview: res.data?.needs_review,
        claimCode: res.data?.claim_code
      });
    }
  }

  console.log('\n--- Cross-Department Live Visibility Verification (36 checks: 6 departments x 6 complaints) ---');
  const staffClients = {};
  for (const dept of cases.map(c => c.dept)) {
    const staff = credentials.departments.find(d => d.departmentId === dept);
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await client.auth.signInWithPassword({
      email: staff.authEmail,
      password: staff.accessKey,
    });
    staffClients[dept] = client;
  }

  for (const comp of results) {
    if (comp.error) continue;
    console.log(`\nChecking visibility for Complaint ${comp.reference} (Target: ${comp.dept.toUpperCase()}, Status: ${comp.status}):`);
    for (const [staffDept, client] of Object.entries(staffClients)) {
      const { data } = await client
        .from('complaints')
        .select('id, reference_number, assigned_department_id, status')
        .eq('id', comp.id);
      
      const canSee = (data && data.length > 0);
      const isExpected = (comp.status === 'assigned' && staffDept === comp.dept);
      
      console.log(`  - Staff [${staffDept.toUpperCase()}]: ${canSee ? 'CAN SEE' : 'CANNOT SEE'} (Expected: ${isExpected ? 'YES' : 'NO'}) -> ${canSee === isExpected ? 'PASS' : (comp.status === 'under_review' ? 'PENDING_REVIEW' : 'FAIL')}`);
    }
  }
}

runTest().catch(console.error);
