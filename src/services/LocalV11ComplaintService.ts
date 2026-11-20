import type {
  Complaint,
  ComplaintSubmissionInput,
  SubmissionResult,
  ComplaintStatus,
  ComplaintIssue,
  ComplaintTimelineEvent,
  CitizenOverviewStats,
  DepartmentComplaintView,
  DepartmentId,
} from '../types';
import type { IComplaintService } from './IComplaintService';
import {
  classifyV11RelationAware,
  championV11Model,
  type V11RelationAwareResult,
} from './v11InferenceAdapter';
import { processComplaintPrivacy } from '../lib/privacy-engine';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';
import {
  assessComplaintDraft,
  resolveComplaintClarification,
  type ClarificationAnswer,
  type UnderstandingResult,
} from './complaintUnderstanding';
import {
  classifyV13_2,
  assessComplaintDraftV13_2,
  resolveComplaintClarificationV13_2,
} from './v13_2/v13_2_engine';
import {
  classifyV13_4,
  assessComplaintDraftV13_4,
  resolveComplaintClarificationV13_4,
} from './v13_4/v13_4_engine';
import {
  classifyV13_5,
  assessComplaintDraftV13_5,
  resolveComplaintClarificationV13_5,
} from './v13_5/v13_5_engine';
import {
  classifyV13_6,
  assessComplaintDraftV13_6,
  resolveComplaintClarificationV13_6,
} from './v13_6/v13_6_engine';
import {
  detectLocationAttribution,
  generateGroundedFactualSummary,
  type LocationAttribution,
} from './v13_3/factualSummaryEngine';

export interface V11LocalAnalysisPayload extends V11RelationAwareResult {
  heading: string;
  factualSummary: string;
  sanitizedDescription: string;
  latencyMs: number;
  modelVersion: string;
  wordCount: number;
  timestamp: string;
  locationAttribution?: LocationAttribution;
  thresholds?: Record<string, number>;
  decisionRecords?: any[];
  /** Preserved candidates during the 3+ department local safety escalation. */
  allDetectedDepartments?: DepartmentId[];
  twoDeptPolicyTriggered?: boolean;
}

/**
 * AWAAZ-E-AWAM — Phase V11.4.3 & V12.6
 * Isolated In-Memory Local V11 Complaint Service
 *
 * Guarantees:
 * - Client-side inference using the frozen local artifact
 * - Zero Network Requests to Hosted Supabase
 * - Zero Database Mutations
 * - Single authoritative clarification-aware submission pipeline
 * - Deterministic provenance: original model prediction vs final clarified routing
 * - Idempotent submission: rapid double-submits produce exactly one complaint record
 * - Department views use the sanitized narrative; this is not a security boundary
 * - Purely In-Memory Ephemeral Storage
 */
export class LocalV11ComplaintService implements IComplaintService {
  private testComplaints: Complaint[] = [];
  private recentSubmissions = new Map<string, { result: SubmissionResult; timestamp: number }>();
  private engineMode: 'run004_v11' | 'v13_2_candidate' | 'v13_4_candidate' | 'v13_5_candidate' | 'v13_6_candidate' = 'run004_v11';

  setEngineMode(mode: 'run004_v11' | 'v13_2_candidate' | 'v13_4_candidate' | 'v13_5_candidate' | 'v13_6_candidate') {
    this.engineMode = mode;
  }

  getEngineMode(): 'run004_v11' | 'v13_2_candidate' | 'v13_4_candidate' | 'v13_5_candidate' | 'v13_6_candidate' {
    return this.engineMode;
  }

  /** Preview-only contract for a citizen clarification UI. No record writes. */
  previewComplaint(description: string): UnderstandingResult {
    if (this.engineMode === 'v13_6_candidate') {
      return assessComplaintDraftV13_6(description, championV11Model as any) as any;
    }
    if (this.engineMode === 'v13_5_candidate') {
      return assessComplaintDraftV13_5(description, championV11Model as any) as any;
    }
    if (this.engineMode === 'v13_4_candidate') {
      return assessComplaintDraftV13_4(description, championV11Model as any) as any;
    }
    if (this.engineMode === 'v13_2_candidate') {
      return assessComplaintDraftV13_2(description, championV11Model as any) as any;
    }
    return assessComplaintDraft(description, championV11Model);
  }

