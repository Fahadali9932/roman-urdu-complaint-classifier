/**
 * Comprehensive Test Suite for Privacy & Sanitization Engine
 */

import { sanitizeComplaint, generateHeading, generateSummary, processComplaintPrivacy } from "../src/lib/privacy-engine.ts";

const TEST_CASES = [
  {
    name: "Pakistani mobile phone variations & email",
    input: "Mera mobile 0300-1234567 hai aur bhai ka 0321 9876543 hai. Rabta karein ali.citizen@gmail.com par. Main Shahrah-e-Faisal par gehra khadda hai.",
    meta: {
      citizenName: "Ali Citizen",
      locality: "PECHS",
      district: "East",
      publicLocation: "Main Shahrah-e-Faisal near Nursery",
      departmentId: "kmc",
    },
    expectedRedactions: ["[PHONE REDACTED]", "[EMAIL REDACTED]"],
    expectedPreserved: ["Main Shahrah-e-Faisal", "gehra khadda"],
  },
  {
    name: "International +92 format and landline 021",
    input: "Emergency call +923001122334 ya landline 021-34567890 par dein. K-Electric transformer blast ho gaya Clifton Block 2 mein.",
    meta: {
      citizenName: "Usman Ghani",
      locality: "Clifton",
      district: "South",
      publicLocation: "Clifton Block 2 near Boat Basin",
      departmentId: "kelectric",
    },
    expectedRedactions: ["[PHONE REDACTED]"],
    expectedPreserved: ["transformer blast", "Clifton Block 2"],
  },
  {
    name: "Citizen self-identification names",
    input: "Mera naam Muhammad Tariq Khan hai. Main Liaquatabad Supermarket flyover ke expansion joint khulne ki shikayat kar raha hoon.",
    meta: {
      citizenName: "Muhammad Tariq Khan",
      locality: "Liaquatabad",
      district: "Central",
      publicLocation: "Liaquatabad Supermarket flyover",
      departmentId: "kmc",
    },
    expectedRedactions: ["[NAME REDACTED]"],
    expectedPreserved: ["Liaquatabad Supermarket flyover", "expansion joint"],
  },
  {
    name: "Private home address vs public incident location",
    input: "Mera ghar House No. 42-B, Street 3, Block 13-D Gulshan mein hai. University Road opposite NED University par main gutter leak ho raha hai.",
    meta: {
      citizenName: "Syed Kashif",
      locality: "Gulshan-e-Iqbal",
      district: "East",
      publicLocation: "University Road opposite NED University",
      departmentId: "kwsc",
    },
    expectedRedactions: ["[PRIVATE ADDRESS REDACTED]"],
    expectedPreserved: ["University Road opposite NED University", "gutter leak"],
  },
  {
    name: "Abusive language filtering without losing grievance",
    input: "KMC ke jahil kameene staff sunte nahi hain kutte log hain. University Road par road toot chuki hai car accident hua jaldi repair karo.",
    meta: {
      citizenName: "Zahid Ahmed",
      locality: "Gulshan-e-Iqbal",
      district: "East",
      publicLocation: "University Road near Expo Centre",
      departmentId: "kmc",
    },
    expectedRedactions: ["[OFFENSIVE LANGUAGE REDACTED]"],
    expectedPreserved: ["University Road", "road toot chuki hai", "accident", "repair"],
  },
  {
    name: "Full composite: Name, Phone, Address, Email, Abuse, Public Location",
    input: "Mera naam Asif Raza hai, phone 0333-7654321, email asif_raza@yahoo.com. Humara makan House 12, Gali 4 mein hai. Gutter ka ganda paani KDA Chowrangi North Nazimabad par beh raha hai. Yeh haramkhor officers so rahe hain.",
    meta: {
      citizenName: "Asif Raza",
      locality: "North Nazimabad",
      district: "Central",
      publicLocation: "KDA Chowrangi near Five Star",
      departmentId: "kwsc",
    },
    expectedRedactions: [
      "[NAME REDACTED]",
      "[PHONE REDACTED]",
      "[EMAIL REDACTED]",
      "[PRIVATE ADDRESS REDACTED]",
      "[OFFENSIVE LANGUAGE REDACTED]",
    ],
    expectedPreserved: ["KDA Chowrangi North Nazimabad", "Gutter ka ganda paani"],
  },
];

console.log("=== PRIVACY ENGINE SPECIFICATION VALIDATION ===");
console.log(`Total test suites: ${TEST_CASES.length}`);
