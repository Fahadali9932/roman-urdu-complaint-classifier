import {
  sanitizeComplaint,
  generateHeading,
  generateSummary,
  processComplaintPrivacy,
} from "../src/lib/privacy-engine";

console.log("=============================================================");
console.log("AWAAZ-E-AWAM — PHASE 3E.2 VERIFICATION OF SCENARIOS");
console.log("=============================================================");

// Scenario A: Electricity and consequence
console.log("\n--- SCENARIO A: Electricity and consequence ---");
const rawA = "Humare ghar 3 din se bijli nahi aa rahi jiski wajah se motor nahi chal rahi aur pani bhi nahi hai.";
const resA = processComplaintPrivacy(rawA, {
  incidentLocality: "Gulshan-e-Iqbal",
  departmentId: "kelectric",
});
console.log("Input:", rawA);
console.log("Heading:", resA.generatedHeading);
console.log("Summary:", resA.factualSummary);
console.log("Sanitized:", resA.sanitizedDescription);

// Scenario B: Garbage 4 days
console.log("\n--- SCENARIO B: Garbage 4 days ---");
const rawB = "Hamari gali mein 4 din se kachra nahi uthaya gaya aur bohat badboo aa rahi hai.";
const resB = processComplaintPrivacy(rawB, {
  incidentLocality: "Gulshan-e-Iqbal",
  departmentId: "sswmb",
});
console.log("Input:", rawB);
console.log("Heading:", resB.generatedHeading);
console.log("Summary:", resB.factualSummary);
console.log("Sanitized:", resB.sanitizedDescription);

// Scenario C: Damaged road
console.log("\n--- SCENARIO C: Damaged road ---");
const rawC = "Hamare area ki road toot gayi hai aur bohat gadday hain.";
const resC = processComplaintPrivacy(rawC, {
  incidentLocality: "Gulberg",
  departmentId: "kmc",
});
console.log("Input:", rawC);
console.log("Heading:", resC.generatedHeading);
console.log("Summary:", resC.factualSummary);
console.log("Sanitized:", resC.sanitizedDescription);

// Scenario D: Personal information & Private address
console.log("\n--- SCENARIO D: Personal information & Private address ---");
const rawD = "Mera naam Ahmed hai, phone 03001234567 hai aur mein House 24 Street 5 mein rehta hun. Gali mein pani ki pipe toot gayi hai.";
const resD = processComplaintPrivacy(rawD, {
  citizenName: "Ahmed",
  citizenPhone: "03001234567",
  residentialAddress: "House 24, Street 5",
  incidentLocality: "North Nazimabad",
  departmentId: "kwsc",
});
console.log("Input:", rawD);
console.log("Heading:", resD.generatedHeading);
console.log("Summary:", resD.factualSummary);
console.log("Sanitized:", resD.sanitizedDescription);
console.log("Flags:", resD.flags);

// Scenario E: Uncertain / Mismatched classification
console.log("\n--- SCENARIO E: Uncertain / Mismatched classification ---");
const rawE = "Hamari gali mein 4 din se kachra nahi uthaya gaya. Bohat badboo arahi hai aur bachay pareshan hain.";
const resE = processComplaintPrivacy(rawE, {
  incidentLocality: "Gulshan-e-Iqbal",
  incidentPublicLocation: "none",
  departmentId: "kmc", // Mismatched classifier prediction!
});
console.log("Input:", rawE);
console.log("Predicted Department:", "kmc (MISMATCHED)");
console.log("Heading:", resE.generatedHeading);
console.log("Summary:", resE.factualSummary);
console.log("Sanitized:", resE.sanitizedDescription);

// Critical Address Span Case: KHI-2026-78C5238F
console.log("\n--- CRITICAL ADDRESS CASE: KHI-2026-78C5238F ---");
const rawAddr = "Mera ghar House No. 42-B, Street 3, Block 13-D Gulshan mein hai.";
const resAddr = sanitizeComplaint(rawAddr, {
  residentialAddress: "House No. 42-B, Street 3, Block 13-D, Gulshan-e-Iqbal",
});
console.log("Input:", rawAddr);
console.log("Sanitized:", resAddr.sanitizedText);
console.log("Flags:", resAddr.flags);

// Live Bug Record Case: KHI-2026-44797EAE
console.log("\n--- LIVE RECORD KHI-2026-44797EAE REPROCESS ---");
const raw447 = "Mera naam Ahmed hai, mera number 03001234567 hai aur mein house 24 street 5 mein rehta hun. Hamari gali mein 4 din se kachra nahi uthaya gaya. Safai walay bilkul maa yava rahe hain apni. Bohat badboo arahi hai aur bachay pareshan hain.";
const res447 = processComplaintPrivacy(raw447, {
  citizenName: "Ahmed",
  citizenPhone: "03001234567",
  residentialAddress: "House 24, Street 5, Gulshan",
  incidentLocality: "Gulshan-e-Iqbal",
  incidentPublicLocation: "none",
  departmentId: "kmc",
});
console.log("Original Raw:", raw447);
console.log("Reprocessed Heading:", res447.generatedHeading);
console.log("Reprocessed Summary:", res447.factualSummary);
console.log("Reprocessed Sanitized:", res447.sanitizedDescription);
console.log("=============================================================");
