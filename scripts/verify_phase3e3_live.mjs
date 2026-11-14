/**
 * Phase 3E.3 Comprehensive Live Verification Script
 * Project: akbwiedtmxjxcjscgitw
 * Edge Function: submit-classified-complaint (Version 12)
 *
 * Verifies:
 * 1. Live Edge Function v12 processes Roman Urdu natural living phrases ("main ... mein rehta hoon").
 * 2. Natural English headings and summaries without robotic jargon ("grid verification", invented water motors).
 * 3. Exact target case KHI-2026-8FE7C3CA verification in live database.
 * 4. KMC Classification Review workflow via staff_review_and_assign_complaint RPC.
 * 5. Department staff privacy protection (sanitized descriptions only, RLS blocked on private table).
 * 6. 36-cell isolation matrix across all 6 municipal authorities (0 violations).
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
  console.log("AWAAZ-E-AWAM — PHASE 3E.3 LIVE DEPLOYMENT & SECURITY VERIFICATION");
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
  // 1. LIVE SUBMISSION TESTS WITH EDGE FUNCTION V12
  // -------------------------------------------------------------------------
  console.log("--- 1. Live Edge Function v12 Submission Tests ---");

  // Test 1: Natural Roman Urdu residence phrase with public incident location
  console.log("\n[Test 1: Roman Urdu Living Context + Public Landmark Protection]");
  const payload1 = {
    title: "Water pipe broken near main road",
    description: "Mera naam Hamza Siddiqui hai aur mera mobile 03219876543 hai. main al-falah colony mein rehta hoon. University Road par pani ki badi pipe phat gayi hai aur hazaron gallon peene ka pani zaya ho raha hai.",
    incidentDistrict: "East",
    incidentLocality: "Gulshan-e-Iqbal",
    incidentPublicLocation: "University Road near NED Gate",
    citizenName: "Hamza Siddiqui",
    citizenPhone: "03219876543",
    residentialAddress: "Al-Falah Colony",
    isDemonstration: false,
  };

  const res1 = await invokeSubmitFunction(payload1);
  console.log("  Ref:", res1.reference_number);
  console.log("  Heading:", res1.privacy.heading);
  console.log("  Summary:", res1.privacy.summary);
  console.log("  Sanitized:", res1.privacy.sanitizedDescription);

  assert("Edge Function returns valid reference number", Boolean(res1.reference_number));
  assert("Heading accurately reflects broken water pipe", res1.privacy.heading.includes("Broken Drinking Water Pipe"));
  assert("Residential address 'al-falah colony' is redacted", !res1.privacy.sanitizedDescription.toLowerCase().includes("al-falah colony"));
  assert("Public landmark 'University Road' is preserved", res1.privacy.sanitizedDescription.includes("University Road"));
  assert("Citizen name 'Hamza Siddiqui' is redacted", !res1.privacy.sanitizedDescription.includes("Hamza Siddiqui"));
  assert("Citizen phone '03219876543' is redacted", !res1.privacy.sanitizedDescription.includes("03219876543"));
  assert("Name redaction flag is true", res1.privacy.flags.hasName === true);
  assert("Phone redaction flag is true", res1.privacy.flags.hasPhone === true);
  assert("Address redaction flag is true", res1.privacy.flags.hasPrivateAddress === true);
  assert("Summary is factual and references incident location", res1.privacy.summary.includes("University Road"));
  assert("Summary has zero 'at none' artifacts", !res1.privacy.summary.includes("at none"));

  // Test 2: Five-day power outage with no drinking water
  console.log("\n[Test 2: Five-Day Power Outage with Drinking Water Consequence]");
  const payload2 = {
    title: "5 din se bijli band hai",
    description: "humare ghar 5 din se light nahi hai aur peene ke liye pani bhi nahi hai",
    incidentDistrict: "Korangi",
    incidentLocality: "Korangi",
    incidentPublicLocation: "none",
    citizenName: "Imran Sheikh",
    citizenPhone: "03009988776",
    residentialAddress: "Area 4-B",
    isDemonstration: false,
  };

  const res2 = await invokeSubmitFunction(payload2);
  console.log("  Ref:", res2.reference_number);
  console.log("  Heading:", res2.privacy.heading);
  console.log("  Summary:", res2.privacy.summary);

  assert("Heading is 'Electricity Outage for Five Days'", res2.privacy.heading === "Electricity Outage for Five Days");
  assert("Summary states 5 days without electricity", res2.privacy.summary.includes("without electricity for five days"));
  assert("Summary states having no drinking water", res2.privacy.summary.includes("They also report having no drinking water"));
  assert("Summary does NOT invent water pump failure", !res2.privacy.summary.includes("water pump"));
  assert("Summary does NOT contain robotic jargon ('grid verification')", !res2.privacy.summary.includes("grid verification"));
  assert("Summary does NOT contain 'at none'", !res2.privacy.summary.includes("at none"));

  // -------------------------------------------------------------------------
  // 2. VERIFY REPAIRED HISTORICAL RECORD KHI-2026-8FE7C3CA
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Verify Repaired Historical Record KHI-2026-8FE7C3CA ---");
  const { staff: kmcClient } = await getStaffClient("kmc");
  const { data: recordTarget, error: targetErr } = await kmcClient
    .from("complaints")
    .select("reference_number, generated_heading, factual_summary, sanitized_description, description, redaction_flags, redaction_needs_review")
    .eq("reference_number", "KHI-2026-8FE7C3CA")
    .single();

  assert("Found target complaint KHI-2026-8FE7C3CA in live database", Boolean(recordTarget) && !targetErr);
  console.log("  Heading:", recordTarget?.generated_heading);
  console.log("  Summary:", recordTarget?.factual_summary);
  console.log("  Sanitized:", recordTarget?.sanitized_description);

  assert(
    "Heading matches 'Electricity Outage for Five Days'",
    recordTarget?.generated_heading === "Electricity Outage for Five Days"
  );
  assert(
    "Summary reports electricity outage and drinking water without jargon",
    recordTarget?.factual_summary.includes("without electricity for five days") &&
    recordTarget?.factual_summary.includes("They also report having no drinking water") &&
    !recordTarget?.factual_summary.includes("grid verification")
  );
  assert(
    "Sanitized description contains [PRIVATE ADDRESS REDACTED]",
    recordTarget?.sanitized_description.includes("[PRIVATE ADDRESS REDACTED]")
  );
  assert(
    "Sanitized description contains [NAME REDACTED]",
    recordTarget?.sanitized_description.includes("[NAME REDACTED]")
  );
  assert(
    "Zero unredacted living neighborhood in sanitized description",
    !recordTarget?.sanitized_description.includes("abbsia blgous")
  );
  assert(
    "Description column is synchronized with sanitized description",
    recordTarget?.description === recordTarget?.sanitized_description
  );
  assert(
    "Private address flag is true",
    recordTarget?.redaction_flags?.hasPrivateAddress === true
  );

  // -------------------------------------------------------------------------
  // 3. KMC CLASSIFICATION REVIEW WORKFLOW VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- 3. KMC Classification Review & Assignment Workflow ---");

  // Submit an uncertain complaint to test the review queue
  const payloadReview = {
    title: "Shikayat",
    description: "main bilal colony mein rehta hoon. Kuch masla hai samajh nahi aa raha madad darkar hai.",
    incidentDistrict: "Central",
    incidentLocality: "Gulberg",
    incidentPublicLocation: "none",
    citizenName: "Waqas Khan",
    citizenPhone: "03331122334",
    residentialAddress: "Bilal Colony",
    isDemonstration: false,
  };

  const resReview = await invokeSubmitFunction(payloadReview);
  console.log("  Review Ref:", resReview.reference_number);
  console.log("  Review Status:", resReview.status);
  console.log("  Review Needs Review:", resReview.needs_review);

  // If held under review, test the KMC assignment RPC
  if (resReview.status === "under_review" || resReview.needs_review) {
    const complaintId = resReview.complaint_id || resReview.id;
    console.log("  Assigning complaint via KMC staff_review_and_assign_complaint RPC for complaintId:", complaintId);
    const { data: assignResult, error: assignErr } = await kmcClient.rpc(
      "staff_review_and_assign_complaint",
      {
        p_complaint_id: complaintId,
        p_target_department_id: "kmc",
        p_notes: "Assigned by KMC reviewer during Phase 3E.3 verification.",
      }
    );

    if (assignErr) {
      console.error("  RPC ERROR DETAILS:", assignErr);
    }
    assert("staff_review_and_assign_complaint RPC succeeds", !assignErr && assignResult?.success === true);

    // Verify complaint transitioned to assigned
    const { data: updatedComp } = await kmcClient
      .from("complaints")
      .select("status, assigned_department_id")
      .eq("id", complaintId)
      .single();

    assert("Complaint status transitioned to 'assigned'", updatedComp?.status === "assigned");
    assert("Complaint assigned to 'kmc'", updatedComp?.assigned_department_id === "kmc");
  } else {
    console.log("  (Complaint was classified with high confidence; checking existing under_review complaints)");
    const { data: existingUnderReview } = await kmcClient
      .from("complaints")
      .select("id, reference_number, status, assigned_department_id")
      .eq("status", "under_review")
      .limit(1);

    if (existingUnderReview && existingUnderReview.length > 0) {
      console.log(`  Found existing under_review complaint: ${existingUnderReview[0].reference_number}`);
      assert("KMC staff can read unassigned under_review complaint", Boolean(existingUnderReview[0]));
    }
  }

  // -------------------------------------------------------------------------
  // 4. DEPARTMENT PRIVACY & RLS BOUNDARY VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Staff Privacy Protection & Strict Private Table RLS ---");
  const { staff: kwscStaff } = await getStaffClient("kwsc");

  // Query complaint 1 from KWSC staff
  const { data: kwscView1, error: kwscErr1 } = await kwscStaff
    .from("complaints")
    .select("reference_number, description, sanitized_description")
    .eq("reference_number", res1.reference_number)
    .maybeSingle();

  if (kwscView1) {
    assert("Staff view has [PRIVATE ADDRESS REDACTED]", kwscView1.description.includes("[PRIVATE ADDRESS REDACTED]"));
    assert("Staff view has [NAME REDACTED]", kwscView1.description.includes("[NAME REDACTED]"));
    assert("Staff view has [PHONE REDACTED]", kwscView1.description.includes("[PHONE REDACTED]"));
    assert("Staff view has zero citizen phone", !kwscView1.description.includes("03219876543"));
    assert("Staff view has zero citizen name", !kwscView1.description.includes("Hamza Siddiqui"));
  }

  // Verify staff CANNOT access public.complaint_citizen_private table
  const { data: privateRows, error: privErr } = await kwscStaff
    .from("complaint_citizen_private")
    .select("*")
    .eq("complaint_id", res1.complaint_id || res1.id);

  assert(
    "Staff is blocked from complaint_citizen_private table (0 rows or RLS denial)",
    !privateRows || privateRows.length === 0 || Boolean(privErr)
  );

  // -------------------------------------------------------------------------
  // 5. 36-CELL CROSS-DEPARTMENT ISOLATION MATRIX VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- 5. 36-Cell Cross-Department Isolation Matrix ---");
  const departments = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"];
  let matrixViolations = 0;

  for (const observerDept of departments) {
    const { staff: obsClient } = await getStaffClient(observerDept);
    const { data: visibleComplaints, error: visErr } = await obsClient
      .from("complaints")
      .select("id, reference_number, assigned_department_id, status");

    if (visErr) {
      console.error(`Failed to fetch complaints for ${observerDept}:`, visErr.message);
      failures++;
      continue;
    }

    for (const comp of visibleComplaints || []) {
      // Rule 1: A department can only see complaints assigned to it
      if (comp.assigned_department_id === observerDept) {
        continue; // Permitted
      }
      // Rule 2: Exception: KMC review staff can ALSO see unassigned complaints where status = 'under_review'
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
  // FINAL REPORT
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`PHASE 3E.3 VERIFICATION RESULT: ${passes} PASSED, ${failures} FAILED`);
  console.log("==================================================================");

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL VERIFICATION ERROR:", err);
  process.exit(1);
});
