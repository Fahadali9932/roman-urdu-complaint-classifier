/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V13.4 Causal Classification & False-Extra Reduced Engine
 *
 * Combines:
 * 1. Non-destructive Roman Urdu Normalization (V13.2).
 * 2. Typed Issue Relation Graph with Causal & Spatial Grounding (V13.4).
 * 3. Strict Multi-Department Evidence Verification (False-Extra Reduction).
 * 4. Dual-Track TF-IDF + Platt-calibrated ML Inference (Frozen Run004/Run006 weights).
 * 5. Single Authoritative Decision Record & Grounded Multi-Issue Summaries.
 */

import { DepartmentId, buildIssueRelationGraph, IssueGraphResult, CausalChainRecord } from './issueRelationGraph';
import { normalizeRomanUrduV13_2 } from '../v13_2/romanUrduNormalizer';
import {
  V11ModelArtifact,
  extractV11Features,
  predictV11RawProbabilities,
  resolveV11CivicRelations,
  ambiguousWaterPower,
  ambiguousIncompleteSecondary,
  ambiguousLandmarkAsset,
  ambiguousResolvedHistorical,
  buildLandmarkQuestion,
  buildHistoricalQuestion,
  WATER_POWER,
  INCOMPLETE_SECONDARY,
  DESCRIBE_ISSUE,
  ClarificationAnswer,
} from '../../../supabase/functions/_shared/v11-engine';

const MAX_WORDS = 200;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export type V13_4UnderstandingResult =
  | { state: 'invalid'; reason: 'EMPTY' | 'WORD_LIMIT' }
  | { state: 'ask'; question: any; prediction: V13_4Result }
  | { state: 'review'; reason: string; prediction: V13_4Result }
  | {
      state: 'ready';
      departments: DepartmentId[];
      prediction: V13_4Result;
      confirmedFact?: string;
      supplemented?: boolean;
    };

export interface DepartmentDecisionRecord {
  department: DepartmentId;
  departmentName: string;
  status: 'SELECTED' | 'REJECTED' | 'SUPPRESSED';
  probability: number;
  threshold: number;
  evidenceSpans: string[];
  decisionSource:
    | 'CIVIC_GROUNDING'
    | 'STATISTICAL_ML'
    | 'HYBRID'
    | 'THRESHOLD_FAIL'
    | 'CAUSAL_SUPPRESSION'
    | 'LOCATION_SUPPRESSION'
    | 'NEGATION_SUPPRESSION'
    | 'HISTORICAL_SUPPRESSION'
    | 'UNGROUNDED_EXTRA_REJECTED';
  reason: string;
}

export interface V13_4Result {
  departments: DepartmentId[];
  probabilities: Record<DepartmentId, number>;
  rawProbabilities: Record<DepartmentId, number>;
  thresholds: Record<DepartmentId, number>;
  graph: IssueGraphResult;
  issueCandidates: any[];
  decisionRecords: DepartmentDecisionRecord[];
  needsReview: boolean;
  reviewReason: string | null;
  notes: string[];
  modelVersion: string;
  decisionPolicy: string;
}

const DEPT_NAMES: Record<DepartmentId, string> = {
  kelectric: 'K-Electric',
  kmc: 'Karachi Metropolitan Corporation (KMC)',
  kwsc: 'Karachi Water & Sewerage Corporation (KWSC)',
  ssgc: 'Sui Southern Gas Company (SSGC)',
  sswmb: 'Sindh Solid Waste Management Board (SSWMB)',
  sbca: 'Sindh Building Control Authority (SBCA)',
};

export const V13_4_DECISION_POLICY = 'v13_4_causal_reasoning_and_false_extra_reduced_v1';

