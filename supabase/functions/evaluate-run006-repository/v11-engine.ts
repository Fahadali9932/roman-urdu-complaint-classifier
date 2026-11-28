/**
 * AWAAZ-E-AWAM — Shared Authoritative V11 AI Classifier & Relation Engine
 * Zero spending, zero paid APIs, purely isomorphic TypeScript.
 * Compatible with Supabase Deno Edge Runtime and Vite browser runtime.
 * Frozen Model: Run004 (SHA-256: E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56)
 */

export type DepartmentId = 'kmc' | 'kwsc' | 'kelectric' | 'ssgc' | 'sswmb' | 'sbca';

export type WaterRelationAnswer = 'independent_supply' | 'power_caused_motor' | 'unsure';
export type LandmarkRelationAnswer = 'landmark_only' | 'asset_also_defective' | 'unsure';
export type HistoricalRelationAnswer = 'already_resolved' | 'still_unresolved' | 'unsure';

export type ClarificationAnswer = { draftText: string } & (
  | { questionId: 'water_power_relation'; choice: WaterRelationAnswer }
  | { questionId: 'landmark_infrastructure_relation'; choice: LandmarkRelationAnswer }
  | { questionId: 'resolved_historical_relation'; choice: HistoricalRelationAnswer }
  | { questionId: 'incomplete_secondary_relation'; details: string }
  | { questionId: 'describe_issue'; details: string }
  | {
      questionId:
        | 'water_power_relation'
        | 'landmark_infrastructure_relation'
        | 'resolved_historical_relation'
        | 'incomplete_secondary_relation'
        | 'describe_issue';
      skip: true;
    }
);

export interface MultiLabelModelArtifact {
  model_version: string;
  model_architecture: string;
  classes: DepartmentId[];
  vocabulary: Record<string, number>;
  idf: number[];
  coef: number[][];
  intercept: number[];
  thresholds: Record<DepartmentId, number>;
  auto_route_confidence_gate: number;
  sublinear_tf: boolean;
  hazard_affirmative_patterns: string[];
  hazard_negation_patterns: string[];
}

export const HAZARD_AFFIRMATIVE_PATTERNS = [
  'chingari',
  'dhamaka',
  'current lagne',
  'taar tooti',
  'gas leak',
  'boo phail',
  'building collapse',
  'chhat girne',
];

export const HAZARD_NEGATION_PATTERNS = [
  'safe hai',
  'khatra nahi',
  'theek hai',
  'koi leak nahi',
];

export function checkHazard(text: string): boolean {
  const low = (text || '').toLowerCase();
  for (const neg of HAZARD_NEGATION_PATTERNS) {
    if (new RegExp(neg, 'i').test(low)) return false;
  }
  for (const aff of HAZARD_AFFIRMATIVE_PATTERNS) {
    if (new RegExp(aff, 'i').test(low)) return true;
  }
  return false;
}


// ==============================================================================
// 1. RELATION ENGINE & ROMAN URDU NORMALIZATION
// ==============================================================================
/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V11.4 Issue-Centric Relation Engine (TypeScript Parity)
 *
 * Implements:
 * - Clause & Span Candidate Extraction preserving original text and character offsets.
 * - IssueCandidate schema with Asset, Defect Predicate, Actionability, and Negation Scope.
 * - Pairwise Relation Graph (SINGLE, CAUSES_CONTEXT_ONLY, INDEPENDENT, SAME_INCIDENT_DIFFERENT_REPAIRS,
 *   MENTION_ONLY, RECIPIENT_ONLY, SPATIAL_PROXIMITY_ONLY, NEGATED, UNCERTAIN).
 * - Affirmative Domain Defect Evidence Gating for all six municipal agencies.
 * - Distinct Review Reason Separation (UNCERTAIN_DEFECT, INCOMPLETE_PUBLIC_LOCATION, OUT_OF_SCOPE).
 */


export type RelationType =
  | 'SINGLE'
  | 'CAUSES_CONTEXT_ONLY'
  | 'INDEPENDENT'
  | 'SAME_INCIDENT_DIFFERENT_REPAIRS'
  | 'MENTION_ONLY'
  | 'RECIPIENT_ONLY'
  | 'SPATIAL_PROXIMITY_ONLY'
  | 'NEGATED'
  | 'UNCERTAIN';

export type AgencyId = 'kmc' | 'kwsc' | 'kelectric' | 'ssgc' | 'sswmb' | 'sbca';

export interface IssueCandidate {
  span_id: string;
  span_start: number;
  span_end: number;
  span_text: string;
  normalized_text: string;
  asset: string;
  defect_evidence: string[];
  is_actionable: boolean;
  negation_scope: boolean;
  is_historical_or_resolved?: boolean;
  is_contextual_landmark?: boolean;
  causal_relationship?: 'root_cause' | 'consequence_of_root' | 'independent' | null;
  causal_target_dept?: DepartmentId;
  decision_rationale?: string;
  responsible_department_candidate?: DepartmentId | null;
  mention_type:
    | 'actionable_defect'
    | 'consequence'
    | 'recipient_mention'
    | 'spatial_landmark'
    | 'negated_mention'
    | 'vague_complaint'
    | 'out_of_scope';
  location_evidence?: string;
  department?: DepartmentId;
  confidence: number;
  reason_codes: string[];
}

export interface RelationEdge {
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  description: string;
}

export interface ComplaintAnalysisResult {
  complaint_id: string;
  sanitized_text: string;
  issue_candidates: IssueCandidate[];
  edges: RelationEdge[];
  proposed_departments: DepartmentId[];
  needs_review: boolean;
  review_reason: string | null;
  missing_public_location: boolean;
  relation_summary: RelationType;
  reason_trace: string[];
}

interface DomainLexicon {
  assets: RegExp[];
  defects: RegExp[];
  denials: RegExp[];
}

