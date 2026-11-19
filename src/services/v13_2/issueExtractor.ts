/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V13.2 Municipal Issue Extraction Engine
 *
 * Decomposes natural Roman Urdu complaints into discrete, actionable municipal issue candidates.
 * Capable of extracting multiple independent faults from single paragraphs without punctuation,
 * while accurately disambiguating root faults from downstream consequences and historical mentions.
 */

export type DepartmentId = 'kmc' | 'kwsc' | 'kelectric' | 'ssgc' | 'sswmb' | 'sbca';
import { normalizeRomanUrduV13_2 } from './romanUrduNormalizer';

export type IssueStatus =
  | 'INDEPENDENT_FAULT'
  | 'CAUSAL_CONSEQUENCE'
  | 'HISTORICAL_RESOLVED'
  | 'NEGATED_MENTION'
  | 'LOCATION_ONLY'
  | 'RECIPIENT_ONLY';

export interface ExtractedIssue {
  id: string;
  department: DepartmentId;
  asset: string;
  defect: string;
  evidenceSpan: string;
  status: IssueStatus;
  isActionable: boolean;
  causedByIssueId?: string;
  confidence: number;
}

export interface ExtractionResult {
  rawText: string;
  normalizedText: string;
  issues: ExtractedIssue[];
  actionableDepartments: DepartmentId[];
  suppressedDepartments: DepartmentId[];
  causalChains: Array<{ rootDept: DepartmentId; consequenceDept: DepartmentId; explanation: string }>;
  isMultiIssue: boolean;
  notes: string[];
}

interface LexiconEntry {
  assets: RegExp[];
  defects: RegExp[];
  standaloneDefects: RegExp[];
}

