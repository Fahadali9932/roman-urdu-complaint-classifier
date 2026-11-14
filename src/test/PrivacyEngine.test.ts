import { describe, it, expect } from "vitest";
import {
  sanitizeComplaint,
  generateHeading,
  generateSummary,
  processComplaintPrivacy,
} from "../lib/privacy-engine";

describe("AWAAZ-E-AWAM — Phase 3E.2: Privacy & Presentation Engine", () => {
  describe("1. Pakistani Phone & Contact Number Redaction", () => {
    it("redacts standard dashed mobile numbers (0300-1234567)", () => {
      const res = sanitizeComplaint("Mera phone 0300-1234567 hai sadak par khadda hai");
      expect(res.sanitizedText).toContain("[PHONE REDACTED]");
      expect(res.sanitizedText).not.toContain("0300-1234567");
      expect(res.flags.hasPhone).toBe(true);
    });

    it("redacts space-separated mobile numbers (0321 9876543)", () => {
      const res = sanitizeComplaint("Contact me on 0321 9876543 immediately for details");
      expect(res.sanitizedText).toContain("[PHONE REDACTED]");
      expect(res.sanitizedText).not.toContain("0321 9876543");
      expect(res.flags.hasPhone).toBe(true);
    });

    it("redacts international +92 format (+923001122334)", () => {
      const res = sanitizeComplaint("WhatsApp at +923001122334 regarding transformer spark");
      expect(res.sanitizedText).toContain("[PHONE REDACTED]");
      expect(res.sanitizedText).not.toContain("+923001122334");
      expect(res.flags.hasPhone).toBe(true);
    });

    it("redacts Karachi landline numbers (021-34567890 and 021 34567890)", () => {
      const res1 = sanitizeComplaint("Landline: 021-34567890 par rabta karein");
      expect(res1.sanitizedText).toContain("[PHONE REDACTED]");
      expect(res1.sanitizedText).not.toContain("021-34567890");

      const res2 = sanitizeComplaint("Call 021 34567890 for emergency");
      expect(res2.sanitizedText).toContain("[PHONE REDACTED]");
      expect(res2.sanitizedText).not.toContain("021 34567890");
    });

    it("redacts submitter phone number provided in metadata", () => {
      const res = sanitizeComplaint("Ghar ka phone 03459988776 hai", {
        citizenPhone: "0345-9988776",
      });
      expect(res.sanitizedText).toContain("[PHONE REDACTED]");
      expect(res.sanitizedText).not.toContain("03459988776");
    });
  });

  describe("2. Email & National Identity (CNIC) Redaction", () => {
    it("redacts standard email addresses", () => {
      const res = sanitizeComplaint("Email me at citizen.karachi_01@gmail.com for photo proof");
      expect(res.sanitizedText).toContain("[EMAIL REDACTED]");
      expect(res.sanitizedText).not.toContain("citizen.karachi_01@gmail.com");
      expect(res.flags.hasEmail).toBe(true);
    });

    it("redacts Pakistani CNIC numbers", () => {
      const res = sanitizeComplaint("My CNIC is 42101-1234567-1 please verify");
      expect(res.sanitizedText).toContain("[CNIC REDACTED]");
      expect(res.sanitizedText).not.toContain("42101-1234567-1");
      expect(res.flags.hasCnic).toBe(true);
    });
  });

  describe("3. Citizen Name Detection & Redaction", () => {
    it("redacts natural Roman Urdu self-identification ('Mera naam [Name] hai')", () => {
      const res = sanitizeComplaint("Mera naam Muhammad Tariq Khan hai aur main shikayat darj kar raha hoon");
      expect(res.sanitizedText).toContain("[NAME REDACTED]");
      expect(res.sanitizedText).not.toContain("Muhammad Tariq Khan");
      expect(res.flags.hasName).toBe(true);
    });

    it("redacts English self-identification ('My name is [Name]')", () => {
      const res = sanitizeComplaint("My name is Ali Raza and I live nearby");
      expect(res.sanitizedText).toContain("[NAME REDACTED]");
      expect(res.sanitizedText).not.toContain("Ali Raza");
      expect(res.flags.hasName).toBe(true);
    });

    it("redacts prefix-based names ('From: [Name]', 'Complaint by: [Name]')", () => {
      const res = sanitizeComplaint("From: Kashif Siddiqui. Main sewerage line block hai");
      expect(res.sanitizedText).toContain("[NAME REDACTED]");
      expect(res.sanitizedText).not.toContain("Kashif Siddiqui");
      expect(res.flags.hasName).toBe(true);
    });

    it("redacts explicit citizenName provided in intake metadata", () => {
      const res = sanitizeComplaint("Main Zahid Ahmed baat kar raha hoon street light kharab hai", {
        citizenName: "Zahid Ahmed",
      });
      expect(res.sanitizedText).toContain("[NAME REDACTED]");
      expect(res.sanitizedText).not.toContain("Zahid Ahmed");
      expect(res.flags.hasName).toBe(true);
    });
  });

  describe("4. Complete Private Address Span Redaction vs Public Incident Location Protection", () => {
    it("redacts full multi-segment private address span (KHI-2026-78C5238F exact fix)", () => {
      const res = sanitizeComplaint(
        "Mera ghar House No. 42-B, Street 3, Block 13-D Gulshan mein hai.",
        {
          residentialAddress: "House No. 42-B, Street 3, Block 13-D, Gulshan-e-Iqbal",
        }
      );
      expect(res.sanitizedText).toBe("Mera ghar [PRIVATE ADDRESS REDACTED] mein hai.");
      expect(res.sanitizedText).not.toContain("House No. 42-B");
      expect(res.sanitizedText).not.toContain("Street 3");
      expect(res.sanitizedText).not.toContain("Block 13-D");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts house and street span without comma (KHI-2026-44797EAE exact fix)", () => {
      const res = sanitizeComplaint(
        "mein house 24 street 5 mein rehta hun. Kachra jama hai."
      );
      expect(res.sanitizedText).toContain("[PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("house 24");
      expect(res.sanitizedText).not.toContain("street 5");
      expect(res.sanitizedText).toContain("Kachra jama hai");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts apartment and building names (Flat 402, Al-Rehman Heights)", () => {
      const res = sanitizeComplaint(
        "Humara Flat 402, Al-Rehman Heights mein crack agaya hai"
      );
      expect(res.sanitizedText).toContain("[PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("Flat 402");
      expect(res.sanitizedText).not.toContain("Al-Rehman Heights");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts residential address starting with street after 'Mera ghar'", () => {
      const res = sanitizeComplaint("Mera ghar Street 3 mein hai aur bijli band hai");
      expect(res.sanitizedText).toContain("Mera ghar [PRIVATE ADDRESS REDACTED] mein hai");
      expect(res.sanitizedText).not.toContain("Street 3");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts natural living context ('main xyz colony mein rehta hoon')", () => {
      const res = sanitizeComplaint(
        "mera naam Ahmed hai main xyz colony mein rehta hoon aur hamare ghar 5 din se bijli nahi aa rahi",
        { citizenName: "Ahmed", residentialAddress: "xyz colony" }
      );
      expect(res.sanitizedText).toContain("main [PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).toContain("[NAME REDACTED]");
      expect(res.sanitizedText).not.toContain("Ahmed");
      expect(res.sanitizedText).not.toContain("xyz colony");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts natural living context ('mein abc block mein rehta hoon')", () => {
      const res = sanitizeComplaint("mein abc block mein rehta hoon aur gali mein kachra jama hai");
      expect(res.sanitizedText).toContain("mein [PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("abc block");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts society statement ('hum log xyz society mein rehte hain')", () => {
      const res = sanitizeComplaint("hum log xyz society mein rehte hain 4 din se pani nahi aa raha");
      expect(res.sanitizedText).toContain("[PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("xyz society");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts apartment intro ('mera ghar abc apartments mein hai')", () => {
      const res = sanitizeComplaint("mera ghar abc apartments mein hai building mein crack agaya");
      expect(res.sanitizedText).toContain("mera ghar [PRIVATE ADDRESS REDACTED] mein hai");
      expect(res.sanitizedText).not.toContain("abc apartments");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts near street statement ('main abc gali ke paas rehti hun')", () => {
      const res = sanitizeComplaint("main abc gali ke paas rehti hun sadak par gehra khadda hai");
      expect(res.sanitizedText).toContain("main [PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("abc gali");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts address intro ('hamara pata xyz colony hai')", () => {
      const res = sanitizeComplaint("hamara pata xyz colony hai gutter ubal raha hai");
      expect(res.sanitizedText).toContain("hamara pata [PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("xyz colony");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts English living statement ('i live in xyz residential complex')", () => {
      const res = sanitizeComplaint("i live in xyz residential complex and there is no water for 2 days");
      expect(res.sanitizedText).toContain("i live in [PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("xyz residential complex");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("DOES NOT redact public incident locations needed for investigation", () => {
      const res = sanitizeComplaint(
        "Main Shahrah-e-Faisal near Nursery flyover par gehra khadda hai gaariyan lag rahi hain",
        {
          incidentPublicLocation: "Main Shahrah-e-Faisal near Nursery",
          incidentLocality: "PECHS",
          incidentDistrict: "East",
        }
      );
      expect(res.sanitizedText).toContain("Main Shahrah-e-Faisal near Nursery");
      expect(res.sanitizedText).toContain("flyover");
      expect(res.sanitizedText).not.toContain("[PRIVATE ADDRESS REDACTED]");
    });

    it("preserves University Road and public chowrangi landmarks", () => {
      const res = sanitizeComplaint(
        "University Road opposite NED University KDA Chowrangi par gutter ka pani beh raha hai",
        {
          incidentPublicLocation: "University Road opposite NED University",
          incidentLocality: "Gulshan-e-Iqbal",
          incidentDistrict: "East",
        }
      );
      expect(res.sanitizedText).toContain("University Road opposite NED University");
      expect(res.sanitizedText).toContain("KDA Chowrangi");
      expect(res.sanitizedText).not.toContain("[PRIVATE ADDRESS REDACTED]");
    });
  });

  describe("5. Abusive Language Filtering & Safety Audit Flags", () => {
    it("masks Roman Urdu offensive words while preserving the citizen's actual complaint", () => {
      const res = sanitizeComplaint(
        "KMC ke jahil kameene staff sunte nahi hain kutte log hain foran sadak repair karo"
      );
      expect(res.sanitizedText).toContain("[OFFENSIVE LANGUAGE REDACTED]");
      expect(res.sanitizedText).not.toContain("jahil");
      expect(res.sanitizedText).not.toContain("kameene");
      expect(res.sanitizedText).not.toContain("kutte");
      expect(res.sanitizedText).toContain("foran sadak repair karo");
      expect(res.flags.hasAbusiveLanguage).toBe(true);
    });

    it("masks English expletives while keeping evidence intact", () => {
      const res = sanitizeComplaint(
        "These corrupt pigs and idiots have not fixed the power outage for 3 days"
      );
      expect(res.sanitizedText).toContain("[OFFENSIVE LANGUAGE REDACTED]");
      expect(res.sanitizedText).not.toContain("corrupt pigs");
      expect(res.sanitizedText).not.toContain("idiots");
      expect(res.sanitizedText).toContain("power outage for 3 days");
      expect(res.flags.hasAbusiveLanguage).toBe(true);
    });

    it("flags safety threat indicators for supervisory audit", () => {
      const res = sanitizeComplaint(
        "Agar transformer theek nahi kiya to jaan se maar doonga"
      );
      expect(res.flags.safetyHazard).toBe(true);
    });
  });

  describe("6. Phase 3E.2 Core Scenarios (A, B, C, D, E)", () => {
    it("Scenario A: Electricity outage with water motor consequence", () => {
      const raw = "Humare ghar 3 din se bijli nahi aa rahi jiski wajah se motor nahi chal rahi aur pani bhi nahi hai.";
      const res = processComplaintPrivacy(raw, {
        incidentLocality: "Gulshan-e-Iqbal",
        departmentId: "kelectric",
      });
      expect(res.generatedHeading).toBe("Electricity Outage for Three Days");
      expect(res.factualSummary).toContain("without electricity for three days in Gulshan-e-Iqbal");
      expect(res.factualSummary).toContain("The power outage is preventing their water pump from working");
    });

    it("Scenario A2: Five-day power outage with no drinking water (KHI-2026-8FE7C3CA exact case)", () => {
      const raw = "humare ghar 5 din se light nahi hai aur peene ke liye pani bhi nahi hai";
      const res = processComplaintPrivacy(raw, {
        incidentLocality: "Korangi",
        departmentId: "kelectric",
      });
      expect(res.generatedHeading).toBe("Electricity Outage for Five Days");
      expect(res.factualSummary).toContain("without electricity for five days in Korangi");
      expect(res.factualSummary).toContain("They also report having no drinking water");
      expect(res.factualSummary).not.toContain("water pump");
      expect(res.factualSummary).not.toContain("grid verification");
    });

    it("Scenario B: Garbage uncollected for 4 days", () => {
      const raw = "Hamari gali mein 4 din se kachra nahi uthaya gaya aur bohat badboo aa rahi hai.";
      const res = processComplaintPrivacy(raw, {
        incidentLocality: "Gulshan-e-Iqbal",
        departmentId: "sswmb",
      });
      expect(res.generatedHeading).toBe("Garbage Not Collected for Four Days");
      expect(res.factualSummary).toContain("garbage has not been collected from their street for four days in Gulshan-e-Iqbal");
      expect(res.factualSummary).toContain("The waste is causing a bad smell and inconvenience for nearby families");
    });

    it("Scenario C: Damaged road and potholes", () => {
      const raw = "Hamare area ki road toot gayi hai aur bohat gadday hain.";
      const res = processComplaintPrivacy(raw, {
        incidentLocality: "Gulberg",
        departmentId: "kmc",
      });
      expect(res.generatedHeading).toBe("Damaged Road and Potholes");
      expect(res.factualSummary).toContain("severe road damage with deep potholes in Gulberg");
      expect(res.factualSummary).toContain("hazardous driving conditions");
    });

    it("Scenario D: Personal information protection with water pipe complaint", () => {
      const raw = "Mera naam Ahmed hai, phone 03001234567 hai aur mein House 24 Street 5 mein rehta hun. Gali mein pani ki pipe toot gayi hai.";
      const res = processComplaintPrivacy(raw, {
        citizenName: "Ahmed",
        citizenPhone: "03001234567",
        residentialAddress: "House 24, Street 5",
        incidentLocality: "North Nazimabad",
        departmentId: "kwsc",
      });
      expect(res.generatedHeading).toBe("Broken Drinking Water Pipe in Street");
      expect(res.sanitizedDescription).toContain("[NAME REDACTED]");
      expect(res.sanitizedDescription).toContain("[PHONE REDACTED]");
      expect(res.sanitizedDescription).toContain("[PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedDescription).not.toContain("Ahmed");
      expect(res.sanitizedDescription).not.toContain("03001234567");
      expect(res.sanitizedDescription).not.toContain("House 24");
      expect(res.sanitizedDescription).not.toContain("Street 5");
      expect(res.sanitizedDescription).toContain("Gali mein pani ki pipe toot gayi hai");
      expect(res.factualSummary).toContain("drinking water pipeline has broken in their street in North Nazimabad");
      expect(res.factualSummary).not.toContain("Ahmed");
      expect(res.factualSummary).not.toContain("03001234567");
    });

    it("Scenario E: Mismatched / uncertain classification does NOT hallucinate wrong problem", () => {
      // Classifier predicts KMC for a garbage complaint
      const raw = "Hamari gali mein 4 din se kachra nahi uthaya gaya. Bohat badboo arahi hai aur bachay pareshan hain.";
      const res = processComplaintPrivacy(raw, {
        incidentLocality: "Gulshan-e-Iqbal",
        incidentPublicLocation: "none",
        departmentId: "kmc", // Low confidence predicted department
      });
      // Heading MUST represent garbage, NOT road damage
      expect(res.generatedHeading).toBe("Garbage Not Collected for Four Days");
      expect(res.generatedHeading).not.toContain("Road");
      expect(res.generatedHeading).not.toContain("Civil Infrastructure");

      // Summary MUST describe garbage, NEVER mention KMC or road repairs
      expect(res.factualSummary).toContain("garbage has not been collected");
      expect(res.factualSummary).not.toContain("road infrastructure");
      expect(res.factualSummary).not.toContain("KMC");
      // NEVER contain "at none"
      expect(res.factualSummary).not.toContain("at none");
    });
  });

  describe("7. Natural Location Formatting (Zero 'at none' artifacts)", () => {
    it("handles placeholder 'none' or 'n/a' gracefully", () => {
      const summary = generateSummary("Pani ki pipe toot gayi hai", {
        incidentPublicLocation: "none",
        incidentLocality: "Gulshan-e-Iqbal",
      });
      expect(summary).not.toContain("at none");
      expect(summary).toContain("in Gulshan-e-Iqbal");
    });

    it("handles both public location and locality cleanly", () => {
      const summary = generateSummary("Pani ki pipe toot gayi hai", {
        incidentPublicLocation: "Near Disco Bakery",
        incidentLocality: "Gulshan-e-Iqbal",
      });
      expect(summary).toContain("at Near Disco Bakery, Gulshan-e-Iqbal");
    });

    it("handles empty or missing location without crashing or generating awkward artifacts", () => {
      const summary = generateSummary("Pani ki pipe toot gayi hai", {});
      expect(summary).not.toContain("at none");
      expect(summary).not.toContain("undefined");
      expect(summary).not.toContain("null");
    });
  });

  describe("8. Unified Privacy Processing Pipeline", () => {
    it("processes multi-field sensitive complaint end-to-end", () => {
      const rawText =
        "Mera naam Asif Raza hai, mera mobile 0300-1234567 hai, email asif@example.com. " +
        "Mera ghar House 12, Street 4 mein hai. University Road par gehra khadda hai gaariyan lagti hain. " +
        "Yeh KMC ke kutte staff koi kaam nahi karte.";

      const processed = processComplaintPrivacy(rawText, {
        citizenName: "Asif Raza",
        citizenPhone: "0300-1234567",
        citizenEmail: "asif@example.com",
        residentialAddress: "House 12, Street 4",
        incidentDistrict: "East",
        incidentLocality: "Gulshan-e-Iqbal",
        incidentPublicLocation: "University Road near Expo",
        departmentId: "kmc",
      });

      // Verification of all redactions
      expect(processed.sanitizedDescription).toContain("[NAME REDACTED]");
      expect(processed.sanitizedDescription).toContain("[PHONE REDACTED]");
      expect(processed.sanitizedDescription).toContain("[EMAIL REDACTED]");
      expect(processed.sanitizedDescription).toContain("[PRIVATE ADDRESS REDACTED]");
      expect(processed.sanitizedDescription).toContain("[OFFENSIVE LANGUAGE REDACTED]");

      // Verification of zero raw leakage
      expect(processed.sanitizedDescription).not.toContain("Asif Raza");
      expect(processed.sanitizedDescription).not.toContain("0300-1234567");
      expect(processed.sanitizedDescription).not.toContain("asif@example.com");
      expect(processed.sanitizedDescription).not.toContain("House 12");
      expect(processed.sanitizedDescription).not.toContain("Street 4");
      expect(processed.sanitizedDescription).not.toContain("kutte");

      // Public location preserved
      expect(processed.sanitizedDescription).toContain("University Road");

      // Generated heading and summary present and factual
      expect(processed.generatedHeading).toBe("Damaged Road and Potholes");
      expect(processed.factualSummary).toContain("at University Road near Expo, Gulshan-e-Iqbal");

      // Flags populated
      expect(processed.flags.hasPhone).toBe(true);
      expect(processed.flags.hasEmail).toBe(true);
      expect(processed.flags.hasName).toBe(true);
      expect(processed.flags.hasPrivateAddress).toBe(true);
      expect(processed.flags.hasAbusiveLanguage).toBe(true);
    });
  });
});