export function classifyV13_4(
  rawText: string,
  artifact: V11ModelArtifact
): V13_4Result {
  const normalizedText = normalizeRomanUrduV13_2(rawText);
  const graph = buildIssueRelationGraph(rawText);

  // 1. Dual-Track TF-IDF extraction on normalized text
  const features = extractV11Features(normalizedText, artifact);
  const rawProbabilities = predictV11RawProbabilities(features, artifact);
  const { resolvedProbs: civicProbs } = resolveV11CivicRelations(normalizedText, rawProbabilities);

  const finalDepartmentsSet = new Set<DepartmentId>();
  const groundedDepts = new Set<DepartmentId>();
  const mlSelectedDepts = new Set<DepartmentId>();
  const rejectedReasons = new Map<DepartmentId, { source: DepartmentDecisionRecord['decisionSource']; reason: string }>();

  // 2. Add all departments grounded by affirmative independent issues
  for (const dept of graph.actionableDepartments) {
    finalDepartmentsSet.add(dept);
    groundedDepts.add(dept);
  }

  // Record explicit suppressions from the graph
  for (const issue of graph.issues) {
    if (!issue.isActionable) {
      if (issue.relationship === 'CONSEQUENCE_OF') {
        rejectedReasons.set(issue.department, {
          source: 'CAUSAL_SUPPRESSION',
          reason: `Demoted per Fahad's Causal Rule: ${issue.reason}`,
        });
      } else if (issue.relationship === 'ASSET_LOCATION_ONLY') {
        rejectedReasons.set(issue.department, {
          source: 'LOCATION_SUPPRESSION',
          reason: issue.reason,
        });
      } else if (issue.relationship === 'NEGATED') {
        rejectedReasons.set(issue.department, {
          source: 'NEGATION_SUPPRESSION',
          reason: issue.reason,
        });
      } else if (issue.relationship === 'RESOLVED_OR_HISTORICAL') {
        rejectedReasons.set(issue.department, {
          source: 'HISTORICAL_SUPPRESSION',
          reason: issue.reason,
        });
      }
    }
  }

  // 3. Evaluate Statistical ML Candidates with Conservative Evidence Gates (False-Extra Reduction)
  // Sort candidate departments by margin above threshold descending so highest confidence ML candidate is considered first
  const sortedDepts = [...artifact.departments].sort((a, b) => {
    const threshA = a === 'sbca' ? Math.min(artifact.thresholds[a] ?? 0.5, 0.4) : (artifact.thresholds[a] ?? 0.5);
    const threshB = b === 'sbca' ? Math.min(artifact.thresholds[b] ?? 0.5, 0.4) : (artifact.thresholds[b] ?? 0.5);
    const marginA = (civicProbs[a] ?? 0) - threshA;
    const marginB = (civicProbs[b] ?? 0) - threshB;
    return marginB - marginA;
  });

  for (const dept of sortedDepts) {
    // If explicitly suppressed or location-only, do not allow ML to revive
    if (graph.suppressedDepartments.includes(dept) || graph.locationOnlyDepartments.includes(dept)) {
      continue;
    }

    let thresh = artifact.thresholds[dept] ?? 0.50;
    if (dept === 'sbca') thresh = Math.min(thresh, 0.40);

    const prob = civicProbs[dept] ?? 0;

    if (prob >= thresh) {
      if (finalDepartmentsSet.size === 0) {
        // Zero grounded departments: ML model can provide primary routing candidate
        if (dept === 'kmc') {
          const hasAffirmativeRoadDamage =
            /\b(?:toot|toota|tooti|toote|tut|tuta|tuti|tute|khadda|khadday|gaddha|crater|pothole|dhans|asphalt|damaged|street\s*light\s*fuse)\b/i.test(
              normalizedText
            );
          if (!hasAffirmativeRoadDamage) {
            rejectedReasons.set('kmc', {
              source: 'LOCATION_SUPPRESSION',
              reason: 'Road mentioned as location without affirmative structural damage',
            });
            continue;
          }
        }
        finalDepartmentsSet.add(dept);
        mlSelectedDepts.add(dept);
      } else {
        // Multi-department candidate evaluation
        const alreadyGrounded = groundedDepts.has(dept);
        if (alreadyGrounded) {
          mlSelectedDepts.add(dept);
        } else {
          // Extra ungrounded department: require affirmative defect mention in text
          const hasAffirmativeDomainDefect = hasAffirmativeDefectForDept(dept, normalizedText);
          if (hasAffirmativeDomainDefect && prob >= thresh) {
            finalDepartmentsSet.add(dept);
            mlSelectedDepts.add(dept);
          } else {
            rejectedReasons.set(dept, {
              source: 'UNGROUNDED_EXTRA_REJECTED',
              reason: `Unsubstantiated multi-department candidate: ML prob (${prob.toFixed(2)}) passed threshold but lacks affirmative grounded defect evidence in complaint text`,
            });
          }
        }
      }
    } else {
      if (!rejectedReasons.has(dept)) {
        rejectedReasons.set(dept, {
          source: 'THRESHOLD_FAIL',
          reason: `Below decision threshold (prob: ${prob.toFixed(2)} < ${thresh.toFixed(2)}); no affirmative defect reported`,
        });
      }
    }
  }

  // 4. Strict Causal Consequence Enforcement
  const demotedChains: CausalChainRecord[] = [];
  for (const chain of graph.causalChains) {
    if (finalDepartmentsSet.has(chain.consequenceDept) && finalDepartmentsSet.has(chain.rootDept)) {
      finalDepartmentsSet.delete(chain.consequenceDept);
      demotedChains.push(chain);
      rejectedReasons.set(chain.consequenceDept, {
        source: 'CAUSAL_SUPPRESSION',
        reason: `Demoted per Fahad's Causal Rule: ${chain.explanation}`,
      });
    }
  }

  const departments = Array.from(finalDepartmentsSet).sort();

  // Calibrate output probabilities: selected depts get >= threshold
  const calibratedProbs: Record<DepartmentId, number> = { ...civicProbs };
  for (const dept of artifact.departments) {
    const thresh = artifact.thresholds[dept] ?? 0.50;
    if (departments.includes(dept)) {
      calibratedProbs[dept] = Math.max(calibratedProbs[dept], thresh);
    } else {
      calibratedProbs[dept] = Math.min(calibratedProbs[dept], thresh * 0.4);
    }
  }

  // Determine Needs Review
  let needsReview = false;
  let reviewReason: string | null = null;

  if (departments.length === 0) {
    needsReview = true;
    reviewReason = 'NO_DEPARTMENT_MET_THRESHOLD';
  }

  // 5. Build Authoritative Decision Records per Department
  const decisionRecords: DepartmentDecisionRecord[] = artifact.departments.map((dept) => {
    const thresh = artifact.thresholds[dept] ?? 0.50;
    const prob = calibratedProbs[dept] ?? 0;
    const isSelected = departments.includes(dept);
    const isGrounded = groundedDepts.has(dept);
    const passedML = mlSelectedDepts.has(dept);
    const deptIssues = graph.issues.filter((iss) => iss.department === dept);
    const evidenceSpans = deptIssues.map((iss) => iss.normalizedSpan);

    if (isSelected) {
      if (isGrounded && passedML) {
        return {
          department: dept,
          departmentName: DEPT_NAMES[dept] || dept.toUpperCase(),
          status: 'SELECTED',
          probability: prob,
          threshold: thresh,
          evidenceSpans,
          decisionSource: 'HYBRID',
          reason: `Grounded affirmative civic defect and model passed decision threshold (prob: ${prob.toFixed(2)} >= ${thresh.toFixed(2)})`,
        };
      } else if (isGrounded) {
        return {
          department: dept,
          departmentName: DEPT_NAMES[dept] || dept.toUpperCase(),
          status: 'SELECTED',
          probability: prob,
          threshold: thresh,
          evidenceSpans,
          decisionSource: 'CIVIC_GROUNDING',
          reason: `Grounded independent civic defect in complaint text: "${evidenceSpans[0] || 'direct defect'}"`,
        };
      } else {
        return {
          department: dept,
          departmentName: DEPT_NAMES[dept] || dept.toUpperCase(),
          status: 'SELECTED',
          probability: prob,
          threshold: thresh,
          evidenceSpans,
          decisionSource: 'STATISTICAL_ML',
          reason: `Statistical ML candidate passed decision threshold (prob: ${prob.toFixed(2)} >= ${thresh.toFixed(2)})`,
        };
      }
    } else {
      const rej = rejectedReasons.get(dept);
      return {
        department: dept,
        departmentName: DEPT_NAMES[dept] || dept.toUpperCase(),
        status: rej?.source.includes('SUPPRESSION') ? 'SUPPRESSED' : 'REJECTED',
        probability: prob,
        threshold: thresh,
        evidenceSpans,
        decisionSource: rej?.source || 'THRESHOLD_FAIL',
        reason: rej?.reason || `Below decision threshold (prob: ${prob.toFixed(2)} < ${thresh.toFixed(2)})`,
      };
    }
  });

  // Build human-readable issue candidates
  const issueCandidates = graph.issues.map((iss, idx) => ({
    span_id: `iss-${iss.department}-${idx + 1}`,
    department: iss.department,
    span_text: iss.rawSpan,
    normalized_text: iss.normalizedSpan,
    defect_evidence: [iss.defect || 'Civic Defect'],
    is_actionable: iss.isActionable,
    mention_type: iss.relationship === 'INDEPENDENT' ? 'Actionable Repair' : iss.relationship,
    is_contextual_landmark: iss.relationship === 'ASSET_LOCATION_ONLY',
    is_historical_or_resolved: iss.relationship === 'RESOLVED_OR_HISTORICAL',
    relationship: iss.relationship,
    reason: iss.reason,
  }));

  const notes = decisionRecords
    .filter((d) => d.status === 'SELECTED')
    .map((d) => `[SELECTED] ${d.department.toUpperCase()}: ${d.reason}`);

  return {
    departments,
    probabilities: calibratedProbs,
    rawProbabilities,
    thresholds: artifact.thresholds,
    graph,
    issueCandidates,
    decisionRecords,
    needsReview,
    reviewReason,
    notes,
    modelVersion: 'v11-candidate-1-v13.4',
    decisionPolicy: V13_4_DECISION_POLICY,
  };
}

