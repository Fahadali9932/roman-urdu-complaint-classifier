import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("Fetching live complaints and private records...");

const sql = `
SELECT 
  c.id,
  c.reference_number,
  c.status,
  c.assigned_department_id,
  c.predicted_department_id,
  c.incident_district,
  c.incident_locality,
  c.incident_public_location,
  c.generated_heading,
  c.factual_summary,
  c.sanitized_description,
  p.citizen_name,
  p.citizen_phone,
  p.citizen_email,
  p.residential_address,
  p.raw_description
FROM public.complaints c
JOIN public.complaint_citizen_private p ON p.complaint_id = c.id
ORDER BY c.created_at ASC;
`;

const res = execSync(
  `npx supabase db query --remote=akbwiedtmxjxcjscgitw --read-only "${sql.replace(/\n/g, " ")}"`,
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
);

const parsed = JSON.parse(res);
console.log(`Fetched ${parsed.rows.length} records.`);
fs.writeFileSync("scripts/complaints_raw_dump.json", JSON.stringify(parsed.rows, null, 2));
console.log("Saved to scripts/complaints_raw_dump.json");
