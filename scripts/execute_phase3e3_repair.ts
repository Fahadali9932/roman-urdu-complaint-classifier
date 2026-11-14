import fs from "fs";
import { execSync } from "child_process";

const plan = JSON.parse(fs.readFileSync("scripts/repair_plan_phase3e3.json", "utf8"));
console.log(`Executing repairs for ${plan.length} complaint records...`);

// Escape text for PostgreSQL string literal
function sqlEscape(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

// Generate SQL update statements
const statements: string[] = [];

for (const item of plan) {
  const flagsJson = JSON.stringify(item.flags);
  const needsReview = Boolean(item.flags.uncertainRedaction || item.flags.safetyHazard);

  statements.push(`
UPDATE public.complaints
SET
  generated_heading = ${sqlEscape(item.newHeading)},
  factual_summary = ${sqlEscape(item.newSummary)},
  sanitized_description = ${sqlEscape(item.newSanitized)},
  description = ${sqlEscape(item.newSanitized)},
  redaction_flags = ${sqlEscape(flagsJson)}::jsonb,
  redaction_needs_review = ${needsReview}
WHERE id = '${item.id}';
`.trim());
}

// Write the complete SQL script to file
const fullSql = `BEGIN;\n\n${statements.join("\n\n")}\n\nCOMMIT;`;
fs.writeFileSync("scripts/repair_phase3e3.sql", fullSql);
console.log(`Generated SQL script scripts/repair_phase3e3.sql (${statements.length} updates).`);

console.log("Applying updates to live Supabase database via --file...");
try {
  const output = execSync(
    `npx supabase db query --remote=akbwiedtmxjxcjscgitw --file scripts/repair_phase3e3.sql --yes`,
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  console.log("Output:", output);
  console.log("\nALL REPAIRS SUCCESSFULLY APPLIED!");
} catch (err: any) {
  console.error("Repair execution failed:", err.message);
  if (err.stdout) console.error("stdout:", err.stdout.toString());
  if (err.stderr) console.error("stderr:", err.stderr.toString());
  process.exit(1);
}
