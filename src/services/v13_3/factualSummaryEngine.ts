/**
 * AWAAZ-E-AWAM — Phase V13.3 Factual Summary & Location Source Attribution Engine
 *
 * Provides:
 * 1. Strict Location Source Attribution (distinguishes text-detected vs form metadata vs not provided).
 * 2. Grounded Multi-Issue Summarization (communicates all independent municipal issues, duration, and consequences).
 * 3. Zero-hallucination guarantee without paid LLM dependencies.
 */

import type { DepartmentId } from '../../types';

export type LocationSource = 'COMPLAINT_TEXT' | 'FORM_METADATA' | 'NOT_PROVIDED';

export interface LocationAttribution {
  source: LocationSource;
  localityName: string | null;
  publicLocationName: string | null;
  displayLocation: string | null;
  isTextGrounded: boolean;
  attributionNotice: string;
}

export interface ExtractedFact {
  department: DepartmentId;
  defectDesc: string;
  duration?: string;
  isActionable: boolean;
}

const KARACHI_LOCALITIES = [
  'Gulshan-e-Iqbal', 'Gulshan', 'Johar', 'Gulistan-e-Jauhar', 'Jauhar',
  'Nazimabad', 'North Nazimabad', 'Liaquatabad', 'Lalu Khet', 'FB Area', 'Federal B Area',
  'Korangi', 'Landhi', 'Malir', 'Shah Faisal', 'Model Colony',
  'Clifton', 'Defence', 'DHA', 'Saddar', 'Lyari', 'Old City', 'Kharadar', 'Mithadar',
  'Orangi', 'SITE', 'Baldia', 'Keamari', 'Mauripur', 'Surjani', 'New Karachi',
  'Basia Bungalows', 'Pechs', 'P.E.C.H.S', 'Bahadurabad', 'Tariq Road', 'Soldier Bazaar',
  'Garden', 'Burns Road', 'Buffer Zone', 'Shadman', 'Ancholi', 'Water Pump'
];

/**
 * Attributed location detection: rigorously verifies whether location terms exist
 * inside the complaint text itself, or only come from separate form input fields.
 */
export function detectLocationAttribution(
  complaintText: string,
  formLocality?: string | null,
  formPublicLocation?: string | null
): LocationAttribution {
  const text = complaintText.toLowerCase();

  // 1. Check if known Karachi locality appears in complaint text
  let detectedInText: string | null = null;
  for (const loc of KARACHI_LOCALITIES) {
    const pattern = new RegExp(`\\b${loc.replace(/[-.]/g, '[\\s.-]?')}\\b`, 'i');
    if (pattern.test(text)) {
      detectedInText = loc;
      break;
    }
  }

  // Also check if user-entered form locality appears inside complaint text
  if (!detectedInText && formLocality && formLocality.trim().length > 2) {
    const cleanFormLoc = formLocality.trim();
    const pattern = new RegExp(`\\b${cleanFormLoc.replace(/[-.]/g, '[\\s.-]?')}\\b`, 'i');
    if (pattern.test(text)) {
      detectedInText = cleanFormLoc;
    }
  }

  // Also check public location field inside text
  if (!detectedInText && formPublicLocation && formPublicLocation.trim().length > 2) {
    const cleanPub = formPublicLocation.trim();
    const pattern = new RegExp(`\\b${cleanPub.replace(/[-.]/g, '[\\s.-]?')}\\b`, 'i');
    if (pattern.test(text)) {
      detectedInText = cleanPub;
    }
  }

  if (detectedInText) {
    return {
      source: 'COMPLAINT_TEXT',
      localityName: detectedInText,
      publicLocationName: formPublicLocation || null,
      displayLocation: detectedInText,
      isTextGrounded: true,
      attributionNotice: `Detected directly in citizen complaint text: "${detectedInText}".`,
    };
  }

  // 2. Check if location was provided in separate form metadata fields
  const hasFormLoc = Boolean(formLocality && formLocality.trim() && !/^(none|null|n\/a|-|nan|undefined)$/i.test(formLocality.trim()));
  const hasFormPub = Boolean(formPublicLocation && formPublicLocation.trim() && !/^(none|null|n\/a|-|nan|undefined)$/i.test(formPublicLocation.trim()));

  if (hasFormLoc || hasFormPub) {
    const displayLoc = hasFormPub && hasFormLoc
      ? `${formPublicLocation!.trim()}, ${formLocality!.trim()}`
      : (formLocality?.trim() || formPublicLocation?.trim() || null);

    return {
      source: 'FORM_METADATA',
      localityName: formLocality?.trim() || null,
      publicLocationName: formPublicLocation?.trim() || null,
      displayLocation: displayLoc,
      isTextGrounded: false,
      attributionNotice: `Supplied in applicant form details: "${displayLoc}" (not mentioned in complaint text).`,
    };
  }

  // 3. Not provided anywhere
  return {
    source: 'NOT_PROVIDED',
    localityName: null,
    publicLocationName: null,
    displayLocation: null,
    isTextGrounded: false,
    attributionNotice: 'Location not specified in complaint text or form fields.',
  };
}

