/**
 * AWAAZ-E-AWAM — Phase 3E.3: Intelligent Privacy & Presentation Engine
 *
 * Implements:
 * 1. Comprehensive Roman Urdu & English Natural Residential Address Redaction:
 *    - Context-aware living phrases ("main xyz colony mein rehta hoon", "hum log xyz society mein rehte hain").
 *    - Intro phrases ("mera ghar abc apartments mein hai", "hamara pata xyz colony hai", "mera address xyz area hai").
 *    - English phrases ("i live in xyz residential complex").
 *    - Dwelling anchors with house/street/block/sector/apartment numbers.
 *    - Metadata residentialAddress token cross-matching (including area names without house numbers).
 *    - Preservation of genuine public incident landmarks (University Road, Main Shahrah-e-Faisal, etc.).
 * 2. Personal Information Detection and Redaction (Phones, Emails, CNICs, Names).
 * 3. Abusive Language Filtering (Masking insults while retaining complaint allegations and audit evidence).
 * 4. Automatic Factual Heading Generation (Text-first, natural English, 5-10 words, zero hallucination).
 * 5. Automatic Factual Summary Generation (Text-first, 1-2 concise human sentences, zero government/AI jargon).
 * 6. Public Location Protection & Clean Location Formatting (Zero "at none" artifacts).
 * 7. Privacy Review Flags (Setting uncertainRedaction = true when private phrases cannot be safely classified).
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
  /\b(jaan\s+se\s+maar|qatal|bomb|dhamaka\s+kar\s+doonga|hathyar|aslah)\b/gi,
  /\b(shoot|kill|burn\s+down)\b/gi,
];

// Public location indicator terms that must NEVER be redacted
const PUBLIC_LOCATION_KEYWORDS = [
  "road", "sadak", "sarak", "main", "service road",
  "shahrah", "shahrah-e-faisal", "shahrah-e-pakistan", "university road",
  "rashid minhas", "m.a. jinnah", "karsaz", "nursery",
  "flyover", "underpass", "bridge", "pul",
  "chowrangi", "roundabout", "chowk", "mor", "chauraha",
  "market", "bazaar", "commercial", "plaza", "supermarket",
  "park", "ground", "school", "college", "university", "ned", "ku",
  "hospital", "masjid", "mosque", "station", "bus stop",
  "signal", "drain", "kundi", "manhole", "pillar", "transformer",
];

// Helper to check if a span is a legitimate public incident landmark
function isPublicLocation(span: string, metadata?: ComplaintPrivacyMetadata): boolean {
  const lower = span.toLowerCase().trim();
  for (const kw of PUBLIC_LOCATION_KEYWORDS) {
    if (lower === kw || lower.startsWith(`${kw} `) || lower.endsWith(` ${kw}`) || lower.includes(` ${kw} `)) {
      return true;
    }
  }
  if (metadata?.incidentPublicLocation) {
    const pub = metadata.incidentPublicLocation.toLowerCase().trim();
    if (pub && pub !== "none" && pub !== "null" && pub !== "n/a" && lower.includes(pub)) {
      return true;
    }
  }
  return false;
}

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
  const prefixPhoneRegex = /\b(?:phone|mobile|cell|contact|number|no|rabta|call|whatsapp)[^\w\n]{1,5}(?:\+?92|0092|0)?[0-9][0-9\s\-().]{5,14}[0-9]\b/gi;
  text = text.replace(prefixPhoneRegex, (match) => {
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
      const escaped = cleanPhone.slice(-7);
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

  // E. Citizen Name Redaction
  // 1. Natural self-introduction: "Mera naam Muhammad Tariq Khan hai", "My name is Ali Raza"
  const myNameRegex = /\b(?:mera\s+na+m|my\s+name\s+is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s+(?:hai|hy|and|\.|\n|,|$))/gi;
  text = text.replace(myNameRegex, (match, capturedName) => {
    flags.hasName = true;
    redactedSpansCount++;
    return match.replace(capturedName, "[NAME REDACTED]");
  });

  // 2. First-person speaking intro: "Main Zahid Ahmed baat kar raha hoon", "Main Ali Raza bol raha hoon", "I am Tariq speaking"
  const COMMON_NON_NAMES = new Set([
    "rehta", "rehti", "rehte", "gali", "ghar", "area", "shikayat",
    "baat", "bol", "yahan", "wahan", "paas", "saath", "andar", "bahar",
    "pareshan", "theek", "xyz", "abc"
  ]);

  const iAmRegex = /\b(?:main|mein|i\s+am)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})\s+(?:hoon|hun|bol\s+raha|bol\s+rahi|baat\s+kar\s+raha|speaking|here)\b/gi;
  text = text.replace(iAmRegex, (match, capturedName) => {
    const words = capturedName.toLowerCase().trim().split(/\s+/);
    if (words.some((w: string) => COMMON_NON_NAMES.has(w))) {
      return match;
    }
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
    const fullNameRegex = new RegExp(`\\b${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
    if (fullNameRegex.test(text)) {
      flags.hasName = true;
      text = text.replace(fullNameRegex, () => {
        redactedSpansCount++;
        return "[NAME REDACTED]";
      });
    }
  }

  // F. Private Home Address & Residential Span Redaction

  // 1. Context phrase: Roman Urdu "main xyz colony mein rehta hoon", "hum log xyz society mein rehte hain"
  const livingContextRegex = /\b(main|mein|ham|hum|hum\s+log)\s+([A-Za-z0-9\s,.'/-]+?)\s+(?:mein|main|me|ke\s+paas|k\s+paas|near)\s+(?:rehta|rehti|rehte|rahay|rahe)\s+(?:hoon|hun|hain|hen|hu|hon)\b/gi;
  text = text.replace(livingContextRegex, (match, prefix, span) => {
    if (isPublicLocation(span, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return `${prefix} [PRIVATE ADDRESS REDACTED]`;
  });

  // 2. English "i live in xyz residential complex", "we live in abc apartments"
  const englishLiveInRegex = /\b(i|we)\s+live\s+(?:in|at|near)\s+([A-Za-z0-9\s,.'/-]+?)(?=\s+(?:and|where|with|\.|\n|,|$)|$)/gi;
  text = text.replace(englishLiveInRegex, (match, prefix, span) => {
    if (isPublicLocation(span, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return `${prefix} live in [PRIVATE ADDRESS REDACTED]`;
  });

  // 3. "mera ghar abc apartments mein hai", "hamara ghar xyz colony mein hai"
  const myHouseSpanRegex = /\b((?:mera|hamara|humaara|humara|my|our)\s+(?:ghar|makan|makaan|house|flat|home|apartment|residence))\s+([A-Za-z0-9\s,.'/-]+?)\s+(?:mein|main|me|par|pe)\s+(?:hai|hy|located|situated)\b/gi;
  text = text.replace(myHouseSpanRegex, (match, prefix, span) => {
    if (isPublicLocation(span, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return `${prefix} [PRIVATE ADDRESS REDACTED] mein hai`;
  });

  // 4. "hamara pata xyz colony hai", "mera address xyz area hai"
  const myAddressSpanRegex = /\b((?:hamara|mera|my|our)\s+(?:pata|address|residence))\s+(?:ye\s+hai|yeh\s+hai|is|hai|hy)?\s*:?\s*([A-Za-z0-9\s,.'/-]+?)(?=\s+(?:hai|hy|aur|and|\.|\n|,|$)|$)/gi;
  text = text.replace(myAddressSpanRegex, (match, prefix, span) => {
    if (isPublicLocation(span, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return `${prefix} [PRIVATE ADDRESS REDACTED]`;
  });

  // 5. Comprehensive multi-segment residential address span:
  // e.g. "House No. 42-B, Street 3, Block 13-D Gulshan", "House 24 Street 5", "Flat 402, Al-Rehman Heights"
  const multiSegmentAddressRegex = /\b(?:house|hno|h\.no|h#|makan|makaan|flat|flat#|fl#|apartment|apt|apt#|plot|plot#)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+(?:\s*,\s*|\s+)?(?:(?:street|st|st\.|gali|lane|rasta|lane#|gali#)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+(?:\s*,\s*|\s+)?)?(?:(?:[0-9]+(?:st|nd|rd|th)\s+)?(?:commercial\s+lane)[^\w\n]{0,3}[0-9a-zA-Z\-/]*(?:\s*,\s*|\s+)?)?(?:(?:sector|sec|sec\.|block|blk|blk\.|phase)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+(?:\s*,\s*|\s+)?)?(?:(?:[A-Za-z0-9\-]+\s+)?(?:building|heights|plaza|apartments|terrace|tower)\s*(?:[A-Za-z0-9\-]+)?(?:\s*,\s*|\s+)?)?(?:(?:Gulshan(?:-e-Iqbal)?|Clifton|DHA|PECHS|Nazimabad|North Nazimabad|Korangi|Malir|Saddar|Gulberg|FB Area|F\.B\. Area|North Karachi|Baldia|Orangi|Lyari|SITE|Jamshed Town))?(?=\s+(?:mein|main|me|pe|par|rehta|rehti|rehte|located|situated|hai|hy|ka|ke|ki|\.|\n|,|$)|$)/gi;

  text = text.replace(multiSegmentAddressRegex, (match) => {
    if (isPublicLocation(match, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // 6. Chained address without ending postposition (e.g. standalone "House No. 42-B, Street 3, Block 13-D")
  const chainedAddressRegex = /\b(?:house|hno|h\.no|h#|makan|makaan|flat|flat#|fl#|apartment|apt|apt#|plot|plot#)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+(?:\s*,\s*|\s+)(?:street|st|st\.|gali|lane|rasta)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+(?:\s*,\s*|\s+)?(?:(?:sector|sec|sec\.|block|blk|blk\.|phase)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+)?\b/gi;

  text = text.replace(chainedAddressRegex, (match) => {
    if (isPublicLocation(match, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // 7. Simple house / flat identifier: "House 24", "Flat 402", "H# 14", "Plot 12-B"
  const simpleHouseRegex = /(?:\b(?:house|hno|h\.no|makan|makaan|flat|banglow|bungalow|apartment|apt|plot)\b\s*(?:(?:no|num|number|#)[.:]?\s*[0-9a-zA-Z\-/]+|[0-9a-zA-Z\-/]*\d[0-9a-zA-Z\-/]*)\b|\b(?:h#|flat#|fl#|apt#|plot#)\s*[0-9a-zA-Z\-/]+\b)/gi;
  text = text.replace(simpleHouseRegex, (match) => {
    if (isPublicLocation(match, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // 8. Named Residential Units / Complex without numbers: e.g. "xyz colony", "abc society", "abc apartments", "xyz residential complex"
  const namedComplexRegex = /\b([A-Za-z0-9-]+\s+(?:colony|society|apartments?|heights|enclave|cottages?|villas?|residency|complex|basti|goth|nagar|mohallah|residential\s+complex))\b/gi;
  text = text.replace(namedComplexRegex, (match, complex) => {
    if (isPublicLocation(complex, metadata)) return match;
    flags.hasPrivateAddress = true;
    redactedSpansCount++;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // 9. Submitter residentialAddress token matching (including area names without numbers)
  if (metadata?.residentialAddress && metadata.residentialAddress.length >= 3) {
    const rawAddr = metadata.residentialAddress.trim();
    const broadRegions = new Set(["karachi", "east", "west", "south", "central", "malir", "korangi", "keamari"]);

    // If whole address matches
    if (!broadRegions.has(rawAddr.toLowerCase()) && !isPublicLocation(rawAddr, metadata)) {
      const escapedFull = rawAddr.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const fullRegex = new RegExp(`\\b${escapedFull}\\b`, "gi");
      if (fullRegex.test(text)) {
        flags.hasPrivateAddress = true;
        text = text.replace(fullRegex, () => {
          redactedSpansCount++;
          return "[PRIVATE ADDRESS REDACTED]";
        });
      }
    }

    // Match individual segments (e.g. "xyz colony", "House 42", "Block 13-D")
    const segments = rawAddr.split(/[,;\n/]+/).map((s) => s.trim()).filter((s) => s.length >= 3);
    for (const seg of segments) {
      if (broadRegions.has(seg.toLowerCase())) continue;
      if (isPublicLocation(seg, metadata)) continue;
      const escapedSeg = seg.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const segRegex = new RegExp(`\\b${escapedSeg}\\b`, "gi");
      if (segRegex.test(text)) {
        flags.hasPrivateAddress = true;
        text = text.replace(segRegex, () => {
          redactedSpansCount++;
          return "[PRIVATE ADDRESS REDACTED]";
        });
      }
    }
  }

  // 10. Cleanup trailing dangling street tokens when in close proximity to a redacted address
  const danglingStreetRegex = /(\[PRIVATE ADDRESS REDACTED\][,\s]+)(?:street|st|st\.|gali|lane|rasta)\s*(?:(?:no|num|number|#)[.:]?)?\s*[0-9a-zA-Z\-/]+/gi;
  text = text.replace(danglingStreetRegex, () => {
    flags.hasPrivateAddress = true;
    return "[PRIVATE ADDRESS REDACTED]";
  });

  // G. Flag uncertain redactions
  // If text contains unparsed house/flat references or remaining living indicators
  if (
    /\b\d{7,8}\b/.test(text) ||
    /\b(?:house\s*no|flat\s*no|makan\s*no|plot\s*no)\b/i.test(text) ||
    (/\b(?:rehta|rehti|rehte)\b/i.test(text) && !text.includes("[PRIVATE ADDRESS REDACTED]"))
  ) {
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
// 3. TEXT-FIRST TOPIC & FACTUAL SEMANTIC EXTRACTION
// ---------------------------------------------------------------------------
export type ComplaintTopic =
  | "garbage"
  | "electricity"
  | "water_supply"
  | "sewerage"
  | "gas"
  | "road"
  | "building"
  | "neutral";

interface ExtractedFacts {
  topic: ComplaintTopic;
  durationLabel: string | null; // e.g. "for Five Days"
  durationPlain: string | null; // e.g. "five days"
  subType: string;
  hasWaterPumpConsequence: boolean;
  hasDrinkingWaterConsequence: boolean;
  hasBadSmellConsequence: boolean;
  hasHazardConsequence: boolean;
  hasLowGasCookingConsequence: boolean;
}

export function extractComplaintFacts(text: string): ExtractedFacts {
  const lower = text.toLowerCase();

  // 1. Duration extraction
  let durationLabel: string | null = null;
  let durationPlain: string | null = null;

  if (/chaar\s+din|4\s+din|four\s+days|4\s+days/i.test(lower)) {
    durationLabel = "for Four Days";
    durationPlain = "four days";
  } else if (/teen\s+din|3\s+din|three\s+days|3\s+days/i.test(lower)) {
    durationLabel = "for Three Days";
    durationPlain = "three days";
  } else if (/do\s+din|2\s+din|two\s+days|2\s+days/i.test(lower)) {
    durationLabel = "for Two Days";
    durationPlain = "two days";
  } else if (/ek\s+din|1\s+din|one\s+day|1\s+day|24\s+ghant[ae]|24\s+hours/i.test(lower)) {
    durationLabel = "for Past 24 Hours";
    durationPlain = "past 24 hours";
  } else if (/paanch\s+din|5\s+din|five\s+days|5\s+days/i.test(lower)) {
    durationLabel = "for Five Days";
    durationPlain = "five days";
  } else if (/chhe\s+din|che\s+din|6\s+din|six\s+days|6\s+days/i.test(lower)) {
    durationLabel = "for Six Days";
    durationPlain = "six days";
  } else if (/do\s+haft[ae]|2\s+haft[ae]|two\s+weeks|2\s+weeks/i.test(lower)) {
    durationLabel = "for Two Weeks";
    durationPlain = "two weeks";
  } else if (/ek\s+hafta|aik\s+hafta|hafta|hafte|one\s+week|1\s+week/i.test(lower)) {
    durationLabel = "for Past Week";
    durationPlain = "approximately one week";
  } else if (/mahina|mahine|one\s+month|1\s+month/i.test(lower)) {
    durationLabel = "for Past Month";
    durationPlain = "over a month";
  } else if (/aaj\s+subah|subah\s+se|since\s+morning/i.test(lower)) {
    durationLabel = "Since Morning";
    durationPlain = "since morning";
  } else if (/kal\s+raat|kal\s+se|since\s+yesterday/i.test(lower)) {
    durationLabel = "Since Yesterday";
    durationPlain = "since yesterday";
  }

  // 2. Specific consequences extraction
  const hasWaterPumpConsequence =
    /(?:motor|pump)\s+(?:nahi|nai)\s+(?:chal|chalti|chalta)/i.test(lower);
  const hasDrinkingWaterConsequence =
    /p[ee]{1,2}ne\s*k[aey]{1,3}(?:\s*liye)?\s*pa?ni|drinking\s+water|pa?ni\s+bhi\s+n[ah]i|na\s+hi\s+(?:p[ee]{1,2}ne(?:\s*keliye|\s*ke\s*liye)?\s*)?pa?ni|p[ee]{1,2}ne\s+k[ao]\s+pa?ni/i.test(lower);
  const hasBadSmellConsequence =
    /badboo|badbu|smell|stink|taffun/i.test(lower);
  const hasHazardConsequence =
    /spark|current|aag|blast|dhamaka|hanging\s+wire|open\s+manhole|khula\s+gutter/i.test(lower);
  const hasLowGasCookingConsequence =
    /chulha|chula|stove|khana|cooking/i.test(lower);

  // 3. Topic classification strictly from text keywords
  const isGarbage =
    /\b(kachra|kachre|garbage|trash|waste|safai|sweeper|jhadoo|dumpster|kundi|dher|kura|koora)\b/i.test(lower);

  const isElectricity =
    /\b(bijli|light|power|loadshedding|voltage|transformer|taar|wire|k-electric|kelectric)\b/i.test(lower) ||
    (/\bcurrent\b/i.test(lower) && !/water|pani/i.test(lower));

  const isSewerage =
    /\b(gutter|gutters|sewerage|sewage|manhole|ubal|ganda\s+pani|sludge|nalla)\b/i.test(lower);

  const isWaterSupply =
    !isSewerage &&
    (/\b(paani|pani|water)\b/i.test(lower) ||
      /\b(line\s+leak|pipeline|pipe\s+toot|pipe\s+leak|line\s+burst|line\s+phat)\b/i.test(lower));

  const isGas =
    /\b(gas|sui\s+gas|ssgc)\b/i.test(lower) ||
    (/\b(chulha|stove)\b/i.test(lower) && /pressure|nahi/i.test(lower));

  const isRoad =
    /\b(road|sadak|sarak|khadda|khadde|gadda|gadday|pothole|potholes|asphalt|crater|flyover|underpass|pul|expansion\s+joint|footpath)\b/i.test(lower);

  const isBuilding =
    /\b(illegal\s+construction|ghair\s+qanooni|manzil|floor|plaza|sbca|darar|bina\s+ijazat)\b/i.test(lower) ||
    (/\bcrack\b/i.test(lower) && /building|pillar|wall|chhat/i.test(lower));

  let topic: ComplaintTopic = "neutral";
  let subType = "general";

  if (isGarbage) {
    topic = "garbage";
    if (/dumpster|kundi|dabba/i.test(lower)) subType = "dumpster_overflow";
    else if (/sweeper|jhadoo|safai\s+wal/i.test(lower)) subType = "sweeper_absent";
    else subType = "uncollected_waste";
  } else if (isElectricity) {
    topic = "electricity";
    if (/spark|taar\s+toot|wire|current|hanging|aag/i.test(lower)) subType = "sparking_wire";
    else if (/transformer|blast|dhamaka/i.test(lower)) subType = "transformer_blast";
    else if (/voltage|dim/i.test(lower)) subType = "low_voltage";
    else subType = "power_outage";
  } else if (isWaterSupply) {
    topic = "water_supply";
    if (/pipe\s+(?:toot|phat|leak|burst)|pipeline\s+(?:burst|leak|phat|toot)|line\s+(?:phat|leak|burst|toot)|pani\s+zaya/i.test(lower)) subType = "pipe_burst";
    else if (/shortage|nahi\s+aa\s+raha|supply\s+band|dry/i.test(lower)) subType = "water_shortage";
    else if (/badboo|ganda/i.test(lower)) subType = "contaminated_water";
    else subType = "supply_issue";
  } else if (isSewerage) {
    topic = "sewerage";
    if (/dhakkan|open\s+manhole|khula/i.test(lower)) subType = "open_manhole";
    else subType = "overflow";
  } else if (isGas) {
    topic = "gas";
    if (/leak|badboo|smell|hissing/i.test(lower)) subType = "gas_leak";
    else subType = "low_pressure";
  } else if (isRoad) {
    topic = "road";
    if (/flyover|bridge|joint/i.test(lower)) subType = "flyover_joint";
    else if (/footpath/i.test(lower)) subType = "footpath_damaged";
    else if (/khadd[ae]|gadd[ae]|pothole/i.test(lower)) subType = "potholes";
    else subType = "general_damage";
  } else if (isBuilding) {
    topic = "building";
    if (/crack|darar|pillar/i.test(lower)) subType = "structural_cracks";
    else subType = "illegal_construction";
  }

  return {
    topic,
    durationLabel,
    durationPlain,
    subType,
    hasWaterPumpConsequence,
    hasDrinkingWaterConsequence,
    hasBadSmellConsequence,
    hasHazardConsequence,
    hasLowGasCookingConsequence,
  };
}

// ---------------------------------------------------------------------------
// 4. CLEAN LOCATION FORMATTER (ELIMINATES "AT NONE")
// ---------------------------------------------------------------------------
function formatCleanLocation(metadata?: ComplaintPrivacyMetadata): string {
  const isInvalid = (val?: string | null) => {
    if (!val) return true;
    const clean = val.trim().toLowerCase();
    return (
      clean === "" ||
      clean === "none" ||
      clean === "null" ||
      clean === "undefined" ||
      clean === "n/a" ||
      clean === "na" ||
      clean === "-" ||
      clean === "nan"
    );
  };

  const pubLoc = !isInvalid(metadata?.incidentPublicLocation)
    ? metadata!.incidentPublicLocation!.trim()
    : null;
  const locality = !isInvalid(metadata?.incidentLocality)
    ? metadata!.incidentLocality!.trim()
    : null;

  if (pubLoc && locality) {
    if (pubLoc.toLowerCase().includes(locality.toLowerCase())) {
      return `at ${pubLoc}`;
    }
    return `at ${pubLoc}, ${locality}`;
  }
  if (pubLoc) return `at ${pubLoc}`;
  if (locality) return `in ${locality}`;
  return "";
}

// ---------------------------------------------------------------------------
// 5. AUTOMATIC NATURAL HEADING GENERATION (5-10 WORDS, FACTUAL)
// ---------------------------------------------------------------------------
export function generateHeading(
  text: string,
  _departmentId?: string | null,
  locality?: string | null
): string {
  const facts = extractComplaintFacts(text);
  const dur = facts.durationLabel ? ` ${facts.durationLabel}` : "";
  const cleanLoc = locality && locality.trim() && !/^(none|null|n\/a|-|nan|undefined)$/i.test(locality)
    ? locality.trim()
    : null;

  switch (facts.topic) {
    case "garbage":
      if (facts.durationLabel) {
        return `Garbage Not Collected ${facts.durationLabel}`;
      }
      if (facts.subType === "dumpster_overflow") {
        return cleanLoc ? `Overflowing Garbage Dumpster in ${cleanLoc}` : "Overflowing Garbage Dumpster in Street";
      }
      return cleanLoc ? `Uncollected Garbage in ${cleanLoc}` : "Uncollected Garbage in Street";

    case "electricity":
      if (facts.subType === "sparking_wire") {
        return cleanLoc ? `Dangerous Sparking Wire in ${cleanLoc}` : "Dangerous Sparking Wire in Street";
      }
      if (facts.subType === "transformer_blast") {
        return cleanLoc ? `Transformer Explosion in ${cleanLoc}` : "Transformer Explosion and Power Outage";
      }
      if (facts.durationLabel) {
        return `Electricity Outage ${facts.durationLabel}`;
      }
      return cleanLoc ? `Electricity Outage in ${cleanLoc}` : "Electricity Outage in Area";

    case "road":
      if (facts.subType === "flyover_joint") {
        return cleanLoc ? `Damaged Expansion Joint on ${cleanLoc} Flyover` : "Damaged Expansion Joint on Flyover";
      }
      if (facts.subType === "potholes") {
        return "Damaged Road and Potholes";
      }
      if (facts.subType === "footpath_damaged") {
        return cleanLoc ? `Damaged Footpath in ${cleanLoc}` : "Damaged Footpath Infrastructure";
      }
      return cleanLoc ? `Damaged Road in ${cleanLoc}` : "Damaged Road in Area";

    case "water_supply":
      if (facts.subType === "pipe_burst") {
        return "Broken Drinking Water Pipe in Street";
      }
      if (facts.durationLabel) {
        return `Drinking Water Shortage ${facts.durationLabel}`;
      }
      return cleanLoc ? `Drinking Water Shortage in ${cleanLoc}` : "Drinking Water Supply Disruption";

    case "sewerage":
      if (facts.subType === "open_manhole") {
        return cleanLoc ? `Open Manhole Hazard in ${cleanLoc}` : "Open Manhole Hazard in Street";
      }
      if (facts.durationLabel) {
        return `Sewerage Overflow ${facts.durationLabel}`;
      }
      return cleanLoc ? `Sewerage Overflow in ${cleanLoc}` : "Severe Sewerage Overflow in Street";

    case "gas":
      if (facts.subType === "gas_leak") {
        return cleanLoc ? `Sui Gas Pipeline Leak in ${cleanLoc}` : "Sui Gas Pipeline Leak in Street";
      }
      if (facts.durationLabel) {
        return `Low Gas Pressure ${facts.durationLabel}`;
      }
      return cleanLoc ? `Low Gas Pressure in ${cleanLoc}` : "Low Gas Pressure in Area";

    case "building":
      if (facts.subType === "structural_cracks") {
        return cleanLoc ? `Dangerous Structural Cracks in ${cleanLoc}` : "Dangerous Structural Cracks in Building";
      }
      return "Unauthorized Multi-Story Building Construction";

    default:
      return cleanLoc ? `Municipal Grievance in ${cleanLoc}${dur}` : `Municipal Service Grievance${dur}`;
  }
}

// ---------------------------------------------------------------------------
// 6. AUTOMATIC FACTUAL SUMMARY GENERATION (1-2 SENTENCES, NATURAL HUMAN ENGLISH)
// ---------------------------------------------------------------------------
export function generateSummary(
  sanitizedText: string,
  metadata: ComplaintPrivacyMetadata
): string {
  const facts = extractComplaintFacts(sanitizedText);
  const locPhrase = formatCleanLocation(metadata);
  const durPlain = facts.durationPlain;

  let sentence1 = "";
  let sentence2 = "";

  switch (facts.topic) {
    case "garbage": {
      if (durPlain) {
        sentence1 = `The resident reports that garbage has not been collected from their street for ${durPlain}${locPhrase ? ` ${locPhrase}` : ""}.`;
      } else {
        sentence1 = `The resident reports uncollected garbage accumulated in their street${locPhrase ? ` ${locPhrase}` : ""}.`;
      }

      if (facts.hasBadSmellConsequence) {
        sentence2 = "The waste is causing a bad smell and inconvenience for nearby families.";
      } else {
        sentence2 = "The waste has piled up and requires collection by local sanitation workers.";
      }
      break;
    }

    case "electricity": {
      if (facts.subType === "sparking_wire") {
        sentence1 = `The resident reports dangerous electrical wiring or cables sparking${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "The loose wiring creates a public safety hazard that needs immediate attention.";
      } else if (facts.subType === "transformer_blast") {
        sentence1 = `The resident reports a transformer explosion causing a power blackout${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "Emergency technical repair is needed to restore electricity.";
      } else {
        if (durPlain) {
          sentence1 = `The resident says their home has been without electricity for ${durPlain}${locPhrase ? ` ${locPhrase}` : ""}.`;
        } else {
          sentence1 = `The resident reports an unscheduled power outage${locPhrase ? ` ${locPhrase}` : ""}.`;
        }

        if (facts.hasWaterPumpConsequence) {
          sentence2 = "The power outage is preventing their water pump from working.";
        } else if (facts.hasDrinkingWaterConsequence) {
          sentence2 = "They also report having no drinking water.";
        } else {
          sentence2 = "The prolonged outage is causing significant difficulties for the household.";
        }
      }
      break;
    }

    case "road": {
      if (facts.subType === "flyover_joint") {
        sentence1 = `The resident reports damaged expansion joints on the overhead bridge${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "The road defect poses an accident risk for moving vehicles and requires inspection.";
      } else if (facts.subType === "potholes") {
        sentence1 = `The resident reports severe road damage with deep potholes${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "The poor road condition is creating hazardous driving conditions for vehicles.";
      } else if (facts.subType === "footpath_damaged") {
        sentence1 = `The resident reports damaged footpath infrastructure${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "Pedestrians are facing difficulty navigating the walkway.";
      } else {
        sentence1 = `The resident reports damaged road conditions requiring municipal repair${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "Timely road maintenance is requested for the area.";
      }
      break;
    }

    case "water_supply": {
      if (facts.subType === "pipe_burst") {
        sentence1 = `The resident reports that a drinking water pipeline has broken in their street${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "Clean water is leaking continuously and needs prompt repair.";
      } else {
        if (durPlain) {
          sentence1 = `The resident reports that drinking water supply has been disrupted for ${durPlain}${locPhrase ? ` ${locPhrase}` : ""}.`;
        } else {
          sentence1 = `The resident reports an interruption in the regular drinking water supply${locPhrase ? ` ${locPhrase}` : ""}.`;
        }
        sentence2 = "Residents are facing water shortages in the area.";
      }
      break;
    }

    case "sewerage": {
      if (facts.subType === "open_manhole") {
        sentence1 = `The resident reports an uncovered open manhole in the street${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "The open drain poses a severe safety hazard to pedestrians and vehicles.";
      } else {
        if (durPlain) {
          sentence1 = `The resident reports raw sewage overflowing onto the street for ${durPlain}${locPhrase ? ` ${locPhrase}` : ""}.`;
        } else {
          sentence1 = `The resident reports blocked gutters overflowing into the street${locPhrase ? ` ${locPhrase}` : ""}.`;
        }
        sentence2 = "The wastewater accumulation causes foul odor and sanitary risks for nearby residents.";
      }
      break;
    }

    case "gas": {
      if (facts.subType === "gas_leak") {
        sentence1 = `The resident reports a natural gas pipeline leak with a strong odor${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "The escaping gas creates a serious fire hazard and needs urgent repair.";
      } else {
        if (durPlain) {
          sentence1 = `The resident reports low gas pressure persisting for ${durPlain}${locPhrase ? ` ${locPhrase}` : ""}.`;
        } else {
          sentence1 = `The resident reports severely low natural gas pressure${locPhrase ? ` ${locPhrase}` : ""}.`;
        }
        if (facts.hasLowGasCookingConsequence) {
          sentence2 = "The low pressure is preventing households from cooking meals.";
        } else {
          sentence2 = "The weak supply is affecting domestic cooking in the area.";
        }
      }
      break;
    }

    case "building": {
      if (facts.subType === "structural_cracks") {
        sentence1 = `The resident reports critical structural cracks in the building${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "Occupants request an urgent structural safety evaluation to prevent harm.";
      } else {
        sentence1 = `The resident reports unauthorized multi-story construction underway${locPhrase ? ` ${locPhrase}` : ""}.`;
        sentence2 = "The construction reportedly violates local building bylaws and lacks required permits.";
      }
      break;
    }

    default: {
      sentence1 = `The resident has filed a municipal service grievance${locPhrase ? ` ${locPhrase}` : ""}.`;
      sentence2 = "The complaint requires staff review to clarify the issue and determine the required action.";
      break;
    }
  }

  return `${sentence1} ${sentence2}`.trim();
}

// ---------------------------------------------------------------------------
// 7. UNIFIED PROCESSING PIPELINE
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