  resolvePreview(description: string, answer: ClarificationAnswer): UnderstandingResult {
    if (this.engineMode === 'v13_6_candidate') {
      return resolveComplaintClarificationV13_6(description, answer, championV11Model as any) as any;
    }
    if (this.engineMode === 'v13_5_candidate') {
      return resolveComplaintClarificationV13_5(description, answer, championV11Model as any) as any;
    }
    if (this.engineMode === 'v13_4_candidate') {
      return resolveComplaintClarificationV13_4(description, answer, championV11Model as any) as any;
    }
    if (this.engineMode === 'v13_2_candidate') {
      return resolveComplaintClarificationV13_2(description, answer, championV11Model as any) as any;
    }
    return resolveComplaintClarification(description, answer, championV11Model);
  }

  async submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult> {
    const start = performance.now();
    const rawDraft = input.description.trim();

    // 1. Complaint Validation
    if (!input.citizenName?.trim()) {
      throw new Error('Citizen name is required.');
    }
    if (!input.district) {
      throw new Error('District selection is required.');
    }
    if (!input.locality?.trim()) {
      throw new Error('Locality is required.');
    }
    if (!rawDraft) {
      throw new Error('Complaint description cannot be empty.');
    }

    const rawWords = rawDraft.split(/\s+/).filter(Boolean).length;
    if (rawWords > 200) {
      throw new Error('Complaint description cannot exceed 200 words.');
    }

    let finalStoredDescription = rawDraft;
    let clarificationDetails: string | undefined;
    if (input.clarificationAnswer && 'details' in input.clarificationAnswer) {
      const details = input.clarificationAnswer.details.trim();
      if (details) {
        clarificationDetails = details;
        const detailsWords = details.split(/\s+/).filter(Boolean).length;
        if (rawWords + detailsWords > 200) {
          throw new Error('Complaint description with additional details cannot exceed 200 words.');
        }
        finalStoredDescription = `${rawDraft}\n${details}`;
      }
    }

    // 2. Idempotency & Concurrency Check
    const subKey = `${input.citizenName.trim()}_${input.district}_${input.locality}_${rawDraft}_${
      input.clarificationAnswer && 'choice' in input.clarificationAnswer
        ? input.clarificationAnswer.choice
        : input.clarificationAnswer && 'skip' in input.clarificationAnswer
        ? 'skip'
        : clarificationDetails || ''
    }`;
    const nowMs = Date.now();
    const existing = this.recentSubmissions.get(subKey);
    if (existing && nowMs - existing.timestamp < 3000) {
      return existing.result;
    }

    // Clean up stale cache entries older than 10 seconds
    for (const [k, v] of this.recentSubmissions.entries()) {
      if (nowMs - v.timestamp > 10000) {
        this.recentSubmissions.delete(k);
      }
    }

    // 3. Draft Analysis
    let initialPrediction: V11RelationAwareResult & {
      allDetectedDepartments?: DepartmentId[];
      twoDeptPolicyTriggered?: boolean;
    };
    let preview: any;

    if (this.engineMode === 'v13_6_candidate' || this.engineMode === 'v13_5_candidate') {
      const v13_5Res = this.engineMode === 'v13_6_candidate'
        ? classifyV13_6(rawDraft, championV11Model as any)
        : classifyV13_5(rawDraft, championV11Model as any);
      preview = this.previewComplaint(rawDraft);
      const relationType =
        v13_5Res.allDetectedDepartments.length > 1
          ? 'INDEPENDENT'
          : v13_5Res.graph.causalChains.length > 0
          ? 'CAUSES_CONTEXT_ONLY'
          : 'SINGLE';

      initialPrediction = {
        departments: v13_5Res.departments,
        probabilities: { ...v13_5Res.probabilities, unassigned: 0 } as Record<DepartmentId, number>,
        rawProbabilities: { ...(v13_5Res.rawProbabilities || {}), unassigned: 0 } as Record<DepartmentId, number>,
        relation: relationType as any,
        needsReview: v13_5Res.needsReview,
        reviewReason: v13_5Res.reviewReason || null,
        notes: v13_5Res.notes,
        issueCandidates: v13_5Res.issueCandidates,
        ruleSelectedDepartments: v13_5Res.graph.actionableDepartments,
        edges: [],
        missingPublicLocation: false,
        thresholds: v13_5Res.thresholds,
        decisionRecords: v13_5Res.decisionRecords,
        allDetectedDepartments: v13_5Res.allDetectedDepartments,
        twoDeptPolicyTriggered: v13_5Res.twoDeptPolicyTriggered,
      };
    } else if (this.engineMode === 'v13_4_candidate') {
      const v13_4Res = classifyV13_4(rawDraft, championV11Model as any);
      preview = this.previewComplaint(rawDraft);
      const relationType =
        v13_4Res.departments.length > 1
          ? 'INDEPENDENT'
          : v13_4Res.graph.causalChains.length > 0
          ? 'CAUSES_CONTEXT_ONLY'
          : 'SINGLE';

      initialPrediction = {
        departments: v13_4Res.departments,
        probabilities: { ...v13_4Res.probabilities, unassigned: 0 } as Record<DepartmentId, number>,
        rawProbabilities: { ...(v13_4Res.rawProbabilities || {}), unassigned: 0 } as Record<DepartmentId, number>,
        relation: relationType as any,
        needsReview: v13_4Res.needsReview,
        reviewReason: v13_4Res.reviewReason || null,
        notes: v13_4Res.notes,
        issueCandidates: v13_4Res.issueCandidates,
        ruleSelectedDepartments: v13_4Res.graph.actionableDepartments,
        edges: [],
        missingPublicLocation: false,
        thresholds: v13_4Res.thresholds,
        decisionRecords: v13_4Res.decisionRecords,
      };
    } else if (this.engineMode === 'v13_2_candidate') {
      const v13Res = classifyV13_2(rawDraft, championV11Model as any);
      preview = assessComplaintDraftV13_2(rawDraft, championV11Model as any);
      const relationType =
        v13Res.departments.length > 1
          ? 'INDEPENDENT'
          : v13Res.extraction.causalChains.length > 0
          ? 'CAUSES_CONTEXT_ONLY'
          : 'SINGLE';

      initialPrediction = {
        departments: v13Res.departments,
        probabilities: { ...v13Res.probabilities, unassigned: 0 } as Record<DepartmentId, number>,
        rawProbabilities: { ...(v13Res.rawProbabilities || {}), unassigned: 0 } as Record<DepartmentId, number>,
        relation: relationType as any,
        needsReview: v13Res.needsReview,
        reviewReason: v13Res.reviewReason || null,
        notes: v13Res.notes,
        issueCandidates: v13Res.issueCandidates,
        ruleSelectedDepartments: v13Res.extraction.actionableDepartments,
        edges: [],
        missingPublicLocation: false,
        thresholds: v13Res.thresholds,
        decisionRecords: v13Res.decisionRecords,
      };
    } else {
      initialPrediction = classifyV11RelationAware(rawDraft, championV11Model);
      preview = assessComplaintDraft(rawDraft, championV11Model);
    }

    // 4. Clarification Evaluation & Resolution
    let finalDepartments: DepartmentId[] = [];
    let needsReview = false;
    let reviewReason: string | undefined;
    let clarificationStatus: 'none' | 'answered' | 'skipped' | 'uncertain' | 'stale' | 'review' = 'none';
    let clarificationQuestionId: string | undefined;
    let clarificationAnswerChoice: string | undefined;
    let confirmedFact: string | undefined;

    if (input.clarificationAnswer && input.clarificationAnswer.draftText !== rawDraft) {
      finalDepartments = [];
      needsReview = true;
      reviewReason = 'STALE_CLARIFICATION';
      clarificationStatus = 'stale';
    } else if (preview.state === 'ready') {
      finalDepartments = [...preview.departments];
      needsReview = false;
      clarificationStatus = 'none';
    } else if (preview.state === 'ask') {
      clarificationQuestionId = preview.question.id;
      if (input.clarificationAnswer) {
        // Validate answer against exact draft and question ID
        if (
          input.clarificationAnswer.draftText !== rawDraft ||
          input.clarificationAnswer.questionId !== preview.question.id
        ) {
          finalDepartments = [];
          needsReview = true;
          reviewReason = 'STALE_CLARIFICATION';
          clarificationStatus = 'stale';
        } else {
          if ('choice' in input.clarificationAnswer) {
            clarificationAnswerChoice = input.clarificationAnswer.choice;
          }
          const resolution =
            this.engineMode === 'v13_6_candidate'
              ? (resolveComplaintClarificationV13_6(rawDraft, input.clarificationAnswer, championV11Model as any) as any)
              : this.engineMode === 'v13_5_candidate'
              ? (resolveComplaintClarificationV13_5(rawDraft, input.clarificationAnswer, championV11Model as any) as any)
              : this.engineMode === 'v13_4_candidate'
              ? (resolveComplaintClarificationV13_4(rawDraft, input.clarificationAnswer, championV11Model as any) as any)
              : this.engineMode === 'v13_2_candidate'
              ? (resolveComplaintClarificationV13_2(rawDraft, input.clarificationAnswer, championV11Model as any) as any)
              : resolveComplaintClarification(rawDraft, input.clarificationAnswer, championV11Model);
          if (resolution.state === 'ready') {
            finalDepartments = [...resolution.departments];
            needsReview = false;
            clarificationStatus = 'answered';
            confirmedFact = resolution.confirmedFact;
          } else if (resolution.state === 'review') {
            finalDepartments = [];
            needsReview = true;
            reviewReason = resolution.reason;
            clarificationStatus =
              resolution.reason === 'CLARIFICATION_SKIPPED'
                ? 'skipped'
                : resolution.reason === 'CLARIFICATION_UNCERTAIN'
                ? 'uncertain'
                : 'review';
          } else {
            const reason = 'reason' in resolution ? resolution.reason : 'INVALID';
            throw new Error(
              reason === 'WORD_LIMIT'
                ? 'Complaint description exceeds word limit.'
                : 'Invalid clarification answer.'
            );
          }
        }
      } else {
        // Clarification was required by the classifier but skipped/missing at submission
        finalDepartments = [];
        needsReview = true;
        reviewReason = 'CLARIFICATION_REQUIRED';
        clarificationStatus = 'none';
      }
    } else if (preview.state === 'review') {
      finalDepartments = [];
      needsReview = true;
      reviewReason = preview.reason;
      clarificationStatus = 'none';
    } else if (preview.state === 'invalid') {
      throw new Error(
        preview.reason === 'WORD_LIMIT'
          ? 'Complaint description cannot exceed 200 words.'
          : 'Invalid complaint description.'
      );
    }

    // 5. Final Department Determination
    const primaryDeptId: DepartmentId =
      needsReview || finalDepartments.length === 0 ? 'unassigned' : finalDepartments[0];
    const primaryDeptName =
      primaryDeptId === 'unassigned' ? undefined : KARACHI_DEPARTMENTS[primaryDeptId]?.name || 'Municipal Agency';
    const assignedDepartmentIds: DepartmentId[] = needsReview ? [] : finalDepartments;
    const status: ComplaintStatus = needsReview ? 'under_review' : 'assigned';

    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    const now = new Date().toISOString();

    // 6. Privacy & Truthful Summarization
    const privacy = processComplaintPrivacy(finalStoredDescription, {
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      citizenEmail: input.citizenEmail,
      residentialAddress: input.residentialAddress,
      incidentDistrict: input.district,
      incidentLocality: input.locality,
      incidentPublicLocation: input.publicLocation,
      departmentId: primaryDeptId,
    });

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refNumber = `TEST-2026-V11-${randomSuffix}`;

    // 7. Issue Records Creation (Only for assigned departments, or a review issue)
    const issues: ComplaintIssue[] = needsReview
      ? [
          {
            id: `iss-review-${Date.now()}-1`,
            complaintId: `cmp-${refNumber}`,
            departmentId: 'unassigned' as any,
            departmentName: 'Review Queue',
            issueType: reviewReason || 'manual_review_required',
            confidence: 0,
            status: 'under_review',
            updatedAt: now,
          },
        ]
      : finalDepartments.map((d, idx) => ({
          id: `iss-${d}-${Date.now()}-${idx + 1}`,
          complaintId: `cmp-${refNumber}`,
          departmentId: d,
          departmentName: KARACHI_DEPARTMENTS[d]?.name,
          issueType: `${d}.actionable_defect`,
          confidence: initialPrediction.probabilities[d] ?? 0.85,
          status: 'assigned',
          updatedAt: now,
        }));

    // 8. Timeline Event Composition
    const timeline: ComplaintTimelineEvent[] = [
      {
        id: `t-${Date.now()}-1`,
        status: 'submitted',
        title: 'Test Complaint Analyzed (Local AI Test Mode)',
        titleUrdu: 'ٹیسٹ شکایت کا مقامی تجزیہ',
        description: `${championV11Model.version} processed complaint locally in ${latencyMs}ms.`,
        descriptionUrdu: `وی ۱۱ ماڈل نے شکایت کا تجزیہ ${latencyMs} ملی سیکنڈ میں کیا۔`,
        timestamp: now,
        actorRole: 'citizen',
      },
    ];

    if (clarificationStatus !== 'none') {
      let clarificationTitle = 'Clarification Processed';
      let clarificationTitleUrdu = 'وضاحت پر عمل درآمد';
      let clarificationDesc = `Clarification status: ${clarificationStatus}.`;
      let clarificationDescUrdu = `وضاحت کا نتیجہ: ${clarificationStatus}۔`;

      if (clarificationStatus === 'answered') {
        clarificationTitle = 'Clarification Confirmed by Citizen';
        clarificationTitleUrdu = 'شہری کی جانب سے وضاحت کی تصدیق';
        clarificationDesc = `Citizen confirmed: ${
          confirmedFact || clarificationAnswerChoice || 'details provided'
        }. Routed to ${finalDepartments.map((d) => d.toUpperCase()).join(' & ')}.`;
        clarificationDescUrdu = `شہری کی تصدیق کے مطابق کارروائی: ${finalDepartments
          .map((d) => d.toUpperCase())
          .join(' اور ')}۔`;
      } else if (clarificationStatus === 'skipped') {
        clarificationTitle = 'Clarification Skipped by Citizen';
        clarificationTitleUrdu = 'شہری نے وضاحت چھوڑ دی';
        clarificationDesc =
          'Citizen chose to skip clarification. Complaint routed to Review Queue for human triage.';
        clarificationDescUrdu =
          'شہری نے وضاحت چھوڑنے کا انتخاب کیا۔ شکایت دستی جائزے کے لیے بھیج دی گئی۔';
      } else if (clarificationStatus === 'uncertain') {
        clarificationTitle = 'Uncertain Clarification Answer';
        clarificationTitleUrdu = 'غیر یقینی وضاحت';
        clarificationDesc =
          'Citizen indicated uncertainty ("I am not sure"). Routed to Review Queue for human triage.';
        clarificationDescUrdu =
          'شہری نے غیر یقینی کا اظہار کیا۔ شکایت دستی جائزے کے لیے بھیج دی گئی۔';
      } else if (clarificationStatus === 'stale') {
        clarificationTitle = 'Stale Clarification Rejected';
        clarificationTitleUrdu = 'پرانی وضاحت مسترد';
        clarificationDesc =
          'Complaint text was modified after clarification question was generated. Routed to Review Queue.';
        clarificationDescUrdu =
          'وضاحتی سوال کے بعد شکایت کی عبارت تبدیل کر دی گئی تھی۔ دستی جائزے کے لیے بھیج دیا گیا۔';
      }

      timeline.push({
        id: `t-${Date.now()}-2`,
        status: needsReview ? 'under_review' : 'assigned',
        title: clarificationTitle,
        titleUrdu: clarificationTitleUrdu,
        description: clarificationDesc,
        descriptionUrdu: clarificationDescUrdu,
        timestamp: now,
        actorRole: 'citizen',
      });
    }

    // 8. Location Source Attribution & Grounded Factual Summary (V13.3)
    const locationAttribution = detectLocationAttribution(
      rawDraft,
      input.locality,
      input.publicLocation
    );

    const grounded = generateGroundedFactualSummary({
      rawText: rawDraft,
      normalizedText: (initialPrediction as any).extraction?.normalizedText || rawDraft,
      departments: finalDepartments,
      issues: (initialPrediction.issueCandidates || []).map((c: any) => ({
        department: c.department as DepartmentId,
        evidenceSpan: c.evidence_span || c.span_text || '',
        status: c.is_actionable ? 'actionable' : 'contextual',
      })),
      locationInfo: locationAttribution,
    });

    const totalWords = finalStoredDescription.split(/\s+/).filter(Boolean).length;
    const analysisPayload: V11LocalAnalysisPayload = {
      ...initialPrediction,
      departments: finalDepartments,
      heading: grounded.heading,
      factualSummary: grounded.factualSummary,
      sanitizedDescription: privacy.sanitizedDescription,
      latencyMs,
      modelVersion:
        this.engineMode === 'v13_6_candidate'
          ? 'V13.6 Experimental (Independent Issue Recovery • Run004)'
          : this.engineMode === 'v13_5_candidate'
          ? 'V13.5 Candidate (Two-Dept Policy • Run004)'
          : this.engineMode === 'v13_4_candidate'
          ? 'V13.4 Candidate (Causal & False-Extra Reduced • Run004)'
          : this.engineMode === 'v13_2_candidate'
          ? 'V13.2 Candidate (Run004 • E4D04293)'
          : championV11Model.version,
      wordCount: totalWords,
      timestamp: now,
      needsReview,
      reviewReason: needsReview ? (reviewReason || 'UNDER_REVIEW') : null,
      locationAttribution,
      thresholds: initialPrediction.thresholds || { ...championV11Model.thresholds },
      decisionRecords: initialPrediction.decisionRecords,
    };

    // 9. Single Complaint Record Persistence
    const newComplaint: Complaint = {
      id: `cmp-${refNumber}`,
      citizenId: null,
      referenceNumber: refNumber,
      citizenName: input.citizenName,
      district: input.district,
      locality: input.locality,
      publicLocation: input.publicLocation,
      title: grounded.heading,
      description: finalStoredDescription,
      sanitizedDescription: privacy.sanitizedDescription,
      generatedHeading: grounded.heading,
      factualSummary: grounded.factualSummary,
      detectedLanguage: 'roman_urdu',
      status,
      assignedDepartmentId: primaryDeptId,
      assignedDepartmentName: primaryDeptName,
      assignedDepartmentIds,
      predictedDepartmentId: initialPrediction.departments[0],
      predictedDepartmentIds: initialPrediction.departments,
      originalPredictedDepartmentIds: initialPrediction.departments,
      predictionConfidence: initialPrediction.departments.length
        ? initialPrediction.probabilities[initialPrediction.departments[0]]
        : undefined,
      isMultiLabel: assignedDepartmentIds.length > 1,
      hasHazard: false,
      issues,
      submittedAt: now,
      updatedAt: now,
      isDemonstration: true,
      timeline,
      clarificationQuestionId,
      clarificationAnswerChoice,
      clarificationDetails,
      clarificationStatus,
    };

    this.testComplaints.unshift(newComplaint);

    const result: SubmissionResult = {
      referenceNumber: refNumber,
      isSimulated: true,
      isLocalTestMode: true,
      timestamp: now,
      message: needsReview
        ? 'Test complaint placed in Review Queue for human classification inspection.'
        : `Test complaint successfully routed to ${finalDepartments.map((d) => d.toUpperCase()).join(' & ')}.`,
      departmentId: primaryDeptId,
      departments: finalDepartments,
      status,
      needsReview,
      v11Analysis: analysisPayload,
    };

    this.recentSubmissions.set(subKey, { result, timestamp: nowMs });
    return result;
  }

