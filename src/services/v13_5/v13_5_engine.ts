/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V13.5 Two-Department Routing Scope Engine
 *
 * Implements:
 * 1. Automatic routing focused on 1 and 2 independent actionable departments.
 * 2. Strict preservation of all evidence when >= 3 independent departments are detected.
 * 3. Never silently discard a 3rd department or arbitrarily truncate to two.
 * 4. Transparent human triage flagging: `EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED`.
 * 5. Full backwards compatibility with frozen Run004/Run006 model weights.
 */

import { DepartmentId } from '../v13_4/issueRelationGraph';
import {
  classifyV13_4,
  V13_4Result,
  assessComplaintDraftV13_4,
  resolveComplaintClarificationV13_4,
} from '../v13_4/v13_4_engine';
import { V11ModelArtifact, ClarificationAnswer } from '../../../supabase/functions/_shared/v11-engine';

export const V13_5_DECISION_POLICY = 'v13_5_two_department_routing_policy_v1';

export interface V13_5Result extends V13_4Result {
  allDetectedDepartments: DepartmentId[];
  isTwoDepartmentCompliant: boolean;
  twoDeptPolicyTriggered: boolean;
}

export type V13_5UnderstandingResult =
  | { state: 'invalid'; reason: 'EMPTY' | 'WORD_LIMIT' }
  | { state: 'ask'; question: any; prediction: V13_5Result }
  | { state: 'review'; reason: string; prediction: V13_5Result }
  | {
      state: 'ready';
      departments: DepartmentId[];
      prediction: V13_5Result;
      confirmedFact?: string;
      supplemented?: boolean;
    };

/**
 * Classifies complaint under the Two-Department Routing Policy.
 * Focuses automatic dispatch on 1-2 departments, safely escalating 3+ departments to review.
 */
export function classifyV13_5(
  rawText: string,
  artifact: V11ModelArtifact
): V13_5Result {
  const baseResult = classifyV13_4(rawText, artifact);
  const detected = [...baseResult.departments];

  // If complaint contains 3 or more independent actionable departments:
  // 1. Preserve all detected departments and issue candidates.
  // 2. Do not silently discard any department.
  // 3. Do not arbitrarily select two departments.
  // 4. Flag for human administrative triage.
  if (detected.length > 2) {
    const updatedNotes = [
      ...baseResult.notes,
      `[TWO_DEPT_POLICY] Detected ${detected.length} independent municipal defects (${detected.join(', ').toUpperCase()}). Scaled to human triage under two-department auto-routing limit.`,
    ];

    return {
      ...baseResult,
      departments: [], // Not auto-assigned to avoid arbitrary truncation
      allDetectedDepartments: detected,
      needsReview: true,
      reviewReason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED',
      notes: updatedNotes,
      modelVersion: 'v11-candidate-1-v13.5',
      decisionPolicy: V13_5_DECISION_POLICY,
      isTwoDepartmentCompliant: false,
      twoDeptPolicyTriggered: true,
    };
  }

  // 1 or 2 departments (or 0 departments needing review)
  return {
    ...baseResult,
    allDetectedDepartments: detected,
    modelVersion: 'v11-candidate-1-v13.5',
    decisionPolicy: V13_5_DECISION_POLICY,
    isTwoDepartmentCompliant: true,
    twoDeptPolicyTriggered: false,
  };
}

/**
 * Pre-submission assessment for V13.5 citizen submission and local preview.
 */
export function assessComplaintDraftV13_5(
  rawText: string,
  artifact: V11ModelArtifact
): V13_5UnderstandingResult {
  const prediction = classifyV13_5(rawText, artifact);

  if (!rawText.trim()) return { state: 'invalid', reason: 'EMPTY' };
  if (rawText.trim().split(/\s+/).filter(Boolean).length > 200) {
    return { state: 'invalid', reason: 'WORD_LIMIT' };
  }

  // Check Two-Department escalation
  if (prediction.twoDeptPolicyTriggered) {
    return {
      state: 'review',
      reason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED',
      prediction,
    };
  }

  const baseAssessment = assessComplaintDraftV13_4(rawText, artifact);

  if (baseAssessment.state === 'ask') {
    return { state: 'ask', question: baseAssessment.question, prediction };
  }
  if (baseAssessment.state === 'review') {
    return { state: 'review', reason: baseAssessment.reason, prediction };
  }
  if (baseAssessment.state === 'invalid') {
    return { state: 'invalid', reason: baseAssessment.reason };
  }

  return {
    state: 'ready',
    departments: [...prediction.departments],
    prediction,
    confirmedFact: (baseAssessment as any).confirmedFact,
  };
}

/**
 * Resolves clarification answers under V13.5 policy.
 */
export function resolveComplaintClarificationV13_5(
  rawText: string,
  answer: ClarificationAnswer,
  artifact: V11ModelArtifact
): V13_5UnderstandingResult {
  const baseRes = resolveComplaintClarificationV13_4(rawText, answer, artifact);
  const prediction = classifyV13_5(rawText, artifact);

  if (baseRes.state === 'ready') {
    if (baseRes.departments.length > 2) {
      return {
        state: 'review',
        reason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED',
        prediction: {
          ...prediction,
          departments: [],
          allDetectedDepartments: baseRes.departments,
          needsReview: true,
          reviewReason: 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED',
          twoDeptPolicyTriggered: true,
        },
      };
    }
    return {
      state: 'ready',
      departments: [...baseRes.departments],
      prediction: {
        ...prediction,
        departments: baseRes.departments,
        allDetectedDepartments: baseRes.departments,
      },
      confirmedFact: baseRes.confirmedFact,
    };
  }

  if (baseRes.state === 'review') {
    return { state: 'review', reason: baseRes.reason, prediction };
  }
  return { state: 'invalid', reason: (baseRes as any).reason };
}