/**
 * Checks if a complaint contains affirmative defect tokens for a candidate department.
 */
function hasAffirmativeDefectForDept(dept: DepartmentId, text: string): boolean {
  switch (dept) {
    case 'kelectric':
      return /\b(?:bijli|light|transformer|tranforma|voltage|feeder|wire|taar|pole|khamba)\b/i.test(text) &&
             /\b(?:nahi\s+aa\s+rahi|nahi\s+arhi|band|trip|spark|dhamaka|blast|phat|jal|smoke|latak|low\s+voltage)\b/i.test(text);
    case 'kwsc':
      return /\b(?:pani|paani|water|sewerage|sewer|gutter|manhole|water\s*board|main\s*line)\b/i.test(text) &&
             /\b(?:nahi\s+aa\s+raha|nahi\s+ara|band|sookha|qillat|leak|burst|phat|overflow|ubal|choke|block|ganda|open|khula|missing)\b/i.test(text);
    case 'kmc':
      return /\b(?:road|sarak|sadak|rod|street|gali|footpath|underpass|asphalt)\b/i.test(text) &&
             /\b(?:toot|toota|tooti|tut|tuta|khadda|khadday|gaddha|crater|pothole|dhans|asphalt|damaged)\b/i.test(text) ||
             /\b(?:street\s*lights?|batti)\b/i.test(text) && /\b(?:fuse|fuses|nahi\s+jal|andhera)\b/i.test(text);
    case 'ssgc':
      return /\b(?:gas|sui\s*gas|chulha)\b/i.test(text) &&
             /\b(?:nahi\s+aa\s+rahi|band|low\s+pressure|zero\s+pressure|leak|smell|gas\s*boo|dhamaka|khana\s+nahi\s+pak|hiss|nikal\s*rahi)\b/i.test(text);
    case 'sswmb':
      return /\b(?:kachra|kooda|safai|dustbin|dumpster|kundi|sweeper|malba)\b/i.test(text) &&
             /\b(?:dher|nahi\s+uthaya|bikhra|gandagi|badboo|sad\s+raha|kachra\s+para|jama\s+hai)\b/i.test(text);
    case 'sbca':
      return /\b(?:building|imarat|plaza|makan|chhat|pillar|beam|plinth|construction)\b/i.test(text) &&
             /\b(?:illegal|ghair\s+qanooni|bina\s+permit|extra\s+floor|crack|daraar|girne\s+wali|baghair\s+noc|baith\s*rahi|toot)\b/i.test(text);
    default:
      return false;
  }
}