const DEPARTMENT_LEXICONS: Record<DepartmentId, LexiconEntry> = {
  kelectric: {
    assets: [
      /\b(?:bijli|light|electric|electricity|power|transformer|khamba|pole|taar|wire|wires|cable|feeder|voltage|meter|phase)\b/i,
    ],
    defects: [
      /\b(?:nahi\s+aa\s+rahi|chali\s+gayi|chali\s+gai|gul(?:\s+ho\s+gayi)?|band(?:\s+hai)?|toot\s+gayi|gir\s+gaya|blast|phat\s+gaya|phata|dhamaka|chingari|sparking|current|trip|low\s+voltage|load\s*shedding|kharab|jhool\s+rahe|nange\s+taar|jal\s+gaya|jal\s+gya|jal\s+gai|andhera)\b/i,
      /\b(?:tripping|outage|power\s+cut|feeder\s+down)\b/i,
    ],
    standaloneDefects: [
      /\b(?:load\s*shedding|feeder\s+tripping|transformer\s+blast|transformer\s+phat|transformer\s+jal|nange\s+taar|current\s+lagne)\b/i,
    ],
  },
  kwsc: {
    assets: [
      /\b(?:pani|water|supply|gutter|sewerage|sewer|manhole|dhakkan|tanker|motor|water\s*board|nal|nullah|main\s+line)\b/i,
      /\b(?:pani|water|sewer|gutter)\s*(?:ki\s+)?(?:pipe|pipeline|line)\b/i,
    ],
    defects: [
      /\b(?:nahi\s+aa\s+raha|nahi\s+aa\s+rahi|band\s+hai|sookhi|sookha|leak|burst|phat|phati|choke|overflow|ubal|ubalta|ganda\s+pani|badboo|dhakkan\s+gayab|kharab|line\s+leakage|motor\s+nahi\s+chal)\b/i,
      /\b(?:sewer\s+overflow|drainage\s+block|contaminated|peenay\s+ka\s+pani\s+band)\b/i,
    ],
    standaloneDefects: [
      /\b(?:gutter\s+ubal|sewerage\s+overflow|dhakkan\s+gayab|main\s+line\s+phat|pani\s+band|water\s+supply\s+line\s+burst)\b/i,
    ],
  },
  kmc: {
    assets: [
      /\b(?:road|sarak|footpath|bridge|pul|flyover|underpass|street\s*light|bulb|chowrangi|pavement)\b/i,
    ],
    defects: [
      /\b(?:toot\s+gayi|toot\s+gaya|tooti|kharab|khadda|khadday|gaddha|crater|dhans\s+gayi|dhas|pothole|asphalt|tameer\s+adhoori|malba\s+para|bulb\s+fuse|andhera)\b/i,
      /\b(?:toota\s+phoota|tooti\s+phooti|gehre\s+khadday|road\s+damage)\b/i,
    ],
    standaloneDefects: [
      /\b(?:road\s+toot|sarak\s+tooti|gehre\s+khadday|street\s+lights?\s+band|potholes?)\b/i,
    ],
  },
  ssgc: {
    assets: [
      /\b(?:gas|sui\s*gas|pipeline|line|chulha|cylinder|gas\s*meter|flame|meter)\b/i,
    ],
    defects: [
      /\b(?:nahi\s+aa\s+rahi|band\s+hai|low\s+pressure|pressure\s+kam|zero\s+pressure|leak|leek|boodar|badboo|smell|chulha\s+nahi\s+jal|khana\s+nahi\s+pak|dhamaka)\b/i,
      /\b(?:gas\s+outage|methane|gas\s+boo)\b/i,
    ],
    standaloneDefects: [
      /\b(?:gas\s+leak|gas\s+band|zero\s+pressure|gas\s+pressure\s+kam|chulha\s+thanda|gas\s+line\s+phat)\b/i,
    ],
  },
  sswmb: {
    assets: [
      /\b(?:kachra|kooda|safai|dustbin|dumpster|dumper|kundi|sweeper|malba|kachra\s*kundi)\b/i,
    ],
    defects: [
      /\b(?:dher|dhaer|ambar|nahi\s+uthaya|bikhra|gandagi|badboo|sad\s+raha|safai\s+nahi|kooda\s+uthao|kachra\s+gaari\s+nahi|para\s+hai|para\s+he|parha\s+hai|jama\s+hai|phaila)\b/i,
      /\b(?:garbage\s+pile|uncollected|waste\s+accumulation)\b/i,
    ],
    standaloneDefects: [
      /\b(?:kachray\s+ka\s+dher|kooday\s+ke\s+dher|kachra\s+nahi\s+uthaya|safai\s+nahi\s+ho\s+rahi|kachra\s+para)\b/i,
    ],
  },
  sbca: {
    assets: [
      /\b(?:building|imarat|plaza|makan|chhat|deewar|pillar|construction|builder|commercial\s+tameer|plot|manzil|floor)\b/i,
    ],
    defects: [
      /\b(?:illegal|ghair\s+qanooni|bina\s+permit|bina\s+noc|extra\s+floor|manzila|crack|daraar|girne\s+wali|substandard|collapse|demolition|ghairqanooni|baghair\s+noc)\b/i,
      /\b(?:unauthorized\s+construction|pillars?\s+mein\s+crack|dangerous\s+building)\b/i,
    ],
    standaloneDefects: [
      /\b(?:ghair\s+qanooni\s+building|illegal\s+construction|pillars?\s+mein\s+daraar|building\s+girne\s+wali|baghair\s+noc|bina\s+noc|extra\s+chhati\s+manzil)\b/i,
    ],
  },
};

// Causal connector patterns
const CAUSAL_CONNECTORS = [
  /\b(?:jis|us|is)\s+ki\s+wajah\s+se\b/i,
  /\b(?:jis|us|is)\s+wajah\s+se\b/i,
  /\bisi\s+liye(?:\s+ke)?\b/i,
  /\bke\s+sabab\b/i,
  /\bke\s+natijay\s+mein\b/i,
  /\bke\s+bais\b/i,
  /\bjis\s+se\b/i,
  /\bki\s+wajah\s+ban\s+raha\b/i,
];

