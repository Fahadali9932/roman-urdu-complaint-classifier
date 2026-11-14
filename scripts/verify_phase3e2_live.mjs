/**
 * Phase 3E.2 Comprehensive Live Verification Script
 * Project: akbwiedtmxjxcjscgitw
 * Edge Function: submit-classified-complaint (Version 10)
 *
 * Verifies:
 * 1. Live Edge Function v10 outputs natural, factual headings and summaries.
 * 2. Scenarios A, B, C, D, E are tested live against Supabase.
 * 3. Complete private address span is redacted without leaving street/block fragments.
 * 4. Zero hallucinated problems (garbage complaints never invent road damage).
 * 5. Zero "at none" artifacts.
 * 6. Department staff can only access sanitized descriptions in public.complaints.
 * 7. Department staff are strictly blocked by RLS from public.complaint_citizen_private.
 * 8. 36-cell isolation matrix remains 100% enforced across all 6 departments.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://akbwiedtmxjxcjscgitw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYndpZWR0bXhqeGNqc2NnaXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjU4NTIsImV4cCI6MjExMDE0MTg1Mn0.q840X7RB-2ZC34ECCO1P3YCy-YFJvxeSznMIe_QhFiM";

const credsPath = path.join(__dirname, "..", ".credentials", "department_staff_credentials.json");
const credentials = JSON.parse(fs.readFileSync(credsPath, "utf8"));
const staffCreds = credentials.departments;

const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getStaffClient(deptId) {
  const cred = staffCreds.find((c) => c.departmentId === deptId);
  if (!cred) throw new Error(`No credentials for ${deptId}`);
  const staff = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await staff.auth.signInWithPassword({
    email: cred.authEmail,
    password: cred.accessKey,
  });
  if (error || !data.session) {
    throw new Error(`Failed to authenticate ${cred.authEmail}: ${error?.message}`);
  }
  return { staff, user: data.user, token: data.session.access_token };
}

async function invokeSubmitFunction(payload) {
  const url = `${SUPABASE_URL}/functions/v1/submit-classified-complaint`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Edge function returned ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function run() {
  console.log("==================================================================");
  console.log("AWAAZ-E-AWAM — PHASE 3E.2 LIVE DEPLOYMENT & SECURITY VERIFICATION");
  console.log("==================================================================\n");

  let passes = 0;
  let failures = 0;

  function assert(desc, condition, details = "") {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passes++;
    } else {
      console.error(`  ✗ FAIL: ${desc} ${details ? `(${details})` : ""}`);
      failures++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. LIVE SUBMISSION TESTS FOR SCENARIOS A, B, C, D, E
  // -------------------------------------------------------------------------
  console.log("--- 1. Live Edge Function v10 Submission Tests ---");

  // Scenario A: Electricity and water motor consequence
  console.log("\n[Test Scenario A: Electricity outage with water motor consequence]");
  const payloadA = {
    title: "Bijli band aur motor band",
    description: "Humare ghar 3 din se bijli nahi aa rahi jiski wajah se motor nahi chal rahi aur pani bhi nahi hai.",
    incidentDistrict: "East",
    incidentLocality: "Gulshan-e-Iqbal",
    incidentPublicLocation: "none",
    citizenName: "Tariq Mehmood",
    citizenPhone: "03001234567",
    residentialAddress: "House 12, Street 4, Gulshan-e-Iqbal",
    isDemonstration: false,
  };
  const resA = await invokeSubmitFunction(payloadA);
  assert("Scenario A returned reference number", Boolean(resA.reference_number));
  assert("Scenario A heading is 'Electricity Outage for Three Days'", resA.privacy.heading === "Electricity Outage for Three Days", resA.privacy.heading);
  assert("Scenario A summary mentions water pump consequence", resA.privacy.summary.includes("water pump from working"), resA.privacy.summary);
  assert("Scenario A summary has zero 'at none'", !resA.privacy.summary.includes("at none"));

  // Scenario B: Garbage 4 days with bad smell
  console.log("\n[Test Scenario B: Garbage 4 days uncollected with bad smell]");
  const payloadB = {
    title: "Gali mein kachra",
    description: "Hamari gali mein 4 din se kachra nahi uthaya gaya aur bohat badboo aa rahi hai.",
    incidentDistrict: "East",
    incidentLocality: "Gulshan-e-Iqbal",
    incidentPublicLocation: "none",
    citizenName: "Kashif Ali",
    citizenPhone: "03219876543",
    residentialAddress: "House 45, Street 2, Gulshan",
    isDemonstration: false,
  };
  const resB = await invokeSubmitFunction(payloadB);
  assert("Scenario B returned reference number", Boolean(resB.reference_number));
  assert("Scenario B heading is 'Garbage Not Collected for Four Days'", resB.privacy.heading === "Garbage Not Collected for Four Days", resB.privacy.heading);
  assert("Scenario B summary explains garbage and smell", resB.privacy.summary.includes("garbage has not been collected from their street for four days") && resB.privacy.summary.includes("bad smell"), resB.privacy.summary);
  assert("Scenario B summary has zero 'at none'", !resB.privacy.summary.includes("at none"));

  // Scenario C: Damaged road and potholes
  console.log("\n[Test Scenario C: Damaged road with deep potholes]");
  const payloadC = {
    title: "Road toot gayi hai",
    description: "Hamare area ki road toot gayi hai aur bohat gadday hain.",
    incidentDistrict: "Central",
    incidentLocality: "Gulberg",
    incidentPublicLocation: "Water Pump Chowrangi",
    citizenName: "Zahid Ahmed",
    citizenPhone: "03335557788",
    residentialAddress: "House 78, Gulberg",
    isDemonstration: false,
  };
  const resC = await invokeSubmitFunction(payloadC);
  assert("Scenario C returned reference number", Boolean(resC.reference_number));
  assert("Scenario C heading is 'Damaged Road and Potholes'", resC.privacy.heading === "Damaged Road and Potholes", resC.privacy.heading);
  assert("Scenario C summary reports potholes and driving hazard", resC.privacy.summary.includes("severe road damage with deep potholes") && resC.privacy.summary.includes("hazardous driving conditions"), resC.privacy.summary);

  // Scenario D: Full address span & personal information redaction
  console.log("\n[Test Scenario D: Multi-segment address span & PII redaction]");
  const payloadD = {
    title: "Water pipe broken",
    description: "Mera naam Ahmed Raza hai, phone 03001234567 hai aur email ahmed@test.com. Mera ghar House No. 42-B, Street 3, Block 13-D Gulshan mein hai. Gali mein pani ki pipe toot gayi hai.",
    incidentDistrict: "East",
    incidentLocality: "Gulshan-e-Iqbal",
    incidentPublicLocation: "University Road near NED",
    citizenName: "Ahmed Raza",
    citizenPhone: "03001234567",
    citizenEmail: "ahmed@test.com",
    residentialAddress: "House No. 42-B, Street 3, Block 13-D, Gulshan-e-Iqbal",
    isDemonstration: false,
  };
  const resD = await invokeSubmitFunction(payloadD);
  assert("Scenario D returned reference number", Boolean(resD.reference_number));
  assert("Scenario D heading describes broken water pipe", resD.privacy.heading === "Broken Drinking Water Pipe in Street", resD.privacy.heading);
  assert("Scenario D redacts entire private address span", resD.privacy.sanitizedDescription.includes("Mera ghar [PRIVATE ADDRESS REDACTED] mein hai."), resD.privacy.sanitizedDescription);
  assert("Scenario D does NOT leak House No. 42-B", !resD.privacy.sanitizedDescription.includes("House No. 42-B"));
  assert("Scenario D does NOT leak Street 3", !resD.privacy.sanitizedDescription.includes("Street 3"));
  assert("Scenario D does NOT leak Block 13-D", !resD.privacy.sanitizedDescription.includes("Block 13-D"));
  assert("Scenario D redacts citizen name", resD.privacy.sanitizedDescription.includes("[NAME REDACTED]") && !resD.privacy.sanitizedDescription.includes("Ahmed Raza"));
  assert("Scenario D redacts phone number", resD.privacy.sanitizedDescription.includes("[PHONE REDACTED]") && !resD.privacy.sanitizedDescription.includes("03001234567"));
  assert("Scenario D redacts email", resD.privacy.sanitizedDescription.includes("[EMAIL REDACTED]") && !resD.privacy.sanitizedDescription.includes("ahmed@test.com"));
  assert("Scenario D summary does not contain citizen PII", !resD.privacy.summary.includes("Ahmed") && !resD.privacy.summary.includes("03001234567"));

  // Scenario E: Uncertain / low confidence classification preserves real issue
  console.log("\n[Test Scenario E: Uncertain / low-confidence garbage complaint does not invent road damage]");
  const payloadE = {
    title: "Gali mein kachra jama hai",
    description: "Hamari gali mein 4 din se kachra nahi uthaya gaya. Bohat badboo arahi hai aur bachay pareshan hain.",
    incidentDistrict: "East",
    incidentLocality: "Gulshan-e-Iqbal",
    incidentPublicLocation: "none",
    citizenName: "Farhan Khan",
    citizenPhone: "03009988776",
    residentialAddress: "House 99, Gulshan",
    isDemonstration: false,
  };
  const resE = await invokeSubmitFunction(payloadE);
  assert("Scenario E returned reference number", Boolean(resE.reference_number));
  assert("Scenario E heading describes garbage, NOT road damage", resE.privacy.heading === "Garbage Not Collected for Four Days", resE.privacy.heading);
  assert("Scenario E heading does not contain 'Road' or 'Civil'", !resE.privacy.heading.includes("Road") && !resE.privacy.heading.includes("Civil"));
  assert("Scenario E summary describes uncollected garbage", resE.privacy.summary.includes("garbage has not been collected from their street for four days"), resE.privacy.summary);
  assert("Scenario E summary does not invent road restoration or KMC", !resE.privacy.summary.includes("road restoration") && !resE.privacy.summary.includes("KMC"));
  assert("Scenario E summary does not contain 'at none'", !resE.privacy.summary.includes("at none"));

  // -------------------------------------------------------------------------
  // 2. VERIFY DATABASE STORAGE & RLS BOUNDARIES FOR AUTHENTICATED STAFF
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Database Storage & RLS Security Boundaries ---");

  // Sign in as KMC staff
  const { staff: kmcStaff } = await getStaffClient("kmc");

  // Query complaint D as KMC staff from public.complaints
  const { data: staffViewD, error: staffErrD } = await kmcStaff
    .from("complaints")
    .select("reference_number, generated_heading, factual_summary, sanitized_description, description")
    .eq("reference_number", resD.reference_number)
    .maybeSingle();

  // If complaint D was assigned to KWSC, KMC won't see it (which verifies isolation!)
  if (resD.assigned_department_id === "kmc" || resD.status === "under_review") {
    assert("KMC staff sees sanitized description", staffViewD && !staffViewD.sanitized_description.includes("03001234567"));
  }

  // Sign in as the actual assigned department staff
  const assignedDept = resD.assigned_department_id || (resD.status === "under_review" ? "kmc" : "kwsc");
  const { staff: assignedStaff } = await getStaffClient(assignedDept);
  const { data: deptViewD, error: deptErrD } = await assignedStaff
    .from("complaints")
    .select("reference_number, generated_heading, factual_summary, sanitized_description, description")
    .eq("reference_number", resD.reference_number)
    .single();

  assert("Assigned staff can retrieve complaint record", Boolean(deptViewD) && !deptErrD);
  assert("Assigned staff sees [NAME REDACTED] in description", deptViewD?.description.includes("[NAME REDACTED]"));
  assert("Assigned staff sees [PRIVATE ADDRESS REDACTED] in description", deptViewD?.description.includes("[PRIVATE ADDRESS REDACTED]"));
  assert("Assigned staff description has zero raw address", !deptViewD?.description.includes("House No. 42-B"));
  assert("Assigned staff description has zero raw phone", !deptViewD?.description.includes("03001234567"));
  assert("Assigned staff description has zero raw email", !deptViewD?.description.includes("ahmed@test.com"));

  // Verify staff CANNOT query raw citizen private data
  const { data: privateData, error: privateError } = await assignedStaff
    .from("complaint_citizen_private")
    .select("*")
    .eq("complaint_id", resD.id);

  assert(
    "Staff is strictly blocked from public.complaint_citizen_private (0 rows returned or 403)",
    !privateData || privateData.length === 0 || Boolean(privateError)
  );

  // -------------------------------------------------------------------------
  // 3. 36-CELL CROSS-DEPARTMENT ISOLATION MATRIX VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- 3. 36-Cell Cross-Department Isolation Matrix ---");
  const departments = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"];
  let matrixViolations = 0;

  for (const observerDept of departments) {
    const { staff: obsClient } = await getStaffClient(observerDept);
    const { data: visibleComplaints, error: visErr } = await obsClient
      .from("complaints")
      .select("id, reference_number, assigned_department_id, status");

    if (visErr) {
      console.error(`Failed to fetch for ${observerDept}:`, visErr.message);
      failures++;
      continue;
    }

    for (const comp of visibleComplaints || []) {
      // Rule 1: A department can only see complaints assigned to it
      // Rule 2: Exception: KMC review staff can ALSO see unassigned complaints where status = 'under_review'
      if (comp.assigned_department_id === observerDept) {
        continue; // Permitted
      }
      if (observerDept === "kmc" && comp.status === "under_review" && comp.assigned_department_id === null) {
        continue; // Permitted review queue access
      }

      // Any other complaint is a boundary violation
      console.error(`VIOLATION: ${observerDept} saw complaint ${comp.reference_number} assigned to ${comp.assigned_department_id} (status: ${comp.status})`);
      matrixViolations++;
    }
  }

  assert(
    "36-cell isolation matrix is 100% enforced (0 boundary violations)",
    matrixViolations === 0,
    `${matrixViolations} violations`
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`PHASE 3E.2 VERIFICATION COMPLETE: ${passes} PASSED, ${failures} FAILED`);
  console.log("==================================================================");

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL VERIFICATION ERROR:", err);
  process.exit(1);
});