/**
 * Assesses complaint draft pre-submission for the citizen website and local preview.
 */
export function assessComplaintDraftV13_4(
  rawText: string,
  artifact: V11ModelArtifact
): V13_4UnderstandingResult {
  if (!rawText.trim()) return { state: 'invalid', reason: 'EMPTY' };
  if (words(rawText) > MAX_WORDS) return { state: 'invalid', reason: 'WORD_LIMIT' };

  const prediction = classifyV13_4(rawText, artifact);
  const normalized = normalizeRomanUrduV13_2(rawText);

  // 1. Water vs Power Outage Causality Check
  // If causal consequence was already recognized and suppressed by graph, do NOT trigger clarification question
  if (ambiguousWaterPower(normalized, prediction as any) && prediction.graph.causalChains.length === 0) {
    return { state: 'ask', question: WATER_POWER, prediction };
  }

  // 2. Incomplete Secondary Issue Check
  if (ambiguousIncompleteSecondary(normalized, prediction as any)) {
    return { state: 'ask', question: INCOMPLETE_SECONDARY, prediction };
  }

  // 3. Landmark Asset Ambiguity Check
  const landmarkDept = ambiguousLandmarkAsset(prediction as any);
  if (landmarkDept) {
    return { state: 'ask', question: buildLandmarkQuestion(landmarkDept), prediction };
  }

  // 4. Resolved / Historical Defect Ambiguity Check
  const historicalDept = ambiguousResolvedHistorical(prediction as any);
  if (historicalDept) {
    return { state: 'ask', question: buildHistoricalQuestion(historicalDept), prediction };
  }

  // 5. Completely vague draft with zero actionable departments
  if (prediction.departments.length === 0) {
    return { state: 'ask', question: DESCRIBE_ISSUE, prediction };
  }

  // 6. Administrative Review for flagged issues
  if (prediction.needsReview) {
    return { state: 'review', reason: prediction.reviewReason || 'REQUIRES_ADMIN_REVIEW', prediction };
  }

  return { state: 'ready', departments: [...prediction.departments], prediction };
}

