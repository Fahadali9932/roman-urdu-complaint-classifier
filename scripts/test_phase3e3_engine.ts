import {
  sanitizeComplaint,
  generateHeading,
  generateSummary,
  processComplaintPrivacy,
} from "../src/lib/privacy-engine";

console.log("=============================================================");
console.log("AWAAZ-E-AWAM — PHASE 3E.3 PRIVACY & PRESENTATION ENGINE TEST");
console.log("=============================================================\n");

const tests = [
  {
    name: "Pattern 1: main xyz colony mein rehta hoon",
    input: "mera naam Ahmed hai main xyz colony mein rehta hoon aur hamare ghar 5 din se bijli nahi aa rahi",
    metadata: {
      citizenName: "Ahmed",
      residentialAddress: "xyz colony",
      incidentLocality: "Gulshan-e-Iqbal",
    },
    expectedHeading: "Electricity Outage for Five Days",
    mustContainSanitized: ["main [PRIVATE ADDRESS REDACTED]", "[NAME REDACTED]"],
    mustNotContainSanitized: ["Ahmed", "xyz colony"],
  },
  {
    name: "Pattern 2: mein abc block mein rehta hoon",
    input: "mein abc block mein rehta hoon aur gali mein kachra jama hai",
    metadata: {
      incidentLocality: "Clifton",
    },
    mustContainSanitized: ["mein [PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["abc block"],
  },
  {
    name: "Pattern 3: hum log xyz society mein rehte hain",
    input: "hum log xyz society mein rehte hain 4 din se pani nahi aa raha",
    metadata: {
      incidentLocality: "North Nazimabad",
    },
    mustContainSanitized: ["[PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["xyz society"],
  },
  {
    name: "Pattern 4: mera ghar abc apartments mein hai",
    input: "mera ghar abc apartments mein hai building mein crack agaya",
    metadata: {
      incidentLocality: "Gulberg",
    },
    mustContainSanitized: ["mera ghar [PRIVATE ADDRESS REDACTED] mein hai"],
    mustNotContainSanitized: ["abc apartments"],
  },
  {
    name: "Pattern 5: main abc gali ke paas rehti hun",
    input: "main abc gali ke paas rehti hun sadak par gehra khadda hai",
    metadata: {
      incidentLocality: "Saddar",
    },
    mustContainSanitized: ["main [PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["abc gali"],
  },
  {
    name: "Pattern 6: hamara pata xyz colony hai",
    input: "hamara pata xyz colony hai gutter ubal raha hai",
    metadata: {
      incidentLocality: "Malir",
    },
    mustContainSanitized: ["hamara pata [PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["xyz colony"],
  },
  {
    name: "Pattern 7: makan number 12 gali 4 sector B",
    input: "makan number 12 gali 4 sector B gas leak ho rahi hai",
    metadata: {
      incidentLocality: "Korangi",
    },
    mustContainSanitized: ["[PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["makan number 12", "gali 4", "sector B"],
  },
  {
    name: "Pattern 8: house no 42-B street 3 block 13-D",
    input: "Mera ghar house no 42-B street 3 block 13-D mein hai light nahi hai",
    metadata: {
      incidentLocality: "Gulshan-e-Iqbal",
    },
    mustContainSanitized: ["Mera ghar [PRIVATE ADDRESS REDACTED] mein hai"],
    mustNotContainSanitized: ["house no 42-B", "street 3", "block 13-D"],
  },
  {
    name: "Pattern 9: mera address xyz area hai",
    input: "mera address xyz area hai transformer blast hua tha",
    metadata: {
      incidentLocality: "PECHS",
    },
    mustContainSanitized: ["mera address [PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["xyz area"],
  },
  {
    name: "Pattern 10: i live in xyz residential complex",
    input: "i live in xyz residential complex and there is no water for 2 days",
    metadata: {
      incidentLocality: "DHA",
    },
    mustContainSanitized: ["i live in [PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["xyz residential complex"],
  },
  {
    name: "Pattern 11: Public incident location MUST remain intact",
    input: "main xyz colony mein rehta hoon lekin University Road par pani ki pipe phat gayi hai",
    metadata: {
      residentialAddress: "xyz colony",
      incidentPublicLocation: "University Road",
      incidentLocality: "Gulshan-e-Iqbal",
    },
    mustContainSanitized: ["University Road", "[PRIVATE ADDRESS REDACTED]"],
    mustNotContainSanitized: ["xyz colony"],
  },
  {
    name: "Pattern 12: Natural heading and summary for light and drinking water (Part 3)",
    input: "humare ghar 5 din se light nahi hai aur peene ke liye pani bhi nahi hai",
    metadata: {
      incidentLocality: "Gulshan-e-Iqbal",
      departmentId: "kelectric",
    },
    expectedHeading: "Electricity Outage for Five Days",
    expectedSummaryContains: [
      "without electricity for five days",
      "no drinking water",
    ],
    expectedSummaryNotContains: [
      "water pump",
      "grid verification",
      "remediation",
      "at none",
    ],
  },
];

let allPassed = true;

for (const t of tests) {
  const res = processComplaintPrivacy(t.input, t.metadata);
  let passed = true;
  const errors: string[] = [];

  if (t.expectedHeading && res.generatedHeading !== t.expectedHeading) {
    passed = false;
    errors.push(`Heading mismatch: expected "${t.expectedHeading}", got "${res.generatedHeading}"`);
  }

  if (t.mustContainSanitized) {
    for (const phrase of t.mustContainSanitized) {
      if (!res.sanitizedDescription.includes(phrase)) {
        passed = false;
        errors.push(`Sanitized missing: "${phrase}". Got: "${res.sanitizedDescription}"`);
      }
    }
  }

  if (t.mustNotContainSanitized) {
    for (const phrase of t.mustNotContainSanitized) {
      if (res.sanitizedDescription.includes(phrase)) {
        passed = false;
        errors.push(`Sanitized leaked private term: "${phrase}". Got: "${res.sanitizedDescription}"`);
      }
    }
  }

  if (t.expectedSummaryContains) {
    for (const phrase of t.expectedSummaryContains) {
      if (!res.factualSummary.toLowerCase().includes(phrase.toLowerCase())) {
        passed = false;
        errors.push(`Summary missing phrase: "${phrase}". Got: "${res.factualSummary}"`);
      }
    }
  }

  if (t.expectedSummaryNotContains) {
    for (const phrase of t.expectedSummaryNotContains) {
      if (res.factualSummary.toLowerCase().includes(phrase.toLowerCase())) {
        passed = false;
        errors.push(`Summary contained forbidden jargon: "${phrase}". Got: "${res.factualSummary}"`);
      }
    }
  }

  if (passed) {
    console.log(`✓ PASS: ${t.name}`);
  } else {
    allPassed = false;
    console.error(`✗ FAIL: ${t.name}`);
    for (const err of errors) console.error(`   ${err}`);
  }
}

console.log("\n=============================================================");
console.log(`TEST COMPLETED: ${allPassed ? "ALL PASSED" : "FAILURES DETECTED"}`);
console.log("=============================================================");