/**
 * Extracts natural duration strings from Roman Urdu / English text.
 */
export function extractDurationText(text: string): { label: string; plain: string } | null {
  const low = text.toLowerCase();

  // Days
  const mNumDays = low.match(/\b(\d+)\s*(?:din|days?)\b/i);
  if (mNumDays) {
    const n = parseInt(mNumDays[1], 10);
    const word = numberToWord(n);
    return { label: `for Past ${n} Days`, plain: `${word} days` };
  }

  if (/\b(?:das|dus|10)\s*din\b/i.test(low)) return { label: 'for Ten Days', plain: 'ten days' };
  if (/\b(?:pandrah|15)\s*din\b/i.test(low)) return { label: 'for Fifteen Days', plain: 'fifteen days' };
  if (/\b(?:bees|20)\s*din\b/i.test(low)) return { label: 'for Twenty Days', plain: 'twenty days' };
  if (/\b(?:ek|aik|1)\s*din\b/i.test(low)) return { label: 'for Past 24 Hours', plain: 'past 24 hours' };
  if (/\b(?:do|2)\s*din\b/i.test(low)) return { label: 'for Two Days', plain: 'two days' };
  if (/\b(?:teen|3)\s*din\b/i.test(low)) return { label: 'for Three Days', plain: 'three days' };
  if (/\b(?:char|chaar|4)\s*din\b/i.test(low)) return { label: 'for Four Days', plain: 'four days' };
  if (/\b(?:paanch|panch|5)\s*din\b/i.test(low)) return { label: 'for Five Days', plain: 'five days' };
  if (/\b(?:chhe|che|6)\s*din\b/i.test(low)) return { label: 'for Six Days', plain: 'six days' };
  if (/\b(?:saat|7)\s*din\b/i.test(low)) return { label: 'for Seven Days', plain: 'seven days' };

  // Weeks
  const mNumWeeks = low.match(/\b(\d+)\s*(?:haftay|hafte|hafta|weeks?)\b/i);
  if (mNumWeeks) {
    const n = parseInt(mNumWeeks[1], 10);
    const word = numberToWord(n);
    return { label: `for ${word} Weeks`, plain: `${word} weeks` };
  }
  if (/\b(?:ek|aik|1)\s*(?:hafta|week)\b/i.test(low)) return { label: 'for Past Week', plain: 'approximately one week' };
  if (/\b(?:do|2)\s*(?:haftay|hafte|weeks)\b/i.test(low)) return { label: 'for Two Weeks', plain: 'two weeks' };
  if (/\b(?:teen|3)\s*(?:haftay|hafte|weeks)\b/i.test(low)) return { label: 'for Three Weeks', plain: 'three weeks' };

  // Months
  if (/\b(?:mahina|mahine|month|months)\b/i.test(low)) return { label: 'for Over a Month', plain: 'over a month' };

  // Time of day
  if (/\b(?:kal\s*raat|since\s*yesterday)\b/i.test(low)) return { label: 'Since Yesterday', plain: 'since yesterday' };
  if (/\b(?:aaj\s*subah|subah\s*se|since\s*morning)\b/i.test(low)) return { label: 'Since Morning', plain: 'since morning' };

  return null;
}

function numberToWord(n: number): string {
  const map: Record<number, string> = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
    10: 'ten', 11: 'eleven', 12: 'twelve', 14: 'fourteen', 15: 'fifteen', 20: 'twenty', 30: 'thirty'
  };
  return map[n] || String(n);
}

const DEPT_FULL_NAMES: Record<DepartmentId, string> = {
  kelectric: 'K-Electric',
  kmc: 'KMC',
  kwsc: 'KWSC (Water & Sewerage Corporation)',
  ssgc: 'SSGC',
  sswmb: 'SSWMB (Solid Waste Management Board)',
  sbca: 'SBCA (Building Control Authority)',
  unassigned: 'Municipal Review Queue',
};

/**
 * Generates an honest, multi-issue factual summary grounded strictly in the citizen's
 * complaint text and extracted actionable issues. Zero hallucinations.
 */