// Historical / Resolved patterns
const HISTORICAL_PATTERNS = [
  /\b(?:pehle|guzishta\s+(?:hafte|maah|saal)|pichle\s+(?:hafte|maah)|sabqa)\b.*?\b(?:theek|hal|solve|repair|safai)\s+(?:kar\s+di|ho\s+chuki|ho\s+gaya|tha|thi)\b/i,
  /\b(?:theek|repair|safai)\s+to\s+(?:kar\s+di|ho\s+chuki|ho\s+gayi)\s+thi\b/i,
  /\bmasla\s+pehle\s+tha\s+ab\s+theek\s+hai\b/i,
];

// Explicit Negation patterns
const NEGATION_PATTERNS: Array<{ dept: DepartmentId; pattern: RegExp }> = [
  {
    dept: 'kelectric',
    pattern: /\b(?:bijli|light|electric)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bbijli\s+(?:bilkul\s+)?theek\s+hai\b|\btaar\s+se\s+khatra\s+nahi\b/i,
  },
  {
    dept: 'kwsc',
    pattern: /\b(?:pani|sewerage|gutter)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bpani\s+(?:bilkul\s+)?theek\s+hai\b/i,
  },
  {
    dept: 'kmc',
    pattern: /\b(?:sarak|road)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\broad\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+khadda\s+nahi\b/i,
  },
  {
    dept: 'ssgc',
    pattern: /\b(?:gas|sui\s*gas)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bgas\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+gas\s+leak\s+nahi\b/i,
  },
  {
    dept: 'sswmb',
    pattern: /\b(?:kachra|safai)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bsafai\s+(?:bilkul\s+)?theek\s+hai\b|\bkachra\s+nahi\s+hai\b/i,
  },
  {
    dept: 'sbca',
    pattern: /\b(?:building|construction)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bbuilding\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+crack\s+nahi\b/i,
  },
];

// Spatial location phrases where road/street is merely a location anchor, not a KMC defect
const LOCATION_ANCHOR_PATTERNS = [
  /\b(?:road|sarak|gali|footpath|chowrangi)\s+(?:par|pe|mein|me|ke\s+kinare|ke\s+samne)\s+(?:kachra|gutter|pani|taar|gas|wire|dher)\b/i,
  /\b(?:kachra|gutter|pani|taar|wire)\s+(?:road|sarak|gali|footpath)\s+par\s+(?:beh|para|gir|ubal|latak)\b/i,
];

/**
 * Splits unpunctuated or lightly punctuated text into discourse segments.
 */
