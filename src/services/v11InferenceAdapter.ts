/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V11 Compatible Inference Adapter
 *
 * Implements:
 * - Dual-track Word (1-2) + Character WB (3-5) Sublinear TF-IDF extraction matching scikit-learn.
 * - 3-Fold Platt calibrated sigmoid ensemble inference from candidate_model.json.
 * - CivicRelationResolver rule engine for contextual disambiguation and consequence suppression.
 * - Safe conversion to MultiLabelModelArtifact (V10 contract) for backward compatibility.
 *
 * NOTE: V11 model remains in candidate status and is NOT active in the citizen runtime.
 */
import type { DepartmentId } from '../types';
import type { MultiLabelModelArtifact } from './multiLabelClassifier';
import {
  analyzeComplaintRelationAware,
  type IssueCandidate,
  type RelationEdge,
  type RelationType,
} from './relationEngine';

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
}

export interface V11ClassifierCalibratedFold {
  coef: number[];
  intercept: number[];
  a: number;
  b: number;
}

export interface V11DepartmentClassifier {
  calibrated: V11ClassifierCalibratedFold[];
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
  const textLower = (text || '').toLowerCase().trim();
  const wordVocabSize = Object.keys(artifact.word_vocab).length;
  const charVocabSize = Object.keys(artifact.char_vocab).length;
  const totalFeatures = wordVocabSize + charVocabSize;
  const featureVector = new Float64Array(totalFeatures);

  // 1. Word n-grams (1-2) using scikit-learn token_pattern r"(?u)\b\w\w+\b"
  const wordTokens = textLower.match(/[a-zA-Z0-9_]{2,}/g) || [];
  const wordCounts = new Map<number, number>();

  for (let i = 0; i < wordTokens.length; i++) {
    // Unigram
    const uni = wordTokens[i];
    const uniIdx = artifact.word_vocab[uni];
    if (uniIdx !== undefined) {
      wordCounts.set(uniIdx, (wordCounts.get(uniIdx) ?? 0) + 1);
    }

    // Bigram
    if (i < wordTokens.length - 1) {
      const bi = `${uni} ${wordTokens[i + 1]}`;
      const biIdx = artifact.word_vocab[bi];
      if (biIdx !== undefined) {
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
    const padded = ` ${word} `;
    const len = padded.length;
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= len - n; i++) {
        const sub = padded.substring(i, i + n);
        const col = artifact.char_vocab[sub];
        if (col !== undefined) {
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
    /\b(?:khadda|khadday|gadda|gadday|pothole|potholes|toota|tooti|damaged?|crater|dhans|asphalt|carpeting|encroachment|thela|vendor)\b/i;

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
    if (!/\b(?:sarkari|main|public)\s+water\s+line\b|\bpani\s+ki\s+supply\s+band\b/i.test(low)) {
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
 * Executes issue-centric, relation-aware classification on Roman Urdu complaint text.
 * Integrates statistical TF-IDF features with affirmative domain defect evidence,
 * candidate span decomposition, and pairwise relation resolution.
 */
export function classifyV11RelationAware(
  text: string,
  artifact: V11ModelArtifact,
  complaintId?: string
): V11RelationAwareResult {
  const features = extractV11Features(text, artifact);
  const rawProbabilities = predictV11RawProbabilities(features, artifact);
  const relationResult = analyzeComplaintRelationAware(text, complaintId);

  // Calibrate probabilities according to affirmative issue evidence
  const calibratedProbs = { ...rawProbabilities };
  for (const dept of artifact.departments) {
    if (relationResult.proposed_departments.includes(dept)) {
      calibratedProbs[dept] = Math.max(calibratedProbs[dept], 0.85);
    } else {
      // If no affirmative defect was grounded, cap probability below threshold
      const maxPermitted = (artifact.thresholds[dept] ?? 0.5) * 0.4;
      calibratedProbs[dept] = Math.min(calibratedProbs[dept], maxPermitted);
    }
  }

  return {
    departments: relationResult.proposed_departments,
    probabilities: calibratedProbs,
    rawProbabilities,
    relation: relationResult.relation_summary,
    issueCandidates: relationResult.issue_candidates,
    edges: relationResult.edges,
    needsReview: relationResult.needs_review,
    reviewReason: relationResult.review_reason,
    missingPublicLocation: relationResult.missing_public_location,
    notes: relationResult.reason_trace,
  };
}
