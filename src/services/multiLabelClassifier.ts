/**
 * AWAAZ-E-AWAM — Multi-Department Multi-Label Civic Classification Engine
 * Pure TypeScript implementation providing exact parity with scikit-learn OneVsRest logistic regression.
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
  ngram_range: [number, number];
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
}

/**
 * Phonetic transliteration normalization for high-variance Roman Urdu text.
 * Standardizes common dialectal and orthographic endings into canonical forms.
 */
export function normalizeRomanUrdu(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\bbijlee\b|\bbijlii\b|\bbijly\b|\bbatti\b/g, 'bijli')
    .replace(/\bpaani\b|\bpany\b|\bpaney\b/g, 'pani')
    .replace(/\bgadda\b|\bkhadday\b|\bcrater\b/g, 'khadda')
    .replace(/\bsarak\b|\bsadq\b/g, 'sadak')
    .replace(/\bgutar\b|\bgatar\b|\bgater\b/g, 'gutter')
    .replace(/\bkoora\b|\bkura\b|\bkuchra\b/g, 'kachra')
    .replace(/\bsooi\s+gas\b|\bsui\s+gas\b/g, 'ssgc gas');
}

/**
 * Extracts sublinear TF-IDF features matching Python scikit-learn TfidfVectorizer.
 */
function extractFeatures(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  const normalized = normalizeRomanUrdu(text);
  const words = normalized.match(/\b\w\w+\b/gu) ?? [];

  for (let i = 0; i < words.length; i++) {
    const unigram = words[i];
    const col1 = classifier.vocabulary[unigram];
    if (col1 !== undefined) {
      counts.set(col1, (counts.get(col1) ?? 0) + 1);
    }

    if (classifier.ngram_range[1] >= 2 && i < words.length - 1) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const col2 = classifier.vocabulary[bigram];
      if (col2 !== undefined) {
        counts.set(col2, (counts.get(col2) ?? 0) + 1);
      }
    }
  }

  let norm = 0;
  for (const [col, count] of counts) {
    const tf = classifier.sublinear_tf ? 1 + Math.log(count) : count;
    const weighted = tf * classifier.idf[col];
    counts.set(col, weighted);
    norm += weighted * weighted;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [col, weighted] of counts) {
    counts.set(col, weighted / norm);
  }
  return counts;
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
      if (/line leak|pipeline phat|burst|leakage/i.test(low)) return 'kwsc.water_leak';
      return 'kwsc.water_shortage';
    case 'kelectric':
      if (/chingari|blast|dhamaka|spark/i.test(low)) return 'kelectric.sparking_wire';
      if (/taar toot|taar gir|wire fall|khamba tedha/i.test(low)) return 'kelectric.fallen_wire_hazard';
      return 'kelectric.power_outage';
    case 'ssgc':
      if (/leak|smell|odor|hiss|blast|phat/i.test(low)) return 'ssgc.gas_leak_hazard';
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
 * Full Multi-Department Classification Engine.
 */
export function classifyMultiLabel(text: string): MultiLabelClassificationResult {
  const vector = extractFeatures(text);
  const logits: Partial<Record<DepartmentId, number>> = {};
  const probabilities: Partial<Record<DepartmentId, number>> = {};
  const selectedDepartments: DepartmentId[] = [];

  for (let c = 0; c < classifier.classes.length; c++) {
    const dept = classifier.classes[c] as DepartmentId;
    let score = classifier.intercept[c];
    for (const [col, val] of vector) {
      score += classifier.coef[c][col] * val;
    }
    const prob = sigmoid(score);
    logits[dept] = score;
    probabilities[dept] = prob;

    const threshold = classifier.thresholds[dept] ?? 0.50;
    if (prob >= threshold) {
      selectedDepartments.push(dept);
    }
  }

  // Sort selected departments by descending probability
  selectedDepartments.sort((a, b) => (probabilities[b] ?? 0) - (probabilities[a] ?? 0));

  const maxProb = Math.max(...(Object.values(probabilities) as number[]));
  const autoRouteGate = classifier.auto_route_confidence_gate ?? 0.65;
  const isMultiLabel = selectedDepartments.length > 1;
  const hazardInfo = detectHazard(text);

  let needsReview = false;
  let reviewReason: string | undefined = undefined;

  if (selectedDepartments.length === 0) {
    needsReview = true;
    reviewReason = 'NO_DEPARTMENT_MET_CONFIDENCE_THRESHOLD';
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
    return 'in_progress';
  }

  // If any is accepted
  if (statuses.some((s) => s === 'accepted')) {
    return 'accepted';
  }

  // If all are assigned
  if (statuses.every((s) => s === 'assigned')) {
    return 'assigned';
  }

  if (statuses.some((s) => s === 'under_review')) {
    return 'under_review';
  }

  return 'assigned';
}
