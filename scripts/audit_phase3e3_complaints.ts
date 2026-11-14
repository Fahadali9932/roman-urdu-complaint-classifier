import fs from "fs";
import {
  processComplaintPrivacy,
  ComplaintPrivacyMetadata,
} from "../src/lib/privacy-engine";

const rawDump = JSON.parse(fs.readFileSync("scripts/complaints_raw_dump.json", "utf8"));

console.log(`=== PHASE 3E.3 AUDIT OF ${rawDump.length} LIVE COMPLAINT RECORDS ===\n`);

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

  // Check 1: Private address in sanitized description
  if (
    row.sanitized_description &&
    (/\b(?:main\s+[A-Za-z0-9\s-]+\s+mein\s+rehta\s+hoon|i\s+live\s+in|colony|society|apartments|gali\s+\d+|house\s+\d+|street\s+\d+)/i.test(row.sanitized_description)) &&
    !row.sanitized_description.includes("[PRIVATE ADDRESS REDACTED]")
  ) {
    reasons.push("residential address unredacted in sanitized_description");
  }

  // Check 2: Target case KHI-2026-8FE7C3CA
  if (row.reference_number === "KHI-2026-8FE7C3CA") {
    reasons.push("target case KHI-2026-8FE7C3CA privacy & summary update");
  }

  // Check 3: Check for robotic jargon in summary
  if (
    row.factual_summary &&
    (row.factual_summary.includes("grid verification") ||
     row.factual_summary.includes("power supply restoration") ||
     row.factual_summary.includes("engineering remediation") ||
     row.factual_summary.includes("at none"))
  ) {
    reasons.push("contains robotic jargon or 'at none'");
  }

  // Check 4: Heading, summary, or sanitized text differs
  if (
    row.generated_heading !== processed.generatedHeading ||
    row.factual_summary !== processed.factualSummary ||
    row.sanitized_description !== processed.sanitizedDescription
  ) {
    if (reasons.length === 0) {
      reasons.push("natural English wording / privacy sync");
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

console.log(`Total live records: ${rawDump.length}`);
console.log(`Records to update/repair: ${affectedCount}`);

fs.writeFileSync("scripts/repair_plan_phase3e3.json", JSON.stringify(repairPlan, null, 2));
console.log("Saved repair plan to scripts/repair_plan_phase3e3.json");

const target = repairPlan.find((r) => r.reference_number === "KHI-2026-8FE7C3CA");
if (target) {
  console.log("\n=== TARGET RECORD KHI-2026-8FE7C3CA REPAIR DETAILS ===");
  console.log("Reasons:", target.reasons.join(", "));
  console.log("Old Heading:", target.oldHeading);
  console.log("New Heading:", target.newHeading);
  console.log("\nOld Summary:\n", target.oldSummary);
  console.log("\nNew Summary:\n", target.newSummary);
  console.log("\nOld Sanitized:\n", target.oldSanitized);
  console.log("\nNew Sanitized:\n", target.newSanitized);
  console.log("\nFlags:\n", JSON.stringify(target.flags, null, 2));
} else {
  console.log("Target KHI-2026-8FE7C3CA not in repair list (already up to date)");
}
