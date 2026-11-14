/**
 * AWAAZ-E-AWAM — Phase 3E: Intelligent Privacy & Sanitization Engine
 *
 * Implements:
 * 1. Personal Information Detection and Redaction (Phones, Emails, CNICs, Names, Private Addresses).
 * 2. Abusive Language Filtering (Masking insults while retaining complaint allegations and audit evidence).
 * 3. Automatic Professional Heading Generation.
 * 4. Automatic Factual Summary Generation (1-3 sentences).
 * 5. Public Location Protection (Ensuring public incident locations are never redacted).
 *
 * Works in both browser/Vite and Deno Edge Runtime with zero external dependencies ($0.00 cost).
 */

export interface ComplaintPrivacyMetadata {
  citizenName?: string | null;
  citizenPhone?: string | null;
  citizenEmail?: string | null;
  residentialAddress?: string | null;
  incidentDistrict?: string | null;
  incidentLocality?: string | null;
  incidentPublicLocation?: string | null;
  departmentId?: string | null;
}

export interface RedactionFlags {
  hasPhone: boolean;
  hasEmail: boolean;
  hasCnic: boolean;
  hasName: boolean;
  hasPrivateAddress: boolean;
  hasAbusiveLanguage: boolean;
  safetyHazard: boolean;
  uncertainRedaction: boolean;
}

export interface SanitizationResult {
  sanitizedText: string;
  flags: RedactionFlags;
  redactedSpansCount: number;
}

export interface ComplaintProcessingResult {
  sanitizedDescription: string;
  generatedHeading: string;
  factualSummary: string;
  flags: RedactionFlags;
}

// ---------------------------------------------------------------------------
// 1. ABUSIVE & OFFENSIVE LANGUAGE DICTIONARY
// ---------------------------------------------------------------------------
const ABUSIVE_PATTERNS = [
  // Roman Urdu vulgarities & insults directed at staff/authorities
  /\b(kutta|kutte|kutti|kutton)\b/gi,
  /\b(kameena|kameene|kameeni)\b/gi,
  /\b(harami|haraami|haramkhor|haramzada|haraamzada)\b/gi,
  /\b(lanat|laanat|laanat\s+ho)\b/gi,
  /\b(bhenchod|behenchod|bc)\b/gi,
  /\b(madarchod|madarchod|mc)\b/gi,
  /\b(chutiya|chutiye|chutye)\b/gi,
  /\b(ullu\s+k[ae]\s+patth[ae])\b/gi,
  /\b(suar|suwar)\b/gi,
  /\b(jahil|jaahil|jahilon)\b/gi,
  /\b(gadha|gadhay|gadhe)\b/gi,
  /\b(beghairat|baghairat)\b/gi,
  /\b(bakwas|bakwaas)\b/gi,
  /\b(ghatiya|ghateeya)\b/gi,
  /\b(zaleel|daleel)\b/gi,
  /\b(rishwat\s+khor\s+kutton)\b/gi,
  /\b(chor\s+afsar|chor\s+staff)\b/gi,
  // English vulgarities
  /\b(bastard|bastards)\b/gi,
  /\b(idiot|idiots)\b/gi,
  /\b(stupid)\b/gi,
  /\b(asshole|assholes)\b/gi,
  /\b(bitch|bitches)\b/gi,
  /\b(fuck|fucking|fucker)\b/gi,
  /\b(corrupt\s+pigs)\b/gi,
  /\b(bloody\s+hell)\b/gi,
];

// Safety / threat patterns
const THREAT_PATTERNS = [
  /\b(jaan\s+se\s+maar|qatal|bomb|dhamaka|hathyar|aslah)\b/gi,
  /\b(shoot|kill|burn\s+down)\b/gi,
];

// Public location indicator terms that must NEVER be redacted
const PUBLIC_LOCATION_KEYWORDS = [
  "road", "sadak", "sarak", "street", "main", "service",
  "shahrah", "flyover", "underpass", "bridge", "pul", "bridge",
  "chowrangi", "roundabout", "chowk", "mor", "chauraha",
  "market", "bazaar", "commercial", "plaza", "arcade", "supermarket",
  "park", "ground", "school", "college", "university", "ned", "ku",
  "hospital", "masjid", "mosque", "station", "stop", "bus stop",
  "signal", "drain", "kundi", "manhole", "pillar", "transformer",
];

