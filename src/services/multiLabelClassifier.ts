/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V10 Advanced Roman Urdu Multi-Department Civic Classifier
 *
 * Provides:
 * - Word + Character (3-5 char_wb) sublinear TF-IDF inference matching scikit-learn to < 1e-6 tolerance.
 * - Robust contextual Roman Urdu spelling normalization.
 * - Cause-and-effect vs independent multi-department relation disambiguation.
 * - Independent location completeness vs model confidence separation.
 */
import type { DepartmentId, ComplaintStatus } from '../types';
import modelData from '../../ml/multilabel_model.json';

export interface MultiLabelModelArtifact {
  model_version: string;
  model_architecture: string;
  classes: string[];
  vocabulary: Record<string, number>;
  idf: number[];
  coef: number[][];
  intercept: number[];
  thresholds: Record<string, number>;
  auto_route_confidence_gate: number;
  ngram_words?: [number, number];
  ngram_chars?: [number, number];
  sublinear_tf: boolean;
  hazard_affirmative_patterns: string[];
  hazard_negation_patterns: string[];
}

const classifier = modelData as unknown as MultiLabelModelArtifact;

export interface MultiLabelClassificationResult {
  departments: DepartmentId[];
  primaryDepartment?: DepartmentId;
  confidence: number;
  probabilities: Record<DepartmentId, number>;
  decisionScores: Record<DepartmentId, number>;
  isMultiLabel: boolean;
  needsReview: boolean;
  reviewReason?: string;
  hasHazard: boolean;
  hazardType?: string;
  modelVersion: string;
  issues: Array<{
    departmentId: DepartmentId;
    issueType: string;
    evidenceSpan: string;
    confidence: number;
  }>;
  relations?: Array<{
    fromDept: string;
    toDept: string;
    type: string;
    actionable: boolean;
  }>;
}

const TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(humare|hmare|hmaray)\b/gi, 'hamare'],
  [/\b(bohat|bht|bhut|bhot)\b/gi, 'bohot'],
  [/\b(zada|ziada|zayada)\b/gi, 'zyada'],
  [/\b(hoi\s+v\s+hai|hui\s+v\s+hai|hoi\s+v|hui\s+v|hoi\s+hui|hui\s+hui)\b/gi, 'hui hai'],
  [/\b(hoi|huwi)\b/gi, 'hui'],
  [/\b(pass|pas)\b/gi, 'paas'],
  [/\b(thik|thek)\b/gi, 'theek'],
  [/\b(kiya\s+jae|kya\s+jaye|karein|karain|krna\s+chahiye)\b/gi, 'kiya jaye'],
  [/\b(jae)\b/gi, 'jaye'],
  [/\b(nai|nhi|nhn|nay)\b/gi, 'nahi'],
  [/\b(hy|ha)\b/gi, 'hai'],
  [/\b(hain|hen|hn)\b/gi, 'hain'],
  [/\b(aur\s+bhi|or\s+bhi)\b/gi, 'aur'],
  [/\b(or)\b/gi, 'aur'],

  // Road & KMC Infrastructure
  [/\b(sadak|sarrak|sadrak)\b/gi, 'sarak'],
  [/\b(tooti|tuti|toot\s+gayi|toot\s+gai|tot\s+gai)\b/gi, 'tooti'],
  [/\b(gadda|gadday|gaddhe|khadday|khadde|potholes|pothole)\b/gi, 'khadda'],
  [/\b(dhans\s+gayi|dhans\s+gai|baith\s+gayi)\b/gi, 'dhans gai'],
  [/\b(foot\s+path|sidewalk)\b/gi, 'footpath'],
  [/\b(street\s+light|streetlights|street\s+lights|battiyan)\b/gi, 'streetlight'],

  // Water & KWSC Sanitation
  [/\b(paani|paany)\b/gi, 'pani'],
  [/\b(gutters|gutr|guttr)\b/gi, 'gutter'],
  [/\b(sewerage|sewer|sewreg)\b/gi, 'sewage'],
  [/\b(manholes|menhole|man\s+hole)\b/gi, 'manhole'],
  [/\b(pipe\s+line|pipelin|pipe)\b/gi, 'pipeline'],
  [/\b(badboo|ganda\s+pani|badbu)\b/gi, 'badboo'],

  // Electricity & K-Electric Power
  [/\b(bijlee|electrcity|electrisity)\b/gi, 'bijli'],
  [/\b(transfomer|transfarmer|pmt)\b/gi, 'transformer'],
  [/\b(taar|wires|taarein)\b/gi, 'wire'],
  [/\b(chingari|sparking|dhamaka)\b/gi, 'spark'],
  [/\b(khamba|khambay|pole|poles)\b/gi, 'khamba'],

  // Gas & SSGC
  [/\b(sooi\s+gas|sui\s+gas)\b/gi, 'gas'],
  [/\b(leaking|leek)\b/gi, 'leak'],
  [/\b(kam\s+pressure|low\s+presure)\b/gi, 'low pressure'],

  // Waste & SSWMB
  [/\b(kachraa|koora|kura|rubbish|trash)\b/gi, 'kachra'],
  [/\b(dustbin|kachra\s+dabba)\b/gi, 'kundi'],
  [/\b(safai\s+nahi|safai\s+na\s+hona)\b/gi, 'safai nahi'],

  // Building & SBCA
  [/\b(imarat|emarat|building)\b/gi, 'building'],
  [/\b(daraar|daraarein|cracks)\b/gi, 'crack'],
  [/\b(girne\s+wali|collapse|gir\s+rahi)\b/gi, 'girne wali'],
  [/\b(ghair\s+qanooni|bila\s+ijazat)\b/gi, 'illegal construction'],
];

