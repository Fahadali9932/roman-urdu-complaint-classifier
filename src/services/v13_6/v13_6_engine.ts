/**
 * V13.6 experimental recovery policy. Frozen ML weights are never altered.
 * Keep this behind Local AI Test Mode until separate human-reviewed validation.
 */
import { classifyV11RelationAware, ClarificationAnswer, V11ModelArtifact } from '../../../supabase/functions/_shared/v11-engine';
import { DepartmentId, IssueGraphResult } from '../v13_4/issueRelationGraph';
import {
  classifyV13_4,
  DepartmentDecisionRecord,
  assessComplaintDraftV13_4,
  resolveComplaintClarificationV13_4,
} from '../v13_4/v13_4_engine';
import { V13_5Result } from '../v13_5/v13_5_engine';
import { extractIndependentIssuesV13_6, IndependentIssueEvidence } from './issueEvidence';

export const V13_6_DECISION_POLICY = 'v13_6_independent_evidence_recovery_experimental_v1';

export interface V13_6Result extends V13_5Result {
  recoveredIndependentEvidence: IndependentIssueEvidence[];
}

export type V13_6UnderstandingResult =
  | { state: 'invalid'; reason: 'EMPTY' | 'WORD_LIMIT' }
  | { state: 'ask'; question: any; prediction: V13_6Result }
  | { state: 'review'; reason: string; prediction: V13_6Result }
  | { state: 'ready'; departments: DepartmentId[]; prediction: V13_6Result; confirmedFact?: string };

function hasSeparateAffirmativeEvidence(
  department: DepartmentId,
  evidence: IndependentIssueEvidence[],
  graph: IssueGraphResult,
  rawText: string
): boolean {
  const matching = evidence.filter((issue) => issue.department === department);
  if (!matching.length) return false;
  if (graph.issues.some((issue) => issue.department === department &&
    (issue.relationship === 'NEGATED' || issue.relationship === 'RESOLVED_OR_HISTORICAL'))) return false;
  if (graph.causalChains.some((chain) => chain.consequenceDept === department)) return false;
  const directCausality = /\b(?:ki\s+wajah\s+se|ke\s+sabab|jis\s+se|is\s+wajah\s+se|because|due\s+to|ki\s+vajha\s+se)\b/i.test(rawText);
  if (directCausality) return false;
  const distinctDefects = new Set(evidence.map((issue) => issue.span));
  // A false global causal heuristic can demote "road toot" merely because a
  // water main also burst elsewhere. Two separate, affirmative clauses with
  // no causal connective are independent unless other evidence contradicts it.
  return distinctDefects.size >= 2 || matching.some((issue) =>
    /\b(?:alag|doosra|dusra|doyam|soyam|teesra|mazeed|sath\s+hi|aur\s+bhi)\b/i.test(issue.span));
}