export const DOMAIN_EVIDENCE: Record<AgencyId, DomainLexicon> = {
  kmc: {
    assets: [
      /\bsarak\b/i, /\bsadak\b/i, /\broad\b/i, /\bfootpath\b/i, /\bfoot\s*path\b/i,
      /\bstreet\s*lights?\b/i, /\bbatti\b/i, /\bbattiyan\b/i, /\bchauraha\b/i,
      /\bchowk\b/i, /\bbridge\b/i, /\bpul\b/i, /\bunderpass\b/i, /\btiles\b/i,
      /\basphalt\b/i, /\bpavement\b/i, /\bnaali\b/i, /\bnaala\b/i, /\bnullah\b/i,
      /\bstormwater(?:\s*drain)?\b/i, /\bdrainage\s*nala\b/i, /\bdrainage\b/i,
      /\bbarish\s*ka\s*paani\b/i, /\bflyover\b/i, /\bdivider\b/i,
      /\bpedestrian\s*bridge\b/i, /\bfootbridge\b/i, /\bbarsati\s*nala\b/i, /\bbarasati\s*nala\b/i,
    ],
    defects: [
      /\btoot\b/i, /\btooti\b/i, /\btoota\b/i, /\bgaddha\b/i, /\bgaddhay\b/i,
      /\bgaddhe\b/i, /\bgaddhon\b/i, /\bkhadda\b/i, /\bkhadday\b/i,
      /\bkhaddhon\b/i, /\bpothole\b/i, /\bpotholes\b/i, /\bdhans\b/i,
      /\bkharab\b/i, /\bdamage\b/i, /\bdamaged\b/i, /\brepair\b/i,
      /\brebuild\b/i, /\bbana(?:o|ein)\b/i, /\bandhera\b/i,
      /\bencroachment\b/i, /\bqabza\b/i, /\bpatharay\b/i, /\bgaariyan\s*lagti\b/i, /\bgehra\b/i,
      /\bdarya\b/i, /\bubal\s*kar\s*road\b/i, /\bandhera\s*rehta\b/i,
      /\bbattiyan\s*kharab\b/i, /\bband\s*pari\b/i, /\bband\s*hain\b/i,
      /\bpaani\s*khara\b/i, /\bdo\s*foot\s*paani\b/i,
      /\bdrainage\s*nala\s*kaam\s*nahi\s*kar\s*raha\b/i,
      /\bkaam\s*nahi\s*kar\s*raha\b/i, /\bdhakkan\s*(?:gayab|chori|missing)?\b/i,
      /\bexpansion\s*joint\b/i, /\bspeed\s*breaker\b/i, /\bdivider\b/i, /\bblock\s*para\b/i,
      /\bbarsati\s*nala\b/i, /\bnala\s*(?:choke|kachray)\b/i,
      /\bsariya\s*nikal\b/i,
      /\bbarish\b[^.!?;]{0,100}\bpani\s*khara\b/i,
    ],
    denials: [
      /\bsarak\s+(?:bilkul\s+)?theek\b/i,
      /\broad\s+(?:toot|tooti)\s+(?:hui\s+)?na?h?i\b/i,
      /\bsarak\s+(?:toot|tooti)\s+(?:hui\s+)?na?h?i\b/i,
      /\bfootpath\s+kharab\s+(?:hua\s+)?na?h?i\b/i,
      /\b(?:road|sadak|sarak|street|gali|pothole|street\s*lights?)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b/i,
      /\broad\s*(?:theek|sahi)\s*hai\b/i,
      /\b(?:sarak|road)\s+(?:ka\s+masla\s+)?(?:theek|hal|solve)\s+ho\s+gay[ai]\b/i,
      /\broad\s+repair\s+ho\s+chuki\s+hai\b/i,
    ],
  },
  kwsc: {
    assets: [
      /\bpani\b/i, /\bpaani\b/i, /\bwater\b/i, /\bsewer\b/i, /\bsewerage\b/i,
      /\bgutter\b/i, /\bmanhole\b/i, /\bwater\s*main\b/i, /\bwater\s*(?:pipe|pipeline|supply)\b/i,
      /\bsarkari\s*pani\b/i, /\bpublic\s*(?:water|pani|pipe|pipeline)\b/i,
      /\bpipe\b/i, /\bpipeline\b/i, /\bwater\s*board\b/i, /\bkwsc\b/i, /\bkw&sc\b/i,
      /\bdrinking\s*water\b/i, /\btap\b/i, /\bsewage\b/i, /\btanki\b/i, /\btankee\b/i,
      /\bsewer\s*line\b/i, /\bwater\s*supply\s*line\b/i, /\bwater\s*pipeline\b/i,
      /\bdrinking\s*water\s*line\b/i, /\bseptic\s*tank\b/i,
    ],
    defects: [
      /\bleak\b/i, /\bleakage\b/i, /\bphat\b/i, /\bphati\b/i, /\bphatne\b/i,
      /\bburst\b/i, /\boverflow\b/i, /\bubalta\b/i, /\bubal\b/i, /\btalaab\b/i,
      /\bcover\s*missing\b/i, /\blid\b/i, /\bsookhi\b/i, /\bpressure\s*(?:intihai|bohot|bht|nihayat|bohat)?\s*kam\b/i,
      /\bpressure\s*(?:na\s*hone|zero)\b/i, /\bpani\s*(?:bilkul\s*|bhi\s*)?na?h?i\b/i, /\bpani\s*nahi\s*aa\s*raha\b/i, /\bwater\s*nahi\s*aa\s*raha\b/i,
      /\bsupply\s*(?:mukammal|bilkul|poori)?\s*band\b/i, /\bshortage\b/i, /\bchori\b/i, /\bband\s*hai\b/i,
      /\breplace\s*lid\b/i, /\bcovers?\s*missing\b/i, /\bcontaminated\b/i, /\btoxic\s*smell\b/i,
      /\btanki\s*nahi\s*bhar\b/i, /\bsewer\s*line\s*choke\b/i, /\bchoke\b/i,
      /\bsirf\s*hawa\s*aa\s*rahi\b/i, /\bganda\s*pani\b/i, /\bsewage\s*mix\b/i,
      /\bgutter\s+(?:ka\s+)?(?:ganda\s+)?pani\s+beh\s+raha\b/i,
      /\bdhakkan\s*(?:gayab|chori|missing)?\b/i, /\bmanhole\s*ka\s*dhakkan\b/i,
      /\bganda\s*(?:black\s*|kala\s*)?pa?ni\b/i,
      /\b(?:sewer|sewage)\s*(?:ka\s*.*?)?mix\b/i,
      /\bmix\s*(?:ho\s*kar\s*)?aa\s*raha\b/i,
      /\bbadboo(?:dar)?\s*pa?ni\b/i,
      /\bbadboo\s*phail\b/i,
      /\bsewerage\s*line\s*collapse\b/i,
      /\bline\s*collapse\b/i,
      /\bback\s*maar\b/i,
      /\bback\s*flow\b/i,
    ],
    denials: [
      /\bye\s+pani\s+ka\s+masla\s+na?h?i\b/i,
      /\bpani\s+ka\s+koi\s+masla\s+nahi\b/i,
      /\bwater\s+ka\s+masla\s+nahi\b/i,
      /\bpani\s+ka\s+masla\s+(?:solve|hal|theek)\s*ho\s*gaya\b/i,
      /\b(?:pani|water|sewer|sewage|gut?tar)\s*(?:ka|ki|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b/i,
      /\bpehle\s*(?:pani|water)\s*(?:ka\s+)?(?:masla|issue)\s*tha\s*lekin\s*ab\s*(?:theek|hal)\b/i,
      /\bpani\s*(?:ka\s*)?(?:koi\s*)?issue\s*nahi\b/i,
      /\bpani\s*theek\s*hai\b/i,
      /\bpani\s*(?:theek|saaf|sahi)\s*hai\b/i,
    ],
  },
  kelectric: {
    assets: [
      /\bbijli\b/i, /\blight\b/i, /\bcurrent\b/i, /\bfeeder\b/i, /\btransformer\b/i,
      /\btaar\b/i, /\bwire\b/i, /\bpole\b/i, /\bkhamba\b/i, /\bvoltage\b/i, /\bpower\b/i,
      /\bk-?electric\b/i, /\b11kv\b/i, /\bjumper\b/i, /\bcutout\b/i, /\bfuse\b/i,
      /\belectricity\s*pole\b/i, /\bphase\b/i, /\bphases\b/i,
      /\bload\s*shedding\b/i,
    ],
    defects: [
      /\bload\s*shedding\b/i, /\bspark\b/i, /\bsparking\b/i, /\bblast\b/i,
      /\bshort\s*circuit\b/i, /\btrip\b/i, /\blatak\b/i, /\bhanging\b/i,
      /\bjhatkay\b/i, /\bbijli\s*nahi\s*aa\s*rahi\b/i, /\blight\s*nahi\s*aa\s*rahi\b/i,
      /\bbijli\s*nahi\b/i, /\blight\s*nahi\b/i, /\bcurrent\s*nahi\s*(?:aa\s*raha|hai)?\b/i,
      /\blight\s*gayi\b/i, /\blight\s*chali\s*gayi\b/i, /\bbijli\s*chali\s*gayi\b/i,
      /\bbijli\s*gayi\b/i, /\blight\s*band\b/i, /\bbijli\s*band\b/i, /\bbijli\s*gayab\b/i, /\blight\s*gayab\b/i,
      /\bfeeder\s*band\b/i, /\bfeeder\s*fault\b/i,
      /\bfeeder\s*down\b/i, /\bbar\s*bar\s*(?:light|bijli)?\s*ja\s*ra?h?i\b/i,
      /\btransformer\s*(?:ka\s*)?(?:blast|jal\s*gaya|phat\s*gaya|kharab|fault)\b/i,
      /\bfeeder\s*(?:ka\s*)?(?:fault|band)\b/i,
      /\bpower\s*outage\b/i, /\bpower\s*cut\b/i, /\bband\s*hai\b/i, /\bpower\s*supply\s*cut\s*off\b/i,
      /\bzero\s*voltage\b/i, /\blow\s*voltage\b/i, /\bsingle\s*phase\b/i, /\bburnt\b/i, /\bsnapping\b/i,
      /\bphase\s+\d+\s+(?:gayab|band|missing|down|trip|fault)\b/i,
      /\bcorroded\b/i, /\bmight\s*collapse\b/i, /\b(?:2|do)?\s*phase\s*gayab\b/i,
      /\bdim\s*light\b/i, /\bvoltage\s*(?:drop|fluctuation|low|kam|up\s*down|bohat\s*zyada\s*low|nahi\s*aa\s*raha|nahi\s*hai|ka\s*masla)\b/i,
      /\bfeeder\s*trip\b/i, /\btoot\s*(?:kar\s*)?(?:zameen\s*par\s*)?(?:gir|giri)\b/i,
      /\b(?:taar|wire|pole|khamb[ae])\s*(?:bhi\s*)?toot(?:i|a|ay|e)?\b/i,
      /\b(?:pole|khamb[ae]|transformer|taar|wire)\s+(?:gir|tedha|jhuk|tilted|girne)\b/i,
      /\bgir\s*raha\b/i,
      /\bnangi\s*taar\b/i, /\bappliances\s*jalne\b/i, /\bbijli\s*ki\s*wajah\s*se\b/i, /\blight\s*ki\s*wajah\s*se\b/i,
    ],
    denials: [
      /\bpole\s+kharab\s+nahi\b/i,
      /\bbijli\s+ka\s+masla\s+nahi\b/i,
      /\blight\s+theek\s+hai\b/i,
      /\bbijli\s+ka\s+masla\s+(?:solve|hal|theek)\s*ho\s*gaya\b/i,
      /\b(?:bijli|light|current|electricity|voltage|load\s*shedding|transformer|wire|taar)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b/i,
      /\bbijli\s*(?:theek|aa\s*rahi)\s*hai\b/i,
    ],
  },
  ssgc: {
    assets: [
      /\bgas\b/i, /\bsui\s*gas\b/i, /\bgas\s*pipe\b/i, /\bgas\s*pipeline\b/i,
      /\bgas\s*line\b/i, /\bgas\s*mains\b/i, /\bgas\s*meter\b/i, /\bchulha\b/i,
      /\bflame\b/i,
      /\bssgc\b/i, /\bregulator\b/i, /\bdiaphragm\b/i, /\bnatural\s*gas\b/i,
    ],
    defects: [
      /\bboo\b/i, /\bsmell\b/i, /\bhiss\b/i, /\bleak\b/i, /\bleakage\b/i,
      /\bphat\b/i, /\bphati\b/i, /\bphatne\b/i,
      /\bgas\s*(?:bilkul\s*|bhi\s*)?na?h?i\b/i, /\bgas\s*band\b/i, /\bgas\s*gayab\b/i,
      /\bpressure\b/i, /\bchulha\s*nahi\s*jal\b/i, /\bflame\s*nahi\b/i,
      /\baag\s*lagne\b/i, /\bdhamaka\b/i, /\bburst\b/i, /\bkam\s*aa\s*raha\b/i,
      /\bruptured\b/i, /\bwhistling\b/i, /\bblowing\s*out\b/i, /\bchulha\s*band\b/i,
      /\bnahi\s*aa\s*rahi\b/i, /\bsupply\s*(?:mukammal|bilkul|poori)?\s*band\b/i,
      /\bgas\s*(?:na\s*hone|gayab)\b/i, /\bkhana\s*banana\s*namumkin\b/i,
      /\btez\s*boo\b/i, /\bcylinder\s*lana\s*parh\b/i,
      /\bescape\b/i, /\bgas\s*escape\b/i, /\bmachis\b/i,
      /\bflame\s+(?:bilkul\s+)?(?:peel[ae]y?|yellow|low|kam|weak)\b/i,
    ],
    denials: [
      /\bgas\s+ka\s+koi\s+issue\s+nahi\b/i,
      /\bye\s+gas\s+ka\s+masla\s+na?h?i\b/i,
      /\bgas\s+leak\s+nahi\s+hai\b/i,
      /\bgas\s+theek\s+hai\b/i,
      /\bgas\s+(?:theek\s+ho\s+gayi|ka\s+masla\s+(?:solve|hal|theek)\s*ho\s*gaya)\b/i,
      /\b(?:gas|suigas|cylinder|pipeline)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b/i,
      /\bgas\s*(?:theek|aa\s*rahi)\s*hai\b/i,
      /\bgas\s+(?:ki\s+)?supply\s+(?:bilkul\s+)?(?:theek|sahi)\s+hai\b/i,
    ],
  },
  sswmb: {
    assets: [
      /\bkachra\b/i, /\bkachray\b/i, /\bkura\b/i, /\btrash\b/i, /\bgarbage\b/i,
      /\bdustbin\b/i, /\bdustbins\b/i, /\bbin\b/i, /\bbins\b/i, /\bdhabay\b/i,
      /\bdead\s*animal\b/i, /\bkachra\s*kundi\b/i, /\bsswmb\b/i,
      /\bwaste\b/i, /\bdumpster\b/i, /\bmurda\s*janwar\b/i, /\blaash\b/i,
      /\bcarcass\b/i, /\billegal\s*(?:garbage\s*)?dump\b/i, /\bdump\b/i,
      /\bgarbage\s*dump\b/i, /\bdumping\s*site\b/i,
    ],
    defects: [
      /\bnahi\s*uth(?:a|aya|ti|te)?\b/i, /\bnahi\s*uthta\b/i,
      /\buthta\s*nahi\b/i, /\buthaya\s*nahi\b/i, /\bpara\s*hai\b/i, /\bpara\s*hua\b/i,
      /\bpari\s*hai\b/i, /\bparay\s*hain\b/i, /\bpare\s*hain\b/i, /\bparha\s*hai\b/i,
      /\bparhi\s*hai\b/i, /\bdher\b/i, /\boverflow\b/i, /\bbikhra\b/i, /\bgir\s*raha\b/i,
      /\bbadbu\b/i, /\bbadboo\b/i, /\bbad-?boo\b/i, /\bmachar\b/i, /\bstolen\b/i, /\bmissing\b/i,
      /\bdisinfect\b/i, /\baccumulation\b/i, /\bjama\b/i,
      /\brefusing\s*to\s*enter\b/i, /\bclogging\b/i, /\brotting\s*odor\b/i,
      /\bclean\s*bin\b/i, /\bgari\s*nahi\s*aa?i\b/i, /\bgaari\s*nahi\s*aa?i\b/i,
      /\bdump\s*ban\s*chuka\b/i, /\bkutte\s*nooch\b/i, /\bsaans\s*lena\s*mushkil\b/i,
      /\baag\s*laga\b/i, /\bdhuwan\b/i, /\btaffun\b/i, /\bsafai\s*(?:bilkul\s*|bhi\s*)?na?h?i\b/i,
      /\billegal\s+(?:(?:garbage|waste|trash)\s+)?dump(?:ing)?\b/i,
      /\b(?:garbage|waste|trash)\s+dump(?:ing)?\s+(?:is\s+)?illegal\b/i,
    ],
    denials: [
      /\bkachra\s+(?:bilkul\s+)?theek\s+se\s+uth\s+gaya\b/i,
      /\bkachray\s+ka\s+masla\s+nahi\b/i,
      /\b(?:kachra|garbage|safai|waste|trash|kunda)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b/i,
      /\bsafai\s*(?:theek|ho\s*chuki)\s*hai\b/i,
    ],
  },
  sbca: {
    assets: [
      /\bbuilding\b/i, /\bimarat\b/i, /\bfloor\b/i, /\bfloors\b/i, /\bchajja\b/i,
      /\bbalcony\b/i, /\bpillar\b/i, /\bpillars\b/i, /\bwall\b/i, /\bdeewar\b/i,
      /\bfoundation\b/i, /\bfoundations\b/i, /\bbasement\b/i, /\bexcavation\b/i,
      /\bplot\b/i, /\bdukan\b/i, /\bcommercial\b/i, /\bcos\b/i,
      /\bcompulsory\s*open\s*space\b/i, /\bsbca\b/i, /\bconstruction\b/i,
      /\bpremises\b/i, /\bbungalow\b/i, /\bopen\s*space\b/i, /\bcos\s*par\b/i,
      /\bunsafe\s*building\b/i,
      /\b(?:chhat|chhajja|godam|warehouse|shops?|rooms?|lanter|plazas?|manzil)\b/i,
    ],
    defects: [
      /\billegal\b/i, /\bgheir\s*qanooni\b/i, /\bbina\s*permit\b/i, /\bbina\s*noc\b/i,
      /\bextra\s*floor\b/i, /\bcrack\b/i, /\bcracks\b/i, /\bdarar\b/i, /\bdaraar\b/i,
      /\bcollapse\b/i, /\bgirne\s*ka\s*khatra\b/i, /\bbowing\b/i, /\bdilapidated\b/i,
      /\bwithout\s*shoring\b/i, /\bseal\s*shuda\b/i, /\bcode\s*violation\b/i,
      /\bviolation\b/i, /\bevacuation\b/i, /\baccess\s*block\b/i,
      /\bstop-work\b/i, /\bseal\s*the\s*premises\b/i, /\bschool\b/i, /\bhospital\b/i,
      /\bkhasta\s*haal\b/i, /\bgirne\s*wali\b/i, /\bsealing\s*order\b/i,
      /\bdobara\s*illegal\s*kaam\b/i, /\bdemolition\s*vibration\b/i,
      /\bkhatarnak\s*dara?ar\b/i, /\bunsafe\b/i,
      /\bghair\s*qanooni\b/i, /\bbaghair\s+shoring\b/i, /\bset[- ]back\s+(?:rules\s+)?violat\w*\b/i,
    ],
    denials: [
      /\bbuilding\s+theek\s+hai\b/i,
      /\billegal\s+kaam\s+nahi\b/i,
      /\b(?:illegal\s*construction|builder|manzila|dhamaka|demolition)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b/i,
    ],
  },
};

const RECIPIENT_PATTERNS: Array<[RegExp, DepartmentId | 'any']> = [
  [/\bk-?electric\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b/i, 'kelectric'],
  [/\bkmc\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b/i, 'kmc'],
  [/\b(?:kw&?sc|water\s*board)\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b/i, 'kwsc'],
  [/\bssgc\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b/i, 'ssgc'],
  [/\bsswmb\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b/i, 'sswmb'],
  [/\bsbca\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b/i, 'sbca'],
  [/\bletter\s+likha\s+tha\b/i, 'any'],
];

const CONSEQUENCE_INDICATORS = [
  /\bjis\s*(?:ki\s*)?wajah\s*se\b/i,
  /\bus\s*(?:ki\s*)?wajah\s*se\b/i,
  /\bis\s*liye\b/i,
  /\bis\s*wajah\s*se\b/i,
  /\bhone\s*se\b/i,
  /\bpedestrian\s*access\s*block\b/i,
];

const VAGUE_PATTERNS = [
  /\bajeeb\s*masla\s*hai\b/i,
  /\bkoi\s*dekh\s*le\b/i,
  /\byahan\s*koi\s*masla\s*hai\b/i,
  /\bbohot\s*masla\s*hai\b/i,
  /\bhalaat\s*bohot\s*kharab\b/i,
];

const OUT_OF_SCOPE_PATTERNS = [
  /\bpadosi\s*ghar\s*ke\s*andar\b/i,
  /\bghar\s*ke\s*andar\s*mujhe\s*pareshan\b/i,
  /\bfamily\s*dispute\b/i,
  /\bshauhar\s*biwi\b/i,
  /\b(?:makan\s*malik|kiraya|rent\s*barha|ghar\s*khali|tenant|landlord|bina\s*notice\s*rent)\b/i,
  /\b(?:cyber\s*crime|fraud\s*caller|atm\s*se\s*paise|paise\s*deduct|bank\s*account)\b/i,
  /\b(?:traffic\s*police|challan\s*kaat|mobile\s*cheen|snatching|dacoity|wardatein)\b/i,
  /\b(?:mobile|phone|wallet|bike|motorcycle|gaari|car|paise|paisa)\s+(?:ki\s+|ka\s+)?chori\b/i,
  /\b(?:school\s*management|fees\s*barha|private\s*school\s*fees)\b/i,
  /\b(?:padosi\s*ke\s*kuttay|kutte\s*ne\s*kaat)\b/i,
];

// Distinguish a public network fault from a private motor symptom.
function hasIndependentWaterFault(text: string): boolean {
  return /\b(sewer|gutter|sookhi|supply\s*band)\b/i.test(text) ||
    (/\b(?:pipe|pipeline|water\s*main|water\s*line|pani\s*ki\s*line)\b/i.test(text) &&
      /\b(?:leak|leakage|phat|phati|burst|choke|contaminated)\b/i.test(text));
}

const LOCATION_INDICATORS = [
  /\b(gali\s*(?:number|no)?\s*\d+|block\s*\d+|sector\s*\d+|phase\s*\d+|street\s*\d+)\b/i,
  /\b(clifton|saddar|nazimabad|korangi|baldia|jauhar|gulshan|north\s*karachi|site|lyari|malir|fb\s*area|liaquatabad)\b/i,
  /\b(chowrangi|chowk|road\s*number|market|bridge|mor|stop|plaza)\b/i,
];

export const HISTORICAL_RESOLVED_PATTERNS = [
  /\b(?:theek|hal|solve)\s*(?:ho\s*gay[ai]|ho\s*chuki|ho\s*chuka)\b/i,
  /\bpehle\s+.*?\s+(?:tha|thi)\s+lekin\s+ab\s+theek\b/i,
  /\bpehle\b[^.?!;]{0,50}\b(?:tha|thi)\b/i,
  /\bpehle\s+toot\w*\s+(?:hui\s+)?thi\b/i,
  /\brepair\s+ho\s+chuki\b/i,
  /\bsafai\s+ho\s+chuki\b/i,
  /\buth\s+gaya\b/i,
  /\bmasla\s+theek\s+ho\s+gaya\b/i,
];

export function normalizeRomanUrduText(text: string): string {
  let t = (text || '').toLowerCase();
  // Recognize complete joined civic expressions, with explicit negation retained.
  t = t.replace(/\b(bijli|bijlee|bjl|gas|gass|pani|paani|pni)(nahi|nhi|nai)(a{1,2}(?:rahi|rhi|raha|rha))\b/g, '$1 nahi $3');
  t = t.replace(/\b(pani|paani|pni|bijli|gas)(aaraha|aarahi|aarha|aarhi)\b/g, '$1 $2');
  t = t.replace(/\b(road|sarak|sadak|gutter|pipeline|transformer|building|imarat)(kharab|khrab|toot|choke|leak)\b/g, '$1 $2');
  t = t.replace(/\bdistributionline\b/g, 'distribution line');
  t = t.replace(/\b(bijli|gas|pani|paani|kachra)(nahi|nhi|nai)(?:\b)/g, '$1 nahi');
  // Only expand known elongated full civic words, not arbitrary words or names.
  t = t.replace(/\bgas{3,}\b/g, 'gas').replace(/\bpa{2,}ni{2,}\b/g, 'pani')
    .replace(/\bbi{2,}jli{1,}\b/g, 'bijli').replace(/\bkachra{3,}\b/g, 'kachra');
  // Bounded, whole-token expansions only: no arbitrary substring splitting.
  t = t.replace(/\b(se|ke|ki|ka|aur|yahan|mein|bhi)(gas|gass|pani|paani|bijli|road|sarak|gutter|kachra|transformer|basement|building|imarat|supply|barsati|waste|pipe|pipeline|line|dhakkan|khamba|pole|chulha)\b/g, '$1 $2');
  t = t.replace(/\b(gas|gass|pani|paani|bijli|road|sarak|gutter|kachra|transformer|basement|building|imarat|supply|flame|pipe|pipeline|line|wire|taar|pole|chulha)(par|ke|ki|ka|mein|band|gayab|leak|leek|burst|phat|phati|toot|tooti|choke|kharab)\b/g, '$1 $2');
  t = t.replace(/\b(aur|sath)(sath|hi)\b/g, '$1 $2');
  t = t.replace(/\b(aik)(sath)\b/g, '$1 $2');
  t = t.replace(/\b(do|teen|chaar)(baray|alag|maslon|maslay)\b/g, '$1 $2');
  t = t.replace(/\b(hai|hain|tha|thi)(aur|lekin|magar)\b/g, '$1 $2');
  t = t.replace(/\b(ho|nahi)(rahi|raha|rahe|chal|jal)\b/g, '$1 $2');
  t = t.replace(/\b(theek|kharab|gayab|missing|gaya|gayi|gaddha|khadda|toot|toota|tooti|choke|burst|leak)(hai|hain|tha|thi)\b/g, '$1 $2');
  t = t.replace(/\bgass\b/g, 'gas');
  t = t.replace(/\b(?:transfamer|trnsfrmr)\b/g, 'transformer');
  t = t.replace(/\bsadak\b/g, 'sarak');
  t = t.replace(/\bubhal\b/g, 'ubal');
  t = t.replace(/\bubhalta\b/g, 'ubalta');
  t = t.replace(/\b(nhi|nai|naheen|nhn)\b/g, 'nahi');
  t = t.replace(/\b(aarhi|arhi|aarahi|arahi)\b/g, 'aa rahi');
  t = t.replace(/\b(aarha|arha|aaraha|araha)\b/g, 'aa raha');
  t = t.replace(/\b(waja|vajha|vaja)\b/g, 'wajah');
  t = t.replace(/\b(boht|bht|bohat|bhat)\b/g, 'bohot');
  t = t.replace(/\b(choolha|chula|chulh+a)\b/g, 'chulha');
  t = t.replace(/\b(gadda|gadha)\b/g, 'gaddha');
  t = t.replace(/\b(khrab|xrab|khara+b)\b/g, 'kharab');
  t = t.replace(/\b(too+t|tooti|toota)\b/g, 'toot');
  t = t.replace(/\b(phat+a|phati|phtti)\b/g, 'phat');
  t = t.replace(/\b(leee+k|leek)\b/g, 'leak');
  t = t.replace(/\b(dhamak+a|dhmaka)\b/g, 'dhamaka');
  t = t.replace(/\b(dara+r|dararein|draren)\b/g, 'daraar');
  t = t.replace(/\b(dumper|damper)\b/g, 'dumper');
  t = t.replace(/\b(sweeper|swpr)\b/g, 'sweeper');
  t = t.replace(/\b(voltage|voltg)\b/g, 'voltage');
  t = t.replace(/\b(hy|\bh\b)\b/g, 'hai');
  t = t.replace(/\b(rhi|rhin)\b/g, 'rahi');
  t = t.replace(/\b(rha|rhe|rhay)\b/g, 'rahe');
  t = t.replace(/\b(zada|zyadh)\b/g, 'zyada');
  t = t.replace(/\b(hoi\s*v|hoi\s*hai|ho\s*gae|ho\s*gai)\b/g, 'hui hai');
  t = t.replace(/\b(gy|gai)\b/g, 'gayi');
  t = t.replace(/\bkrdo\b/g, 'karo');
  t = t.replace(/\b(badbu|bad-?boo)\b/g, 'badboo');
  t = t.replace(/\bbhee\b/g, 'bhi');
  t = t.replace(/\bpaani\b/g, 'pani');
  t = t.replace(/\b(pni|paney)\b/g, 'pani');
  t = t.replace(/\b(bjl|bijlee)\b/g, 'bijli');
  t = t.replace(/\b(srk|sark)\b/g, 'sarak');
  return t;
}

const LANDMARK_NOUNS: Record<AgencyId, string> = {
  kelectric: 'transformer|transfamer|khamb(?:a|ay|e)|pole|feeder|electricity pole',
  kwsc: 'water pump|water tank|water pipe|water board|pani ki tanki|sewer|gutter|manhole',
  ssgc: 'gas meter|gas pipeline|gas pipe|gas line|gas regulator',
  kmc: 'road|sarak|bridge|pul|flyover|footpath',
  sswmb: 'garbage dump|dustbin|kachra kundi|dumpster',
  sbca: 'building|imarat|construction site|plaza',
};
const SPATIAL_TAIL = 'ke\\s+(?:bilkul\\s+)?(?:paas|qareeb|samne|samnay|barabar|peeche|peechay|kinare|kinaray|agay|ooper|neechay)(?:\\s+(?:mein|me|par))?';
const LANDMARK_MASKS = Object.fromEntries(Object.entries(LANDMARK_NOUNS).map(([dept, asset]) => [dept,
  new RegExp(`\\b(?:(?:k-?electric|kwsc|ssgc|sswmb|sbca|kmc)\\s+ke\\s+)?(?:${asset})(?:\\s+aur\\s+(?:${asset}))*\\s+${SPATIAL_TAIL}\\b`, 'g')
])) as Record<AgencyId, RegExp>;
const COORDINATED_LANDMARK_TAIL = new RegExp(`^(?:${Object.values(LANDMARK_NOUNS).join('|')})\\s+${SPATIAL_TAIL}\\b`, 'i');

/** Evidence-only projection: never mutate the original narrative or span offsets.
 * A numbered address, addressee, or another utility's named pipe is not a fault.
 * Mask only tightly scoped context phrases so a separate real asset survives.
 */
export function domainEvidenceText(normalized: string, dept: DepartmentId): string {
  let evidence = normalized.replace(
    /\b(?:k-?electric|kmc|kw&?sc|water\s*board|ssgc|sswmb|sbca)\s+(?:(?:walon|staff|team|ko)\s+)*(?:bhi\s+)?(?:dekhein|dekhen|dekhain|sunein|sunain|bataya|kaha|ittila|letter\s+likha)\b/g,
    ' '
  );
  const landmarkMask = LANDMARK_MASKS[dept as AgencyId];
  if (landmarkMask) evidence = evidence.replace(landmarkMask, (match, offset: number, source: string) => {
    // A direct defect immediately after the location is not a neutral mention.
    const tail = source.slice(offset + match.length).trimStart();
    return /^(?:sparks?|sparking|leak|leakage|phat|burst|toot|gaddh[ae]|potholes?|blast|current|aag\s+laga)\b/i.test(tail) ? match : ' ';
  });
  if (dept === 'kelectric') {
    evidence = evidence.replace(/\bphase\s+\d+\b(?!\s*(?:gayab|band|missing|down|trip|fault|nahi\s+aa))/g, ' ');
  } else if (dept === 'kwsc') {
    evidence = evidence.replace(/\bwater\s+pump\s+chowrangi\b/g, ' ')
      // Water inside a gas-owned conduit is a gas fault, not a second water fault.
      .replace(/\bgas\s+(?:(?:ka|ki|ke)\s+)?(?:distribution\s+)?(?:pipeline|pipe|line|mains?)\s+(?:mein|me|main)\s+(?:pani|water)\b/g, ' ')
      .replace(/\bgas\s+(?:(?:ka|ki|ke)\s+)?(?:distribution\s+)?(?:pipeline|pipe|line|mains?)\b/g, ' ');
    if (/\bbarish\b/i.test(evidence) && /\b(?:road|sarak|drainage|naali|naala|nala)\b/i.test(evidence)) {
      // Standing rainwater is not an independent water-supply or sewer fault.
      evidence = evidence.replace(/\bpani\s+khara\b/g, ' ');
    }
  } else if (dept === 'kmc') {
    evidence = evidence.replace(/\b(?:main\s+)?(?:road|sarak|bridge|pul|footpath)(?:\s+(?:number|no\.?|#)\s*\d+)?\s+(?:ke\s+(?:paas|qareeb)|par|mein|me)(?:\s+(?:par|mein|me))*\s+(?=(?:bijli|taar|wire|transformer|feeder|gas|(?:pani|water)\s+(?:ki\s+)?(?:pipe|pipeline|line|main|supply)|sewer|gutter|kachra|kachray|garbage|waste|building|imarat)\b)/g, ' ');
    if (/\b(?:sewer|gutter|sewerage)\b/i.test(normalized) && !/\b(?:gaddh[ae]|khadd[ae]|toot|dhans|pothole)\b/i.test(normalized)) {
      evidence = evidence.replace(/\bdarya\b/g, ' ');
    }
  }
  return evidence;
}

export function segmentSpansWithOffsets(text: string): Array<[number, number, string]> {
  const raw = text;
  if (!raw.trim()) return [];

  const splitterRegex =
    /(?:,\s*(?:aur\s+(?:is\s+ke\s+)?sath\s+sath|sath\s+sath\s+(?:doosri\s+taraf|mazeed)?|mazeed\s+(?:yeh\s+ke|teesra|chotha)?|doosra\s+(?:bara\s+)?masla|teesra\s+(?:bara\s+)?(?:masla|nuqs|issue)|chotha\s+(?:bara\s+)?(?:masla|nuqs|azaab|issue)|aakhri\s+(?:masla|chotha\s+azaab|nuqs)|pados\s+wali\s+gali\s+mein|doosri\s+taraf|aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein)\b|\b(?:aur\s+(?:is\s+ke\s+)?sath\s+sath|sath\s+sath\s+(?:doosri\s+taraf|mazeed)?|mazeed\s+(?:yeh\s+ke|teesra|chotha)?|doosra\s+(?:bara\s+)?masla|teesra\s+(?:bara\s+)?(?:masla|nuqs|issue)|chotha\s+(?:bara\s+)?(?:masla|nuqs|azaab|issue)|aakhri\s+(?:masla|chotha\s+azaab|nuqs)|pados\s+wali\s+gali\s+mein|doosri\s+taraf|aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein|aur\s+saath\s+wali|lekin|magar|but|however|balke|balkay)\b|(?<!\d)\.(?!\d)\s*|[?!;]+\s*|\n+)/gi;

  const spans: Array<[number, number, string]> = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = splitterRegex.exec(raw)) !== null) {
    const start = match.index;
    const end = splitterRegex.lastIndex;
    if (start > lastEnd) {
      const chunk = raw.slice(lastEnd, start).trim();
      if (chunk) {
        spans.push([lastEnd, start, raw.slice(lastEnd, start)]);
      }
    }
    lastEnd = end;
  }

  if (lastEnd < raw.length) {
    const chunk = raw.slice(lastEnd).trim();
    if (chunk) {
      spans.push([lastEnd, raw.length, raw.slice(lastEnd)]);
    }
  }

  // Sub-split on 'aur' if coordinating two different department assets
  const refinedSpans: Array<[number, number, string]> = [];
  for (const [sStart, sEnd, sText] of spans) {
    const aurRegex = /\s+aur\s+/gi;
    const aurMatches: Array<[number, number]> = [];
    let am: RegExpExecArray | null;
    while ((am = aurRegex.exec(sText)) !== null) {
      aurMatches.push([am.index, aurRegex.lastIndex]);
    }

    if (aurMatches.length === 0) {
      refinedSpans.push([sStart, sEnd, sText]);
      continue;
    }

    let subLast = 0;
    const subChunks: Array<[number, number, string]> = [];
    for (const [aStart, aEnd] of aurMatches) {
      const leftPart = sText.slice(subLast, aStart);
      const rightPart = sText.slice(aEnd);
      if (COORDINATED_LANDMARK_TAIL.test(rightPart.trim())) continue;

      const leftDepts = quickDeptCheck(leftPart);
      const rightDepts = quickDeptCheck(rightPart);

      if (leftDepts.size > 0 && rightDepts.size > 0 && !areSetsEqual(leftDepts, rightDepts)) {
        subChunks.push([sStart + subLast, sStart + aStart, leftPart]);
        subLast = aEnd;
      }
    }

    if (subLast < sText.length) {
      subChunks.push([sStart + subLast, sEnd, sText.slice(subLast)]);
    }

    if (subChunks.length > 0) {
      refinedSpans.push(...subChunks);
    } else {
      refinedSpans.push([sStart, sEnd, sText]);
    }
  }

  return refinedSpans.length > 0 ? refinedSpans : [[0, raw.length, raw]];
}

function quickDeptCheck(clause: string): Set<DepartmentId> {
  const found = new Set<DepartmentId>();
  const cNorm = normalizeRomanUrduText(clause);
  if (/\b(gas|sui\s*gas|natural\s*gas)\b/i.test(cNorm)) {
    found.add('ssgc');
  }
  for (const [dept, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
    if (dept === 'kwsc' && /\b(gas|sui\s*gas)\b/i.test(cNorm) && !/\b(pani|water|sewer|gutter)\b/i.test(cNorm)) {
      continue;
    }
    const evidenceText = domainEvidenceText(cNorm, dept);
    for (const pat of lex.assets) {
      if (pat.test(evidenceText)) {
        found.add(dept);
        break;
      }
    }
  }
  return found;
}

function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function analyzeComplaintRelationAware(
  text: string,
  complaintId: string = 'comp_test'
): ComplaintAnalysisResult {
  const sanitized = (text || '').trim();
  const normFull = normalizeRomanUrduText(sanitized);
  const reasonTrace: string[] = [];

  // 1. Out of Scope Check
  for (const pat of OUT_OF_SCOPE_PATTERNS) {
    if (pat.test(normFull)) {
      const candidate: IssueCandidate = {
        span_id: 'iss_0',
        span_start: 0,
        span_end: sanitized.length,
        span_text: sanitized,
        normalized_text: normFull,
        asset: 'private_dwelling',
        defect_evidence: ['padosi pareshan kar raha hai'],
        is_actionable: false,
        negation_scope: false,
        is_historical_or_resolved: false,
        is_contextual_landmark: false,
        causal_relationship: null,
        decision_rationale: 'Citizen grievance concerns private dispute outside civic municipal jurisdiction',
        responsible_department_candidate: null,
        mention_type: 'out_of_scope',
        confidence: 0,
        reason_codes: ['OUT_OF_SCOPE_PRIVATE_DISPUTE'],
      };
      return {
        complaint_id: complaintId,
        sanitized_text: sanitized,
        issue_candidates: [candidate],
        edges: [
          {
            source_id: 'iss_0',
            target_id: 'iss_0',
            relation_type: 'UNCERTAIN',
            description: 'Out of scope private complaint',
          },
        ],
        proposed_departments: [],
        needs_review: true,
        review_reason: 'OUT_OF_SCOPE',
        missing_public_location: false,
        relation_summary: 'UNCERTAIN',
        reason_trace: ['Citizen complaint concerns private dispute outside civic municipal jurisdiction'],
      };
    }
  }

  // 2. Vague / Unroutable Check
  const isVague = VAGUE_PATTERNS.some((pat) => pat.test(normFull));
  const hasAnyAsset = (Object.values(DOMAIN_EVIDENCE) as DomainLexicon[]).some((lex) =>
    lex.assets.some((pat) => pat.test(normFull))
  );
  if (isVague && !hasAnyAsset) {
    const candidate: IssueCandidate = {
      span_id: 'iss_0',
      span_start: 0,
      span_end: sanitized.length,
      span_text: sanitized,
      normalized_text: normFull,
      asset: 'none',
      defect_evidence: [],
      is_actionable: false,
      negation_scope: false,
      is_historical_or_resolved: false,
      is_contextual_landmark: false,
      causal_relationship: null,
      decision_rationale: 'Input lacks actionable defect predicate or asset mention',
      responsible_department_candidate: null,
      mention_type: 'vague_complaint',
      confidence: 0,
      reason_codes: ['VAGUE_NO_DEFECT_SPECIFIED'],
    };
    return {
      complaint_id: complaintId,
      sanitized_text: sanitized,
      issue_candidates: [candidate],
      edges: [
        {
          source_id: 'iss_0',
          target_id: 'iss_0',
          relation_type: 'UNCERTAIN',
          description: 'Vague complaint without knowable defect',
        },
      ],
      proposed_departments: [],
      needs_review: true,
      review_reason: 'UNCERTAIN_DEFECT',
      missing_public_location: true,
      relation_summary: 'UNCERTAIN',
      reason_trace: ['Input lacks actionable defect predicate or asset mention'],
    };
  }

  // 3. Shared Incident with Multiple Distinct Repairs
  const isSharedIncident =
    (/\bpipe\s*(?:bhi\s*)?replace\b/i.test(normFull) && /\broad\s*(?:bhi\s*)?(?:dubara\s*)?banao\b/i.test(normFull)) ||
    /\bdono\s*pipe\s*aur\s*road\s*repair\b/i.test(normFull);

  // 4. Spatial Proximity Only
  const isSpatialProximityOnly =
    /\bpole\s*ke\s*paas\s*kachra\b/i.test(normFull) &&
    (/\bpole\s*kharab\s*nahi\b/i.test(normFull) || !/\b(spark|taar|wire|current|blast)\b/i.test(normFull));

  // 5. Recipient / Addressee Only
  let recipientDept: DepartmentId | 'any' | null = null;
  for (const [pat, dTarget] of RECIPIENT_PATTERNS) {
    if (pat.test(normFull)) {
      recipientDept = dTarget;
      break;
    }
  }
  const hasRecipientPreamble =
    recipientDept !== null &&
    (/\blekin\s+hamari\s+complaint\b/i.test(normFull) ||
      /\bpar\s+asal\s+issue\b/i.test(normFull) ||
      /\bko\s+bhi\s+bataya\s+tha\b/i.test(normFull) ||
      /\bko\s+letter\s+likha\s+tha\b/i.test(normFull));

  // 6. Explicit Negations
  const negatedDepts = new Set<DepartmentId>();
  for (const [dept, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
    if (lex.denials.some((den) => den.test(normFull))) {
      negatedDepts.add(dept);
    }
  }

  // 7. Causal Consequence Indicators
  const hasCausalConsequence = CONSEQUENCE_INDICATORS.some((pat) => pat.test(normFull));
  const hasElectricEvidence = DOMAIN_EVIDENCE.kelectric.assets.some((pat) => pat.test(domainEvidenceText(normFull, 'kelectric')));
  const hasWaterMotorSymptom =
    hasElectricEvidence &&
    /\b(?:pani\s+ki\s+)?motor\s+(?:band|nahi\s*chal|ruk\s*gayi|kharab)\b|\bwater\s*pump\s*band\b/i.test(
      normFull
    );

  // 8. Span-by-span Issue Classification
  const edges: RelationEdge[] = [];
  const spanTuples = segmentSpansWithOffsets(sanitized);
  const candidates: IssueCandidate[] = [];

  for (let idx = 0; idx < spanTuples.length; idx++) {
    const [sStart, sEnd, sRaw] = spanTuples[idx];
    const sNorm = normalizeRomanUrduText(sRaw);

    for (const [dept, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
      const evidenceText = domainEvidenceText(sNorm, dept);
      // A denial or historical/resolved mention applies to this clause, not a later independent fault.
      const isHistMatch = HISTORICAL_RESOLVED_PATTERNS.some((hp) => hp.test(sNorm));
      const isDenialMatch = lex.denials.some((den) => den.test(sNorm));
      const hasDeptAssetInClause = lex.assets.some((p) => p.test(sNorm));

      if (isDenialMatch || (isHistMatch && hasDeptAssetInClause)) {
        const isHist = isHistMatch;
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: dept,
          defect_evidence: [isHist ? 'historical_or_resolved' : 'explicitly_negated'],
          is_actionable: false,
          negation_scope: true,
          is_historical_or_resolved: isHist,
          is_contextual_landmark: false,
          causal_relationship: null,
          decision_rationale: isHist
            ? `Past issue for ${dept.toUpperCase()} reported resolved/repaired; not currently actionable`
            : `Explicit denial of active defect for ${dept.toUpperCase()}`,
          responsible_department_candidate: dept,
          mention_type: 'negated_mention',
          department: dept,
          confidence: 0,
          reason_codes: [isHist ? `HISTORICAL_RESOLVED_${dept.toUpperCase()}` : `EXPLICIT_DENIAL_${dept.toUpperCase()}`],
        });
        continue;
      }

      // Recipient
      if (hasRecipientPreamble && recipientDept === dept &&
          !lex.defects.some((pat) => pat.test(sNorm))) {
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: dept,
          defect_evidence: ['recipient_mention_only'],
          is_actionable: false,
          negation_scope: false,
          is_historical_or_resolved: false,
          is_contextual_landmark: false,
          causal_relationship: null,
          decision_rationale: `Agency ${dept.toUpperCase()} mentioned as recipient/addressee only, not an active defect`,
          responsible_department_candidate: dept,
          mention_type: 'recipient_mention',
          department: dept,
          confidence: 0,
          reason_codes: [`RECIPIENT_ONLY_${dept.toUpperCase()}`],
        });
        continue;
      }

      // Spatial Landmark
      const isLandmarkCandidate =
        (isSpatialProximityOnly && dept === 'kelectric') ||
        (LANDMARK_MASKS[dept] &&
          new RegExp(LANDMARK_MASKS[dept].source, 'i').test(sNorm) &&
          !lex.defects.some((pat) => pat.test(sNorm)));

      if (isLandmarkCandidate) {
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: dept === 'kelectric' ? 'pole' : dept,
          defect_evidence: ['spatial_landmark_only'],
          is_actionable: false,
          negation_scope: false,
          is_historical_or_resolved: false,
          is_contextual_landmark: true,
          causal_relationship: null,
          decision_rationale: `Asset for ${dept.toUpperCase()} mentioned solely as spatial reference/landmark; no active physical defect`,
          responsible_department_candidate: dept,
          mention_type: 'spatial_landmark',
          department: dept,
          confidence: 0,
          reason_codes: ['SPATIAL_LANDMARK_WITHOUT_DEFECT'],
        });
        continue;
      }

      // Consequence: Motor symptom from electric outage
      if (
        dept === 'kwsc' &&
        hasWaterMotorSymptom &&
        !hasIndependentWaterFault(sNorm)
      ) {
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: 'water_motor',
          defect_evidence: ['consequence_of_power_outage'],
          is_actionable: false,
          negation_scope: false,
          is_historical_or_resolved: false,
          is_contextual_landmark: false,
          causal_relationship: 'consequence_of_root',
          causal_target_dept: 'kelectric',
          decision_rationale: 'Private water pump/motor non-operation caused by electric power outage; root cause is electric',
          responsible_department_candidate: dept,
          mention_type: 'consequence',
          department: dept,
          confidence: 0,
          reason_codes: ['CONSEQUENCE_WATER_MOTOR_SYMPTOM'],
        });
        continue;
      }

      // Spatial preamble for KMC: "footpath aur road par [Location] ... [other dept issue]"
      if (dept === 'kmc' && /^(?:footpath\s+aur\s+road\s+par|sarak\s+par|road\s+par)\b/i.test(sNorm)) {
        const dHits = lex.defects.filter((pat) => pat.test(sNorm));
        if (dHits.length === 0) {
          continue;
        }
      }

      // Location: "water pump chowrangi" is location, not kwsc asset
      if (dept === 'kwsc' && /\bwater\s*pump\s*chowrangi\b/i.test(sNorm) && !/\b(pani|paani|sewer|gutter|supply|manhole|leak|leakage|burst|choke)\b/i.test(sNorm)) {
        continue;
      }

      // Gas pipe check for KWSC
      if (dept === 'kwsc' && /\b(gas|sui\s*gas)\b/i.test(sNorm) && !/\b(pani|water|sewer|gutter)\b/i.test(sNorm)) {
        continue;
      }

      // SSGC must have gas tokens
      if (dept === 'ssgc' && !/\b(gas|chulha|flame|sui\s*gas|natural\s*gas)\b/i.test(normFull)) {
        continue;
      }

      // If taar/wire is present in K-Electric, don't confuse KMC road toot with taar toot
      if (dept === 'kmc' && /\b(taar|wire|bijli)\b/i.test(sNorm) && !/\b(sarak|sadak|road|footpath|street\s*lights?|naali|naala|drainage)\b/i.test(sNorm)) {
        continue;
      }

      // Check matches
      const assetHits = lex.assets.filter((pat) => pat.test(evidenceText));
      const defectHits = lex.defects.filter((pat) => pat.test(evidenceText));

      if (assetHits.length > 0 && defectHits.length > 0) {
        const isCausalRoot = hasCausalConsequence && (dept === 'kelectric' || dept === 'kwsc');
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: dept,
          defect_evidence: defectHits.map((d) => d.source),
          is_actionable: true,
          negation_scope: false,
          is_historical_or_resolved: false,
          is_contextual_landmark: false,
          causal_relationship: isCausalRoot ? 'root_cause' : 'independent',
          decision_rationale: `Affirmative active municipal defect identified for ${dept.toUpperCase()}`,
          responsible_department_candidate: dept,
          mention_type: 'actionable_defect',
          department: dept,
          confidence: 0.95,
          reason_codes: [`AFFIRMATIVE_DEFECT_${dept.toUpperCase()}`],
        });
        reasonTrace.push(`Actionable defect for ${dept.toUpperCase()} in span '${sRaw.trim()}'`);
      }
    }
  }

  // 9. Extract actionable departments
  let actionableDepts: DepartmentId[] = Array.from(
    new Set(
      candidates
        .filter((c) => c.is_actionable && c.department)
        .map((c) => c.department as DepartmentId)
    )
  ).sort();

  // Full-text fallback
  if (actionableDepts.length === 0) {
    for (const [dept, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
      if (negatedDepts.has(dept)) continue;
      if (hasRecipientPreamble && recipientDept === dept) continue;
      if (isSpatialProximityOnly && dept === 'kelectric') continue;
      if (
        dept === 'kwsc' &&
        hasWaterMotorSymptom &&
        !hasIndependentWaterFault(normFull)
      ) {
        continue;
      }
      if (dept === 'kmc' && DOMAIN_EVIDENCE.kmc.denials.some((den) => den.test(normFull))) {
        if (!/\b(drainage\s*nala|drainage|street\s*lights?|naali|naala|nullah)\b/i.test(normFull)) {
          continue;
        }
      }
      if (dept === 'kmc' && /\b(wire|taar)\b/i.test(normFull) && !/\b(gaddha|khadda|toot|dhans|pothole|sarak|sadak|road|footpath|street\s*lights?|naali|naala|drainage)\b/i.test(normFull)) {
        continue;
      }
      if (dept === 'kwsc' && /\bwater\s*pump\s*chowrangi\b/i.test(normFull) && !/\b(pani|paani|sewer|gutter|supply|manhole|leak|leakage|burst|choke)\b/i.test(normFull)) {
        continue;
      }
      if (dept === 'ssgc' && !/\b(gas|chulha|flame|sui\s*gas|natural\s*gas)\b/i.test(normFull)) continue;

      const evidenceText = domainEvidenceText(normFull, dept);
      const aHits = lex.assets.filter((pat) => pat.test(evidenceText));
      let dHits = lex.defects.filter((pat) => pat.test(evidenceText));
      if (dept === 'kelectric' && hasWaterMotorSymptom && aHits.length > 0 && dHits.length === 0) {
        dHits = [/power_outage_causing_water_motor_failure/i];
      }
      if (aHits.length > 0 && dHits.length > 0) {
        const isCausalRoot = hasCausalConsequence && (dept === 'kelectric' || dept === 'kwsc');
        actionableDepts.push(dept);
        candidates.push({
          span_id: `iss_fb_${dept}`,
          span_start: 0,
          span_end: sanitized.length,
          span_text: sanitized,
          normalized_text: normFull,
          asset: dept,
          defect_evidence: dHits.map((d) => d.source),
          is_actionable: true,
          negation_scope: false,
          is_historical_or_resolved: false,
          is_contextual_landmark: false,
          causal_relationship: isCausalRoot ? 'root_cause' : 'independent',
          decision_rationale: `Affirmative municipal defect identified from full complaint text for ${dept.toUpperCase()}`,
          responsible_department_candidate: dept,
          mention_type: 'actionable_defect',
          department: dept,
          confidence: 0.9,
          reason_codes: [`FULL_TEXT_AFFIRMATIVE_DEFECT_${dept.toUpperCase()}`],
        });
      }
    }
    actionableDepts = Array.from(new Set(actionableDepts)).sort();
  }

  // Causal consequence between distinct departments linked by explicit causal connectors
  const CAUSAL_CONNECTOR_REGEX =
    /\b(?:jis\s*(?:ki\s*)?wajah\s*se|us\s*(?:ki\s*)?wajah\s*se|is\s*(?:wajah\s*se|i?s?\s*liye)|isi\s*liye|ke\s*sabab|ke\s*natijay\s*mein)\b/i;
  const causalMatch = CAUSAL_CONNECTOR_REGEX.exec(normFull);
  if (causalMatch && !isSharedIncident) {
    const preText = normFull.slice(0, causalMatch.index);
    const postRaw = normFull.slice(causalMatch.index + causalMatch[0].length);
    const consequenceClause = postRaw.split(/[.\n;]|\b(?:lekin|magar|aur\s+alag\s+se|alag\s+se)\b/i)[0];
    const consequenceEnd = causalMatch.index + causalMatch[0].length + consequenceClause.length;

    // Find departments with affirmative defects in preText vs consequenceClause
    const deptsInPre = new Set<AgencyId>();
    const deptsInConsequence = new Set<AgencyId>();
    for (const [d, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
      const preEv = domainEvidenceText(preText, d);
      if (lex.assets.some((p) => p.test(preEv)) && lex.defects.some((p) => p.test(preEv))) {
        deptsInPre.add(d);
      }
      const consEv = domainEvidenceText(consequenceClause, d);
      if (lex.assets.some((p) => p.test(consEv)) && lex.defects.some((p) => p.test(consEv))) {
        deptsInConsequence.add(d);
      }
    }

    // Demote only candidates within the consequence clause for deptsInConsequence not in preText
    for (const postDept of deptsInConsequence) {
      if (!deptsInPre.has(postDept)) {
        for (const preDept of deptsInPre) {
          for (const cand of candidates) {
            if (
              cand.department === postDept &&
              cand.is_actionable &&
              cand.span_start < consequenceEnd
            ) {
              cand.is_actionable = false;
              cand.mention_type = 'consequence';
              cand.causal_relationship = 'consequence_of_root';
              cand.causal_target_dept = preDept;
              cand.decision_rationale = `Defect for ${postDept.toUpperCase()} is a stated consequence of ${preDept.toUpperCase()} root fault`;
            }
          }
          edges.push({
            source_id: preDept,
            target_id: postDept,
            relation_type: 'CAUSES_CONTEXT_ONLY',
            description: `${postDept.toUpperCase()} is a stated consequence caused by ${preDept.toUpperCase()}`,
          });
        }
      }
    }
    // Recompute actionableDepts after causal consequence demotion
    actionableDepts = Array.from(
      new Set(
        candidates
          .filter((c) => c.is_actionable && c.department)
          .map((c) => c.department as DepartmentId)
      )
    ).sort();
  }

  // 10. Relational Summary and Edge Building
  let relationSummary: RelationType = 'UNCERTAIN';

  if (isSharedIncident && actionableDepts.length >= 2) {
    relationSummary = 'SAME_INCIDENT_DIFFERENT_REPAIRS';
    for (let i = 0; i < actionableDepts.length; i++) {
      for (let j = i + 1; j < actionableDepts.length; j++) {
        edges.push({
          source_id: actionableDepts[i],
          target_id: actionableDepts[j],
          relation_type: 'SAME_INCIDENT_DIFFERENT_REPAIRS',
          description: 'Shared physical incident requires separate distinct repairs',
        });
      }
    }
  } else if (actionableDepts.length > 1) {
    relationSummary = 'INDEPENDENT';
    for (let i = 0; i < actionableDepts.length; i++) {
      for (let j = i + 1; j < actionableDepts.length; j++) {
        edges.push({
          source_id: actionableDepts[i],
          target_id: actionableDepts[j],
          relation_type: 'INDEPENDENT',
          description: 'Independent civic defects requiring separate municipal teams',
        });
      }
    }
  } else if (actionableDepts.length === 1) {
    if (isSpatialProximityOnly) {
      relationSummary = 'SPATIAL_PROXIMITY_ONLY';
      edges.push({
        source_id: actionableDepts[0],
        target_id: 'spatial',
        relation_type: 'SPATIAL_PROXIMITY_ONLY',
        description: 'Asset mentioned solely as landmark',
      });
    } else if (hasRecipientPreamble) {
      relationSummary = 'RECIPIENT_ONLY';
      edges.push({
        source_id: actionableDepts[0],
        target_id: 'recipient',
        relation_type: 'RECIPIENT_ONLY',
        description: 'Other department mentioned as recipient',
      });
    } else if (hasCausalConsequence || edges.some((e) => e.relation_type === 'CAUSES_CONTEXT_ONLY')) {
      relationSummary = 'CAUSES_CONTEXT_ONLY';
      if (!edges.some((e) => e.relation_type === 'CAUSES_CONTEXT_ONLY')) {
        edges.push({
          source_id: actionableDepts[0],
          target_id: 'consequence',
          relation_type: 'CAUSES_CONTEXT_ONLY',
          description: 'Root civic cause with non-actionable symptom',
        });
      }
    } else if (negatedDepts.size > 0) {
      relationSummary = 'NEGATED';
      edges.push({
        source_id: actionableDepts[0],
        target_id: 'negated',
        relation_type: 'NEGATED',
        description: 'Alternative department explicitly negated',
      });
    } else {
      relationSummary = 'SINGLE';
      edges.push({
        source_id: actionableDepts[0],
        target_id: actionableDepts[0],
        relation_type: 'SINGLE',
        description: 'Single distinct municipal defect',
      });
    }
  } else {
    relationSummary = 'UNCERTAIN';
    edges.push({
      source_id: 'none',
      target_id: 'none',
      relation_type: 'UNCERTAIN',
      description: 'No actionable civic defect identified',
    });
  }

  // 11. Location Completeness
  const hasSpecificLocation = LOCATION_INDICATORS.some((pat) => pat.test(normFull));
  const missingLocation = !hasSpecificLocation && actionableDepts.length > 0;
  if (missingLocation) {
    reasonTrace.push(
      'Complaint contains actionable defect but lacks specific public street/landmark details (INCOMPLETE_PUBLIC_LOCATION)'
    );
  }

  // 12. Review Gate & Secondary Issue Completeness Check
  let needsReview = actionableDepts.length === 0;
  let reviewReason = needsReview ? 'UNCERTAIN_DEFECT' : null;

  if (actionableDepts.length >= 1 && spanTuples.length > 1) {
    for (let sIdx = 0; sIdx < spanTuples.length; sIdx++) {
      const [, , stRaw] = spanTuples[sIdx];
      const stNorm = normalizeRomanUrduText(stRaw);
      const spanGrounded = candidates.some(
        (c) =>
          c.span_id.startsWith(`iss_${sIdx}_`) &&
          c.is_actionable &&
          c.department &&
          actionableDepts.includes(c.department)
      );
      if (!spanGrounded) {
        const isBenign = candidates.some(
          (c) =>
            c.span_id.startsWith(`iss_${sIdx}_`) &&
            ['consequence', 'recipient_mention', 'spatial_landmark', 'negated_mention'].includes(
              c.mention_type
            )
        );
        if (!isBenign) {
          // A declared additional issue with no grounded asset/defect is ambiguous,
          // even when its text is longer than a dangling terminal connector.
          const precedingSeparator = sIdx > 0
            ? sanitized.slice(spanTuples[sIdx - 1][1], spanTuples[sIdx][0]) : '';
          if (/\b(?:alag\s+se|doosra\s+masla|is\s+ke\s+ilawa)\b/i.test(precedingSeparator)) {
            needsReview = true;
            reviewReason = 'INCOMPLETE_SECONDARY_ISSUE';
            reasonTrace.push('An explicitly declared secondary issue lacks a grounded municipal fault.');
            break;
          }
          const unroutedDeptsInSpan = new Set<string>();
          for (const [otherDept, oLex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
            if (!actionableDepts.includes(otherDept) && !oLex.denials.some((den) => den.test(stNorm))) {
              const evidenceText = domainEvidenceText(stNorm, otherDept);
              const hasAsset = oLex.assets.some((pat) => pat.test(evidenceText));
              const hasDefect = oLex.defects.some((pat) => pat.test(evidenceText));
              if (hasAsset && hasDefect) {
                unroutedDeptsInSpan.add(otherDept);
              }
            }
          }
          if (unroutedDeptsInSpan.size > 0) {
            needsReview = true;
            reviewReason = 'POSSIBLE_UNROUTED_SECONDARY_ISSUE';
            reasonTrace.push(
              `Secondary clause contains unrouted civic defect indicators for ${Array.from(unroutedDeptsInSpan).sort().join(', ')}; flagged for human triage (POSSIBLE_UNROUTED_SECONDARY_ISSUE)`
            );
            break;
          }
        }
      }
    }
  }

  if (/\b(?:aur\s+alag(?:\s+se)?|alag\s+se|doosra\s+masla(?:\s+ye\s+hai\s+ke)?|is\s+ke\s+ilawa|lekin|magar)\W*$/i.test(normFull)) {
    needsReview = true;
    reviewReason = 'INCOMPLETE_SECONDARY_ISSUE';
    reasonTrace.push('Complaint ends at an unfinished issue connector; a missing fault cannot be inferred.');
  }

  return {
    complaint_id: complaintId,
    sanitized_text: sanitized,
    issue_candidates: candidates,
    edges,
    proposed_departments: actionableDepts,
    needs_review: needsReview,
    review_reason: reviewReason,
    missing_public_location: missingLocation,
    relation_summary: relationSummary,
    reason_trace: reasonTrace,
  };
}


// ==============================================================================
// 2. V11 INFERENCE ADAPTER & STATISTICAL CLASSIFIER
// ==============================================================================
/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V11 Compatible Inference Adapter
 *
 * Implements:
 * - Dual-track Word (1-2) + Character WB (3-5) Sublinear TF-IDF extraction matching scikit-learn.
 * - 3-Fold Platt calibrated sigmoid ensemble inference from candidate_model.json.
 * - CivicRelationResolver rule engine for contextual disambiguation and consequence suppression.
 * - Safe conversion to MultiLabelModelArtifact (V10 contract) for backward compatibility.
 *
 * The frozen Run004 artifact is used by local V11 diagnostics and the development
 * test-mode complaint flow. Normal Supabase submission uses its existing pipeline.
 * Candidate Run005/Run006 artifacts are never promoted by this adapter.
 */





const DECISION_POLICY = 'v11_hybrid_ml_relation_v9';

// A road named as the location can support KMC only with evidence of a fault
// in that clause, or another municipal asset outside the address phrase.
const ROAD_LOCATION = /\b(?:road|sarak|sadak|foot\s*path|bridge|pul|chowk|chauraha|flyover|underpass)(?:\s+(?:number|no\.?|#)\s*\d+)?\s+(?:par|pe|per|mein|me|ke\s+(?:paas|qareeb))\b/g;

function hasDomainKeywordSupport(lowText: string, dept: DepartmentId, hasGroundedIssue: boolean): boolean {
  const lexicon = DOMAIN_EVIDENCE[dept as keyof typeof DOMAIN_EVIDENCE];
  if (!lexicon) return true;
  const clauses = segmentSpansWithOffsets(lowText).map(([, , clause]) => clause);
  const assetClauses = clauses
    .map(clause => domainEvidenceText(clause, dept))
    .filter((clause) => lexicon.assets.some((p) => p.test(clause)));
  if (assetClauses.length) {
    // A neutral observation must not inherit a fault from an unrelated clause.
    return assetClauses.some((clause) => {
      if (lexicon.defects.some((pattern) => pattern.test(clause))) return true;
      if (/\b(?:dekha|dekhi|dekhe)\s+tha\b/i.test(clause)) return false;
      // Speculative disjunctive uncertainty ("pata nahi X hai ya Y") without defect does not support ML routing
      if (/\b(?:pata|maloom|samajh)\s*na?h?i\b[^.!?;]{0,60}\b(?:ya|or)\b/i.test(clause)) return false;
      if (
        /\b(?:pata|maloom|samajh)\s*na?h?i\b.*\b(?:kya|kahan|kis)\s+(?:masla|kharabi|wajah|fault)\b/i.test(clause) &&
        !lexicon.defects.some((p) => p.test(clause))
      )
        return false;
      if (dept !== 'kmc') return true;
      const outsideAddress = clause.replace(ROAD_LOCATION, ' ');
      return lexicon.assets.some((pattern) => pattern.test(outsideAddress));
    });
  }
  // A generic defect word alone is insufficient to add a second department.
  const contextOnlyAsset = clauses.some(clause => lexicon.assets.some(p => p.test(clause)));
  return !hasGroundedIssue && !contextOnlyAsset && lexicon.defects.some((p) => p.test(domainEvidenceText(lowText, dept)));
}

export interface V11RelationAwareResult {
  departments: DepartmentId[];
  probabilities: Record<DepartmentId, number>;
  rawProbabilities: Record<DepartmentId, number>;
  relation: RelationType;
  issueCandidates: IssueCandidate[];
  edges: RelationEdge[];
  needsReview: boolean;
  reviewReason: string | null;
  missingPublicLocation: boolean;
  notes: string[];
  modelVersion?: string;
  decisionPolicy?: string;
  mlSelectedDepartments?: DepartmentId[];
  clauseSelectedDepartments?: DepartmentId[];
  ruleSelectedDepartments?: DepartmentId[];
  suppressedDepartments?: DepartmentId[];
  finalReason?: string;
  thresholds?: Record<string, number>;
  decisionRecords?: any[];
}

export interface V11ClassifierCalibratedFold {
  coef: number[];
  intercept: number[];
  a: number;
  b: number;
}

export interface V11DepartmentClassifier {
  calibrated?: V11ClassifierCalibratedFold[];
  coef?: number[];
  intercept?: number[];
}

export interface V11ModelArtifact {
  version: string;
  departments: DepartmentId[];
  thresholds: Record<DepartmentId, number>;
  word_vocab: Record<string, number>;
  word_idf: number[];
  char_vocab: Record<string, number>;
  char_idf: number[];
  classifiers: V11DepartmentClassifier[];
  sha256_checksum?: string;
}

export interface V11ClassificationResult {
  departments: DepartmentId[];
  probabilities: Record<DepartmentId, number>;
  rawProbabilities: Record<DepartmentId, number>;
  notes: string[];
}

/**
 * Extracts dual Word (1-2) + Character WB (3-5) TF-IDF features identically to scikit-learn.
 */
export function extractV11Features(
  text: string,
  artifact: V11ModelArtifact
): Float64Array {
  // Training uses strip_accents='unicode'. Normal Roman Urdu accents and
  // compatibility forms must not generate different features at inference time.
  const textLower = (text || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').trim();
  const wordVocabSize = Object.keys(artifact.word_vocab).length;
  const charVocabSize = Object.keys(artifact.char_vocab).length;
  const totalFeatures = wordVocabSize + charVocabSize;
  const featureVector = new Float64Array(totalFeatures);

  // 1. Word n-grams (1-2) using scikit-learn token_pattern r"(?u)\b\w\w+\b"
  const wordTokens = textLower.match(/[\p{L}\p{N}_]{2,}/gu) || [];
  const wordCounts = new Map<number, number>();

  for (let i = 0; i < wordTokens.length; i++) {
    // Unigram
    const uni = wordTokens[i];
    const uniIdx = artifact.word_vocab[uni];
    if (typeof uniIdx === 'number') {
      wordCounts.set(uniIdx, (wordCounts.get(uniIdx) ?? 0) + 1);
    }

    // Bigram
    if (i < wordTokens.length - 1) {
      const bi = `${uni} ${wordTokens[i + 1]}`;
      const biIdx = artifact.word_vocab[bi];
      if (typeof biIdx === 'number') {
        wordCounts.set(biIdx, (wordCounts.get(biIdx) ?? 0) + 1);
      }
    }
  }

  let wordNormSq = 0;
  for (const [col, count] of wordCounts.entries()) {
    const tf = 1.0 + Math.log(count); // sublinear_tf
    const val = tf * artifact.word_idf[col];
    featureVector[col] = val;
    wordNormSq += val * val;
  }

  const wordNorm = Math.sqrt(wordNormSq);
  if (wordNorm > 0) {
    for (const col of wordCounts.keys()) {
      featureVector[col] /= wordNorm;
    }
  }

  // 2. Character WB n-grams (3-5) within whitespace-delimited word tokens
  const charOffset = wordVocabSize;
  const wsTokens = textLower.split(/\s+/).filter(Boolean);
  const charCounts = new Map<number, number>();

  for (const word of wsTokens) {
    const padded = Array.from(` ${word} `);
    const len = padded.length;
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= len - n; i++) {
        const sub = padded.slice(i, i + n).join('');
        const col = artifact.char_vocab[sub];
        if (typeof col === 'number') {
          charCounts.set(col, (charCounts.get(col) ?? 0) + 1);
        }
      }
    }
  }

  let charNormSq = 0;
  for (const [col, count] of charCounts.entries()) {
    const tf = 1.0 + Math.log(count);
    const val = tf * artifact.char_idf[col];
    featureVector[charOffset + col] = val;
    charNormSq += val * val;
  }

  const charNorm = Math.sqrt(charNormSq);
  if (charNorm > 0) {
    for (const col of charCounts.keys()) {
      featureVector[charOffset + col] /= charNorm;
    }
  }

  return featureVector;
}

/**
 * Computes raw calibrated probabilities using 3-fold Platt sigmoid scaling.
 *
 * For each fold k:
 *   df_k = dot(coef_k, x) + intercept_k
 *   prob_k = 1 / (1 + exp(a_k * df_k + b_k))
 *   prob = mean(prob_k)
 */
export function predictV11RawProbabilities(
  features: Float64Array,
  artifact: V11ModelArtifact
): Record<DepartmentId, number> {
  const result: Partial<Record<DepartmentId, number>> = {};

  for (let j = 0; j < artifact.departments.length; j++) {
    const dept = artifact.departments[j];
    const deptClf = artifact.classifiers[j];
    if (deptClf.calibrated && deptClf.calibrated.length > 0) {
      const folds = deptClf.calibrated;
      let sumProb = 0;

      for (let k = 0; k < folds.length; k++) {
        const fold = folds[k];
        const coef = fold.coef;
        let df = fold.intercept[0] ?? 0;

        for (let i = 0; i < coef.length; i++) {
          const fi = features[i];
          if (fi !== 0) {
            df += coef[i] * fi;
          }
        }

        // Sigmoid calibration: expit(-(a * df + b)) = 1 / (1 + exp(a * df + b))
        const z = fold.a * df + fold.b;
        const prob = 1 / (1 + Math.exp(z));
        sumProb += prob;
      }

      result[dept] = sumProb / folds.length;
    } else if (deptClf.coef && deptClf.intercept) {
      // Direct LogisticRegression OneVsRest inference (V11.4.2 Champion run_003)
      let score = deptClf.intercept[0] ?? 0;
      const coef = deptClf.coef;
      for (let i = 0; i < coef.length; i++) {
        const fi = features[i];
        if (fi !== 0) {
          score += coef[i] * fi;
        }
      }
      result[dept] = 1 / (1 + Math.exp(-score));
    } else {
      result[dept] = 0;
    }
  }

  return result as Record<DepartmentId, number>;
}

/**
 * Disambiguation and consequence suppression engine mirroring Python CivicRelationResolver.
 */
export function resolveV11CivicRelations(
  text: string,
  rawProbs: Record<DepartmentId, number>
): {
  resolvedProbs: Record<DepartmentId, number>;
  notes: string[];
} {
  const probs: Record<DepartmentId, number> = { ...rawProbs };
  const notes: string[] = [];
  const low = (text || '').toLowerCase();

  // 0. Boost English civic loanwords
  const englishPower = /\b(?:load\s*shedding|power\s*cut|continuous\s+power\s+cut|feeder\s+down|feeder\s+tripping)\b/i;
  const englishBuilding = /\b(?:stop-work\s*order|seal\s+the\s+premises|unauthorized\s+construction|demolition\s+order)\b/i;

  if (englishPower.test(low)) {
    probs.kelectric = Math.max(probs.kelectric ?? 0, 0.85);
    notes.push('Boosted K-Electric: English power terms detected');
  }

  if (englishBuilding.test(low)) {
    probs.sbca = Math.max(probs.sbca ?? 0, 0.85);
    notes.push('Boosted SBCA: English building control terms detected');
  }

  // 1. Water pressure vs Gas pressure
  const waterPressure =
    /\b(?:water|pani|paani)(?:\s+supply)?(?:\s+ka)?\s+(?:intihai\s+|bohot\s+|bht\s+)?(?:low|kam|zero)\s+pressure\b|\b(?:water|pani|paani)\s+(?:ka\s+)?pressure\b|\bpressure\s+(?:intihai\s+)?kam\s+hai\s+(?:pani|motor)\b|\bpressure\s+intihai\s+kam\s+hai\s+motor\b/i;
  const gasEvidence = /\b(?:gas|sui\s*gas|chulha|stove|gas\s*meter|flame|methane)\b/i;

  if (waterPressure.test(low) && !gasEvidence.test(low)) {
    if ((probs.ssgc ?? 0) > 0.1) {
      probs.ssgc = 0.05;
      notes.push("Suppressed SSGC: 'pressure' refers to water supply, not gas");
    }
  }

  // 2. Building excavation vs Gas pipeline fracture
  const buildingExcavation =
    /\b(?:basement|foundation|shoring|building|house|makan|wall|deewar|pillar)\b.*\b(?:excavation|khudai)\b|\b(?:excavation|khudai)\b.*\b(?:basement|foundation|shoring|building|house|wall|deewar|crack)\b/i;

  if (buildingExcavation.test(low) && !gasEvidence.test(low)) {
    if ((probs.ssgc ?? 0) > 0.1) {
      probs.ssgc = 0.05;
      notes.push('Suppressed SSGC: Excavation relates to building construction, no gas pipeline mentioned');
    }
  }

  // 3. Spatial location (wire on footpath/road) without road defect
  const electricalHazard = /\b(?:wire|taar|taaren|cable|pole|khamba|transformer|current|sparks?|snapping)\b/i;
  const roadStructuralDefect =
    /\b(?:khadda|khadday|gadda|gadday|pothole|potholes|toota|tooti|toote|tuta|tuti|tute|toot\s*phoot|tut\s*phut|damaged?|crater|dhans|asphalt|carpeting|encroachment|thela|vendor)\b|\b(?:road|sarak|sadak|rod|gali|foot\s*path)\b[^\.\,\;]{0,40}\b(?:toot|tut)\b|\b(?:toot|tut)\b[^\.\,\;]{0,40}\b(?:road|sarak|sadak|rod|gali|foot\s*path)\b/i;

  if (electricalHazard.test(low)) {
    if (!roadStructuralDefect.test(low)) {
      if ((probs.kmc ?? 0) > 0.15) {
        probs.kmc = 0.05;
        notes.push('Suppressed KMC: Road/footpath is location of electrical hazard without structural road defect');
      }
    }
  }

  // 4. SSWMB false positive without garbage evidence
  const wasteEvidence =
    /\b(?:kachra|kachray|garbage|trash|safai|dustbin|dhair|dumper|sweeper|malba|kura|dumpster|dumped|waste)\b/i;

  if ((probs.sswmb ?? 0) > 0.2 && !wasteEvidence.test(low)) {
    probs.sswmb = 0.05;
    notes.push('Suppressed SSWMB: No affirmative waste/garbage tokens found');
  }

  // 5. Power outage causing domestic water motor failure
  const motorConsequence = /\b(?:pani\s+ki\s+)?motor\s+(?:nahi\s+chal\s+rahi|band\s+hai|ruk\s+gai)\b|\bwater\s+pump\s+band\b/i;
  if ((probs.kelectric ?? 0) > 0.4 && motorConsequence.test(low)) {
    if (!/\b(?:sarkari|main|public)\s+(?:water\s+)?(?:line|pipe|pipeline)\b|\bpani\s+ki\s+supply\s+band\b/i.test(low)) {
      if ((probs.kwsc ?? 0) > 0.2) {
        probs.kwsc = Math.min(probs.kwsc ?? 0, 0.15);
        notes.push('Suppressed KWSC: Domestic water motor failure is downstream symptom of power outage');
      }
    }
  }

  // 6. Sewer overflow causing traffic slowdown
  const trafficConsequence = /\b(?:traffic\s+jam|gariyan\s+phans\s+rahi|gariyan\s+ruk\s+rahi)\b/i;
  const roadActualDamage =
    /\b(?:sarak|road)\s+(?:dhans\s+gai|toot\s+gai|baith\s+gai|khadday\s+par\s+gaye|parat\s+ukhad\s+gai)\b|\b(?:pothole|khadda|gadda|crater|asphalt|footpath\s+toot)\b/i;

  if ((probs.kwsc ?? 0) > 0.4 && trafficConsequence.test(low)) {
    if (!roadActualDamage.test(low) && !/\b(?:sarak|road)\s+(?:kharab|tooti)\b/i.test(low)) {
      if ((probs.kmc ?? 0) > 0.2) {
        probs.kmc = Math.min(probs.kmc ?? 0, 0.15);
        notes.push('Suppressed KMC: Traffic congestion is downstream effect of sewer overflow');
      }
    }
  }

  // 7. Water line burst making road wet vs damaging road
  const wetRoadOnly = /\broad\s+geeli\s+hai\b|\bsarak\s+par\s+pani\s+hai\b/i;
  if ((probs.kwsc ?? 0) > 0.4 && wetRoadOnly.test(low)) {
    if (!roadActualDamage.test(low)) {
      probs.kmc = Math.min(probs.kmc ?? 0, 0.15);
      notes.push('Suppressed KMC: Road is wet from water pipe leak without structural pavement damage');
    }
  }

  // 8. Explicit defect negations
  const explicitDeptDenials: Array<{ dept: DepartmentId; pattern: RegExp }> = [
    {
      dept: 'ssgc',
      pattern: /\b(?:ye\s+)?gas\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bgas\s+bilkul\s+theek\s+hai\b/i,
    },
    {
      dept: 'kmc',
      pattern: /\b(?:ye\s+)?(?:sarak|road|sadak)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\b(?:sarak|road|sadak)\s+(?:bilkul\s+)?theek\s+hai\b|\b(?:koi\s+)?(?:khadda|gadda|damage)\s+nahi\b|\broad\s+kharab\s+nahi\b/i,
    },
    {
      dept: 'kelectric',
      pattern: /\b(?:ye\s+)?(?:bijli|light|electric)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\btaar\s+(?:safe|theek)\s+hai\b|\bwire\s+se\s+khatra\s+nahi\b/i,
    },
    {
      dept: 'kwsc',
      pattern: /\b(?:ye\s+)?(?:pani|water|sewer|gutter)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bpaani\s+theek\s+hai\b/i,
    },
    {
      dept: 'sswmb',
      pattern: /\b(?:ye\s+)?(?:kachra|garbage|safai)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bkachra\s+nahi\s+hai\b|\bsafai\s+theek\s+hai\b/i,
    },
    {
      dept: 'sbca',
      pattern: /\b(?:ye\s+)?(?:building|construction)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bbuilding\s+theek\s+hai\b|\bkoi\s+crack\s+nahi\b/i,
    },
  ];

  for (const { dept, pattern } of explicitDeptDenials) {
    if (pattern.test(low)) {
      probs[dept] = 0.05;
      notes.push(`Suppressed ${dept}: Explicit denial of issue or confirmed defect-free`);
    }
  }

  const gasLeakDenial = /\bgas\s+(?:leak|leek)\s+nahi\b|\bboo\s+(?:bilkul\s+)?nahi\b|\bkoi\s+leakage\s+nahi\b/i;
  if (gasLeakDenial.test(low)) {
    notes.push('Noted: Gas leak explicitly denied');
  }

  // 9. Mention of agency name as recipient without grievance
  const recipientMentions: Array<{ dept: DepartmentId; mention: RegExp; fault: RegExp }> = [
    {
      dept: 'kelectric',
      mention: /\bk-?electric\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b/i,
      fault: /\b(?:bijli|taar|voltage|transformer|light|current|feeder|meter|power|load\s*shedding)\b/i,
    },
    {
      dept: 'kmc',
      mention: /\bkmc\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b/i,
      fault: /\b(?:sarak|road|sadak|footpath|flyover|bridge|khadda|pothole|underpass|street\s*light)\b/i,
    },
    {
      dept: 'kwsc',
      mention: /\b(?:kwsc|kwsb|water\s+board)\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b/i,
      fault: /\b(?:pani|paani|water|sewer|sewerage|gutter|gatar|line\s+phat|pipe|drain)\b/i,
    },
    {
      dept: 'ssgc',
      mention: /\bssgc\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b/i,
      fault: /\b(?:gas|sui\s*gas|cylinder|chulha|pipeline|meter)\b/i,
    },
    {
      dept: 'sswmb',
      mention: /\bsswmb\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b/i,
      fault: /\b(?:kachra|garbage|trash|safai|dustbin|dhair|dumper|sweeper)\b/i,
    },
    {
      dept: 'sbca',
      mention: /\bsbca\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b/i,
      fault: /\b(?:building|imarat|construction|floor|chath|daraar|crack|demolition)\b/i,
    },
  ];

  for (const { dept, mention, fault } of recipientMentions) {
    if (mention.test(low) && !fault.test(low)) {
      probs[dept] = 0.05;
      notes.push(`Suppressed ${dept}: Entity addressed as message recipient, not fault owner`);
    }
  }

  // 10. Affirmative domain evidence gating for SSGC and SBCA
  const buildingEvidence =
    /\b(?:building|imarat|construction|floor|chath|daraar|crack|demolition|basement|pillar|plaza|makan|plot|premises|shutter)\b/i;

  if ((probs.ssgc ?? 0) > 0.20 && !gasEvidence.test(low)) {
    probs.ssgc = 0.05;
    notes.push('Suppressed SSGC: No affirmative gas infrastructure tokens found');
  }

  if ((probs.sbca ?? 0) > 0.20 && !buildingEvidence.test(low)) {
    probs.sbca = 0.05;
    notes.push('Suppressed SBCA: No affirmative building control tokens found');
  }

  return { resolvedProbs: probs, notes };
}

/**
 * End-to-end V11 candidate inference.
 */
export function classifyV11(
  text: string,
  artifact: V11ModelArtifact
): V11ClassificationResult {
  const features = extractV11Features(text, artifact);
  const rawProbabilities = predictV11RawProbabilities(features, artifact);
  const { resolvedProbs, notes } = resolveV11CivicRelations(text, rawProbabilities);

  const selectedDepartments: DepartmentId[] = [];
  for (const dept of artifact.departments) {
    const thresh = artifact.thresholds[dept] ?? 0.5;
    if (resolvedProbs[dept] >= thresh) {
      selectedDepartments.push(dept);
    }
  }

  return {
    departments: selectedDepartments,
    probabilities: resolvedProbs,
    rawProbabilities,
    notes,
  };
}

/**
 * Converts a V11 candidate artifact into the V10 MultiLabelModelArtifact format.
 *
 * Scikit-learn Platt scaling evaluates:
 *   prob = 1 / (1 + exp(a * df + b)) = 1 / (1 + exp(a * (w · x + b0) + b))
 *
 * For linear equivalence, the effective weight vector and intercept are:
 *   w_eff = -a * w
 *   b_eff = -(a * b0 + b)
 *
 * For an ensemble of K folds, the average effective linear model is:
 *   w_bar = mean(w_eff)
 *   b_bar = mean(b_eff)
 */
export function convertV11ToMultiLabelModelArtifact(
  v11: V11ModelArtifact
): MultiLabelModelArtifact {
  const mergedVocab: Record<string, number> = {};
  const mergedIdf: number[] = [];

  // 1. Prefixed word vocabulary: "w:term"
  for (const [term, idx] of Object.entries(v11.word_vocab)) {
    mergedVocab[`w:${term}`] = idx;
    mergedIdf[idx] = v11.word_idf[idx];
  }

  // 2. Prefixed char vocabulary: "c:term"
  const charOffset = Object.keys(v11.word_vocab).length;
  for (const [term, idx] of Object.entries(v11.char_vocab)) {
    mergedVocab[`c:${term}`] = charOffset + idx;
    mergedIdf[charOffset + idx] = v11.char_idf[idx];
  }

  const numFeatures = Object.keys(mergedVocab).length;
  const numClasses = v11.departments.length;
  const coef: number[][] = [];
  const intercept: number[] = [];

  for (let j = 0; j < numClasses; j++) {
    const deptClf = v11.classifiers[j];
    if (deptClf.calibrated && deptClf.calibrated.length > 0) {
      const folds = deptClf.calibrated;
      const avgW = new Float64Array(numFeatures);
      let avgB = 0;

      for (const fold of folds) {
        const a = fold.a;
        const b = fold.b;
        const b0 = fold.intercept[0] ?? 0;

        // -a * w
        for (let i = 0; i < fold.coef.length; i++) {
          avgW[i] += (-a * fold.coef[i]) / folds.length;
        }
        // -(a * b0 + b)
        avgB += -(a * b0 + b) / folds.length;
      }

      coef.push(Array.from(avgW));
      intercept.push(avgB);
    } else if (deptClf.coef && deptClf.intercept) {
      coef.push([...deptClf.coef]);
      intercept.push(deptClf.intercept[0] ?? 0);
    }
  }

  return {
    model_version: `${v11.version}-linear-adapted`,
    model_architecture: 'OneVsRest_LinearSVC_PlattAdapted_Dual_Word_Char_TFIDF',
    classes: v11.departments,
    vocabulary: mergedVocab,
    idf: mergedIdf,
    coef,
    intercept,
    thresholds: v11.thresholds,
    auto_route_confidence_gate: 0.6,
    sublinear_tf: true,
    hazard_affirmative_patterns: [
      'chingari',
      'dhamaka',
      'current lagne',
      'taar tooti',
      'gas leak',
      'boo phail',
      'building collapse',
      'chhat girne',
    ],
    hazard_negation_patterns: [
      'safe hai',
      'khatra nahi',
      'theek hai',
      'koi leak nahi',
    ],
  };
}

/**
 * Clause-level inference to recover secondary/tertiary municipal defects
 * that may suffer whole-complaint L2 TF-IDF dilution in compound narratives.
 * Only admits candidates that pass calibrated threshold AND clause-level domain grounding,
 * while strictly respecting all causal and negation suppression boundaries.
 */
function classifyClauseLevel(
  text: string,
  artifact: V11ModelArtifact,
  relationResult: ReturnType<typeof analyzeComplaintRelationAware>,
  suppressed: DepartmentId[],
  alreadySelected: DepartmentId[]
): {
  clauseSelectedDepartments: DepartmentId[];
  clauseNotes: string[];
} {
  const clauseSelectedDepartments: DepartmentId[] = [];
  const clauseNotes: string[] = [];
  const spans = segmentSpansWithOffsets(text);
  if (spans.length <= 1) {
    return { clauseSelectedDepartments, clauseNotes };
  }

  for (let idx = 0; idx < spans.length; idx++) {
    const [, , clauseRaw] = spans[idx];
    const clauseNorm = normalizeRomanUrduText(clauseRaw).trim();
    const words = clauseNorm.split(/\s+/).filter(Boolean);
    if (words.length < 3) continue;

    const clauseFeatures = extractV11Features(clauseNorm, artifact);
    const clauseRawProbs = predictV11RawProbabilities(clauseFeatures, artifact);
    const { resolvedProbs: clauseCivicProbs } = resolveV11CivicRelations(clauseNorm, clauseRawProbs);

    for (const dept of artifact.departments) {
      if (suppressed.includes(dept) || alreadySelected.includes(dept)) continue;
      // Negation belongs to the candidate department, not every fault in a clause.
      if (relationResult.issue_candidates.some(c => c.department === dept &&
          c.span_id.startsWith(`iss_${idx}_`) && (c.negation_scope || c.mention_type === 'negated_mention'))) continue;
      const thresh = artifact.thresholds[dept] ?? 0.50;
      if (clauseCivicProbs[dept] >= thresh) {
        const lex = DOMAIN_EVIDENCE[dept as keyof typeof DOMAIN_EVIDENCE];
        const evidence = domainEvidenceText(clauseNorm, dept);
        if (!lex || !lex.assets.some(p => p.test(evidence)) || !lex.defects.some(p => p.test(evidence))) {
          continue;
        }
        if (hasDomainKeywordSupport(clauseNorm, dept, false)) {
          if (!clauseSelectedDepartments.includes(dept)) {
            clauseSelectedDepartments.push(dept);
            clauseNotes.push(
              `Clause-level ML selected ${dept.toUpperCase()} in span '${clauseRaw.trim()}' (prob: ${clauseCivicProbs[dept].toFixed(2)})`
            );
          }
        }
      }
    }
  }

  return { clauseSelectedDepartments, clauseNotes };
}

/**
 * Executes issue-centric, relation-aware classification on Roman Urdu complaint text.
 * Integrates statistical TF-IDF features with affirmative domain defect evidence,
 * candidate span decomposition, and pairwise relation resolution.
 *
 * Implements Phase 1 Hybrid Decision Policy:
 * 1. Evaluates calibrated ML probabilities and civic relation enhancements.
 * 2. Evaluates relation engine candidate decomposition and defect grounding.
 * 3. Enforces strict protections for out-of-scope complaints (routed to Needs Review).
 * 4. Enforces causal consequence and negation suppression so secondary symptoms don't generate false tickets.
 * 5. Empowers statistical ML to route valid complaints even when vocabulary is novel/colloquial.
 * 6. Preserves multi-label assignments across all six municipal agencies.
 * 7. Records rich diagnostic metadata for review and audit transparency.
 */
export function classifyV11RelationAware(
  text: string,
  artifact: V11ModelArtifact,
  complaintId?: string
): V11RelationAwareResult {
  const features = extractV11Features(text, artifact);
  const rawProbabilities = predictV11RawProbabilities(features, artifact);
  const { resolvedProbs: civicProbs, notes: civicNotes } = resolveV11CivicRelations(text, rawProbabilities);
  const relationResult = analyzeComplaintRelationAware(text, complaintId);

  const notes = [...relationResult.reason_trace, ...civicNotes];
  const mlSelected: DepartmentId[] = [];
  const ruleSelected: DepartmentId[] = [...relationResult.proposed_departments];
  const suppressed: DepartmentId[] = [];

  // Out-of-scope protection: private disputes, tenancy/rental, domestic issues
  if (relationResult.needs_review && relationResult.review_reason === 'OUT_OF_SCOPE') {
    return {
      departments: [],
      probabilities: { ...civicProbs },
      rawProbabilities,
      relation: relationResult.relation_summary,
      issueCandidates: relationResult.issue_candidates,
      edges: relationResult.edges,
      needsReview: true,
      reviewReason: 'OUT_OF_SCOPE',
      missingPublicLocation: false,
      notes: [...notes, 'Decision Policy: Protected out-of-scope non-municipal grievance from auto-routing'],
      modelVersion: artifact.version,
      decisionPolicy: DECISION_POLICY,
      mlSelectedDepartments: [],
      clauseSelectedDepartments: [],
      ruleSelectedDepartments: [],
      suppressedDepartments: [],
      finalReason: 'Out-of-scope non-municipal grievance routed to administrative triage',
    };
  }

  // Identify departments suppressed by explicit relation edges
  for (const edge of relationResult.edges) {
    if (edge.relation_type === 'CAUSES_CONTEXT_ONLY' && edge.target_id && edge.target_id !== 'consequence') {
      const targetDept = edge.target_id as DepartmentId;
      if (
        artifact.departments.includes(targetDept) &&
        !suppressed.includes(targetDept) &&
        !ruleSelected.includes(targetDept)
      ) {
        suppressed.push(targetDept);
        notes.push(`Suppressed ${targetDept.toUpperCase()} via relation edge: secondary consequence of ${edge.source_id.toUpperCase()}`);
      }
    }
  }

  // Identify departments suppressed by candidate mention types
  for (const cand of relationResult.issue_candidates) {
    if (cand.department && !suppressed.includes(cand.department) && !ruleSelected.includes(cand.department)) {
      if (cand.mention_type === 'consequence') {
        suppressed.push(cand.department);
        notes.push(`Suppressed ${cand.department.toUpperCase()}: candidate identified as causal consequence symptom`);
      } else if (cand.mention_type === 'negated_mention' || cand.negation_scope) {
        suppressed.push(cand.department);
        notes.push(`Suppressed ${cand.department.toUpperCase()}: explicitly negated or historically resolved defect`);
      } else if (cand.mention_type === 'recipient_mention' || cand.mention_type === 'spatial_landmark') {
        suppressed.push(cand.department);
        notes.push(`Suppressed ${cand.department.toUpperCase()}: context-only mention`);
      }
    }
  }

  // Check which departments pass whole-complaint ML threshold
  for (const dept of artifact.departments) {
    const thresh = artifact.thresholds[dept] ?? 0.50;
    if (civicProbs[dept] >= thresh) {
      mlSelected.push(dept);
    }
  }

  // Clause-level inference to recover secondary/tertiary faults diluted by whole-complaint TF-IDF
  const { clauseSelectedDepartments, clauseNotes } = classifyClauseLevel(
    text,
    artifact,
    relationResult,
    suppressed,
    ruleSelected
  );
  notes.push(...clauseNotes);

  // Combine ML and rule selections:
  // Department is included if:
  // 1. Not suppressed by causal or negation rule, AND
  // 2. Either relation engine grounded affirmative defect (ruleSelected), OR
  //    Whole-text ML model passed threshold AND has supporting domain asset/defect keyword, OR
  //    Clause-level ML passed threshold in an actionable clause
  const finalDepartments: DepartmentId[] = [];
  const lowText = normalizeRomanUrduText(text);
  for (const dept of artifact.departments) {
    if (suppressed.includes(dept)) {
      continue;
    }
    const mlPass = mlSelected.includes(dept);
    const rulePass = ruleSelected.includes(dept);
    const clausePass = clauseSelectedDepartments.includes(dept);

    if (rulePass) {
      finalDepartments.push(dept);
    } else if (mlPass) {
      if (hasDomainKeywordSupport(lowText, dept, ruleSelected.length > 0)) {
        finalDepartments.push(dept);
      } else {
        notes.push(`Filtered unsupported ML candidate ${dept.toUpperCase()}: no domain asset or defect tokens present`);
      }
    } else if (clausePass) {
      finalDepartments.push(dept);
    }
  }
  finalDepartments.sort();

  // Adjust routing scores (raw calibrated ML probabilities are returned separately):
  // - Selected departments: ensure at least threshold
  // - Unselected or suppressed departments: safely capped below threshold
  const calibratedProbs: Record<DepartmentId, number> = { ...civicProbs };
  for (const dept of artifact.departments) {
    const thresh = artifact.thresholds[dept] ?? 0.50;
    if (finalDepartments.includes(dept)) {
      calibratedProbs[dept] = Math.max(calibratedProbs[dept], thresh);
    } else {
      const maxPermitted = thresh * 0.4;
      calibratedProbs[dept] = Math.min(calibratedProbs[dept], maxPermitted);
    }
  }

  // Determine Needs Review state
  let needsReview = false;
  let reviewReason: string | null = null;

  if (finalDepartments.length === 0) {
    needsReview = true;
    reviewReason = relationResult.review_reason || 'UNCERTAIN_DEFECT';
    notes.push('No actionable municipal department met confidence threshold or rule criteria (Needs Review)');
  } else if (relationResult.review_reason === 'INCOMPLETE_SECONDARY_ISSUE') {
    needsReview = true;
    reviewReason = relationResult.review_reason;
  } else if (relationResult.needs_review && relationResult.review_reason === 'POSSIBLE_UNROUTED_SECONDARY_ISSUE') {
    // If ML also routed additional departments beyond ruleSelected, secondary issue might already be addressed
    if (finalDepartments.length <= ruleSelected.length) {
      needsReview = true;
      reviewReason = 'POSSIBLE_UNROUTED_SECONDARY_ISSUE';
    }
  }

  const finalReason = finalDepartments.length > 0
    ? `Routed to [${finalDepartments.join(', ').toUpperCase()}] via hybrid ML-relation policy (ML: [${mlSelected.join(', ')}], Clause: [${clauseSelectedDepartments.join(', ')}], Rules: [${ruleSelected.join(', ')}])`
    : `Routing deferred to human review: ${reviewReason}`;

  const allDepts: DepartmentId[] = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];
  const DEPT_NAMES_RECORD: Record<DepartmentId, string> = {
    kelectric: 'K-Electric',
    kmc: 'Karachi Metropolitan Corporation (KMC)',
    kwsc: 'Karachi Water & Sewerage Corporation (KWSC)',
    ssgc: 'Sui Southern Gas Company (SSGC)',
    sswmb: 'Sindh Solid Waste Management Board (SSWMB)',
    sbca: 'Sindh Building Control Authority (SBCA)',
  };
  const decisionRecords = allDepts.map((d) => {
    const prob = calibratedProbs[d] ?? 0;
    const thresh = artifact.thresholds[d] ?? 0.25;
    const isSel = finalDepartments.includes(d);
    const isSupp = suppressed.includes(d);
    const status = isSel ? 'SELECTED' : isSupp ? 'SUPPRESSED' : 'REJECTED';
    let source = 'STATISTICAL_ML';
    let reason = '';
    if (isSel) {
      if (ruleSelected.includes(d) && mlSelected.includes(d)) {
        source = 'HYBRID';
        reason = `Grounded affirmative civic defect and model passed decision threshold (prob: ${prob.toFixed(2)} >= ${thresh.toFixed(2)})`;
      } else if (ruleSelected.includes(d)) {
        source = 'CIVIC_GROUNDING';
        reason = `Grounded independent civic defect in complaint text`;
      } else {
        source = 'STATISTICAL_ML';
        reason = `Statistical ML candidate passed decision threshold (prob: ${prob.toFixed(2)} >= ${thresh.toFixed(2)})`;
      }
    } else if (isSupp) {
      source = 'CAUSAL_SUPPRESSION';
      reason = `Suppressed ${d.toUpperCase()}: Causal symptom or contextual reference`;
    } else {
      source = 'THRESHOLD_FAIL';
      reason = `Below decision threshold (prob: ${prob.toFixed(2)} < ${thresh.toFixed(2)})`;
    }
    return {
      department: d,
      departmentName: DEPT_NAMES_RECORD[d] || d.toUpperCase(),
      status,
      probability: prob,
      threshold: thresh,
      evidenceSpans: [],
      decisionSource: source,
      reason,
    };
  });

  return {
    departments: finalDepartments,
    probabilities: calibratedProbs,
    rawProbabilities,
    thresholds: { ...artifact.thresholds },
    decisionRecords,
    relation: finalDepartments.length > 1 && relationResult.relation_summary !== 'SAME_INCIDENT_DIFFERENT_REPAIRS'
      ? 'INDEPENDENT' : relationResult.relation_summary,
    issueCandidates: relationResult.issue_candidates,
    edges: relationResult.edges,
    needsReview,
    reviewReason,
    missingPublicLocation: relationResult.missing_public_location,
    notes,
    modelVersion: artifact.version,
    decisionPolicy: DECISION_POLICY,
    mlSelectedDepartments: mlSelected,
    clauseSelectedDepartments,
    ruleSelectedDepartments: ruleSelected,
    suppressedDepartments: suppressed,
    finalReason,
  };
}


// ==============================================================================
// 3. COMPLAINT UNDERSTANDING & CLARIFICATION SERVICE
// ==============================================================================
/** Local, stateless pre-submission advisory API. No persistence or hosted authority.
 * A clarification is a citizen-provided fact, never an inferred user answer.
 * Existing classifier safety/review reasons cannot be waived by a choice.
 */




export type LocalizedPrompt = { en: string; ur: string; romanUrdu: string };

export type ClarificationQuestion =
  | {
      id: 'water_power_relation';
      kind: 'choice';
      prompt: LocalizedPrompt;
      options: readonly { value: WaterRelationAnswer; label: LocalizedPrompt }[];
    }
  | {
      id: 'landmark_infrastructure_relation';
      kind: 'choice';
      prompt: LocalizedPrompt;
      options: readonly { value: LandmarkRelationAnswer; label: LocalizedPrompt }[];
      targetDept: DepartmentId;
    }
  | {
      id: 'resolved_historical_relation';
      kind: 'choice';
      prompt: LocalizedPrompt;
      options: readonly { value: HistoricalRelationAnswer; label: LocalizedPrompt }[];
      targetDept: DepartmentId;
    }
  | {
      id: 'incomplete_secondary_relation';
      kind: 'details';
      prompt: LocalizedPrompt;
    }
  | {
      id: 'describe_issue';
      kind: 'details';
      prompt: LocalizedPrompt;
    };

export type UnderstandingResult =
  | { state: 'invalid'; reason: 'EMPTY' | 'WORD_LIMIT' }
  | { state: 'ask'; question: ClarificationQuestion; prediction: V11RelationAwareResult }
  | { state: 'review'; reason: string; prediction: V11RelationAwareResult }
  | {
      state: 'ready';
      departments: DepartmentId[];
      prediction: V11RelationAwareResult;
      confirmedFact?: string;
      supplemented?: boolean;
    };

const MAX_WORDS = 200;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const WATER_POWER: ClarificationQuestion = {
  id: 'water_power_relation',
  kind: 'choice',
  prompt: {
    en: 'Is the public water supply separately disrupted, or is water unavailable only because the electricity outage stopped your own pump?',
    ur: 'کیا پانی کی سرکاری سپلائی الگ سے بند ہے، یا بجلی نہ ہونے کی وجہ سے آپ کی اپنی موٹر نہیں چل رہی؟',
    romanUrdu: 'Kya public pani ki supply alag se band hai, ya sirf bijli na hone ki wajah se aap ki apni motor nahi chal rahi?',
  },
  options: [
    {
      value: 'independent_supply',
      label: {
        en: 'The public water supply has its own problem',
        ur: 'پانی کی سرکاری سپلائی کا الگ مسئلہ ہے',
        romanUrdu: 'Public pani ki supply ka alag masla hai',
      },
    },
    {
      value: 'power_caused_motor',
      label: {
        en: 'Only my pump stopped because of the power outage',
        ur: 'صرف بجلی بند ہونے سے میری موٹر بند ہے',
        romanUrdu: 'Sirf bijli band hone se meri motor band hai',
      },
    },
    {
      value: 'unsure',
      label: {
        en: 'I am not sure',
        ur: 'مجھے یقین نہیں',
        romanUrdu: 'Mujhe yaqeen nahi',
      },
    },
  ],
};

export const INCOMPLETE_SECONDARY: ClarificationQuestion = {
  id: 'incomplete_secondary_relation',
  kind: 'details',
  prompt: {
    en: 'You started mentioning an additional municipal issue. Please provide details about what else needs repair or attention.',
    ur: 'آپ نے ایک اور مسئلے کا ذکر شروع کیا تھا۔ براہ کرم بتائیں کہ مزید کس چیز کی مرمت یا توجہ درکار ہے۔',
    romanUrdu: 'Aap ne aik aur maslay ka zikr shuru kiya tha. Meharbani karke wazeh karein ke doosra masla kya hai.',
  },
};

export const DESCRIBE_ISSUE: ClarificationQuestion = {
  id: 'describe_issue',
  kind: 'details',
  prompt: {
    en: 'Please describe the specific public-service fault, including any separate problem that still needs to be fixed.',
    ur: 'براہ کرم سرکاری سہولت کا اصل مسئلہ اور کوئی الگ مسئلہ جس کی مرمت ضروری ہے واضح کریں۔',
    romanUrdu: 'Meharbani karke public service ka asal masla aur koi alag fault jo abhi theek karna hai wazeh karein.',
  },
};

export function buildLandmarkQuestion(dept: DepartmentId): ClarificationQuestion {
  const deptUpper = dept.toUpperCase();
  return {
    id: 'landmark_infrastructure_relation',
    kind: 'choice',
    targetDept: dept,
    prompt: {
      en: `You mentioned a nearby ${deptUpper} asset. Is that infrastructure also damaged/faulty, or was it mentioned only as a nearby landmark?`,
      ur: `آپ نے قریبی ${deptUpper} کا ذکر کیا۔ کیا اس میں بھی کوئی خرابی ہے، یا یہ صرف قریبی نشان/پتے کے طور پر بتایا گیا تھا؟`,
      romanUrdu: `Aap ne qareebi ${deptUpper} ka zikr kiya. Kya us mein bhi kharabi hai, ya sirf location nishani ke tor par bataya gaya tha?`,
    },
    options: [
      {
        value: 'landmark_only',
        label: {
          en: 'Mentioned only as a landmark / location reference; not damaged',
          ur: 'صرف پتے/نشان کے طور پر بتایا گیا؛ کوئی خرابی نہیں',
          romanUrdu: 'Sirf location reference ke tor par bataya; koi kharabi nahi',
        },
      },
      {
        value: 'asset_also_defective',
        label: {
          en: 'That asset is also damaged and requires department repair',
          ur: 'اس میں بھی خرابی ہے اور محکمہ کی مرمت درکار ہے',
          romanUrdu: 'Is mein bhi kharabi hai aur department ki repair chahiye',
        },
      },
      {
        value: 'unsure',
        label: {
          en: 'I am not sure',
          ur: 'مجھے یقین نہیں',
          romanUrdu: 'Mujhe yaqeen nahi',
        },
      },
    ],
  };
}

export function buildHistoricalQuestion(dept: DepartmentId): ClarificationQuestion {
  const deptUpper = dept.toUpperCase();
  return {
    id: 'resolved_historical_relation',
    kind: 'choice',
    targetDept: dept,
    prompt: {
      en: `You mentioned a past issue concerning ${deptUpper}. Is that issue already resolved/repaired, or does it still require active repair?`,
      ur: `آپ نے ${deptUpper} کے مسئلے کا ذکر کیا۔ کیا وہ پہلے ہی ٹھیک ہو چکا ہے، یا اب بھی مرمت درکار ہے؟`,
      romanUrdu: `Aap ne ${deptUpper} ke maslay ka zikr kiya. Kya wo pehle hi theek ho chuka hai, ya abhi bhi repair ki zaroorat hai?`,
    },
    options: [
      {
        value: 'already_resolved',
        label: {
          en: 'Already resolved / repaired; no current action needed',
          ur: 'پہلے ہی حل/مرمت ہو چکا ہے؛ اب مزید کارروائی کی ضرورت نہیں',
          romanUrdu: 'Pehle hi theek ho chuka hai; ab action ki zaroorat nahi',
        },
      },
      {
        value: 'still_unresolved',
        label: {
          en: 'Still unresolved; active department repair is needed',
          ur: 'اب بھی خراب ہے؛ محکمہ کی مرمت درکار ہے',
          romanUrdu: 'Abhi bhi kharab hai; active repair ki zaroorat hai',
        },
      },
      {
        value: 'unsure',
        label: {
          en: 'I am not sure',
          ur: 'مجھے یقین نہیں',
          romanUrdu: 'Mujhe yaqeen nahi',
        },
      },
    ],
  };
}

export function ambiguousWaterPower(text: string, prediction: V11RelationAwareResult): boolean {
  if (!prediction.ruleSelectedDepartments?.includes('kelectric') && !prediction.departments.includes('kelectric')) {
    return false;
  }
  const normalized = normalizeRomanUrduText(text);
  const symptom = /\b(?:pani|water)\s+(?:bhi\s+)?(?:nahi\s+aa\s+rah[ai]|band\s+hai|gayab\s+hai)\b/i;
  if (!symptom.test(normalized)) return false;
  // Explicit public network defects, distinct issue mentions and clear motor causality
  // already supply the required fact. Do not overwrite those with a broad question.
  const independent = /\b(?:pani\s+ki\s+(?:pipe|pipeline|line)|water\s+(?:pipe|pipeline|main)|gutter|sewer|sewage|manhole)\b/i;
  const separate = /\b(?:alag\s+se|doosra\s+masla|doosri\s+gali\s+mein)\s+(?:pani|water)\b/i;
  const clearCause = /\b(?:bijli|light|power)\b[^.!?;]{0,90}\b(?:wajah\s+se|jis\s+se)\b[^.!?;]{0,60}\b(?:motor|pump)\b/i;
  return !independent.test(normalized) && !separate.test(normalized) && !clearCause.test(normalized);
}

export function ambiguousLandmarkAsset(prediction: V11RelationAwareResult): DepartmentId | null {
  for (const cand of prediction.issueCandidates) {
    if (
      cand.department &&
      (cand.mention_type === 'spatial_landmark' || cand.is_contextual_landmark) &&
      !prediction.departments.includes(cand.department)
    ) {
      if (/\b(?:safe|bilkul\s+safe)\b/i.test(cand.normalized_text || cand.span_text)) {
        continue;
      }
      return cand.department;
    }
  }
  return null;
}

export function ambiguousResolvedHistorical(prediction: V11RelationAwareResult): DepartmentId | null {
  for (const cand of prediction.issueCandidates) {
    if (
      cand.department &&
      cand.is_historical_or_resolved &&
      !prediction.departments.includes(cand.department)
    ) {
      return cand.department;
    }
  }
  return null;
}

function hasRemainingUncertainty(
  text: string,
  prediction: V11RelationAwareResult,
  answeredQuestionId: string
): { hasUncertainty: boolean; reason?: string } {
  if (prediction.needsReview && prediction.reviewReason) {
    if (prediction.reviewReason !== 'UNCERTAIN_DEFECT' && prediction.reviewReason !== 'INCOMPLETE_SECONDARY_ISSUE') {
      return { hasUncertainty: true, reason: prediction.reviewReason };
    }
  }
  if (answeredQuestionId !== 'water_power_relation' && ambiguousWaterPower(text, prediction)) {
    return { hasUncertainty: true, reason: 'REMAINING_WATER_POWER_UNCERTAINTY' };
  }
  if (answeredQuestionId !== 'incomplete_secondary_relation' && ambiguousIncompleteSecondary(text, prediction)) {
    return { hasUncertainty: true, reason: 'REMAINING_SECONDARY_UNCERTAINTY' };
  }
  if (answeredQuestionId !== 'landmark_infrastructure_relation') {
    const lm = ambiguousLandmarkAsset(prediction);
    if (lm) return { hasUncertainty: true, reason: 'REMAINING_LANDMARK_UNCERTAINTY' };
  }
  if (answeredQuestionId !== 'resolved_historical_relation') {
    const hist = ambiguousResolvedHistorical(prediction);
    if (hist) return { hasUncertainty: true, reason: 'REMAINING_HISTORICAL_UNCERTAINTY' };
  }
  return { hasUncertainty: false };
}

export function ambiguousIncompleteSecondary(text: string, prediction: V11RelationAwareResult): boolean {
  if (prediction.reviewReason === 'INCOMPLETE_SECONDARY_ISSUE') return true;
  const normalized = normalizeRomanUrduText(text);
  return /\b(?:aur\s+alag(?:\s+se)?|alag\s+se|doosra\s+masla(?:\s+ye\s+hai\s+ke)?|is\s+ke\s+ilawa|lekin|magar)\W*$/i.test(
    normalized
  );
}

/** A high ML score alone is not a confirmed issue. Keep the current hybrid's
 * prediction, but request a fact before allowing the opt-in preflight to route.
 */
export function hasUngroundedPrediction(
  prediction: Pick<V11RelationAwareResult, 'departments' | 'ruleSelectedDepartments'>,
  confirmed?: DepartmentId
): boolean {
  const grounded = new Set(prediction.ruleSelectedDepartments ?? []);
  return prediction.departments.some((dept) => dept !== confirmed && !grounded.has(dept));
}

/** Does not create a complaint or a reference number. Safe to call on a draft. */
export function assessComplaintDraft(text: string, artifact: V11ModelArtifact): UnderstandingResult {
  if (!text.trim()) return { state: 'invalid', reason: 'EMPTY' };
  if (words(text) > MAX_WORDS) return { state: 'invalid', reason: 'WORD_LIMIT' };

  const prediction = classifyV11RelationAware(text, artifact);
  if (prediction.reviewReason === 'OUT_OF_SCOPE') {
    return { state: 'review', reason: 'OUT_OF_SCOPE', prediction };
  }

  // 1. Water vs Power Outage Causality Check
  if (ambiguousWaterPower(text, prediction)) {
    return { state: 'ask', question: WATER_POWER, prediction };
  }

  // 2. Incomplete Secondary Issue Check
  if (ambiguousIncompleteSecondary(text, prediction)) {
    return { state: 'ask', question: INCOMPLETE_SECONDARY, prediction };
  }

  // 3. Landmark Asset Ambiguity Check
  const landmarkDept = ambiguousLandmarkAsset(prediction);
  if (landmarkDept) {
    return { state: 'ask', question: buildLandmarkQuestion(landmarkDept), prediction };
  }

  // 4. Resolved / Historical Defect Ambiguity Check
  const historicalDept = ambiguousResolvedHistorical(prediction);
  if (historicalDept) {
    return { state: 'ask', question: buildHistoricalQuestion(historicalDept), prediction };
  }

  // 5. Completely vague / unroutable draft with zero detected actionable departments
  if (prediction.departments.length === 0 && prediction.needsReview) {
    return { state: 'ask', question: DESCRIBE_ISSUE, prediction };
  }

  // 6. Review state for flagged items that don't match specific clarification prompts
  if (prediction.needsReview) {
    return { state: 'review', reason: prediction.reviewReason || 'UNCERTAIN_DEFECT', prediction };
  }

  // Clear complaint — return ready immediately without user-facing friction
  return { state: 'ready', departments: [...prediction.departments], prediction };
}

/** One answer round only. Recompute from the current text; reject stale question
 * types and invalid/unsure answers; do not silently route unresolved cases.
 * This API is advisory; a production server must bind answers to the citizen's
 * exact draft and session and independently re-run the same policy.
 */
export function resolveComplaintClarification(
  text: string,
  answer: ClarificationAnswer,
  artifact: V11ModelArtifact
): UnderstandingResult {
  const current = assessComplaintDraft(text, artifact);
  const prediction = 'prediction' in current ? current.prediction : classifyV11RelationAware(text, artifact);
  const review = (reason: string): UnderstandingResult => ({ state: 'review', reason, prediction });

  if (answer.draftText !== text) {
    return review('STALE_CLARIFICATION');
  }

  if (current.state !== 'ask') return current;

  if (answer.questionId !== current.question.id) {
    return review('STALE_CLARIFICATION');
  }
  if ('skip' in answer) return review('CLARIFICATION_SKIPPED');

  // Question 1: Water Power Relation
  if (answer.questionId === 'water_power_relation' && 'choice' in answer) {
    if (answer.choice !== 'independent_supply' && answer.choice !== 'power_caused_motor') {
      return review('CLARIFICATION_UNCERTAIN');
    }
    const departments = new Set(prediction.departments);
    if (answer.choice === 'independent_supply') {
      departments.add('kwsc');
    } else {
      departments.delete('kwsc');
    }
    if (departments.size === 0) {
      return review('NO_ACTIONABLE_DEPARTMENT');
    }
    const remaining = hasRemainingUncertainty(text, prediction, answer.questionId);
    if (remaining.hasUncertainty) {
      return review(remaining.reason || 'REMAINING_UNCERTAINTY');
    }
    return {
      state: 'ready',
      departments: [...departments].sort(),
      prediction,
      confirmedFact: answer.choice,
    };
  }

  // Question 2: Landmark Infrastructure Relation
  if (answer.questionId === 'landmark_infrastructure_relation' && 'choice' in answer) {
    if (answer.choice !== 'landmark_only' && answer.choice !== 'asset_also_defective') {
      return review('CLARIFICATION_UNCERTAIN');
    }
    const targetDept = (current.question as Extract<ClarificationQuestion, { id: 'landmark_infrastructure_relation' }>).targetDept;
    const departments = new Set(prediction.departments);
    if (answer.choice === 'asset_also_defective') {
      departments.add(targetDept);
    } else {
      departments.delete(targetDept);
    }
    if (departments.size === 0) {
      return review('NO_ACTIONABLE_DEPARTMENT');
    }
    const remaining = hasRemainingUncertainty(text, prediction, answer.questionId);
    if (remaining.hasUncertainty) {
      return review(remaining.reason || 'REMAINING_UNCERTAINTY');
    }
    return {
      state: 'ready',
      departments: [...departments].sort(),
      prediction,
      confirmedFact: answer.choice,
    };
  }

  // Question 3: Resolved Historical Relation
  if (answer.questionId === 'resolved_historical_relation' && 'choice' in answer) {
    if (answer.choice !== 'already_resolved' && answer.choice !== 'still_unresolved') {
      return review('CLARIFICATION_UNCERTAIN');
    }
    const targetDept = (current.question as Extract<ClarificationQuestion, { id: 'resolved_historical_relation' }>).targetDept;
    const departments = new Set(prediction.departments);
    if (answer.choice === 'still_unresolved') {
      departments.add(targetDept);
    } else {
      departments.delete(targetDept);
    }
    if (departments.size === 0) {
      return review('NO_ACTIONABLE_DEPARTMENT');
    }
    const remaining = hasRemainingUncertainty(text, prediction, answer.questionId);
    if (remaining.hasUncertainty) {
      return review(remaining.reason || 'REMAINING_UNCERTAINTY');
    }
    return {
      state: 'ready',
      departments: [...departments].sort(),
      prediction,
      confirmedFact: answer.choice,
    };
  }

  // Question 4 & 5: Incomplete Secondary & Describe Issue (details-based text expansion)
  if (
    (answer.questionId === 'incomplete_secondary_relation' || answer.questionId === 'describe_issue') &&
    'details' in answer
  ) {
    if (!answer.details.trim()) return review('CLARIFICATION_EMPTY');
    const combined = `${text.trim()}\n${answer.details.trim()}`;
    if (words(combined) > MAX_WORDS) return review('CLARIFICATION_WORD_LIMIT');
    const resolved = assessComplaintDraft(combined, artifact);
    if (resolved.state === 'ready') return { ...resolved, supplemented: true };
    if (resolved.state === 'review' || resolved.state === 'ask') {
      return {
        state: 'review',
        reason: resolved.state === 'review' ? resolved.reason : 'CLARIFICATION_UNRESOLVED',
        prediction: resolved.prediction,
      };
    }
    return review('CLARIFICATION_INVALID');
  }

  return review('CLARIFICATION_INVALID');
}

