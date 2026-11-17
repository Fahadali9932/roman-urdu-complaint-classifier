import type {
  Complaint,
  ComplaintSubmissionInput,
  SubmissionResult,
  ComplaintStatus,
  ComplaintIssue,
  CitizenOverviewStats,
  DepartmentComplaintView,
} from '../types';
import type { IComplaintService } from './IComplaintService';
import {
  classifyV11RelationAware,
  championV11Model,
  type V11RelationAwareResult,
} from './v11InferenceAdapter';
import { processComplaintPrivacy } from '../lib/privacy-engine';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';

export interface V11LocalAnalysisPayload extends V11RelationAwareResult {
  heading: string;
  factualSummary: string;
  sanitizedDescription: string;
  latencyMs: number;
  modelVersion: string;
  wordCount: number;
  timestamp: string;
}

/**
 * AWAAZ-E-AWAM — Phase V11.4.3
 * Isolated In-Memory Local V11 Complaint Service
 *
 * Guarantees:
 * - 100% Client-Side V11.4.2 Champion (run_003) Inference
 * - Zero Network Requests to Hosted Supabase
 * - Zero Database Mutations
 * - Zero PII Exposure
 * - Purely In-Memory Ephemeral Storage
 */
export class LocalV11ComplaintService implements IComplaintService {
  private testComplaints: Complaint[] = [];

  async submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult> {
    const start = performance.now();
    const text = input.description.trim();
    const words = text.split(/\s+/).filter(Boolean).length;

    // Run V11.4.2 Relation-Aware Champion Inference locally
    const v11Result = classifyV11RelationAware(text, championV11Model);
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;

    // Process Privacy and Truthful Summarization locally
    const privacy = processComplaintPrivacy(text, {
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      citizenEmail: input.citizenEmail,
      residentialAddress: input.residentialAddress,
      incidentDistrict: input.district,
      incidentLocality: input.locality,
      incidentPublicLocation: input.publicLocation,
      departmentId: v11Result.departments[0] || 'kmc',
    });

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refNumber = `TEST-2026-V11-${randomSuffix}`;
    const now = new Date().toISOString();
    const status: ComplaintStatus = v11Result.needsReview ? 'under_review' : 'assigned';
    const primaryDeptId = v11Result.departments[0] || 'kmc';
    const primaryDeptName = KARACHI_DEPARTMENTS[primaryDeptId]?.name || 'Municipal Agency';

    const issues: ComplaintIssue[] = v11Result.departments.map((d, idx) => ({
      id: `iss-${d}-${Date.now()}-${idx + 1}`,
      complaintId: `cmp-${refNumber}`,
      departmentId: d,
      departmentName: KARACHI_DEPARTMENTS[d]?.name,
      issueType: `${d}.actionable_defect`,
      confidence: v11Result.probabilities[d] ?? 0.85,
      status: v11Result.needsReview ? 'under_review' : 'assigned',
      updatedAt: now,
    }));

    const analysisPayload: V11LocalAnalysisPayload = {
      ...v11Result,
      heading: privacy.generatedHeading,
      factualSummary: privacy.factualSummary,
      sanitizedDescription: privacy.sanitizedDescription,
      latencyMs,
      modelVersion: 'v11.4.2-champion-run_003',
      wordCount: words,
      timestamp: now,
    };

    const newComplaint: Complaint = {
      id: `cmp-${refNumber}`,
      citizenId: null,
      referenceNumber: refNumber,
      citizenName: input.citizenName,
      district: input.district,
      locality: input.locality,
      publicLocation: input.publicLocation,
      title: privacy.generatedHeading,
      description: text,
      sanitizedDescription: privacy.sanitizedDescription,
      generatedHeading: privacy.generatedHeading,
      factualSummary: privacy.factualSummary,
      detectedLanguage: 'roman_urdu',
      status,
      assignedDepartmentId: (v11Result.needsReview ? 'unassigned' : primaryDeptId) as any,
      assignedDepartmentName: v11Result.needsReview ? undefined : primaryDeptName,
      assignedDepartmentIds: v11Result.needsReview ? [] : v11Result.departments,
      predictedDepartmentId: primaryDeptId,
      predictedDepartmentIds: v11Result.departments,
      predictionConfidence: v11Result.probabilities[primaryDeptId] ?? 0.85,
      isMultiLabel: v11Result.departments.length > 1,
      hasHazard: false,
      issues,
      submittedAt: now,
      updatedAt: now,
      isDemonstration: true,
      timeline: [
        {
          id: `t-${Date.now()}`,
          status: 'submitted',
          title: 'Test Complaint Analyzed (Local AI Test Mode)',
          titleUrdu: 'ٹیسٹ شکایت کا مقامی تجزیہ',
          description: `V11.4.2 Champion model processed complaint locally in ${latencyMs}ms.`,
          descriptionUrdu: `وی ۱۱ ماڈل نے شکایت کا تجزیہ ${latencyMs} ملی سیکنڈ میں کیا۔`,
          timestamp: now,
          actorRole: 'citizen',
        },
      ],
    };

    // Store in isolated in-memory test store only
    this.testComplaints.unshift(newComplaint);

    return {
      referenceNumber: refNumber,
      isSimulated: true,
      isLocalTestMode: true,
      timestamp: now,
      message: v11Result.needsReview
        ? 'Test complaint placed in Review Queue for human classification inspection.'
        : `Test complaint successfully routed to ${v11Result.departments.map((d) => d.toUpperCase()).join(' & ')}.`,
      departmentId: primaryDeptId,
      departments: v11Result.departments,
      status,
      needsReview: v11Result.needsReview,
      guestTrackingNumber: '9999 8888 7777 6666 5555 4444',
      claimCode: `CLM-TEST-${randomSuffix}`,
      v11Analysis: analysisPayload,
    };
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
    return this.testComplaints
      .filter((c) => c.status === 'under_review')
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
    return { success: true };
  }

  async overrideComplaintPriority(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async claimComplaint(
    _referenceNumber: string,
    _claimCode: string
  ): Promise<{ success: boolean; complaintId?: string; referenceNumber?: string; error?: string }> {
    return { success: false, error: 'Claiming is not supported in Local AI Test Mode.' };
  }

  async trackGuestComplaint(): Promise<any> {
    return {
      found: true,
      public_status: 'assigned',
      display_status: 'Local Test Mode Evaluation',
      public_category: 'Local V11 Evaluation',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      public_updates: [],
    };
  }

  async getCitizenOverviewStats(): Promise<CitizenOverviewStats> {
    return {
      totalComplaints: this.testComplaints.length,
      pendingComplaints: this.testComplaints.filter((c) => c.status === 'under_review').length,
      inProgressComplaints: this.testComplaints.filter((c) => c.status === 'assigned').length,
      resolvedComplaints: 0,
    };
  }

  clearTestStore(): void {
    this.testComplaints = [];
  }
}

export const localV11ComplaintService = new LocalV11ComplaintService();