export function classifyV13_6(rawText: string, artifact: V11ModelArtifact): V13_6Result {
  const base = classifyV13_4(rawText, artifact);
  const baseline = classifyV11RelationAware(rawText, artifact);
  const recoveredIndependentEvidence = extractIndependentIssuesV13_6(rawText);
  const evidenceDepartments = new Set(recoveredIndependentEvidence.map((issue) => issue.department));

  // Existing V11 out-of-scope detection is stricter than V13.4. Keep the
  // protective human-review decision rather than auto-routing keyword hits.
  const outOfScope = baseline.needsReview && baseline.reviewReason === 'OUT_OF_SCOPE';
  // Explicit causal connective language takes precedence over loose proximity
  // matches (e.g. "bijli band hone se pani ki motor nahi chal rahi").
  const explicitCausal = /\b(?:ki\s+wajah\s+se|ke\s+sabab|jis\s+se|is\s+wajah\s+se|hone\s+se|ke\s+bais|ke\s+baais|tab\s+se|because|due\s+to|ki\s+vajha\s+se)\b/i.test(rawText) ||
    base.graph.causalChains.length > 0;
  const independentDepartments = new Set(recoveredIndependentEvidence.map((issue) => issue.department));
  const separateEvidenceSpans = new Set(recoveredIndependentEvidence.map((issue) => issue.span));
  const clearThreeIndependentIssues = independentDepartments.size > 2 &&
    separateEvidenceSpans.size > 2 &&
    base.graph.causalChains.length === 0;
  // The existing V13.4 policy remains authoritative for zero- and single-
  // issue text. We only change it when two distinct civic asset/defect pairs
  // appear in separate spans, or when 3+ are proven before the safety gate.
  const allowRecovery = !outOfScope && independentDepartments.size >= 2 &&
    separateEvidenceSpans.size >= 2 && (!explicitCausal || clearThreeIndependentIssues);
  const selected = new Set<DepartmentId>(outOfScope ? [] : base.departments);
  const suppressed = new Set<DepartmentId>(base.graph.suppressedDepartments);
  const locationOnly = new Set<DepartmentId>(base.graph.locationOnlyDepartments);

  if (allowRecovery) {
    for (const dept of evidenceDepartments) {
      // Location-only is stored at department granularity by V13.4. It may
      // coexist with a genuine broken road in another clause, so only a
      // recovered asset+defect pair may override that label.
      if ((!suppressed.has(dept) && (!locationOnly.has(dept) || evidenceDepartments.has(dept))) ||
        hasSeparateAffirmativeEvidence(dept, recoveredIndependentEvidence, base.graph, rawText)) {
        selected.add(dept);
      }
    }
  }

  // Triage must inspect pre-selection affirmative evidence. In V13.5 the
  // guard only inspected post-filter departments, missing 46/50 triple cases.
  const allDetected = new Set<DepartmentId>(selected);
  if (allowRecovery) {
    for (const dept of evidenceDepartments) {
      if (!suppressed.has(dept) || hasSeparateAffirmativeEvidence(dept, recoveredIndependentEvidence, base.graph, rawText)) {
        allDetected.add(dept);
      }
    }
  }
  const allDetectedDepartments = [...allDetected].sort();
  const twoDeptPolicyTriggered = allDetectedDepartments.length > 2;
  const departments = twoDeptPolicyTriggered ? [] : [...selected].sort();
  const needsReview = outOfScope || twoDeptPolicyTriggered || departments.length === 0 || base.needsReview;
  const reviewReason = twoDeptPolicyTriggered
    ? 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED'
    : outOfScope ? 'OUT_OF_SCOPE'
    : departments.length === 0 ? (base.reviewReason || baseline.reviewReason || 'NO_ACTIONABLE_DEFECT')
    : needsReview ? (base.reviewReason || 'REQUIRES_ADMIN_REVIEW') : null;

  const decisionRecords: DepartmentDecisionRecord[] = base.decisionRecords.map((record) => {
    if (twoDeptPolicyTriggered) {
      return { ...record, status: 'REJECTED', reason: 'Held for human triage: more than two independent civic faults detected' };
    }
    if (departments.includes(record.department)) {
      const evidence = recoveredIndependentEvidence.filter((issue) => issue.department === record.department);
      if (record.status === 'SELECTED') return record;
      return {
        ...record,
        status: 'SELECTED',
        evidenceSpans: evidence.map((issue) => issue.span),
        decisionSource: evidence.length ? 'CIVIC_GROUNDING' : 'STATISTICAL_ML',
        reason: evidence.length
          ? 'Independent affirmative asset and defect recovered before secondary-department filtering'
          : 'Retained existing V11 model decision with no explicit causal or negation suppression',
      };
    }
    return record.status === 'SELECTED'
      ? { ...record, status: 'SUPPRESSED', decisionSource: 'CAUSAL_SUPPRESSION', reason: 'Not auto-routed after relation review' }
      : record;
  });

  return {
    ...base,
    departments,
    allDetectedDepartments,
    isTwoDepartmentCompliant: !twoDeptPolicyTriggered,
    twoDeptPolicyTriggered,
    recoveredIndependentEvidence,
    issueCandidates: [
      ...base.issueCandidates,
      ...recoveredIndependentEvidence.map((issue, i) => ({
        span_id: `v13-6-independent-${i + 1}`,
        department: issue.department,
        span_text: issue.span,
        normalized_text: issue.span,
        defect_evidence: [issue.defect],
        is_actionable: allDetected.has(issue.department) && (allowRecovery || base.departments.includes(issue.department)),
        mention_type: 'Actionable Repair',
        relationship: 'INDEPENDENT',
        reason: 'Affirmative asset and local defect match (pre-routing evidence)',
      })),
    ],
    decisionRecords,
    needsReview,
    reviewReason,
    notes: [
      ...base.notes,
      `[V13.6] Pre-routing independent evidence: ${[...evidenceDepartments].sort().join(', ') || 'none'}`,
      ...(twoDeptPolicyTriggered ? ['[V13.6] Three or more independent faults: escalated for human review'] : []),
    ],
    modelVersion: 'v11-candidate-1-v13.6-experimental',
    decisionPolicy: V13_6_DECISION_POLICY,
  };
}