export function segmentDiscourseClauses(text: string): string[] {
  // Punctuation boundaries
  let clean = text.replace(/([.?!;\n]+)/g, ' $1 ');

  // Discourse markers introducing independent or causal transitions
  clean = clean.replace(
    /\b(aur\s+alag\s+se|aur\s+doosra\s+masla|aur\s+mazeed\s+yeh\s+ke|aur\s+sath\s+hi\s+sath|doosri\s+taraf|doosri\s+gali\s+mein|saath\s+wali|aur\s+pichlay|jis\s+ki\s+wajah\s+se|us\s+ki\s+wajah\s+se|is\s+wajah\s+se|isi\s+liye|ke\s+sabab|ke\s+natijay\s+mein|jis\s+se|lekin\s+ab|magar\s+ab|jabke|halanke)\b/gi,
    '. $1'
  );

  // Split on periods, exclamation marks, question marks, semicolons
  const rawSegments = clean
    .split(/[.?!;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const finalSegments: string[] = [];

  for (const seg of rawSegments) {
    // If a segment contains 'aur' followed by a defect for another department, split it
    const aurParts = seg.split(/\baur\b/i);
    if (aurParts.length <= 1) {
      finalSegments.push(seg);
    } else {
      let currentSub = aurParts[0].trim();
      for (let i = 1; i < aurParts.length; i++) {
        const nextPart = aurParts[i].trim();
        // Check if nextPart starts an independent problem
        if (
          /\b(?:rod|road|sarak|bijli|light|pani|gutter|gas|kachra|building|taar|transformer)\b/i.test(nextPart)
        ) {
          finalSegments.push(currentSub);
          currentSub = nextPart;
        } else {
          currentSub += ' aur ' + nextPart;
        }
      }
      if (currentSub) finalSegments.push(currentSub);
    }
  }

  return finalSegments.filter((s) => s.trim().length > 0);
}

/**
 * Extracts all municipal issues from raw complaint text using Phase V13.2 discourse intelligence.
 */
export function extractMunicipalIssuesV13_2(rawText: string): ExtractionResult {
  const normalizedText = normalizeRomanUrduV13_2(rawText);
  const clauses = segmentDiscourseClauses(normalizedText);

  const issues: ExtractedIssue[] = [];
  const notes: string[] = [];
  const causalChains: Array<{ rootDept: DepartmentId; consequenceDept: DepartmentId; explanation: string }> = [];

  // Check explicit full-text negations
  const fullTextNegations = new Set<DepartmentId>();
  for (const { dept, pattern } of NEGATION_PATTERNS) {
    if (pattern.test(normalizedText)) {
      fullTextNegations.add(dept);
      notes.push(`Explicit negation detected: ${dept.toUpperCase()} reported defect-free in context`);
    }
  }

  // Check historical repairs
  const historicallyResolvedDepts = new Set<DepartmentId>();
  for (const pattern of HISTORICAL_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      const matchText = match[0];
      for (const [dept, lex] of Object.entries(DEPARTMENT_LEXICONS)) {
        if (lex.assets.some((p) => p.test(matchText))) {
          historicallyResolvedDepts.add(dept as DepartmentId);
          notes.push(`Historical repair detected: ${dept.toUpperCase()} was previously fixed, not an active issue`);
        }
      }
    }
  }

  let issueCounter = 1;

  for (let cIdx = 0; cIdx < clauses.length; cIdx++) {
    const clause = clauses[cIdx];

    // Detect which departments have evidence in this clause
    for (const [deptStr, lex] of Object.entries(DEPARTMENT_LEXICONS)) {
      const dept = deptStr as DepartmentId;

      const hasAsset = lex.assets.some((p) => p.test(clause));
      const hasDefect = lex.defects.some((p) => p.test(clause));
      const hasStandalone = lex.standaloneDefects.some((p) => p.test(clause));

      if ((hasAsset && hasDefect) || hasStandalone) {
        // Find asset match and defect match
        const assetMatch = clause.match(lex.assets[0])?.[0] || dept;
        const defectMatch = clause.match(lex.defects[0])?.[0] || 'reported defect';

        let status: IssueStatus = 'INDEPENDENT_FAULT';

        // Check if explicitly negated
        if (fullTextNegations.has(dept)) {
          status = 'NEGATED_MENTION';
        } else if (historicallyResolvedDepts.has(dept)) {
          status = 'HISTORICAL_RESOLVED';
        }

        // Special Check for KMC Road as purely spatial location anchor
        if (dept === 'kmc' && status === 'INDEPENDENT_FAULT') {
          const isSpatialAnchor = LOCATION_ANCHOR_PATTERNS.some((p) => p.test(clause));
          const hasAffirmativeRoadDamage = /\b(?:toot|tooti|khadda|khadday|gaddha|crater|pothole|dhans|asphalt|damaged)\b/i.test(clause);
          if (isSpatialAnchor && !hasAffirmativeRoadDamage) {
            status = 'LOCATION_ONLY';
            notes.push('Suppressed KMC: Road is merely spatial location for another utility defect');
          }
        }

        issues.push({
          id: `iss_${issueCounter++}`,
          department: dept,
          asset: assetMatch,
          defect: defectMatch,
          evidenceSpan: clause,
          status,
          isActionable: status === 'INDEPENDENT_FAULT',
          confidence: 0.85,
        });
      }
    }
  }

  // Cross-Clause Causal Consequence Linking (Fahad's Rule)
  // Check if a causal connector links a root fault to a secondary symptom
  for (let i = 0; i < issues.length; i++) {
    const rootIssue = issues[i];
    if (rootIssue.status !== 'INDEPENDENT_FAULT') continue;

    for (let j = 0; j < issues.length; j++) {
      if (i === j) continue;
      const targetIssue = issues[j];
      if (targetIssue.department === rootIssue.department) continue;

      // Check if target issue clause contains a causal connector linking it from root
      const combined = rootIssue.evidenceSpan + ' ' + targetIssue.evidenceSpan;
      const hasCausalConnector = CAUSAL_CONNECTORS.some((p) => p.test(targetIssue.evidenceSpan) || p.test(combined));

      // Specific civic causal dynamics:
      // KWSC water leak -> KMC road damage
      // SSGC gas excavation -> KMC road trench
      // K-Electric outage -> KWSC domestic water motor stopped
      // SSWMB garbage pile -> KWSC drain blockage
      let isCivicCausalPair = false;
      let reason = '';

      if (rootIssue.department === 'kwsc' && targetIssue.department === 'kmc') {
        if (/\b(?:line|pipe|burst|leak|overflow)\b/i.test(rootIssue.evidenceSpan) && hasCausalConnector) {
          isCivicCausalPair = true;
          reason = 'KWSC water pipeline leak caused KMC road damage';
        }
      } else if (rootIssue.department === 'ssgc' && targetIssue.department === 'kmc') {
        if (/\b(?:khod|khudai|excavation|pipeline)\b/i.test(rootIssue.evidenceSpan) && hasCausalConnector) {
          isCivicCausalPair = true;
          reason = 'SSGC pipeline digging caused KMC road damage';
        }
      } else if (rootIssue.department === 'kelectric' && targetIssue.department === 'kwsc') {
        if (/\b(?:bijli|light|feeder|power|transformer)\b/i.test(rootIssue.evidenceSpan) && /\bmotor\b/i.test(targetIssue.evidenceSpan)) {
          isCivicCausalPair = true;
          reason = 'K-Electric power outage caused domestic water motor to stop';
        }
      } else if (rootIssue.department === 'sswmb' && targetIssue.department === 'kwsc') {
        if (/\b(?:kachra|kooda|dher)\b/i.test(rootIssue.evidenceSpan) && /\b(?:choke|block|overflow)\b/i.test(targetIssue.evidenceSpan)) {
          isCivicCausalPair = true;
          reason = 'SSWMB garbage dump caused sewer line blockage';
        }
      }

      if (isCivicCausalPair) {
        targetIssue.status = 'CAUSAL_CONSEQUENCE';
        targetIssue.isActionable = false;
        targetIssue.causedByIssueId = rootIssue.id;
        causalChains.push({
          rootDept: rootIssue.department,
          consequenceDept: targetIssue.department,
          explanation: reason,
        });
        notes.push(`Fahad's Rule Applied: Demoted ${targetIssue.department.toUpperCase()} (${reason})`);
      }
    }
  }

  // Deduplicate actionable departments
  const actionableDepartments = Array.from(
    new Set(issues.filter((iss) => iss.isActionable).map((iss) => iss.department))
  ).sort();

  const suppressedDepartments = Array.from(
    new Set(issues.filter((iss) => !iss.isActionable).map((iss) => iss.department))
  ).filter((d) => !actionableDepartments.includes(d)).sort();

  return {
    rawText,
    normalizedText,
    issues,
    actionableDepartments,
    suppressedDepartments,
    causalChains,
    isMultiIssue: actionableDepartments.length > 1,
    notes,
  };
}
