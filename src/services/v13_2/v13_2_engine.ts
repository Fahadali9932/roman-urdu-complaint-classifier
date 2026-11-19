/**
 * AWAAZ-E-AWAM — Phase V13.2 Authoritative Classification & Issue Understanding Engine
 *
 * Combines:
 * 1. Non-destructive Roman Urdu Normalization (spelling robustness, missing spaces, letter repetition).
 * 2. Multi-Issue Discourse Extraction (unpunctuated clauses, multi-fault paragraphs).
 * 3. Causal Consequence & Fahad's Routing Rule Enforcement (root fault vs consequence).
 * 4. Dual-Track TF-IDF + 3-Fold Platt Calibrated ML Inference (reusing frozen Run004/Run006 weights).
 * 5. Spatial Anchor De-biasing for KMC & Calibrated Thresholding for SBCA.
 */

import { DepartmentId, extractMunicipalIssuesV13_2, ExtractionResult } from './issueExtractor';
import { normalizeRomanUrduV13_2 } from './romanUrduNormalizer';
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

export interface V13_2Result {
  departments: DepartmentId[];
  probabilities: Record<DepartmentId, number>;
  rawProbabilities: Record<DepartmentId, number>;
  extraction: ExtractionResult;
  issueCandidates: any[];
  needsReview: boolean;
  reviewReason: string | null;
  notes: string[];
  modelVersion: string;
  decisionPolicy: string;
}

export type V13_2UnderstandingResult =
  | { state: 'ready'; departments: DepartmentId[]; prediction: V13_2Result }
  | { state: 'ask'; question: any; prediction: V13_2Result }
  | { state: 'review'; reason: string; prediction: V13_2Result }
  | { state: 'invalid'; reason: 'EMPTY' | 'WORD_LIMIT' };

export const V13_2_DECISION_POLICY = 'v13_2_discourse_and_spelling_robust_v1';

/**
 * Classifies a natural Roman Urdu complaint using Phase V13.2 pipeline.
 */
export function classifyV13_2(
  rawText: string,
  artifact: V11ModelArtifact
): V13_2Result {
  const normalizedText = normalizeRomanUrduV13_2(rawText);
  const extraction = extractMunicipalIssuesV13_2(rawText);

  // 1. Dual-Track TF-IDF extraction on normalized text
  const features = extractV11Features(normalizedText, artifact);
  const rawProbabilities = predictV11RawProbabilities(features, artifact);
  const { resolvedProbs: civicProbs, notes: civicNotes } = resolveV11CivicRelations(normalizedText, rawProbabilities);

  const notes = [...extraction.notes, ...civicNotes];
  const finalDepartmentsSet = new Set<DepartmentId>();

  // 2. Add all departments grounded by affirmative independent issues
  for (const dept of extraction.actionableDepartments) {
    finalDepartmentsSet.add(dept);
    notes.push(`Grounded independent fault: ${dept.toUpperCase()}`);
  }

  // 3. Evaluate Statistical ML Candidates
  for (const dept of artifact.departments) {
    if (extraction.suppressedDepartments.includes(dept)) {
      continue;
    }

    // Adaptive threshold: use calibrated threshold for SBCA (0.40) to prevent false negative suppression
    let thresh = artifact.thresholds[dept] ?? 0.50;
    if (dept === 'sbca') thresh = Math.min(thresh, 0.40);

    const prob = civicProbs[dept] ?? 0;
    if (prob >= thresh) {
      // Special gating for KMC: require affirmative defect, reject if road is merely spatial anchor
      if (dept === 'kmc') {
        const hasRoadDefect = /\b(?:toot|tooti|khadda|khadday|gaddha|crater|pothole|dhans|asphalt|damaged|street\s*light\s*fuse)\b/i.test(normalizedText);
        if (!hasRoadDefect && finalDepartmentsSet.size > 0) {
          notes.push('Suppressed KMC: Road is purely location anchor for other utility defect');
          continue;
        }
      }
      finalDepartmentsSet.add(dept);
      notes.push(`ML candidate passed threshold: ${dept.toUpperCase()} (prob: ${prob.toFixed(2)} >= ${thresh.toFixed(2)})`);
    }
  }

  // 4. Fahad's Rule: ensure demoted consequences are strictly eliminated
  for (const chain of extraction.causalChains) {
    if (finalDepartmentsSet.has(chain.consequenceDept) && finalDepartmentsSet.has(chain.rootDept)) {
      finalDepartmentsSet.delete(chain.consequenceDept);
      notes.push(`Enforced Fahad's Rule: Removed ${chain.consequenceDept.toUpperCase()} (caused by ${chain.rootDept.toUpperCase()})`);
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

  const issueCandidates = extraction.issues.map((iss) => ({
    department: iss.department,
    span_text: iss.evidenceSpan,
    normalized_text: iss.evidenceSpan,
    mention_type: iss.status === 'LOCATION_ONLY' ? 'spatial_landmark' : 'direct_asset_defect',
    is_contextual_landmark: iss.status === 'LOCATION_ONLY',
    is_historical_or_resolved: iss.status === 'HISTORICAL_RESOLVED',
  }));

  return {
    departments,
    probabilities: calibratedProbs,
    rawProbabilities,
    extraction,
    issueCandidates,
    needsReview,
    reviewReason,
    notes,
    modelVersion: `${artifact.version}-v13.2`,
    decisionPolicy: V13_2_DECISION_POLICY,
  };
}

/**
 * Assesses complaint draft pre-submission for the citizen website and Edge Function.
 */
export function assessComplaintDraftV13_2(
  rawText: string,
  artifact: V11ModelArtifact
): V13_2UnderstandingResult {
  if (!rawText.trim()) return { state: 'invalid', reason: 'EMPTY' };
  if (words(rawText) > MAX_WORDS) return { state: 'invalid', reason: 'WORD_LIMIT' };

  const prediction = classifyV13_2(rawText, artifact);
  const normalized = prediction.extraction.normalizedText;

  // 1. Water vs Power Outage Causality Check
  if (ambiguousWaterPower(normalized, prediction as any)) {
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
 * Resolves clarification answers against the V13.2 candidate.
 */
export function resolveComplaintClarificationV13_2(
  rawText: string,
  answer: ClarificationAnswer,
  artifact: V11ModelArtifact
): V13_2UnderstandingResult {
  const current = assessComplaintDraftV13_2(rawText, artifact);
  const prediction = 'prediction' in current ? current.prediction : classifyV13_2(rawText, artifact);
  const review = (reason: string): V13_2UnderstandingResult => ({ state: 'review', reason, prediction });

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
    };
  }

  if (answer.questionId === 'describe_issue' && 'details' in answer) {
    const combined = `${rawText} ${answer.details}`.trim();
    return assessComplaintDraftV13_2(combined, artifact);
  }

  return {
    state: 'ready',
    departments: [...prediction.departments].sort(),
    prediction,
  };
}