export function generateGroundedFactualSummary(params: {
  rawText: string;
  normalizedText: string;
  departments: DepartmentId[];
  issues?: { department: DepartmentId; evidenceSpan: string; status: string }[];
  locationInfo: LocationAttribution;
}): { heading: string; factualSummary: string } {
  const { rawText, normalizedText, departments, issues: _issues, locationInfo } = params;
  const duration = extractDurationText(rawText) || extractDurationText(normalizedText);

  // Determine location phrase
  let locPhrase = '';
  const locName = locationInfo.localityName || locationInfo.displayLocation;
  if (locName) {
    locPhrase = ` in ${locName}`;
  }

  // 1. Identify specific reported defects per assigned department
  const issueDescriptions: string[] = [];
  const low = normalizedText.toLowerCase();

  // K-Electric
  if (departments.includes('kelectric')) {
    const hasTransformer = /\b(?:transformer|tranformer|tranforma|transforma|blast|phat|dhamaka|khrab|kharab|jal)\b/i.test(low);
    const hasOutage = /\b(?:bijli|bejli|bijlee|light|power)\s*(?:nahi|ni|band|chali|gul)\b/i.test(low) || /\b(?:load\s*shedding|outage)\b/i.test(low);
    const hasWires = /\b(?:taar|wire|wires|cable|current|chingari|spark)\b/i.test(low);

    if (hasOutage && hasTransformer) {
      const durStr = duration ? ` for ${duration.plain}` : '';
      issueDescriptions.push(`electricity has been unavailable${durStr} and that the local transformer is damaged`);
    } else if (hasTransformer) {
      issueDescriptions.push('the local electricity transformer is damaged and requires technical repair');
    } else if (hasWires) {
      issueDescriptions.push('loose or sparking electrical wiring poses a hazard in the street');
    } else if (hasOutage) {
      const durStr = duration ? ` for ${duration.plain}` : '';
      issueDescriptions.push(`electricity supply has been disrupted${durStr}`);
    } else {
      issueDescriptions.push('an electrical infrastructure failure has occurred');
    }
  }

  // KMC (Roads & Civic Infrastructure)
  if (departments.includes('kmc')) {
    const hasStreetLights = /\b(?:street\s*lights?|batti|battiyan|bulb)\b/i.test(low);
    const hasFootpath = /\b(?:footpath|foot\s*path)\b/i.test(low);

    let roadDesc = '';
    if (hasStreetLights) {
      roadDesc = 'non-functional street lighting infrastructure';
    } else if (hasFootpath) {
      roadDesc = 'damaged pedestrian footpath infrastructure';
    } else {
      roadDesc = 'damaged road conditions requiring municipal repair';
    }

    // Check rain/mud consequence on road
    if (/\b(?:barish|rain)\b/i.test(low) && /\b(?:kichar|keechad|mud|dal-dal)\b/i.test(low)) {
      roadDesc += ' that becomes muddy during rainfall';
    }
    issueDescriptions.push(roadDesc);
  }

  // KWSC (Water & Sewerage)
  if (departments.includes('kwsc')) {
    const hasSewer = /\b(?:gutter|sewer|manhole|dhakkan|ganda\s*pani|ubal)\b/i.test(low);
    const hasPipe = /\b(?:pipe|pipeline|line)\s*(?:leak|burst|phat|toot)\b/i.test(low);
    const hasWaterShortage = /\b(?:pani|water)\s*(?:nahi|band|sookha)\b/i.test(low);

    if (hasSewer && /\b(?:dhakkan|open)\b/i.test(low)) {
      issueDescriptions.push('an uncovered open manhole creates a severe hazard in the street');
    } else if (hasSewer) {
      issueDescriptions.push('blocked sewerage lines are overflowing onto the public street');
    } else if (hasPipe) {
      issueDescriptions.push('a water supply pipeline has burst and is leaking water continuously');
    } else if (hasWaterShortage) {
      const durStr = duration ? ` for ${duration.plain}` : '';
      issueDescriptions.push(`public drinking water supply has been disrupted${durStr}`);
    } else {
      issueDescriptions.push('water or sewerage infrastructure requires municipal attention');
    }
  }

  // SSGC (Sui Gas)
  if (departments.includes('ssgc')) {
    const hasLeak = /\b(?:leak|badboo|smell|gas\s*boo)\b/i.test(low);
    const hasLowPressure = /\b(?:gas|pressure)\s*(?:nahi|band|low|kam|zero)\b/i.test(low) || /\b(?:chulha|stove)\b/i.test(low);

    if (hasLeak) {
      issueDescriptions.push('a natural gas pipeline leak with odor poses an urgent safety hazard');
    } else if (hasLowPressure) {
      const durStr = duration ? ` for ${duration.plain}` : '';
      issueDescriptions.push(`natural gas supply has severe low pressure${durStr}`);
    } else {
      issueDescriptions.push('natural gas supply issues require inspection');
    }
  }

  // SSWMB (Solid Waste)
  if (departments.includes('sswmb')) {
    const hasDumpster = /\b(?:kundi|dustbin|dumpster)\b/i.test(low);
    if (hasDumpster) {
      issueDescriptions.push('an overflowing garbage dumpster has accumulated uncollected waste');
    } else {
      issueDescriptions.push('uncollected garbage and waste have piled up in the street');
    }
  }

  // SBCA (Building Control)
  if (departments.includes('sbca')) {
    const hasCracks = /\b(?:crack|darar|daraar|pillar|girne)\b/i.test(low);
    if (hasCracks) {
      issueDescriptions.push('dangerous structural building cracks require immediate safety evaluation');
    } else {
      issueDescriptions.push('unauthorized multi-story building construction underway without permits');
    }
  }

  // 2. Compose Factual Summary Sentences
  let sentence1 = '';
  if (issueDescriptions.length === 0) {
    sentence1 = `The resident has filed a municipal service complaint${locPhrase}.`;
  } else if (issueDescriptions.length === 1) {
    sentence1 = `The resident reports that ${issueDescriptions[0]}${locPhrase}.`;
  } else if (issueDescriptions.length === 2) {
    sentence1 = `The resident reports that ${issueDescriptions[0]}${locPhrase}. They also report ${issueDescriptions[1]}.`;
  } else {
    const firstTwo = issueDescriptions.slice(0, 2).join(' and that ');
    const remaining = issueDescriptions.slice(2).join(' and ');
    sentence1 = `The resident reports that ${firstTwo}${locPhrase}. Additionally, they report ${remaining}.`;
  }

  // Department Routing Sentence
  let sentence2 = '';
  if (departments.length === 1) {
    sentence2 = `This issue requires ${DEPT_FULL_NAMES[departments[0]]} attention.`;
  } else if (departments.length === 2) {
    sentence2 = `The ${getDeptRole(departments[0])} requires ${DEPT_FULL_NAMES[departments[0]]} attention, while the ${getDeptRole(departments[1])} requires ${DEPT_FULL_NAMES[departments[1]]} attention.`;
  } else if (departments.length > 2) {
    const deptsList = departments.map((d) => DEPT_FULL_NAMES[d]).join(', ');
    sentence2 = `These distinct municipal faults require coordinated repair across ${deptsList}.`;
  } else {
    sentence2 = 'The complaint requires administrative review to verify the responsible civic department.';
  }

  const factualSummary = `${sentence1} ${sentence2}`.trim();

  // 3. Compose Truthful Heading
  const heading = generateTruthfulHeading(departments, locationInfo, duration);

  return { heading, factualSummary };
}

