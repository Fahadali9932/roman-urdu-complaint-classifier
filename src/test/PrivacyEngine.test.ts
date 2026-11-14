import { describe, it, expect } from "vitest";
import {
  sanitizeComplaint,
  generateHeading,
  generateSummary,
  processComplaintPrivacy,
} from "../lib/privacy-engine";

describe("AWAAZ-E-AWAM — Phase 3E: Privacy & Sanitization Engine", () => {
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

  describe("4. Private Address Redaction vs Public Incident Location Protection", () => {
    it("redacts private house and flat addresses", () => {
      const res = sanitizeComplaint(
        "Mera ghar House No. 42-B, Street 3 mein hai aur bijli band hai"
      );
      expect(res.sanitizedText).toContain("[PRIVATE ADDRESS REDACTED]");
      expect(res.sanitizedText).not.toContain("House No. 42-B, Street 3");
      expect(res.flags.hasPrivateAddress).toBe(true);
    });

    it("redacts apartment and flat numbers (Flat 402, Al-Rehman Heights)", () => {
      const res = sanitizeComplaint(
        "Humara Flat 402, Building mein crack agaya hai"
      );
      expect(res.sanitizedText).toContain("[PRIVATE ADDRESS REDACTED]");
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
      // Public location MUST be preserved
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
      // Civic grievance must remain intact
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

  describe("6. Automatic Heading Generation", () => {
    it("generates factual heading for electricity outage with duration", () => {
      const heading = generateHeading("Bijli teen din se band hai transformer blast hua", "kelectric", "Gulshan");
      expect(heading).toContain("Transformer Explosion");
      expect(heading).toContain("Gulshan");
    });

    it("generates professional heading for road pothole repair", () => {
      const heading = generateHeading("University road par gehra gadda hai asphalt toot gaya", "kmc", "Gulberg");
      expect(heading).toContain("Deep Pothole and Damaged Road Repair Required");
      expect(heading).toContain("Gulberg");
    });

    it("generates concise heading for sewage overflow", () => {
      const heading = generateHeading("Gutter ka ganda pani ubal kar sadak par aagaya", "kwsc", "Clifton");
      expect(heading).toContain("Severe Sewerage Overflow and Gutter Blockage");
      expect(heading).toContain("Clifton");
    });

    it("generates heading for uncollected garbage", () => {
      const heading = generateHeading("Gali mein kachra jama hai dustbin bhar gaya", "sswmb", "North Nazimabad");
      expect(heading).toContain("Uncollected Garbage and Waste Accumulation");
    });

    it("generates heading for illegal building construction", () => {
      const heading = generateHeading("Padosi 4 manzil illegal plaza bana raha hai", "sbca", "Saddar");
      expect(heading).toContain("Unauthorized Multi-Story Building Construction");
    });
  });

  describe("7. Automatic Factual Summary Generation", () => {
    it("generates factual 1-3 sentence summary explaining what, where, duration, and problem", () => {
      const summary = generateSummary(
        "Main manhole se ganda badboodar paani ubal kar sadak par aagaya hai teen din se paani khara hai",
        {
          departmentId: "kwsc",
          incidentPublicLocation: "Block 12 near Central Market",
          incidentLocality: "Gulberg",
          incidentDistrict: "Central",
        }
      );
      expect(summary).toContain("Raw sewage and blocked manhole runoff are overflowing");
      expect(summary).toContain("Block 12 near Central Market, Gulberg");
      expect(summary).toContain("three days");
      expect(summary).toContain("KWSC");
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
      expect(processed.sanitizedDescription).not.toContain("House 12, Street 4");
      expect(processed.sanitizedDescription).not.toContain("kutte");

      // Public location preserved
      expect(processed.sanitizedDescription).toContain("University Road");

      // Generated heading and summary present
      expect(processed.generatedHeading).toContain("Deep Pothole");
      expect(processed.factualSummary).toContain("University Road near Expo");

      // Flags populated
      expect(processed.flags.hasPhone).toBe(true);
      expect(processed.flags.hasEmail).toBe(true);
      expect(processed.flags.hasName).toBe(true);
      expect(processed.flags.hasPrivateAddress).toBe(true);
      expect(processed.flags.hasAbusiveLanguage).toBe(true);
    });
  });
});
