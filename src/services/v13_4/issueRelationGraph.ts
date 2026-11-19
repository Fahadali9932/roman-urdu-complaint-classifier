/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V13.4 Causal Issue Relation Graph & Reasoner
 *
 * Provides typed, grounded representation of municipal issues and their semantic relations:
 * - INDEPENDENT: Separate actionable municipal faults requiring distinct departments.
 * - CAUSES / CONSEQUENCE_OF: Root municipal fault causing secondary civic symptoms (demoted per Fahad's Rule).
 * - ASSET_LOCATION_ONLY: Municipal asset (e.g. road/street) mentioned solely as spatial location anchor.
 * - NEGATED: Municipal issue explicitly denied or stated to be free of defects.
 * - RESOLVED_OR_HISTORICAL: Historical issue previously repaired or resolved.
 * - UNCERTAIN: Ambiguous mention requiring human review or clarification.
 */

export type DepartmentId = 'kmc' | 'kwsc' | 'kelectric' | 'ssgc' | 'sswmb' | 'sbca';

export type RelationshipType =
  | 'INDEPENDENT'
  | 'CAUSES'
  | 'CONSEQUENCE_OF'
  | 'ASSET_LOCATION_ONLY'
  | 'NEGATED'
  | 'RESOLVED_OR_HISTORICAL'
  | 'UNCERTAIN';

export interface GroundedIssue {
  id: string;
  department: DepartmentId;
  rawSpan: string;
  normalizedSpan: string;
  asset: string;
  defect: string;
  evidenceStrength: number; // 0.0 - 1.0
  relationship: RelationshipType;
  relatedIssueId?: string;
  isActionable: boolean;
  routingDecision:
    | 'ROUTED'
    | 'SUPPRESSED_CONSEQUENCE'
    | 'SUPPRESSED_LOCATION'
    | 'SUPPRESSED_NEGATION'
    | 'SUPPRESSED_HISTORICAL'
    | 'FLAGGED_REVIEW';
  reason: string;
}

export interface CausalChainRecord {
  rootDept: DepartmentId;
  consequenceDept: DepartmentId;
  causeIssueId: string;
  consequenceIssueId: string;
  connectorText: string;
  explanation: string;
}

export interface IssueGraphResult {
  rawText: string;
  normalizedText: string;
  issues: GroundedIssue[];
  actionableDepartments: DepartmentId[];
  suppressedDepartments: DepartmentId[];
  locationOnlyDepartments: DepartmentId[];
  causalChains: CausalChainRecord[];
  isMultiIssue: boolean;
  auditNotes: string[];
}

import { normalizeRomanUrduV13_2 } from '../v13_2/romanUrduNormalizer';

// Enhanced causal connector patterns with extensive Roman Urdu spelling variants
export const CAUSAL_CONNECTORS = [
  // ki wajah se variants
  /\b(?:jis|us|is|in|un|iski|uski|inki|unki)\s*(?:ki|k|ke)?\s*(?:wajah|waja|wajeh)\s*(?:se|say)\b/i,
  /\b(?:jis|us|is)\s*(?:wajah|waja|wajeh)\s*(?:se|say)\b/i,
  /\b(?:ki|k|ke)?\s*(?:wajah|waja|wajeh)\s*(?:se|say)\b/i,
  // is liye variants
  /\b(?:is|isi|us|usi)\s*(?:liye|lye|lie)\s*(?:ke|k)?\b/i,
  // sabab / bais / natijay variants
  /\b(?:ke|k|jis\s*ke|is\s*ke|us\s*ke)\s*(?:sabab|bais|natijay\s*mein|natije\s*me)\b/i,
  // jis se / is se variants
  /\b(?:jis|is|us)\s*(?:se|say)\b/i,
  // kyun ke variants
  /\b(?:kyun|kyon|kiun|q)\s*(?:ke|k)\b/i,
  /\bkyunke\b/i,
  // tab se / jab se
  /\b(?:tab|jab)\s*(?:se|say)\b/i,
  // hone se / hone ki wajah se
  /\b(?:hone|phatne|girne|tootne|tutne|trip\s*hone|band\s*hone|khudai\s*hone)\s*(?:se|say|ki\s*wajah\s*se|ki\s*waja\s*se)\b/i,
  // jis ke paani se / paani behne se
  /\bjis\s*(?:ke|k)\s*(?:paani|pani)\s*(?:se|say)\b/i,
  /\bpaani\s+behne\s+se\b/i,
];

// Negation patterns per department
const NEGATION_PATTERNS: Array<{ dept: DepartmentId; pattern: RegExp; explanation: string }> = [
  {
    dept: 'kelectric',
    pattern: /\b(?:bijli|light|electric|current|transformer|taar)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bbijli\s+(?:bilkul\s+)?theek\s+hai\b|\btaar\s+(?:se\s+)?khatra\s+nahi\b|\blight\s+(?:aa\s+rahi\s+hai|theek\s+hai)\b/i,
    explanation: 'Citizen explicitly affirmed K-Electric electricity / lighting is defect-free',
  },
  {
    dept: 'kwsc',
    pattern: /\b(?:pani|sewerage|gutter|water\s*supply|line)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bpani\s+(?:bilkul\s+)?theek\s+hai\b|\bpaani\s+ara\s+hai\b|\bgutter\s+(?:saaf\s+hai|band\s+nahi)\b/i,
    explanation: 'Citizen explicitly affirmed KWSC water supply / drainage is defect-free',
  },
  {
    dept: 'kmc',
    pattern: /\b(?:sarak|road|sadak|gali|footpath|street\s*light)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\broad\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+khadda\s+nahi\b|\bsarak\s+bani\s+hui\s+hai\b/i,
    explanation: 'Citizen explicitly affirmed KMC road infrastructure is defect-free',
  },
  {
    dept: 'ssgc',
    pattern: /\b(?:gas|sui\s*gas|chulha)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bgas\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+gas\s+leak\s+nahi\b|\bgas\s+aa\s+rahi\s+hai\b/i,
    explanation: 'Citizen explicitly affirmed SSGC gas supply is defect-free',
  },
  {
    dept: 'sswmb',
    pattern: /\b(?:kachra|kooda|safai)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bsafai\s+(?:bilkul\s+)?theek\s+hai\b|\bkachra\s+nahi\s+hai\b|\bkachra\s+uth\s+gaya\b/i,
    explanation: 'Citizen explicitly affirmed SSWMB sanitation is defect-free',
  },
  {
    dept: 'sbca',
    pattern: /\b(?:building|construction|imarat)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bbuilding\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+illegal\s+kaam\s+nahi\b/i,
    explanation: 'Citizen explicitly affirmed SBCA building construction is defect-free',
  },
];

// Historical / Resolved patterns
const HISTORICAL_PATTERNS = [
  /\b(?:pehle|guzishta|pichle|sabqa|kal|parson)\b.*?\b(?:theek|hal|solve|repair|safai|banaya|bana\s+diya)\s+(?:kar\s+di|ho\s+chuki|ho\s+gaya|ho\s+gayi|tha|thi)\b/i,
  /\b(?:theek|repair|safai)\s+to\s+(?:kar\s+di|ho\s+chuki|ho\s+gayi)\s+thi\b/i,
  /\bmasla\s+pehle\s+tha\s+ab\s+theek\s+hai\b/i,
];

// Spatial location phrases where road/street is merely a location anchor, not an actionable KMC defect
export const LOCATION_ANCHOR_PATTERNS = [
  /\b(?:road|sarak|sadak|rod|gali|footpath|chowrangi|chowk)\s+(?:par|pe|mein|me|ke\s+kinare|ke\s+samne|ke\s+beech)\s+(?:kachra|kooda|gutter|pani|taar|gas|wire|dher|khamba|pole|meter|dustbin|kundi)\b/i,
  /\b(?:kachra|kooda|gutter|pani|taar|wire|khamba|pole|gas\s*leak|dustbin|kundi)\s+(?:road|sarak|sadak|rod|gali|footpath|chowrangi|chowk)\s+(?:par|pe|mein)\s+(?:beh|para|gir|ubal|latak|phail|leak|bikhra)\b/i,
  /\b(?:sth\s+wali|saath\s+wali|hamari)\s+(?:rod|road|gali|sarak)\s+(?:pe|par)\s+(?:khambay|taar|pole|wire|kachra|gas)\b/i,
];

// Genuine Road / Flyover / Footpath Structural Damage Pattern
const ROAD_STRUCTURAL_DEFECT_REGEX =
  /\b(?:road|roads|sarak|sadak|rod|street|gali|asphalt|footpath|underpass|flyover|bridge|pavement|expressway)\b[^\.\,\;]{0,35}\b(?:toot|toota|tooti|toote|tut|tuta|tuti|tute|toot\s*phoot|tut\s*phut|khadda|khadday|khadde|gaddha|crater|pothole|potholes|dhans|damaged|asphalt\s*ukhad|surfacing\s*utar|malba\s*para)\b|\b(?:toot|toota|tooti|toote|tut|tuta|tuti|tute|khadda|khadday|khadde|crater|pothole|potholes|dhans|damaged|asphalt\s*ukhad|surfacing\s*utar|malba\s*para)\b[^\.\,\;]{0,35}\b(?:road|roads|sarak|sadak|rod|street|gali|asphalt|footpath|underpass|flyover|bridge|pavement|expressway)\b/i;

interface StrictLexicon {
  assets: RegExp[];
  defects: RegExp[];
  standaloneDefects: RegExp[];
  excludeIfPresent?: RegExp;
}

export const STRICT_DEPARTMENT_LEXICONS: Record<DepartmentId, StrictLexicon> = {
  kelectric: {
    assets: [
      /\b(?:bijli|light|current|transformer|tranforma|voltage|feeder|wire|wires|taar|taarein|pole|khamba|khambay|pmt|k-?electric|kelectric|k\.e\.)\b/i,
    ],
    defects: [
      /\b(?:nahi\s+aa\s+rahi|nahi\s+arhi|band\s+hai|band\s+he|chali\s+gayi|kat\s+gayi|trip|tripping|spark|sparking|dhamaka|blast|phat|jal\s+gaya|smoke|dhuan|latak|tuta\s+hua|toota|gir\s+gaya|low\s+voltage|dim|fluctuation|shock|current\s+lag)\b/i,
      /\b(?:power\s+outage|load\s*shedding|short\s*circuit|hanging\s*wire)\b/i,
    ],
    standaloneDefects: [
      /\b(?:load\s*shedding|power\s*cut|bijli\s+band|taar\s+toot|pole\s+gir|transformer\s+phat|transformer\s+jal|current\s+ara\s+hai|short\s*circuit)\b/i,
    ],
  },
  kwsc: {
    assets: [
      /\b(?:pani|paani|water|sewerage|sewer|gutter|gutters|manhole|manholes|dhakkan|nullah|nalla|sewer\s*line|water\s*board|kw&sc|kwsc|main\s*line)\b/i,
      /\b(?:pipeline|pipe)\b/i,
    ],
    defects: [
      /\b(?:nahi\s+aa\s+raha|nahi\s+ara|band\s+hai|sookha|qillat|shortage|leak|leek|burst|phat|toot|overflow|ubal|choke|block|ganda\s+pani|badboo|mix|open|khula|missing|ghayab|chor|beh\s+raha)\b/i,
      /\b(?:sewerage\s+overflow|water\s+shortage|contaminated\s+water|missing\s+manhole)\b/i,
    ],
    standaloneDefects: [
      /\b(?:pani\s+band|peenay\s+ka\s+pani|pani\s+nahi\s+ara|gutter\s+ubal|sewer\s+block|manhole\s+cover|dhakkan\s+ghayab|water\s+board|line\s+phat\s+gayi)\b/i,
    ],
    // Exclude if gas is clearly mentioned in proximity to line
    excludeIfPresent: /\b(?:gas|sui\s*gas)\b/i,
  },
  kmc: {
    assets: [
      /\b(?:road|roads|sarak|sadak|sarken|rod|street|gali|footpath|foot\s*path|underpass|flyover|bridge|asphalt|carpeting|street\s*light|street\s*lights|batti|chowk|chowrangi)\b/i,
    ],
    defects: [
      /\b(?:toot|toota|tooti|toote|tut|tuta|tuti|tute|toot\s*phoot|tut\s*phut|khadda|khadday|khadde|gaddha|gadday|crater|pothole|potholes|dhans|kharab|damaged|asphalt\s+ukhad|beh\s+gaya|fuse|fuses|nahi\s+jal|andhera)\b/i,
      /\b(?:broken\s+road|potholes|damaged\s+pavement|street\s*light\s*fuse)\b/i,
    ],
    standaloneDefects: [
      /\b(?:road\s+toot|sarak\s+toot|gali\s+toot|khadday\s+par\s+gaye|potholes|street\s*light\s*fuse|asphalt\s+ukhad|road\s+damaged)\b/i,
    ],
  },
  ssgc: {
    assets: [
      /\b(?:gas|sui\s*gas|gas\s*pipeline|gas\s*line|chulha|chulhay|stove|gas\s*meter|ssgc)\b/i,
    ],
    defects: [
      /\b(?:nahi\s+aa\s+rahi|nahi\s+ara|band\s+hai|low\s+pressure|pressure\s+kam|zero\s+pressure|leak|leek|boodar|badboo|smell|gas\s*boo|chulha\s+nahi\s+jal|khana\s+nahi\s+pak|dhamaka|excavation|khudai|khoda|khodi|hiss|nikal\s*rahi|damage)\b/i,
      /\b(?:gas\s+outage|methane|gas\s+leak|gas\s+smell)\b/i,
    ],
    standaloneDefects: [
      /\b(?:gas\s+leak|gas\s+band|gas\s+nahi\s+aa\s+rahi|zero\s+pressure|gas\s+pressure\s+kam|chulha\s+thanda|gas\s+line\s+phat|sui\s*gas)\b/i,
    ],
    excludeIfPresent: /\b(?:peenay\s+ka\s+pani|pani\s+ki\s+line|water\s+board|drainage|gutter|sewer)\b/i,
  },
  sswmb: {
    assets: [
      /\b(?:kachra|kachray|kachre|kooda|kooday|koode|safai|dustbin|dumpster|dumper|kundi|kachra\s*kundi|sweeper|solid\s*waste|sswmb)\b/i,
    ],
    defects: [
      /\b(?:dher|dhaer|ambar|nahi\s+uthaya|bikhra|gandagi|badboo|sad\s+raha|safai\s+nahi|kooda\s+uthao|kachra\s+gaari\s+nahi|para\s+hai|para\s+he|parha\s+hai|jama\s+hai|phaila|overflow|gir\s+gaya)\b/i,
      /\b(?:garbage\s+pile|uncollected|waste\s+accumulation|trash\s+dump)\b/i,
    ],
    standaloneDefects: [
      /\b(?:kachray\s+ka\s+dher|kooday\s+ke\s+dher|kachra\s+nahi\s+uthaya|safai\s+nahi\s+ho\s+rahi|kachra\s+para|kachra\s+kundi)\b/i,
    ],
  },
  sbca: {
    assets: [
      /\b(?:building|buildings|imarat|imaraten|plaza|plazas|makan|chhat|deewar|pillar|pillars|beam|plinth|construction|builder|commercial\s+tameer|plot|manzil|floor|sbca)\b/i,
    ],
    defects: [
      /\b(?:illegal|ghair\s+qanooni|bina\s+permit|bina\s+noc|extra\s+floor|manzila|crack|cracks|daraar|girne\s+wali|substandard|collapse|demolition|ghairqanooni|baghair\s+noc|baghair\s+naqsha|baith\s*rahi|gir\s*sakti|toot)\b/i,
      /\b(?:unauthorized\s+construction|pillars?\s+mein\s+crack|dangerous\s+building)\b/i,
    ],
    standaloneDefects: [
      /\b(?:ghair\s+qanooni\s+building|illegal\s+construction|pillars?\s+mein\s+daraar|building\s+girne\s+wali|baghair\s+noc|bina\s+noc|extra\s+chhati\s+manzil)\b/i,
    ],
  },
};

/**
 * Splits unpunctuated text into coherent discourse clauses.
 */
export function segmentDiscourseClausesV13_4(text: string): string[] {
  let clean = text.replace(/([.?!;\n]+)/g, ' $1 ');

  clean = clean.replace(
    /\b(aur\s+alag\s+se|aur\s+doosra\s+masla|aur\s+mazeed\s+yeh\s+ke|aur\s+sath\s+hi\s+sath|doosri\s+taraf|doosri\s+gali\s+mein|saath\s+wali|aur\s+pichlay|jis\s+ki\s+wajah\s+se|us\s+ki\s+wajah\s+se|is\s+wajah\s+se|isi\s+liye|ke\s+sabab|ke\s+natijay\s+mein|jis\s+se|is\s+se|lekin\s+ab|magar\s+ab|jabke|halanke|jis\s+k?e?\s*pa?ani\s+se)\b/gi,
    '. $1'
  );

  const rawSegments = clean
    .split(/[.?!;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const finalSegments: string[] = [];

  for (const seg of rawSegments) {
    const aurParts = seg.split(/\baur\b/i);
    if (aurParts.length <= 1) {
      finalSegments.push(seg);
    } else {
      let currentSub = aurParts[0].trim();
      for (let i = 1; i < aurParts.length; i++) {
        const nextPart = aurParts[i].trim();
        if (
          /\b(?:rod|road|sarak|sadak|gali|bijli|light|pani|gutter|sewer|gas|sui\s*gas|kachra|kooda|building|imarat|taar|transformer)\b/i.test(
            nextPart
          )
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
 * Builds the comprehensive typed issue relation graph for a complaint.
 */
export function buildIssueRelationGraph(rawText: string): IssueGraphResult {
  const normalizedText = normalizeRomanUrduV13_2(rawText);
  const clauses = segmentDiscourseClausesV13_4(normalizedText);

  const issues: GroundedIssue[] = [];
  const auditNotes: string[] = [];
  const causalChains: CausalChainRecord[] = [];

  // Check explicit full-text negations
  const negatedDepts = new Map<DepartmentId, string>();
  for (const { dept, pattern, explanation } of NEGATION_PATTERNS) {
    if (pattern.test(normalizedText)) {
      negatedDepts.set(dept, explanation);
      auditNotes.push(`Negation Detected: ${dept.toUpperCase()} — ${explanation}`);
    }
  }

  // Check historical repairs
  const historicalDepts = new Set<DepartmentId>();
  for (const pattern of HISTORICAL_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      const matchText = match[0];
      for (const [dept, lex] of Object.entries(STRICT_DEPARTMENT_LEXICONS)) {
        if (lex.assets.some((p) => p.test(matchText))) {
          historicalDepts.add(dept as DepartmentId);
          auditNotes.push(`Historical Resolution: ${dept.toUpperCase()} defect was previously resolved`);
        }
      }
    }
  }

  let counter = 1;

  // Extract candidate issues clause-by-clause
  for (const clause of clauses) {
    for (const [deptStr, lex] of Object.entries(STRICT_DEPARTMENT_LEXICONS)) {
      const dept = deptStr as DepartmentId;

      if (lex.excludeIfPresent && lex.excludeIfPresent.test(clause)) {
        continue;
      }

      const hasAsset = lex.assets.some((p) => p.test(clause));
      const hasDefect = lex.defects.some((p) => p.test(clause));
      const hasStandalone = lex.standaloneDefects.some((p) => p.test(clause));

      if ((hasAsset && hasDefect) || hasStandalone) {
        const assetMatch = clause.match(lex.assets[0])?.[0] || dept;
        const defectMatch = clause.match(lex.defects[0])?.[0] || 'reported defect';

        let relationship: RelationshipType = 'INDEPENDENT';
        let routingDecision: GroundedIssue['routingDecision'] = 'ROUTED';
        let reason = `Affirmative independent defect for ${dept.toUpperCase()}`;
        let isActionable = true;

        // Check negation
        if (negatedDepts.has(dept)) {
          relationship = 'NEGATED';
          routingDecision = 'SUPPRESSED_NEGATION';
          reason = negatedDepts.get(dept)!;
          isActionable = false;
        } else if (historicalDepts.has(dept)) {
          relationship = 'RESOLVED_OR_HISTORICAL';
          routingDecision = 'SUPPRESSED_HISTORICAL';
          reason = 'Historical repair; not an active actionable defect';
          isActionable = false;
        } else if (dept === 'kmc') {
          // Check if road is purely a spatial anchor
          const hasRoadSpecificDamage = ROAD_STRUCTURAL_DEFECT_REGEX.test(clause);
          const hasStreetLightDefect = /\b(?:street\s*lights?|gali\s*light|sarak\s*ki\s*light|batti|battiyan)\b[^\.\,\;]{0,25}\b(?:fuse|fuses|nahi\s+jal|andhera)\b/i.test(clause);

          // If toot modifies dustbin, wire, pole, or house, it is not road damage
          const isCompromisedByDustbinOrWire = /\b(?:kooda\s*daan|dustbin|kundi|taar|wire|khamba|pole|pillar|beam)\b[^\.\,\;]{0,25}\b(?:toot|tut|gir)\b/i.test(clause);

          if (!hasRoadSpecificDamage && !hasStreetLightDefect) {
            relationship = 'ASSET_LOCATION_ONLY';
            routingDecision = 'SUPPRESSED_LOCATION';
            reason = 'Road / street mentioned solely as spatial location anchor for another utility defect';
            isActionable = false;
            auditNotes.push('Suppressed KMC: Road is spatial location only without structural damage');
          } else if (isCompromisedByDustbinOrWire && !ROAD_STRUCTURAL_DEFECT_REGEX.test(clause.replace(/\b(?:kooda\s*daan|dustbin|kundi|taar|wire|khamba|pole)\s+(?:toot|tut|gir)\w*\b/gi, ''))) {
            relationship = 'ASSET_LOCATION_ONLY';
            routingDecision = 'SUPPRESSED_LOCATION';
            reason = 'Road mentioned as location of damaged dumpster/wire';
            isActionable = false;
            auditNotes.push('Suppressed KMC: Road mentioned as location of damaged dumpster/wire');
          }
        }

        // Special check: domestic water pump stoppage due to electrical outage
        if (dept === 'kwsc' && /\b(?:water\s*pump|pani\s*ki\s*motor|water\s*motor|motor)\b/i.test(clause)) {
          const hasOutageInContext = /\b(?:bijli|light|transformer|feeder|tripping|voltage)\b/i.test(normalizedText);
          const hasWaterUtilityDefect = /\b(?:main\s*line|line\s*burst|water\s*board|peenay\s*ka\s*pani|sewerage|gutter)\b/i.test(clause);
          if (hasOutageInContext && !hasWaterUtilityDefect) {
            relationship = 'CONSEQUENCE_OF';
            routingDecision = 'SUPPRESSED_CONSEQUENCE';
            reason = 'Domestic water motor failure is a secondary symptom of K-Electric electrical outage';
            isActionable = false;
            auditNotes.push('Suppressed KWSC: Domestic pump stoppage is consequence of power outage');
          }
        }

        // Special check: rain mud on road
        if (dept === 'sswmb' && /\b(?:kichar|keechad|mud)\b/i.test(clause)) {
          const hasBrokenRoadInContext = /\b(?:road|sarak|sadak|gali|rod)\b/i.test(normalizedText) && /\b(?:toot|tut|khadda|barish)\b/i.test(normalizedText);
          const hasSolidWasteInContext = /\b(?:kachra|kooda|dustbin|dumpster|kundi)\b/i.test(clause);
          if (hasBrokenRoadInContext && !hasSolidWasteInContext) {
            relationship = 'CONSEQUENCE_OF';
            routingDecision = 'SUPPRESSED_CONSEQUENCE';
            reason = 'Mud / kichar is contextual weather consequence of damaged road; not an independent solid waste issue';
            isActionable = false;
            auditNotes.push('Suppressed SSWMB: Mud is consequence of damaged road infrastructure');
          }
        }

        issues.push({
          id: `iss_${counter++}`,
          department: dept,
          rawSpan: clause,
          normalizedSpan: clause,
          asset: assetMatch,
          defect: defectMatch,
          evidenceStrength: 0.90,
          relationship,
          isActionable,
          routingDecision,
          reason,
        });
      }
    }
  }

  // Ensure negated departments detected in full text are explicitly recorded in issues
  for (const [dept, explanation] of negatedDepts.entries()) {
    if (!issues.some((iss) => iss.department === dept)) {
      issues.push({
        id: `iss_${counter++}`,
        department: dept,
        rawSpan: normalizedText,
        normalizedSpan: normalizedText,
        asset: dept,
        defect: 'none (explicitly negated)',
        evidenceStrength: 0.95,
        relationship: 'NEGATED',
        isActionable: false,
        routingDecision: 'SUPPRESSED_NEGATION',
        reason: explanation,
      });
    }
  }

  // Ensure historical/resolved departments detected in full text are explicitly recorded in issues
  for (const dept of historicalDepts) {
    if (!issues.some((iss) => iss.department === dept)) {
      issues.push({
        id: `iss_${counter++}`,
        department: dept,
        rawSpan: normalizedText,
        normalizedSpan: normalizedText,
        asset: dept,
        defect: 'previously resolved',
        evidenceStrength: 0.95,
        relationship: 'RESOLVED_OR_HISTORICAL',
        isActionable: false,
        routingDecision: 'SUPPRESSED_HISTORICAL',
        reason: 'Historical repair; not an active actionable defect',
      });
    }
  }

  // Cross-Issue Causal Consequence Linking (Inter-Clause & Intra-Sentence)
  for (let i = 0; i < issues.length; i++) {
    const root = issues[i];
    if (root.relationship !== 'INDEPENDENT') continue;

    for (let j = 0; j < issues.length; j++) {
      if (i === j) continue;
      const target = issues[j];
      if (target.department === root.department) continue;
      if (target.relationship !== 'INDEPENDENT') continue;

      const combined = root.normalizedSpan + ' ' + target.normalizedSpan;
      const connectorMatch = CAUSAL_CONNECTORS.find(
        (p) => p.test(target.normalizedSpan) || p.test(combined) || p.test(normalizedText)
      );

      let isCausalPair = false;
      let explanation = '';

      // 1. KWSC Water Main Burst / Gutter Overflow -> KMC Road Damage
      if (root.department === 'kwsc' && target.department === 'kmc') {
        const rootHasWaterLeak = /\b(?:line|pipe|burst|phat|leak|gutter|sewer|overflow|ubal|pani)\b/i.test(root.normalizedSpan);
        const targetHasRoadDamage = /\b(?:road|sarak|sadak|gali|asphalt|khadda|toot|tut)\b/i.test(target.normalizedSpan);
        const hasWaterRoadCausal =
          connectorMatch ||
          /\b(?:jis\s*ke\s*paani\s*se|gutter\s*ka\s*pani\s*ubalne\s*ki\s*wajah\s*se|drainage\s*block\s*hone\s*se)\b/i.test(
            normalizedText
          );

        if (rootHasWaterLeak && targetHasRoadDamage && hasWaterRoadCausal) {
          isCausalPair = true;
          explanation = 'KWSC water main burst / sewer overflow caused downstream KMC road erosion';
        }
      }

      // 2. SSGC Gas Excavation / Digging -> KMC Road Pothole / Trench
      else if (root.department === 'ssgc' && target.department === 'kmc') {
        const rootHasDigging = /\b(?:khod\w*|khudai|excavation|repair\s*ke\s*liye|pipeline|pipe\s*line)\b/i.test(root.normalizedSpan);
        const targetHasRoadTrench = /\b(?:road|sarak|sadak|gali|khadda|khadday|tooti|toota)\b/i.test(target.normalizedSpan);
        if (rootHasDigging && targetHasRoadTrench && (connectorMatch || /\b(?:khod\w*|khudai|chor\s*kar)\b/i.test(normalizedText))) {
          isCausalPair = true;
          explanation = 'SSGC utility excavation trench left road broken; responsibility belongs to SSGC';
        }
      }

      // 3. K-Electric Outage -> KWSC Domestic Water Pump Stoppage
      else if (root.department === 'kelectric' && target.department === 'kwsc') {
        const rootHasOutage = /\b(?:bijli|light|feeder|power|transformer|trip|band)\b/i.test(root.normalizedSpan);
        const targetHasPump = /\b(?:pump|motor|pani\s*nahi\s*bhara|pani\s*band)\b/i.test(target.normalizedSpan);
        const hasWaterBoardDefect = /\b(?:water\s*board|line\s*burst|main\s*line|meetha\s*pani)\b/i.test(target.normalizedSpan);

        if (rootHasOutage && targetHasPump && !hasWaterBoardDefect) {
          isCausalPair = true;
          explanation = 'K-Electric power outage caused domestic water motor to stop';
        }
      }

      // 4. SSWMB Garbage Pile -> KWSC Drain / Gutter Choke
      else if (root.department === 'sswmb' && target.department === 'kwsc') {
        const rootHasGarbage = /\b(?:kachra|kachray|kooda|dher|malba)\b/i.test(root.normalizedSpan);
        const targetHasChoke = /\b(?:drain|gutter|sewer|choke|block|manhole)\b/i.test(target.normalizedSpan);
        if (rootHasGarbage && targetHasChoke && (connectorMatch || /\b(?:drain\s*ke\s*uper|sewer\s*line\s*mein)\b/i.test(normalizedText))) {
          isCausalPair = true;
          explanation = 'SSWMB solid waste dump caused drainage / sewer line blockage';
        }
      }

      if (isCausalPair) {
        target.relationship = 'CONSEQUENCE_OF';
        target.isActionable = false;
        target.relatedIssueId = root.id;
        target.routingDecision = 'SUPPRESSED_CONSEQUENCE';
        target.reason = explanation;

        root.relationship = 'CAUSES';
        root.relatedIssueId = target.id;

        causalChains.push({
          rootDept: root.department,
          consequenceDept: target.department,
          causeIssueId: root.id,
          consequenceIssueId: target.id,
          connectorText: connectorMatch
            ? (combined.match(connectorMatch)?.[0] || normalizedText.match(connectorMatch)?.[0] || 'causal_connector')
            : 'contextual_causal_link',
          explanation,
        });

        auditNotes.push(`Fahad's Causal Rule: Demoted ${target.department.toUpperCase()} (${explanation})`);
      }
    }
  }

  // GLOBAL CONTEXTUAL CAUSAL CHECKS
  // Check 1: If K-Electric outage is actionable and complaint mentions domestic water pump/motor stoppage
  const hasActionableKE = issues.some((iss) => iss.department === 'kelectric' && iss.isActionable);
  if (hasActionableKE) {
    const hasDomesticWaterSymptom = /\b(?:water\s*pump|pani\s*ki\s*motor|water\s*motor|motor\s*nahi\s*chal|tanki\s*nahi\s*bhar|pani\s*nahi\s*bhara|motor\s*band)\b/i.test(normalizedText);
    if (hasDomesticWaterSymptom && !hasWaterUtilityDefect(normalizedText)) {
      let foundKwsc = false;
      for (const iss of issues) {
        if (iss.department === 'kwsc') {
          iss.relationship = 'CONSEQUENCE_OF';
          iss.isActionable = false;
          iss.routingDecision = 'SUPPRESSED_CONSEQUENCE';
          iss.reason = 'Domestic water motor failure is caused by K-Electric power outage';
          foundKwsc = true;
        }
      }
      if (!foundKwsc) {
        issues.push({
          id: `iss_${counter++}`,
          department: 'kwsc',
          rawSpan: normalizedText,
          normalizedSpan: normalizedText,
          asset: 'water pump / motor',
          defect: 'stoppage caused by power outage',
          evidenceStrength: 0.90,
          relationship: 'CONSEQUENCE_OF',
          isActionable: false,
          routingDecision: 'SUPPRESSED_CONSEQUENCE',
          reason: 'Domestic water motor failure is caused by K-Electric power outage',
        });
      }
      auditNotes.push('Global Causal Rule: Suppressed KWSC due to K-Electric power failure causing water pump stoppage');
    }
  }

  // Check 2: If SSWMB garbage is present and causes drain blockage (e.g. kachra drain pe gir gaya / kachra kundi se sewer mein gaya)
  const hasGarbageDefect =
    /\b(?:kachra|kachray|kooda|solid|waste|malba)\b/i.test(normalizedText) &&
    /\b(?:dher|kundi|dustbin|drain\s*ke\s*uper|kachra\s*kundi|kachra\s*dustbin|dustbin\s*se\s*nikal|se\s*nikal\s*kar)\b/i.test(
      normalizedText
    );
  const hasDrainBlockageConsequence =
    /\b(?:drain\s*ke\s*uper\s*gir|sewer\s*line\s*mein\s*chala\s*gaya|manhole\s*band|gutter\s*choke|drain\s*choke)\b/i.test(
      normalizedText
    );
  if (hasGarbageDefect && hasDrainBlockageConsequence) {
    let foundKwsc = false;
    for (const iss of issues) {
      if (iss.department === 'kwsc') {
        iss.relationship = 'CONSEQUENCE_OF';
        iss.isActionable = false;
        iss.routingDecision = 'SUPPRESSED_CONSEQUENCE';
        iss.reason = 'Drain / gutter choke caused by uncollected garbage dump';
        foundKwsc = true;
      }
    }
    if (!foundKwsc) {
      issues.push({
        id: `iss_${counter++}`,
        department: 'kwsc',
        rawSpan: normalizedText,
        normalizedSpan: normalizedText,
        asset: 'sewer line / manhole',
        defect: 'choke caused by solid waste',
        evidenceStrength: 0.90,
        relationship: 'CONSEQUENCE_OF',
        isActionable: false,
        routingDecision: 'SUPPRESSED_CONSEQUENCE',
        reason: 'Drain / gutter choke caused by uncollected garbage dump',
      });
    }

    let sswmbIssue = issues.find((iss) => iss.department === 'sswmb' && iss.isActionable);
    if (!sswmbIssue) {
      sswmbIssue = {
        id: `iss_${counter++}`,
        department: 'sswmb',
        rawSpan: normalizedText,
        normalizedSpan: normalizedText,
        asset: 'solid waste / kachra kundi',
        defect: 'waste overflowing into drain/sewer',
        evidenceStrength: 0.95,
        relationship: 'CAUSES',
        isActionable: true,
        routingDecision: 'ROUTED',
        reason: 'Root civic defect: Solid waste overflowing into sewer drainage',
      };
      issues.push(sswmbIssue);
    }

    causalChains.push({
      rootDept: 'sswmb',
      consequenceDept: 'kwsc',
      causeIssueId: sswmbIssue.id,
      consequenceIssueId: 'iss_kwsc_consequence',
      connectorText: 'waste overflowing into drain/sewer',
      explanation: 'SSWMB solid waste dump caused drainage / sewer line blockage',
    });
    auditNotes.push("Fahad's Causal Rule: Demoted KWSC (SSWMB solid waste dump caused drainage blockage)");
  }

  // Check 3: If SSGC gas pipeline digging caused road damage (road kharab / khadda)
  const hasGasDigging = /\b(?:gas\s*pipeline|sui\s*gas)\b/i.test(normalizedText) && /\b(?:khod|khudai|excavation|repair\s*ke\s*liye\s*gali\s*khodi)\b/i.test(normalizedText);
  const hasRoadExcavationTrench = /\b(?:road\s*par\s*khadda|sarak\s*tooti|road\s*tooti|khadda\s*chor\s*gaye)\b/i.test(normalizedText);
  if (hasGasDigging && hasRoadExcavationTrench) {
    for (const iss of issues) {
      if (iss.department === 'kmc') {
        iss.relationship = 'CONSEQUENCE_OF';
        iss.isActionable = false;
        iss.routingDecision = 'SUPPRESSED_CONSEQUENCE';
        iss.reason = 'Road trench / pothole left by SSGC pipeline excavation';
      }
    }
    if (!issues.some((iss) => iss.department === 'ssgc' && iss.isActionable)) {
      issues.push({
        id: `iss_${counter++}`,
        department: 'ssgc',
        rawSpan: normalizedText,
        normalizedSpan: normalizedText,
        asset: 'gas pipeline',
        defect: 'excavation',
        evidenceStrength: 0.95,
        relationship: 'CAUSES',
        isActionable: true,
        routingDecision: 'ROUTED',
        reason: 'Root civic defect: Gas pipeline excavation',
      });
    }
  }

  // Check 4: Water leak / sewage overflow causing road damage
  const hasWaterLeakBurst = /\b(?:water\s*board|main\s*line\s*phat|gutter\s*ka\s*pani\s*ubalne|drainage\s*block)\b/i.test(normalizedText);
  const hasRoadErosionConsequence = /\b(?:sadak\s*toot|road\s*toot|asphalt\s*beh|road\s*kharab|sarak\s*par\s*khadday)\b/i.test(normalizedText);
  if (hasWaterLeakBurst && hasRoadErosionConsequence) {
    for (const iss of issues) {
      if (iss.department === 'kmc') {
        iss.relationship = 'CONSEQUENCE_OF';
        iss.isActionable = false;
        iss.routingDecision = 'SUPPRESSED_CONSEQUENCE';
        iss.reason = 'Road damage / asphalt erosion caused by water main burst / sewage overflow';
      }
    }
  }

  // Filter actionable and suppressed departments
  const actionableDepartments = Array.from(
    new Set(issues.filter((iss) => iss.isActionable).map((iss) => iss.department))
  ).sort();

  const suppressedDepartments = Array.from(
    new Set(
      issues
        .filter((iss) => !iss.isActionable && (iss.relationship === 'CONSEQUENCE_OF' || iss.relationship === 'NEGATED' || iss.relationship === 'RESOLVED_OR_HISTORICAL'))
        .map((iss) => iss.department)
    )
  ).filter((d) => !actionableDepartments.includes(d)).sort();

  const locationOnlyDepartments = Array.from(
    new Set(issues.filter((iss) => iss.relationship === 'ASSET_LOCATION_ONLY').map((iss) => iss.department))
  ).filter((d) => !actionableDepartments.includes(d)).sort();

  return {
    rawText,
    normalizedText,
    issues,
    actionableDepartments,
    suppressedDepartments,
    locationOnlyDepartments,
    causalChains,
    isMultiIssue: actionableDepartments.length > 1,
    auditNotes,
  };
}

function hasWaterUtilityDefect(text: string): boolean {
  return /\b(?:water\s*board|main\s*line\s*phat|peenay\s*ka\s*pani\s*band|gutter\s*ubal|sewerage\s*line|manhole)\b/i.test(text);
}