/** Retains the existing clarification contract and the strict 200-word limit. */
export function assessComplaintDraftV13_6(
  rawText: string,
  artifact: V11ModelArtifact
): V13_6UnderstandingResult {
  if (!rawText.trim()) return { state: 'invalid', reason: 'EMPTY' };
  if (rawText.trim().split(/\s+/).length > 200) return { state: 'invalid', reason: 'WORD_LIMIT' };
  const prediction = classifyV13_6(rawText, artifact);
  if (prediction.twoDeptPolicyTriggered) {
    return { state: 'review', reason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED', prediction };
  }
  const existing = assessComplaintDraftV13_4(rawText, artifact);
  if (existing.state === 'invalid') return { state: 'invalid', reason: existing.reason };
  if (existing.state === 'ask') return { state: 'ask', question: existing.question, prediction };
  if (existing.state === 'review' || prediction.needsReview) {
    return { state: 'review', reason: prediction.reviewReason ||
      (existing.state === 'review' ? existing.reason : 'REQUIRES_ADMIN_REVIEW'), prediction };
  }
  return {
    state: 'ready',
    departments: [...prediction.departments],
    prediction,
    confirmedFact: existing.confirmedFact,
  };
}

/** A citizen's explicit clarification remains authoritative for the final set. */
export function resolveComplaintClarificationV13_6(
  rawText: string,
  answer: ClarificationAnswer,
  artifact: V11ModelArtifact
): V13_6UnderstandingResult {
  if (!rawText.trim()) return { state: 'invalid', reason: 'EMPTY' };
  if (rawText.trim().split(/\s+/).length > 200) return { state: 'invalid', reason: 'WORD_LIMIT' };
  const prediction = classifyV13_6(rawText, artifact);
  if (prediction.twoDeptPolicyTriggered) {
    return { state: 'review', reason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED', prediction };
  }
  const resolved = resolveComplaintClarificationV13_4(rawText, answer, artifact);
  if (resolved.state === 'invalid') return { state: 'invalid', reason: resolved.reason };
  if (resolved.state === 'ask') return { state: 'ask', question: resolved.question, prediction };
  if (resolved.state === 'review') return { state: 'review', reason: resolved.reason, prediction };
  if (resolved.departments.length > 2) {
    return {
      state: 'review',
      reason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED',
      prediction: {
        ...prediction,
        departments: [],
        allDetectedDepartments: [...resolved.departments],
        isTwoDepartmentCompliant: false,
        twoDeptPolicyTriggered: true,
        needsReview: true,
        reviewReason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED',
      },
    };
  }
  return {
    state: 'ready',
    departments: [...resolved.departments],
    prediction: { ...prediction, departments: [...resolved.departments] },
    confirmedFact: resolved.confirmedFact,
  };
}
