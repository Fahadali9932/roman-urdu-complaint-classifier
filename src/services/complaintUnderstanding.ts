/** Local, stateless pre-submission advisory API. No persistence or hosted authority.
 * A clarification is a citizen-provided fact, never an inferred user answer.
 * Existing classifier safety/review reasons cannot be waived by a choice.
 */
import type {
  DepartmentId,
  WaterRelationAnswer,
  LandmarkRelationAnswer,
  HistoricalRelationAnswer,
  ClarificationAnswer,
} from '../types';
export type {
  WaterRelationAnswer,
  LandmarkRelationAnswer,
  HistoricalRelationAnswer,
  ClarificationAnswer,
};
import { normalizeRomanUrduText } from './relationEngine';
import {
  championV11Model,
  classifyV11RelationAware,
  type V11ModelArtifact,
  type V11RelationAwareResult,
} from './v11InferenceAdapter';

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

const WATER_POWER: ClarificationQuestion = {
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

const INCOMPLETE_SECONDARY: ClarificationQuestion = {
  id: 'incomplete_secondary_relation',
  kind: 'details',
  prompt: {
    en: 'You started mentioning an additional municipal issue. Please provide details about what else needs repair or attention.',
    ur: 'آپ نے ایک اور مسئلے کا ذکر شروع کیا تھا۔ براہ کرم بتائیں کہ مزید کس چیز کی مرمت یا توجہ درکار ہے۔',
    romanUrdu: 'Aap ne aik aur maslay ka zikr shuru kiya tha. Meharbani karke wazeh karein ke doosra masla kya hai.',
  },
};

const DESCRIBE_ISSUE: ClarificationQuestion = {
  id: 'describe_issue',
  kind: 'details',
  prompt: {
    en: 'Please describe the specific public-service fault, including any separate problem that still needs to be fixed.',
    ur: 'براہ کرم سرکاری سہولت کا اصل مسئلہ اور کوئی الگ مسئلہ جس کی مرمت ضروری ہے واضح کریں۔',
    romanUrdu: 'Meharbani karke public service ka asal masla aur koi alag fault jo abhi theek karna hai wazeh karein.',
  },
};

function buildLandmarkQuestion(dept: DepartmentId): ClarificationQuestion {
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

function buildHistoricalQuestion(dept: DepartmentId): ClarificationQuestion {
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

function ambiguousWaterPower(text: string, prediction: V11RelationAwareResult): boolean {
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

function ambiguousLandmarkAsset(prediction: V11RelationAwareResult): DepartmentId | null {
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

function ambiguousResolvedHistorical(prediction: V11RelationAwareResult): DepartmentId | null {
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

function ambiguousIncompleteSecondary(text: string, prediction: V11RelationAwareResult): boolean {
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
export function assessComplaintDraft(text: string, artifact = championV11Model): UnderstandingResult {
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
  artifact: V11ModelArtifact = championV11Model
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
