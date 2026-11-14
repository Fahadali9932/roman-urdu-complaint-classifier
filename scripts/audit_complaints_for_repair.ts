import fs from "fs";
import {
  processComplaintPrivacy,
  ComplaintPrivacyMetadata,
} from "../src/lib/privacy-engine";

const rawDump = JSON.parse(fs.readFileSync("scripts/complaints_raw_dump.json", "utf8"));

console.log(`=== AUDIT OF ${rawDump.length} LIVE COMPLAINT RECORDS ===\n`);

let affectedCount = 0;
const repairPlan: Array<{
  id: string;
  reference_number: string;
  reasons: string[];
  oldHeading: string;
  newHeading: string;
  oldSummary: string;
  newSummary: string;
  oldSanitized: string;
  newSanitized: string;
  flags: any;
}> = [];

for (const row of rawDump) {
  const metadata: ComplaintPrivacyMetadata = {
    citizenName: row.citizen_name,
    citizenPhone: row.citizen_phone,
    citizenEmail: row.citizen_email,
    residentialAddress: row.residential_address,
    incidentDistrict: row.incident_district,
    incidentLocality: row.incident_locality,
    incidentPublicLocation: row.incident_public_location,
    departmentId: row.assigned_department_id || row.predicted_department_id,
  };

  const processed = processComplaintPrivacy(row.raw_description, metadata);

  const reasons: string[] = [];

  // Check 1: "at none" artifact
  if (row.factual_summary && row.factual_summary.includes("at none")) {
    reasons.push("contains 'at none' placeholder");
  }

  // Check 2: Hallucinated road / engineering jargon
  if (
    row.factual_summary &&
    (row.factual_summary.includes("Prompt engineering remediation") ||
      row.factual_summary.includes("Damaged municipal road infrastructure") && !/road|sadak|khadda|gadda/i.test(row.raw_description) ||
      row.factual_summary.includes("Critical structural cracks") && !/crack|darar|building/i.test(row.raw_description))
  ) {
    reasons.push("contains hallucinated problem/jargon");
  }

  // Check 3: Truncated Urdu heading
  if (row.generated_heading && (row.generated_heading.length === 50 || /^[a-z0-9\s]+$/i.test(row.generated_heading) && /din|hai|nhi|mein|ki/i.test(row.generated_heading) && !/outage|garbage|road|water|pipe|leak|pothole|overflow/i.test(row.generated_heading))) {
    reasons.push("truncated or raw Roman Urdu heading");
  }

  // Check 4: Incomplete private address redaction (e.g. house or street still visible)
  if (
    row.sanitized_description &&
    (/\b(?:street\s+\d+|block\s+\d+[a-z]?|no\.\s*\d+)/i.test(row.sanitized_description) ||
      row.sanitized_description.includes("[PRIVATE ADDRESS REDACTED] No.") ||
      row.sanitized_description.includes("street 5"))
  ) {
    reasons.push("incomplete address redaction");
  }

  // Check 5: Discrepancy between old and new generated heading/summary
  if (row.generated_heading !== processed.generatedHeading || row.factual_summary !== processed.factualSummary || row.sanitized_description !== processed.sanitizedDescription) {
    if (reasons.length === 0) {
      reasons.push("natural English wording update");
    }
  }

  if (reasons.length > 0) {
    affectedCount++;
    repairPlan.push({
      id: row.id,
      reference_number: row.reference_number,
      reasons,
      oldHeading: row.generated_heading,
      newHeading: processed.generatedHeading,
      oldSummary: row.factual_summary,
      newSummary: processed.factualSummary,
      oldSanitized: row.sanitized_description,
      newSanitized: processed.sanitizedDescription,
      flags: processed.flags,
    });
  }
}

console.log(`Total records: ${rawDump.length}`);
console.log(`Records to update/repair: ${affectedCount}`);

console.log("\n--- NOTABLE REPAIRS ---");
for (const item of repairPlan.filter((r) => r.reference_number === "KHI-2026-44797EAE" || r.reference_number === "KHI-2026-78C5238F" || r.reference_number === "KHI-2026-0D7180D2" || r.reference_number === "KHI-2026-A4CAB546")) {
  console.log(`\n[${item.reference_number}] Reasons: ${item.reasons.join(", ")}`);
  console.log(`  OLD HEADING: "${item.oldHeading}"`);
  console.log(`  NEW HEADING: "${item.newHeading}"`);
  console.log(`  OLD SUMMARY: "${item.oldSummary}"`);
  console.log(`  NEW SUMMARY: "${item.newSummary}"`);
  console.log(`  OLD SANITIZED: "${item.oldSanitized.slice(0, 80)}..."`);
  console.log(`  NEW SANITIZED: "${item.newSanitized.slice(0, 80)}..."`);
}

fs.writeFileSync("scripts/repair_plan.json", JSON.stringify(repairPlan, null, 2));
console.log("\nWrote repair plan to scripts/repair_plan.json");
