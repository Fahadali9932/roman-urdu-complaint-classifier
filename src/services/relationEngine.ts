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

import type { DepartmentId } from '../types';

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
      /\bstreet\s*light\b/i, /\bbatti\b/i, /\bbattiyan\b/i, /\bchauraha\b/i,
      /\bchowk\b/i, /\bbridge\b/i, /\bpul\b/i, /\bunderpass\b/i, /\btiles\b/i,
      /\basphalt\b/i, /\bpavement\b/i,
    ],
    defects: [
      /\btoot\b/i, /\btooti\b/i, /\btoota\b/i, /\bgaddha\b/i, /\bgaddhay\b/i,
      /\bgaddhe\b/i, /\bgaddhon\b/i, /\bkhadda\b/i, /\bkhadday\b/i,
      /\bkhaddhon\b/i, /\bpothole\b/i, /\bpotholes\b/i, /\bdhans\b/i,
      /\bkharab\b/i, /\bdamage\b/i, /\bdamaged\b/i, /\brepair\b/i,
      /\brebuild\b/i, /\bbana(?:o|ein)\b/i, /\bandhera\b/i,
      /\bencroachment\b/i, /\bgaariyan\s*lagti\b/i, /\bgehra\b/i,
    ],
    denials: [
      /\bsarak\s+bilkul\s+theek\b/i,
      /\broad\s+tooti\s+nahi\b/i,
      /\bfootpath\s+kharab\s+nahi\b/i,
    ],
  },
  kwsc: {
    assets: [
      /\bpani\b/i, /\bpaani\b/i, /\bwater\b/i, /\bsewer\b/i, /\bsewerage\b/i,
      /\bgutter\b/i, /\bmanhole\b/i, /\bwater\s*main\b/i, /\bwater\s*(?:pipe|pipeline|supply)\b/i,
      /\bsarkari\s*pani\b/i, /\bpublic\s*(?:water|pani|pipe|pipeline)\b/i,
      /\bpipe\b/i, /\bpipeline\b/i, /\bwater\s*board\b/i, /\bkwsc\b/i, /\bkw&sc\b/i,
      /\bdrinking\s*water\b/i, /\btap\b/i, /\bsewage\b/i,
    ],
    defects: [
      /\bleak\b/i, /\bleakage\b/i, /\bphat\b/i, /\bphati\b/i, /\bphatne\b/i,
      /\bburst\b/i, /\boverflow\b/i, /\bubalta\b/i, /\bubal\b/i, /\btalaab\b/i,
      /\bcover\s*missing\b/i, /\blid\b/i, /\bsookhi\b/i, /\bpressure\s*(?:intihai\s*)?kam\b/i,
      /\bpressure\s*zero\b/i, /\bpaani\s*nahi\s*aa\s*raha\b/i, /\bwater\s*nahi\s*aa\s*raha\b/i,
      /\bsupply\s*(?:bilkul\s*)?band\b/i, /\bshortage\b/i, /\bchori\b/i, /\bband\s*hai\b/i,
      /\breplace\s*lid\b/i, /\bcovers?\s*missing\b/i, /\bcontaminated\b/i, /\btoxic\s*smell\b/i,
    ],
    denials: [
      /\bye\s+pani\s+ka\s+masla\s+na?h?i\b/i,
      /\bpani\s+ka\s+koi\s+masla\s+nahi\b/i,
      /\bwater\s+ka\s+masla\s+nahi\b/i,
    ],
  },
  kelectric: {
    assets: [
      /\bbijli\b/i, /\blight\b/i, /\bcurrent\b/i, /\bfeeder\b/i, /\btransformer\b/i,
      /\btaar\b/i, /\bwire\b/i, /\bpole\b/i, /\bkhamba\b/i, /\bvoltage\b/i, /\bpower\b/i,
      /\bk-?electric\b/i, /\b11kv\b/i, /\bjumper\b/i, /\bcutout\b/i, /\bfuse\b/i,
      /\belectricity\s*pole\b/i,
    ],
    defects: [
      /\bload\s*shedding\b/i, /\bspark\b/i, /\bsparking\b/i, /\bblast\b/i,
      /\bshort\s*circuit\b/i, /\btrip\b/i, /\blatak\b/i, /\bhanging\b/i,
      /\bjhatkay\b/i, /\bbijli\s*nahi\s*aa\s*rahi\b/i, /\blight\s*gayi\b/i,
      /\bbijli\s*gayi\b/i, /\bfeeder\s*band\b/i, /\bfeeder\s*fault\b/i,
      /\bfeeder\s*down\b/i, /\bbar\s*bar\s*ja\s*ra?h?i\b/i, /\btransformer\s*kharab\b/i,
      /\btransformer\s*ka\s*fault\b/i, /\bpower\s*outage\b/i, /\bband\s*hai\b/i,
      /\bpower\s*supply\s*cut\s*off\b/i, /\bzero\s*voltage\b/i, /\bsingle\s*phase\b/i,
      /\bburnt\b/i, /\bsnapping\b/i, /\bcorroded\b/i, /\bmight\s*collapse\b/i,
    ],
    denials: [
      /\bpole\s+kharab\s+nahi\b/i,
      /\bbijli\s+ka\s+masla\s+nahi\b/i,
      /\blight\s+theek\s+hai\b/i,
    ],
  },
  ssgc: {
    assets: [
      /\bgas\b/i, /\bsui\s*gas\b/i, /\bgas\s*pipe\b/i, /\bgas\s*pipeline\b/i,
      /\bgas\s*line\b/i, /\bgas\s*mains\b/i, /\bgas\s*meter\b/i, /\bchulha\b/i,
      /\bssgc\b/i, /\bregulator\b/i, /\bdiaphragm\b/i,
    ],
    defects: [
      /\bboo\b/i, /\bsmell\b/i, /\bhiss\b/i, /\bleak\b/i, /\bleakage\b/i,
      /\bpressure\b/i, /\bchulha\s*nahi\s*jal\b/i, /\bflame\s*nahi\b/i,
      /\baag\s*lagne\b/i, /\bdhamaka\b/i, /\bburst\b/i, /\bkam\s*aa\s*raha\b/i,
      /\bruptured\b/i, /\bwhistling\b/i, /\bblowing\s*out\b/i, /\bchulha\s*band\b/i,
      /\bnahi\s*aa\s*rahi\b/i,
    ],
    denials: [
      /\bgas\s+ka\s+koi\s+issue\s+nahi\b/i,
      /\bye\s+gas\s+ka\s+masla\s+na?h?i\b/i,
      /\bgas\s+leak\s+nahi\s+hai\b/i,
      /\bgas\s+theek\s+hai\b/i,
    ],
  },
  sswmb: {
    assets: [
      /\bkachra\b/i, /\bkachray\b/i, /\bkura\b/i, /\btrash\b/i, /\bgarbage\b/i,
      /\bdustbin\b/i, /\bdustbins\b/i, /\bbin\b/i, /\bbins\b/i, /\bdhabay\b/i,
      /\bdead\s*animal\b/i, /\bkachra\s*kundi\b/i, /\bsswmb\b/i,
      /\bwaste\b/i, /\bdumpster\b/i,
    ],
    defects: [
      /\bnahi\s*utha\b/i, /\bnahi\s*uth\b/i, /\bnahi\s*uthta\b/i,
      /\buthta\s*nahi\b/i, /\buthaya\s*nahi\b/i, /\bpara\s*hai\b/i, /\bpara\s*hua\b/i,
      /\bdher\b/i, /\boverflow\b/i, /\bbikhra\b/i, /\bgir\s*raha\b/i,
      /\bbadbu\b/i, /\bmachar\b/i, /\bstolen\b/i, /\bmissing\b/i,
      /\bdisinfect\b/i, /\baccumulation\b/i, /\bjama\b/i,
      /\brefusing\s*to\s*enter\b/i, /\bclogging\b/i, /\brotting\s*odor\b/i,
      /\bclean\s*bin\b/i,
    ],
    denials: [
      /\bkachra\s+theek\s+se\s+uth\s+gaya\b/i,
      /\bkachray\s+ka\s+masla\s+nahi\b/i,
    ],
  },
  sbca: {
    assets: [
      /\bbuilding\b/i, /\bimarat\b/i, /\bfloor\b/i, /\bfloors\b/i, /\bchajja\b/i,
      /\bbalcony\b/i, /\bpillar\b/i, /\bpillars\b/i, /\bwall\b/i, /\bdeewar\b/i,
      /\bfoundation\b/i, /\bfoundations\b/i, /\bbasement\b/i, /\bexcavation\b/i,
      /\bplot\b/i, /\bdukan\b/i, /\bcommercial\b/i, /\bcos\b/i,
      /\bcompulsory\s*open\s*space\b/i, /\bsbca\b/i, /\bconstruction\b/i,
      /\bpremises\b/i, /\bbungalow\b/i,
    ],
    defects: [
      /\billegal\b/i, /\bgheir\s*qanooni\b/i, /\bbina\s*permit\b/i, /\bbina\s*noc\b/i,
      /\bextra\s*floor\b/i, /\bcrack\b/i, /\bcracks\b/i, /\bdarar\b/i,
      /\bcollapse\b/i, /\bgirne\s*ka\s*khatra\b/i, /\bbowing\b/i, /\bdilapidated\b/i,
      /\bwithout\s*shoring\b/i, /\bseal\s*shuda\b/i, /\bcode\s*violation\b/i,
      /\bviolation\b/i, /\bevacuation\b/i, /\baccess\s*block\b/i,
      /\bstop-work\b/i, /\bseal\s*the\s*premises\b/i, /\bschool\b/i, /\bhospital\b/i,
      /\bkhasta\s*haal\b/i, /\bgirne\s*wali\b/i,
    ],
    denials: [
      /\bbuilding\s+theek\s+hai\b/i,
      /\billegal\s+kaam\s+nahi\b/i,
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
];

const LOCATION_INDICATORS = [
  /\b(gali\s*(?:number|no)?\s*\d+|block\s*\d+|sector\s*\d+|phase\s*\d+|street\s*\d+)\b/i,
  /\b(clifton|saddar|nazimabad|korangi|baldia|jauhar|gulshan|north\s*karachi|site|lyari|malir|fb\s*area|liaquatabad)\b/i,
  /\b(chowrangi|chowk|road\s*number|market|bridge|mor|stop|plaza)\b/i,
];

export function normalizeRomanUrduText(text: string): string {
  let t = (text || '').toLowerCase();
  t = t.replace(/\bsadak\b/g, 'sarak');
  t = t.replace(/\b(nhi|nai)\b/g, 'nahi');
  t = t.replace(/\b(boht|bht|bohat)\b/g, 'bohot');
  t = t.replace(/\b(choolha)\b/g, 'chulha');
  t = t.replace(/\bgadda\b/g, 'gaddha');
  t = t.replace(/\b(hy)\b/g, 'hai');
  t = t.replace(/\b(rhi)\b/g, 'rahi');
  t = t.replace(/\b(zada)\b/g, 'zyada');
  t = t.replace(/\b(hoi\s*v|hoi\s*hai)\b/g, 'hui hai');
  t = t.replace(/\bkrdo\b/g, 'karo');
  return t;
}

export function segmentSpansWithOffsets(text: string): Array<[number, number, string]> {
  const raw = text.trim();
  if (!raw) return [];

  const splitterRegex =
    /(?:,\s*(?:aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein|doosra\s+masla|doosri\s+taraf)\b|\b(?:aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein|doosra\s+masla|doosri\s+taraf)\b|(?<!\w[A-Za-z])\.\s+|;\s*)/gi;

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
  if (/\b(gas|sui\s*gas)\b/i.test(cNorm)) {
    found.add('ssgc');
  }
  for (const [dept, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
    if (dept === 'kwsc' && /\b(gas|sui\s*gas)\b/i.test(cNorm) && !/\b(pani|water|sewer|gutter)\b/i.test(cNorm)) {
      continue;
    }
    for (const pat of lex.assets) {
      if (pat.test(cNorm)) {
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
  const hasElectricEvidence = DOMAIN_EVIDENCE.kelectric.assets.some((pat) => pat.test(normFull));
  const hasWaterMotorSymptom = hasElectricEvidence && /\b(motor\s*band|motor\s*nahi\s*chal)\b/i.test(normFull);

  // 8. Span-by-span Issue Classification
  const spanTuples = segmentSpansWithOffsets(sanitized);
  const candidates: IssueCandidate[] = [];

  for (let idx = 0; idx < spanTuples.length; idx++) {
    const [sStart, sEnd, sRaw] = spanTuples[idx];
    const sNorm = normalizeRomanUrduText(sRaw);

    for (const [dept, lex] of Object.entries(DOMAIN_EVIDENCE) as Array<[AgencyId, DomainLexicon]>) {
      // Negation
      if (negatedDepts.has(dept)) {
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: dept,
          defect_evidence: ['explicitly_negated'],
          is_actionable: false,
          negation_scope: true,
          mention_type: 'negated_mention',
          department: dept,
          confidence: 0,
          reason_codes: [`EXPLICIT_DENIAL_${dept.toUpperCase()}`],
        });
        continue;
      }

      // Recipient
      if (hasRecipientPreamble && recipientDept === dept) {
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
          mention_type: 'recipient_mention',
          department: dept,
          confidence: 0,
          reason_codes: [`RECIPIENT_ONLY_${dept.toUpperCase()}`],
        });
        continue;
      }

      // Spatial Landmark
      if (isSpatialProximityOnly && dept === 'kelectric') {
        candidates.push({
          span_id: `iss_${idx}_${dept}`,
          span_start: sStart,
          span_end: sEnd,
          span_text: sRaw.trim(),
          normalized_text: sNorm,
          asset: 'pole',
          defect_evidence: ['spatial_landmark_only'],
          is_actionable: false,
          negation_scope: false,
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
        !/\b(sewer|gutter|sookhi|supply\s*band)\b/i.test(sNorm)
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
          mention_type: 'consequence',
          department: dept,
          confidence: 0,
          reason_codes: ['CONSEQUENCE_WATER_MOTOR_SYMPTOM'],
        });
        continue;
      }

      // Road surface water ponding consequence without road damage
      if (dept === 'kmc' && /\broad\s*tooti\s*nahi\b/i.test(normFull)) continue;
      if (dept === 'kmc' && /\bfootpath\s*kharab\s*nahi\b/i.test(normFull)) continue;

      // Gas pipe check for KWSC
      if (dept === 'kwsc' && /\b(gas|sui\s*gas)\b/i.test(sNorm) && !/\b(pani|water|sewer|gutter)\b/i.test(sNorm)) {
        continue;
      }

      // SSGC must have gas tokens
      if (dept === 'ssgc' && !/\b(gas|chulha|sui\s*gas)\b/i.test(normFull)) {
        continue;
      }

      // Check matches
      const assetHits = lex.assets.filter((pat) => pat.test(sNorm));
      let defectHits = lex.defects.filter((pat) => pat.test(sNorm));

      if (dept === 'ssgc' && /\bgas\b/i.test(sNorm) && defectHits.length === 0) {
        defectHits = lex.defects.filter((pat) => pat.test(normFull));
      }

      if (assetHits.length > 0 && defectHits.length > 0) {
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
        !/\b(sewer|gutter|sookhi|supply\s*band)\b/i.test(normFull)
      ) {
        continue;
      }
      if (dept === 'kmc' && (/\broad\s*tooti\s*nahi\b/i.test(normFull) || /\bfootpath\s*kharab\s*nahi\b/i.test(normFull))) {
        continue;
      }
      if (dept === 'kmc' && /\b(wire|taar)\b/i.test(normFull) && !/\b(gaddha|khadda|toot|dhans|pothole)\b/i.test(normFull)) {
        continue;
      }
      if (dept === 'ssgc' && !/\b(gas|chulha|sui\s*gas)\b/i.test(normFull)) continue;

      const aHits = lex.assets.filter((pat) => pat.test(normFull));
      const dHits = lex.defects.filter((pat) => pat.test(normFull));
      if (aHits.length > 0 && dHits.length > 0) {
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
          mention_type: 'actionable_defect',
          department: dept,
          confidence: 0.9,
          reason_codes: [`FULL_TEXT_AFFIRMATIVE_DEFECT_${dept.toUpperCase()}`],
        });
      }
    }
    actionableDepts = Array.from(new Set(actionableDepts)).sort();
  }

  // 10. Relational Summary and Edge Building
  const edges: RelationEdge[] = [];
  let relationSummary: RelationType = 'UNCERTAIN';

  if (isSharedIncident && actionableDepts.length >= 2) {
    relationSummary = 'SAME_INCIDENT_DIFFERENT_REPAIRS';
    for (let i = 0; i < actionableDepts.length - 1; i++) {
      edges.push({
        source_id: actionableDepts[i],
        target_id: actionableDepts[i + 1],
        relation_type: 'SAME_INCIDENT_DIFFERENT_REPAIRS',
        description: 'Shared physical incident requires separate distinct repairs',
      });
    }
  } else if (actionableDepts.length > 1) {
    relationSummary = 'INDEPENDENT';
    for (let i = 0; i < actionableDepts.length - 1; i++) {
      edges.push({
        source_id: actionableDepts[i],
        target_id: actionableDepts[i + 1],
        relation_type: 'INDEPENDENT',
        description: 'Independent civic defects requiring separate municipal teams',
      });
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
    } else if (hasCausalConsequence) {
      relationSummary = 'CAUSES_CONTEXT_ONLY';
      edges.push({
        source_id: actionableDepts[0],
        target_id: 'consequence',
        relation_type: 'CAUSES_CONTEXT_ONLY',
        description: 'Root civic cause with non-actionable symptom',
      });
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

  // 12. Review Gate
  const needsReview = actionableDepts.length === 0;
  const reviewReason = needsReview ? 'UNCERTAIN_DEFECT' : null;

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