/**
 * Resolves clarification answers against the V13.4 candidate.
 */
export function resolveComplaintClarificationV13_4(
  rawText: string,
  answer: ClarificationAnswer,
  artifact: V11ModelArtifact
): V13_4UnderstandingResult {
  const current = assessComplaintDraftV13_4(rawText, artifact);
  const prediction = 'prediction' in current ? current.prediction : classifyV13_4(rawText, artifact);
  const review = (reason: string): V13_4UnderstandingResult => ({ state: 'review', reason, prediction });

  if (answer.draftText !== rawText) {
    return review('STALE_CLARIFICATION');
  }

  if (current.state !== 'ask') return current;

  if (answer.questionId !== current.question.id) {
    return review('STALE_CLARIFICATION');
  }
  if ('skip' in answer) return review('CLARIFICATION_SKIPPED');

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
    return {
      state: 'ready',
      departments: [...departments].sort(),
      prediction,
      confirmedFact:
        answer.choice === 'independent_supply'
          ? 'Public water supply has separate issue'
          : 'Only domestic water motor affected',
    };
  }

  if (answer.questionId === 'describe_issue' && 'details' in answer) {
    const combined = `${rawText} ${answer.details}`.trim();
    return assessComplaintDraftV13_4(combined, artifact);
  }

  return {
    state: 'ready',
    departments: [...prediction.departments].sort(),
    prediction,
  };
}