// ---------------------------------------------------------------------------
// 2. SANITIZATION / REDACTION CORE
// ---------------------------------------------------------------------------
export function sanitizeComplaint(
  rawText: string,
  metadata?: ComplaintPrivacyMetadata
): SanitizationResult {
  if (!rawText || !rawText.trim()) {
    return {
      sanitizedText: "",
      flags: {
        hasPhone: false,
        hasEmail: false,
        hasCnic: false,
        hasName: false,
        hasPrivateAddress: false,
        hasAbusiveLanguage: false,
        safetyHazard: false,
        uncertainRedaction: false,
      },
      redactedSpansCount: 0,
    };
  }

  let text = rawText;
  let redactedSpansCount = 0;

  const flags: RedactionFlags = {
    hasPhone: false,
    hasEmail: false,
    hasCnic: false,
    hasName: false,
    hasPrivateAddress: false,
    hasAbusiveLanguage: false,
    safetyHazard: false,
    uncertainRedaction: false,
  };

  // Helper to check if a span overlaps with public location
  const isPublicIncidentLocation = (span: string): boolean => {
    const lower = span.toLowerCase().trim();
    for (const kw of PUBLIC_LOCATION_KEYWORDS) {
      if (lower.includes(kw)) return true;
    }
    if (metadata?.incidentPublicLocation && lower.includes(metadata.incidentPublicLocation.toLowerCase().trim())) {
      return true;
    }
    if (metadata?.incidentLocality && lower.includes(metadata.incidentLocality.toLowerCase().trim())) {
      return true;
    }
    return false;
  };

  // A. Abusive Language Masking
  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(text)) {
      flags.hasAbusiveLanguage = true;
      text = text.replace(pattern, () => {
        redactedSpansCount++;
        return "[OFFENSIVE LANGUAGE REDACTED]";
      });
    }
  }

  // Safety Threat Detection (Flags audit alert without erasing grievance)
  for (const tPattern of THREAT_PATTERNS) {
    if (tPattern.test(text)) {
      flags.safetyHazard = true;
    }
  }

  // B. Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  if (emailRegex.test(text)) {
    flags.hasEmail = true;
    text = text.replace(emailRegex, () => {
      redactedSpansCount++;
      return "[EMAIL REDACTED]";
    });
  }

  // C. Pakistani CNIC / Identity Numbers (e.g. 42101-1234567-1, 42201 1234567 1)
  const cnicRegex = /\b[0-9]{5}[-.\s]?[0-9]{7}[-.\s]?[0-9]\b/g;
  if (cnicRegex.test(text)) {
    flags.hasCnic = true;
    text = text.replace(cnicRegex, () => {
      redactedSpansCount++;
      return "[CNIC REDACTED]";
    });
  }

  // D. Pakistani Phone & Telephone Numbers
  // 1. Prefix-based contact patterns: "phone: 0300 1234567", "mobile: ...", "rabta no: ..."
  const prefixPhoneRegex = /\b(?:phone|mobile|cell|contact|number|no|rabta|call|whatsapp)[^\w\n]{1,5}(?:\+?92|0092|0)?[0-9\s\-().]{7,15}\b/gi;
  text = text.replace(prefixPhoneRegex, (match) => {
    // Keep the keyword prefix for context, redact the number digits
    flags.hasPhone = true;
    redactedSpansCount++;
    const prefix = match.match(/^[a-z]+/i)?.[0] ?? "Contact";
    return `${prefix}: [PHONE REDACTED]`;
  });

  // 2. Mobile numbers: 0300-1234567, 0321 9876543, +923001234567, 00923001234567, 03451234567
  const mobileRegex = /(?:\+?92|0092|0)[-.\s]?3[0-9]{2}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b|(?:\+?92|0092|0)[-.\s]?3[0-9]{2}[-.\s]?[0-9]{7}\b|\(?03[0-9]{2}\)?[-.\s]?[0-9]{7}\b/g;
  if (mobileRegex.test(text)) {
    flags.hasPhone = true;
    text = text.replace(mobileRegex, () => {
      redactedSpansCount++;
      return "[PHONE REDACTED]";
    });
  }

  // 3. Landline numbers: 021-34567890, 021 34567890, +92-21-34567890, 042-35891234
  const landlineRegex = /(?:\+?92|0092|0)?[-.\s]?(?:21|42|51)[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4}\b|\b0[2-9][0-9][-.\s]?[0-9]{6,8}\b/g;
  if (landlineRegex.test(text)) {
    flags.hasPhone = true;
    text = text.replace(landlineRegex, () => {
      redactedSpansCount++;
      return "[PHONE REDACTED]";
    });
  }

  // 4. Submitter phone matching if provided
  if (metadata?.citizenPhone) {
    const cleanPhone = metadata.citizenPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length >= 7) {
      const escaped = cleanPhone.slice(-7); // Last 7 digits
      const dynamicPhone = new RegExp(`[0-9\\s\\-.]{0,5}${escaped}\\b`, "g");
      if (dynamicPhone.test(text)) {
        flags.hasPhone = true;
        text = text.replace(dynamicPhone, () => {
          redactedSpansCount++;
          return "[PHONE REDACTED]";
        });
      }
    }
  }

  // E. Private Home Address & House Number Redaction
  // 1. "House No. 42-B, Street 3", "Flat 402, Al-Rehman Heights", "H# 14", "Plot 12-B"
  const privateAddressRegex = /\b(?:house|hno|h\.no|h#|makan|flat|apartment|apt|apt#|flat#|fl#|plot)[^\w\n]{0,3}(?:no|num|number|#)?[^\w\n]{0,3}[0-9a-zA-Z\-/]+(?:\s*,\s*(?:street|st|gali|lane|sector|block|phase)[^\w\n]{0,3}(?:no|num|number|#)?[^\w\n]{0,3}[0-9a-zA-Z\-/]+)?\b/gi;
  text = text.replace(privateAddressRegex, (match) => {
    if (isPublicIncidentLocation(match)) {
      return match; // Protect public locations
    }
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // 2. Private introduction: "Mera ghar...", "Humara makan...", "My house is..."
  const myHouseRegex = /\b(?:mera|humaara|humara|my|our)\s+(?:ghar|makan|house|flat|home)\s+(?:no|num|number|#)?[^\w\n]{0,3}[0-9a-zA-Z\-/]+(?:\s*,\s*[^\n,.]+)?\b/gi;
  text = text.replace(myHouseRegex, (match) => {
    if (isPublicIncidentLocation(match)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // 3. Submitter residential address matching if provided
  if (metadata?.residentialAddress && metadata.residentialAddress.length >= 6) {
    // If the citizen explicitly typed their full residential address in the description
    const cleanAddr = metadata.residentialAddress.toLowerCase().trim();
    const houseTokens = cleanAddr.match(/\b(?:house|flat|makan|plot|h#|apt)[^,]+/i);
    if (houseTokens && houseTokens[0]) {
      const houseRegex = new RegExp(houseTokens[0].replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi");
      if (houseRegex.test(text)) {
        flags.hasPrivateAddress = true;
        text = text.replace(houseRegex, () => {
          redactedSpansCount++;
          return "[PRIVATE ADDRESS REDACTED]";
        });
      }
    }
  }

  // F. Citizen Name Redaction
  // 1. Natural self-introduction: "Mera naam Muhammad Tariq Khan hai", "My name is Ali Raza"
  const nameIntroRegex = /\b(?:mera\s+na+m|my\s+name\s+is|mein|main|i\s+am)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\s+(?:hai|hy|bol\s+raha|bol\s+rahi|baat\s+kar\s+raha|here)\b/gi;
  text = text.replace(nameIntroRegex, (match, capturedName) => {
    flags.hasName = true;
    redactedSpansCount++;
    return match.replace(capturedName, "[NAME REDACTED]");
  });

  // 2. "Mera naam [Name] hai" / "Mera naam [Name]"
  const directNameRegex = /\b(?:mera\s+na+m|my\s+name\s+is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/gi;
  text = text.replace(directNameRegex, (match, capturedName) => {
    flags.hasName = true;
    redactedSpansCount++;
    return match.replace(capturedName, "[NAME REDACTED]");
  });

  // 3. Prefix: "From: Ali Raza", "Complaint by: Tariq", "Citizen: Asif"
  const fromNameRegex = /\b(?:from|complaint\s+by|complainant|citizen|naam)\s*:\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})\b/gi;
  text = text.replace(fromNameRegex, (match, capturedName) => {
    flags.hasName = true;
    redactedSpansCount++;
    return match.replace(capturedName, "[NAME REDACTED]");
  });

  // 4. Submitter citizenName matching if provided
  if (metadata?.citizenName && metadata.citizenName.trim().length >= 3) {
    const cleanName = metadata.citizenName.trim();
    // Match full name
    const fullNameRegex = new RegExp(`\\b${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
    if (fullNameRegex.test(text)) {
      flags.hasName = true;
      text = text.replace(fullNameRegex, () => {
        redactedSpansCount++;
        return "[NAME REDACTED]";
      });
    }
  }

  // G. Flag uncertain redactions
  // If text contains isolated 7-8 digit sequences or unparsed "house/flat" references
  if (/\b\d{7,8}\b/.test(text) || /\b(?:ghar|makan|house|flat)\b/i.test(text)) {
    flags.uncertainRedaction = true;
  }

  // Normalize consecutive duplicate redaction tokens
  text = text
    .replace(/(\[PHONE REDACTED\](\s*,\s*|\s+)){2,}/g, "[PHONE REDACTED] ")
    .replace(/(\[PRIVATE ADDRESS REDACTED\](\s*,\s*|\s+)){2,}/g, "[PRIVATE ADDRESS REDACTED] ")
    .replace(/(\[NAME REDACTED\](\s*,\s*|\s+)){2,}/g, "[NAME REDACTED] ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    sanitizedText: text,
    flags,
    redactedSpansCount,
  };
}

// ---------------------------------------------------------------------------
// 3. AUTOMATIC PROFESSIONAL HEADING GENERATION
// ---------------------------------------------------------------------------
export function generateHeading(
  text: string,
  departmentId?: string | null,
  locality?: string | null
): string {
  const lower = text.toLowerCase();
  const locPrefix = locality ? ` in ${locality.trim()}` : "";

  // Duration extraction
  let durationStr = "";
  if (/teen\s+din|3\s+din|three\s+days|3\s+days/i.test(lower)) {
    durationStr = " for Three Days";
  } else if (/do\s+din|2\s+din|two\s+days|2\s+days/i.test(lower)) {
    durationStr = " for Two Days";
  } else if (/chaar\s+din|4\s+din|four\s+days|4\s+days/i.test(lower)) {
    durationStr = " for Four Days";
  } else if (/paanch\s+din|5\s+din|five\s+days|5\s+days/i.test(lower)) {
    durationStr = " for Five Days";
  } else if (/hafta|hafte|one\s+week|1\s+week/i.test(lower)) {
    durationStr = " for Past Week";
  } else if (/mahina|mahine|one\s+month|1\s+month/i.test(lower)) {
    durationStr = " for Past Month";
  } else if (/aaj\s+subah|since\s+morning/i.test(lower)) {
    durationStr = " Since Morning";
  }

  switch (departmentId) {
    case "kelectric":
      if (/spark|taar\s+toot|wire|current|aag|falling/i.test(lower)) {
        return `Dangerous Fallen Wire and Sparking Emergency${locPrefix}`;
      }
      if (/transformer|blast|dhamaka/i.test(lower)) {
        return `Transformer Explosion and Power Failure${locPrefix}`;
      }
      if (/meter|digital\s+meter|screen|reading/i.test(lower)) {
        return `Faulty Electric Meter and Supply Fault${locPrefix}`;
      }
      return `Electricity Outage and Grid Failure${locPrefix}${durationStr}`;

    case "kmc":
      if (/gadda|khadda|pothole|crater|asphalt|carpet/i.test(lower)) {
        return `Deep Pothole and Damaged Road Repair Required${locPrefix}`;
      }
      if (/flyover|bridge|pul|joint|expansion/i.test(lower)) {
        return `Flyover Structural Joint and Road Hazard${locPrefix}`;
      }
      if (/footpath|pedestrian|encroachment|thela/i.test(lower)) {
        return `Pedestrian Footpath Obstruction and Encroachment${locPrefix}`;
      }
      if (/signal|street\s*light|light\s+pole|khamba/i.test(lower)) {
        return `Traffic Signal and Streetlight Infrastructure Fault${locPrefix}`;
      }
      return `Municipal Road and Civil Infrastructure Damage${locPrefix}`;

    case "kwsc":
      if (/gutter|sewerage|sewage|ubal|sludge|ganda\s+pani/i.test(lower)) {
        return `Severe Sewerage Overflow and Gutter Blockage${locPrefix}${durationStr}`;
      }
      if (/line\s+leak|burst|pipeline\s+phat|peep/i.test(lower)) {
        return `Main Drinking Water Pipeline Leakage${locPrefix}`;
      }
      if (/paani\s+nahi|pani\s+nahi|water\s+shortage|dry/i.test(lower)) {
        return `Drinking Water Supply Shortage${locPrefix}${durationStr}`;
      }
      if (/mix|contamination|badboo/i.test(lower)) {
        return `Sewage Contamination in Tap Water Supply${locPrefix}`;
      }
      return `Water and Sanitation Infrastructure Complaint${locPrefix}`;

    case "ssgc":
      if (/leak|badboo|smell|hissing/i.test(lower)) {
        return `Urgent Sui Gas Pipeline Leakage and Fire Hazard${locPrefix}`;
      }
      if (/pressure|kam\s+gas|chulha|stove/i.test(lower)) {
        return `Severe Low Gas Pressure and Supply Stoppage${locPrefix}${durationStr}`;
      }
      if (/meter|meter\s+leak/i.test(lower)) {
        return `Damaged Sui Gas Meter and Network Pipeline Issue${locPrefix}`;
      }
      return `Sui Gas Network Pipeline Emergency${locPrefix}`;

    case "sswmb":
      if (/kundi|dumpster|kachra\s+dabba/i.test(lower)) {
        return `Overflowing Municipal Garbage Dumpster${locPrefix}${durationStr}`;
      }
      if (/sweeper|safai|jhadoo/i.test(lower)) {
        return `Absence of Municipal Sweepers and Waste Cleanup${locPrefix}`;
      }
      return `Uncollected Garbage and Waste Accumulation${locPrefix}${durationStr}`;

    case "sbca":
      if (/manzil|floor|commercial|plaza|illegal\s+construction/i.test(lower)) {
        return `Unauthorized Multi-Story Building Construction${locPrefix}`;
      }
      if (/crack|pillar|foundation|jhuk|tilt/i.test(lower)) {
        return `Dangerous Structural Cracks in Residential Building${locPrefix}`;
      }
      if (/noc|plan|open\s+space/i.test(lower)) {
        return `Building Code Violation and Encroachment on Open Space${locPrefix}`;
      }
      return `Unauthorized Construction and Building Code Violation${locPrefix}`;

    default:
      if (/kachra|garbage/i.test(lower)) return `Uncollected Garbage in Residential Street${locPrefix}`;
      if (/bijli|power|light/i.test(lower)) return `Electricity Outage Reported${locPrefix}${durationStr}`;
      if (/paani|pani|water/i.test(lower)) return `Water Supply Issue Reported${locPrefix}`;
      if (/sadak|road/i.test(lower)) return `Damaged Road Infrastructure${locPrefix}`;
      return `Municipal Service Complaint${locPrefix}`;
  }
}

// ---------------------------------------------------------------------------
// 4. AUTOMATIC FACTUAL SUMMARY GENERATION (1-3 SENTENCES)
// ---------------------------------------------------------------------------
export function generateSummary(
  sanitizedText: string,
  metadata: ComplaintPrivacyMetadata
): string {
  const loc = metadata.incidentPublicLocation
    ? `${metadata.incidentPublicLocation}${metadata.incidentLocality ? `, ${metadata.incidentLocality}` : ""}`
    : metadata.incidentLocality || "the municipal area";

  const lower = sanitizedText.toLowerCase();

  // Sentence 1: The Essential Public Service Problem
  let problemDesc = "A civic service infrastructure disruption has been reported by local residents.";
  let impactDesc = "Immediate site inspection and technical remediation are required.";

  switch (metadata.departmentId) {
    case "kmc":
      if (/pothole|khadda|gadda|crater|asphalt/i.test(lower)) {
        problemDesc = `Severe road surface damage and deep potholes have formed on the main thoroughfare at ${loc}.`;
        impactDesc = "Vehicle movement is hazardous with reported damage to commuter traffic, requiring urgent asphalt resurfacing by KMC.";
      } else if (/flyover|bridge|joint/i.test(lower)) {
        problemDesc = `Expansion joint damage and structural road hazards are reported on the overhead crossing at ${loc}.`;
        impactDesc = "The road defect poses an immediate accident risk to moving vehicles, requiring civil engineering inspection by KMC.";
      } else {
        problemDesc = `Damaged municipal road infrastructure and pedestrian footpath obstructions are reported at ${loc}.`;
        impactDesc = "Prompt engineering remediation and road restoration by KMC are requested.";
      }
      break;

    case "kelectric":
      if (/spark|taar|wire|current/i.test(lower)) {
        problemDesc = `High-voltage electrical wiring or transmission cables are sparking and hanging precariously at ${loc}.`;
        impactDesc = "The situation presents an acute electrocution and public safety hazard, requiring immediate power shutdown and line securing by K-Electric.";
      } else if (/transformer|blast/i.test(lower)) {
        problemDesc = `A localized distribution transformer has malfunctioned or experienced a flashover at ${loc}.`;
        impactDesc = "Surrounding consumers are disconnected without power, requiring emergency transformer inspection and restoration by K-Electric.";
      } else {
        problemDesc = `An unscheduled power outage and electrical distribution failure has been reported at ${loc}.`;
        impactDesc = "Residents request grid verification and prompt power supply restoration by K-Electric.";
      }
      break;

    case "kwsc":
      if (/gutter|sewerage|sewage|ubal|sludge/i.test(lower)) {
        problemDesc = `Raw sewage and blocked manhole runoff are overflowing onto the public street at ${loc}.`;
        impactDesc = "The wastewater accumulation causes intense odor, hygiene hazards, and pedestrian blockage, requiring desilting and suction machinery by KWSC.";
      } else if (/line|leak|burst/i.test(lower)) {
        problemDesc = `A municipal drinking water pipeline has burst or developed significant pressurized leakage at ${loc}.`;
        impactDesc = "Potable water is being wasted while undermining the road sub-base, requiring urgent pipeline isolation and welding by KWSC.";
      } else {
        problemDesc = `Drinking water supply has been completely interrupted or severely depleted for residents at ${loc}.`;
        impactDesc = "Citizens request verification of bulk distribution valves and resumption of scheduled water supply by KWSC.";
      }
      break;

    case "ssgc":
      if (/leak|badboo|smell/i.test(lower)) {
        problemDesc = `A natural gas pipeline leak with intense odor has been reported in the vicinity of ${loc}.`;
        impactDesc = "The escaping gas poses an imminent combustible fire and explosion hazard, necessitating urgent emergency line isolation by SSGC.";
      } else {
        problemDesc = `Severely degraded or zero natural gas pressure is preventing normal domestic kitchen use at ${loc}.`;
        impactDesc = "Consumers request gas pressure regulation and pipeline blockage clearance by SSGC.";
      }
      break;

    case "sswmb":
      if (/kundi|dabba|dumpster/i.test(lower)) {
        problemDesc = `An overflowing municipal waste container and open garbage collection point are unmaintained at ${loc}.`;
        impactDesc = "Decomposing refuse has spilled onto the road causing sanitary and environmental risks, requiring compactors and waste removal by SSWMB.";
      } else {
        problemDesc = `Solid municipal waste and street refuse have accumulated uncollected in the neighborhood around ${loc}.`;
        impactDesc = "Residents request deployment of sanitation sweepers and complete trash evacuation by SSWMB.";
      }
      break;

    case "sbca":
      if (/manzil|floor|illegal|plaza/i.test(lower)) {
        problemDesc = `Unauthorized multi-story construction exceeding approved layout plans is actively progressing at ${loc}.`;
        impactDesc = "The developer has allegedly encroached on mandatory open space without SBCA clearance, requiring on-site sealing and inspection.";
      } else {
        problemDesc = `Critical structural cracks or unsafe construction practices are reported on building premises at ${loc}.`;
        impactDesc = "Neighbors request structural safety evaluation and enforcement of Karachi Building Regulations by SBCA.";
      }
      break;
  }

  // Sentence 2: Duration / Persistence
  let durationSentence = "";
  if (/teen\s+din|3\s+din|three\s+days|3\s+days/i.test(lower)) {
    durationSentence = " The problem has reportedly persisted continuously for three days.";
  } else if (/do\s+din|2\s+din|two\s+days/i.test(lower)) {
    durationSentence = " The grievance has persisted unaddressed for two days.";
  } else if (/hafta|week/i.test(lower)) {
    durationSentence = " The disruption has affected the locality for approximately one week.";
  } else if (/mahina|month/i.test(lower)) {
    durationSentence = " Residents report that this condition has remained unresolved for over a month.";
  }

  return `${problemDesc}${durationSentence} ${impactDesc}`.trim();
}

// ---------------------------------------------------------------------------
// 5. UNIFIED PROCESSING PIPELINE
// ---------------------------------------------------------------------------
export function processComplaintPrivacy(
  rawText: string,
  metadata: ComplaintPrivacyMetadata
): ComplaintProcessingResult {
  const { sanitizedText, flags } = sanitizeComplaint(rawText, metadata);
  const generatedHeading = generateHeading(
    rawText,
    metadata.departmentId,
    metadata.incidentLocality
  );
  const factualSummary = generateSummary(sanitizedText, metadata);

  return {
    sanitizedDescription: sanitizedText,
    generatedHeading,
    factualSummary,
    flags,
  };
}