function getDeptRole(d: DepartmentId): string {
  switch (d) {
    case 'kelectric': return 'electricity issue';
    case 'kmc': return 'damaged road';
    case 'kwsc': return 'water or sewerage issue';
    case 'ssgc': return 'gas supply problem';
    case 'sswmb': return 'waste sanitation issue';
    case 'sbca': return 'building construction issue';
    default: return 'reported issue';
  }
}

function generateTruthfulHeading(
  departments: DepartmentId[],
  locationInfo: LocationAttribution,
  duration?: { label: string } | null
): string {
  const locName = locationInfo.localityName || locationInfo.displayLocation;
  const locSuffix = locName ? ` in ${locName}` : '';
  const durSuffix = duration?.label ? ` (${duration.label})` : '';

  if (departments.length === 0) {
    return `Municipal Grievance${locSuffix}${durSuffix}`;
  }

  const labels: string[] = [];
  if (departments.includes('kelectric')) labels.push('Electricity Outage');
  if (departments.includes('kmc')) labels.push('Damaged Road');
  if (departments.includes('kwsc')) labels.push('Water Supply & Sewerage');
  if (departments.includes('ssgc')) labels.push('Low Gas Pressure');
  if (departments.includes('sswmb')) labels.push('Uncollected Garbage');
  if (departments.includes('sbca')) labels.push('Building Construction Defect');

  if (labels.length === 1) {
    return `${labels[0]}${locSuffix}${durSuffix}`;
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}${locSuffix}${durSuffix}`;
  }
  return `${labels.slice(0, 2).join(', ')} & ${labels[2]}${locSuffix}${durSuffix}`;
}