/**
 * Phonetic transliteration and spelling normalization for Roman Urdu complaints.
 */
export function normalizeRomanUrdu(text: string): string {
  if (!text) return '';
  let s = text.normalize('NFC');
  s = s.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
  s = s.replace(/[`'"'']/g, "'");
  s = s.replace(/[—–−]/g, '-');
  s = s.toLowerCase();
  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts dual word (1-2) + character (3-5 char_wb) n-grams with sublinear TF-IDF.
 */
function extractFeatures(text: string): Map<number, number> {
  const norm = normalizeRomanUrdu(text);
  const words = norm.split(/\s+/).filter(Boolean);
  const counts = new Map<number, number>();

  // 1. Word n-grams (1-2)
  for (let n = 1; n <= 2; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const term = 'w:' + words.slice(i, i + n).join(' ');
      const col = classifier.vocabulary[term];
      if (col !== undefined) {
        counts.set(col, (counts.get(col) ?? 0) + 1);
      }
    }
  }

  // 2. Character n-grams (3-5 within word boundaries)
  for (const word of words) {
    const padded = ` ${word} `;
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= padded.length - n; i++) {
        const term = 'c:' + padded.substring(i, i + n);
        const col = classifier.vocabulary[term];
        if (col !== undefined) {
          counts.set(col, (counts.get(col) ?? 0) + 1);
        }
      }
    }
  }

  let sumSq = 0;
  const weighted = new Map<number, number>();
  for (const [col, count] of counts) {
    const tf = classifier.sublinear_tf ? 1 + Math.log(count) : count;
    const val = tf * classifier.idf[col];
    weighted.set(col, val);
    sumSq += val * val;
  }

  const normL2 = Math.sqrt(sumSq) || 1;
  for (const [col, val] of weighted) {
    weighted.set(col, val / normL2);
  }

  return weighted;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Detects affirmative life-safety hazards with syntactic negation protection.
 */
export function detectHazard(text: string): { hasHazard: boolean; hazardType?: string } {
  const low = text.toLowerCase();
  for (const neg of classifier.hazard_negation_patterns) {
    if (new RegExp(neg, 'i').test(low)) {
      return { hasHazard: false };
    }
  }
  for (const aff of classifier.hazard_affirmative_patterns) {
    if (new RegExp(aff, 'i').test(low)) {
      let htype = 'emergency_hazard';
      if (/chingari|blast|dhamaka|taar|wire|current|electrocution/i.test(aff)) {
        htype = 'electrical_hazard';
      } else if (/gas|smell|odor|pipe\s+phat|hiss|fractur|ruptur|bhabka/i.test(aff)) {
        htype = 'gas_leak_hazard';
      } else if (/building|pillar|chhat|collapse/i.test(aff)) {
        htype = 'structural_hazard';
      }
      return { hasHazard: true, hazardType: htype };
    }
  }
  return { hasHazard: false };
}

/**
 * Causal relation resolver and consequence suppressor.
 */
function resolveIssueRelations(
  text: string,
  departments: DepartmentId[]
): {
  actionable: DepartmentId[];
  suppressed: Array<{ dept: DepartmentId; reason: string }>;
  isDualRepair: boolean;
  isAmbiguous: boolean;
} {
  const norm = normalizeRomanUrdu(text);
  const actionable: DepartmentId[] = [];
  const suppressed: Array<{ dept: DepartmentId; reason: string }> = [];

  // Consequence 1: Power out -> Motor stopped (Household water motor symptom is NOT KWSC defect)
  const isPowerOut = departments.includes('kelectric');
  const isMotorSymptom = /\b(motor\s+(nahi|band)|pani\s+ki\s+motor)\b/i.test(norm);
  const hasPublicWaterDefect = /\b(sarkari\s+line|main\s+line|pipeline\s+phat|peene\s+ka\s+pani\s+nahi)\b/i.test(norm);

  // Consequence 2: Sewer overflow -> Traffic jam (Traffic obstruction is NOT structural road defect)
  const isSewageDefect = departments.includes('kwsc');
  const isTrafficSymptom = /\b(traffic\s+(ruk|jam|slow)|road\s+geeli|sarak\s+geeli)\b/i.test(norm);
  const hasStructuralRoadDefect = /\b(khadda|pothole|gadda|sarak\s+toot|road\s+toot|dhans)\b/i.test(norm);

  // Dual Repair: Water main burst broke road surface
  const isWaterMainRoadCollapse =
    /\b(pipe|line|main)\s+(phat|burst).*\b(sarak|road)\s+(toot|damage|dhans)/i.test(norm) ||
    /\b(sarak|road)\s+(toot|damage|dhans).*\b(pipe|line)\s+(phat|burst)/i.test(norm);

  // Dual Repair: Road excavation ruptured gas line
  const isExcavationGasLeak =
    /\b(khudai|excavat).*\b(gas\s+line|pipeline\s+phat|gas\s+leak)/i.test(norm);

  const isDualRepair = isWaterMainRoadCollapse || isExcavationGasLeak;
  const isAmbiguous = /\b(shayad|ho\s+sakta\s+hai|lagta\s+hai|pata\s+nahi)\b/i.test(norm) && departments.length > 1;

  for (const dept of departments) {
    if (dept === 'kwsc' && isPowerOut && isMotorSymptom && !hasPublicWaterDefect && !isDualRepair) {
      suppressed.push({
        dept: 'kwsc',
        reason: 'Household water motor failure is a consequence of power outage, not a KWSC supply defect.',
      });
      continue;
    }
    if (dept === 'kmc' && isSewageDefect && isTrafficSymptom && !hasStructuralRoadDefect && !isDualRepair) {
      suppressed.push({
        dept: 'kmc',
        reason: 'Traffic obstruction or wet pavement is a consequence of sewer overflow, not an independent structural road defect.',
      });
      continue;
    }
    actionable.push(dept);
  }

  return {
    actionable,
    suppressed,
    isDualRepair,
    isAmbiguous,
  };
}

/**
 * Maps department IDs to actionable defect issue families.
 */
function mapIssueType(departmentId: DepartmentId, text: string): string {
  const low = text.toLowerCase();
  switch (departmentId) {
    case 'kmc':
      if (/street light|khamba toota|battiyan/i.test(low)) return 'kmc.street_lighting';
      if (/footpath|encroach|sidewalk/i.test(low)) return 'kmc.footpath_obstruction';
      if (/flyover|bridge|expansion/i.test(low)) return 'kmc.bridge_flyover';
      if (/nallah|barsati|storm/i.test(low)) return 'kmc.storm_drain';
      return 'kmc.road_damage';
    case 'kwsc':
      if (/gutter|sewer|sewerage|manhole/i.test(low)) return 'kwsc.sewage_overflow';
      if (/badboo|contaminated|ganda pani/i.test(low)) return 'kwsc.water_contamination';
      if (/line\s+(leak|phat)|pipeline|burst|leakage|main\s+line/i.test(low)) return 'kwsc.water_leak';
      return 'kwsc.water_shortage';
    case 'kelectric':
      if (/chingari|blast|dhamaka|spark/i.test(low)) return 'kelectric.sparking_wire';
      if (/taar toot|taar gir|wire fall|khamba tedha/i.test(low)) return 'kelectric.fallen_wire_hazard';
      return 'kelectric.power_outage';
    case 'ssgc':
      if (/(pressure\s+(kam|low)|low\s+pressure|chulha\s+nahi)/i.test(low)) {
        if (!/(leak\s+hai|tez\s+boo|aag\s+lag)/i.test(low)) return 'ssgc.low_pressure';
      }
      if (/leak|smell|odor|hiss|blast|phat/i.test(low) && !/leak\s+nahi/i.test(low)) return 'ssgc.gas_leak_hazard';
      return 'ssgc.low_pressure';
    case 'sswmb':
      if (/dead animal|janwar|carcass/i.test(low)) return 'sswmb.carcass_removal';
      if (/safai nahi|sweeping/i.test(low)) return 'sswmb.sweeping_neglect';
      return 'sswmb.garbage_dump';
    case 'sbca':
      if (/crack|daraar|pillar|girne|collapse|chhat/i.test(low)) return 'sbca.structural_hazard';
      return 'sbca.illegal_construction';
    default:
      return `${departmentId}.general`;
  }
}

/**
 * Extracts supporting text clauses for an assigned department.
 */
function extractEvidenceSpan(text: string, departmentId: DepartmentId): string {
  const clauses = text.split(/(?:,|\.|\baur\b|\bsath\s+hi\b|\bjabke\b|\blekin\b)/i);
  const deptTerms: Record<DepartmentId, RegExp> = {
    kmc: /\b(sadak|sarak|road|khadda|gadda|footpath|street light|flyover|nallah|asphalt)\b/i,
    kwsc: /\b(pani|paani|water|gutter|sewer|sewerage|manhole|tanker|pipeline)\b/i,
    kelectric: /\b(bijli|current|light|feeder|transformer|pmt|voltage|taar|wire|pole|khamba)\b/i,
    ssgc: /\b(gas|sooi gas|sui gas|pressure|leak|chulha|cylinder)\b/i,
    sswmb: /\b(kachra|koora|kura|malba|kundi|solid waste|garbage|safai)\b/i,
    sbca: /\b(building|plaza|imarat|tameer|construction|manzil|chhat|pillar|crack|daraar)\b/i,
    unassigned: /.*/,
  };

  const pattern = deptTerms[departmentId] || /.*/;
  const matched = clauses.find((c) => pattern.test(c));
  return (matched || text).trim();
}

/**
 * Full Phase V10 Multi-Department Classification Engine.
 */
export function classifyMultiLabel(
  text: string,
  options?: { hasLocation?: boolean }
): MultiLabelClassificationResult {
  const vector = extractFeatures(text);
  const logits: Partial<Record<DepartmentId, number>> = {};
  const probabilities: Partial<Record<DepartmentId, number>> = {};
  const initialDepartments: DepartmentId[] = [];

  for (let c = 0; c < classifier.classes.length; c++) {
    const dept = classifier.classes[c] as DepartmentId;
    let score = classifier.intercept[c];
    for (const [col, val] of vector) {
      if (classifier.coef[c][col]) {
        score += classifier.coef[c][col] * val;
      }
    }
    const prob = sigmoid(score);
    logits[dept] = score;
    probabilities[dept] = prob;

    const threshold = classifier.thresholds[dept] ?? 0.50;
    if (prob >= threshold) {
      initialDepartments.push(dept);
    }
  }

  // Sort by descending probability
  initialDepartments.sort((a, b) => (probabilities[b] ?? 0) - (probabilities[a] ?? 0));

  // Run Causal Relation & Disambiguation Engine
  const relationResult = resolveIssueRelations(text, initialDepartments);
  const selectedDepartments = relationResult.actionable;

  const maxProb = selectedDepartments.length > 0
    ? Math.max(...selectedDepartments.map((d) => probabilities[d] ?? 0))
    : Math.max(...(Object.values(probabilities) as number[]));

  const autoRouteGate = classifier.auto_route_confidence_gate ?? 0.60;
  const isMultiLabel = selectedDepartments.length > 1;
  const hazardInfo = detectHazard(text);

  let needsReview = false;
  let reviewReason: string | undefined = undefined;

  if (selectedDepartments.length === 0) {
    needsReview = true;
    reviewReason = 'NO_DEPARTMENT_MET_CONFIDENCE_THRESHOLD';
  } else if (relationResult.isAmbiguous) {
    needsReview = true;
    reviewReason = 'AMBIGUOUS_CAUSE_EFFECT';
  } else if (options?.hasLocation === false) {
    // Decoupled location completeness gate: Service is identified, but location is missing!
    needsReview = true;
    reviewReason = 'INCOMPLETE_PUBLIC_LOCATION';
  } else if (maxProb < autoRouteGate) {
    needsReview = true;
    reviewReason = 'PREDICTION_BELOW_AUTO_ROUTE_GATE';
  }

  const issues = selectedDepartments.map((dept) => ({
    departmentId: dept,
    issueType: mapIssueType(dept, text),
    evidenceSpan: extractEvidenceSpan(text, dept),
    confidence: probabilities[dept] ?? 0,
  }));

  const relations = selectedDepartments.map((dept) => ({
    fromDept: dept,
    toDept: dept,
    type: relationResult.isDualRepair ? 'SAME_INCIDENT_DIFFERENT_REPAIRS' : 'INDEPENDENT',
    actionable: true,
  }));

  return {
    departments: selectedDepartments,
    primaryDepartment: selectedDepartments[0] || undefined,
    confidence: maxProb,
    probabilities: probabilities as Record<DepartmentId, number>,
    decisionScores: logits as Record<DepartmentId, number>,
    isMultiLabel,
    needsReview,
    reviewReason,
    hasHazard: hazardInfo.hasHazard,
    hazardType: hazardInfo.hazardType,
    modelVersion: classifier.model_version,
    issues,
    relations,
  };
}

/**
 * Reconciles independent child issue statuses into a single aggregate citizen status.
 */
export function computeAggregateStatus(
  issues: Array<{ status: ComplaintStatus }>,
  parentReview = false
): ComplaintStatus {
  if (parentReview) return 'under_review';
  if (!issues || issues.length === 0) return 'submitted';

  const statuses = issues.map((i) => i.status);

  // If all are completed
  if (statuses.every((s) => s === 'resolved')) {
    return 'resolved';
  }

  // If all are rejected
  if (statuses.every((s) => s === 'rejected')) {
    return 'rejected';
  }

  // If some are resolved and some rejected
  if (statuses.every((s) => s === 'resolved' || s === 'rejected')) {
    return 'partly_resolved';
  }

  // If any is in_progress
  if (statuses.some((s) => s === 'in_progress')) {
    if (statuses.some((s) => s === 'resolved')) {
      return 'partly_resolved';
    }
    return 'in_progress';
  }

  // If any is accepted
  if (statuses.some((s) => s === 'accepted')) {
    return 'accepted';
  }

  // If all are under_review
  if (statuses.every((s) => s === 'under_review')) {
    return 'under_review';
  }

  return 'assigned';
}