  async getComplaints(): Promise<Complaint[]> {
    return [...this.testComplaints];
  }

  async getCitizenComplaints(): Promise<Complaint[]> {
    return [...this.testComplaints];
  }

  async getOverviewStats(): Promise<CitizenOverviewStats> {
    const total = this.testComplaints.length;
    const resolved = this.testComplaints.filter((c) => c.status === 'resolved').length;
    const inProgress = this.testComplaints.filter((c) => c.status === 'in_progress').length;
    const pending = total - resolved - inProgress;
    return {
      totalComplaints: total,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved,
    };
  }

  async getComplaintByReference(referenceNumber: string): Promise<Complaint | null> {
    const found = this.testComplaints.find(
      (c) => c.referenceNumber.toUpperCase() === referenceNumber.trim().toUpperCase()
    );
    return found ? { ...found } : null;
  }

  async getDepartmentComplaints(departmentId: string): Promise<DepartmentComplaintView[]> {
    return this.testComplaints
      .filter((c) => (c.assignedDepartmentIds || []).includes(departmentId as any))
      .map((c) => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        district: c.district,
        locality: c.locality,
        publicLocation: c.publicLocation,
        title: c.title,
        description: c.sanitizedDescription || c.description,
        status: c.status,
        submittedAt: c.submittedAt,
        updatedAt: c.updatedAt,
        assignedDepartmentId: c.assignedDepartmentId || 'unassigned',
        assignedDepartmentIds: c.assignedDepartmentIds || [],
        detectedLanguage: c.detectedLanguage,
        isDemonstration: c.isDemonstration,
        timeline: c.timeline,
        manualPriority: c.manualPriority,
        manualPriorityReason: c.manualPriorityReason,
        manualPriorityBy: c.manualPriorityBy,
        manualPriorityAt: c.manualPriorityAt,
        isMultiLabel: c.isMultiLabel,
        hasHazard: c.hasHazard,
        issues: c.issues,
      }));
  }

  async getDepartmentComplaintByReference(
    departmentId: string,
    referenceNumber: string
  ): Promise<DepartmentComplaintView | null> {
    const all = await this.getDepartmentComplaints(departmentId);
    return all.find((c) => c.referenceNumber === referenceNumber) || null;
  }

  async getReviewQueueComplaints(): Promise<DepartmentComplaintView[]> {
    return []; // Local AI test mode has no authenticated administrator.
  }

  async updateComplaintStatus(
    departmentId: any,
    referenceNumber: string,
    newStatus: ComplaintStatus,
    _note?: string,
    _noteUrdu?: string
  ): Promise<{ success: boolean; complaint: DepartmentComplaintView }> {
    const complaint = await this.getDepartmentComplaintByReference(departmentId, referenceNumber);
    if (!complaint) {
      throw new Error(`Test complaint ${referenceNumber} not found.`);
    }
    complaint.status = newStatus;
    return { success: true, complaint };
  }

  async reviewAndAssignComplaint(
    _complaintId: string,
    _targetDepartmentId: any,
    _reviewNotes?: string
  ): Promise<{ success: boolean; complaint?: DepartmentComplaintView; error?: string }> {
    return { success: false, error: 'Reassignment is not supported in Local AI Test Mode.' };
  }

  async overrideComplaintPriority(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Priority changes are not supported in Local AI Test Mode.' };
  }

  async claimComplaint(
    _referenceNumber: string,
    _claimCode: string
  ): Promise<{ success: boolean; complaintId?: string; referenceNumber?: string; error?: string }> {
    return { success: false, error: 'Claiming is not supported in Local AI Test Mode.' };
  }

  async trackGuestComplaint(): Promise<{ found: boolean; error?: string }> {
    return {
      found: false,
      error: 'Guest tracking is not supported in Local AI Test Mode.',
    };
  }

  async getCitizenOverviewStats(): Promise<CitizenOverviewStats> {
    return this.getOverviewStats();
  }

  clearTestStore(): void {
    this.testComplaints = [];
    this.recentSubmissions.clear();
  }
}

export const localV11ComplaintService = new LocalV11ComplaintService();
