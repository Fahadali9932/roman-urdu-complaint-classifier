import {
  type Complaint,
  type ComplaintSubmissionInput,
  type CitizenOverviewStats,
  type SubmissionResult,
  type DepartmentId,
  type DepartmentComplaintView,
  type ComplaintStatus,
  type ComplaintTimelineEvent,
  type ComplaintIssue,
  DEMO_CITIZEN,
} from '../types';
import { IComplaintService } from './IComplaintService';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';
import { generateMockReference, generateGuestTrackingNumber, generateClaimCode } from '../utils/referenceGenerator';
import { classifyV11RelationAware, championV11Model, type V11RelationAwareResult } from './v11InferenceAdapter';
import { assessComplaintDraft, resolveComplaintClarification, type UnderstandingResult } from './complaintUnderstanding';

const STORAGE_KEY = 'awaaz_complaints_store_v1';

export class MockComplaintService implements IComplaintService {
  private complaints: Complaint[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.complaints = parsed;
            return;
          }
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
    // Truthful default: starts empty if no complaints have been registered
    this.complaints = [];
  }

  private persistToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.complaints));
      }
    } catch {
      // Ignore in private browsing
    }
  }

  /**
   * Automatic civic routing based on complaint keywords in Roman Urdu / English.
   * Matches municipal responsibilities without inventing fake confidence scores.
   */
  private routeDepartment(text: string): { id: DepartmentId; name: string } {
    const lower = text.toLowerCase();

    // Electricity (K-Electric)
    if (
      /\b(bijli|current|transformer|pmt|k-electric|ke|light|khamba|pole|taar|wire|voltage|spark|power out)\b/i.test(
        lower
      )
    ) {
      return {
        id: 'kelectric',
        name: KARACHI_DEPARTMENTS.kelectric?.name || 'K-Electric (Infrastructure & Distribution)',
      };
    }

    // Sanitation & Solid Waste (SSWMB)
    if (
      /\b(kachra|safai|kundi|sswmb|garbage|waste|dump|dustbin|badboo|dumping|solid waste)\b/i.test(
        lower
      )
    ) {
      return {
        id: 'sswmb',
        name: KARACHI_DEPARTMENTS.sswmb?.name || 'Sindh Solid Waste Management Board (SSWMB)',
      };
    }

    // Gas & Supply (SSGC)
    if (
      /\b(gas|leak|leaking|leakage|pressure|ssgc|cylinder|chulha|suction|compressor)\b/i.test(
        lower
      )
    ) {
      return {
        id: 'ssgc',
        name: KARACHI_DEPARTMENTS.ssgc?.name || 'Sui Southern Gas Company (SSGC)',
      };
    }

    // Water & Sewerage (KW&SC)
    if (
      /\b(pani|water|pipeline|line leak|kwsc|tanker|sewerage|gutter|drain|sewer)\b/i.test(
        lower
      )
    ) {
      return {
        id: 'kwsc',
        name: KARACHI_DEPARTMENTS.kwsc?.name || 'Karachi Water & Sewerage Corporation (KW&SC)',
      };
    }

    // Roads & Municipal Works (KMC)
    if (
      /\b(road|sadak|gadda|khadda|kmc|street light|footpath|signal|pothole)\b/i.test(
        lower
      )
    ) {
      return {
        id: 'kmc',
        name: KARACHI_DEPARTMENTS.kmc?.name || 'Karachi Metropolitan Corporation (KMC / DMCs)',
      };
    }

    // Building Regulations (SBCA)
    if (
      /\b(sbca|construction|tamir|illegal building|demolition|encroach|commercial conversion)\b/i.test(
        lower
      )
    ) {
      return {
        id: 'sbca',
        name: KARACHI_DEPARTMENTS.sbca?.name || 'Sindh Building Control Authority (SBCA)',
      };
    }

    return {
      id: 'unassigned',
      name: 'General Municipal Desk',
    };
  }

  async getComplaints(): Promise<Complaint[]> {
    await this.delay(100);
    return [...this.complaints];
  }

  async getCitizenComplaints(citizenId: string = DEMO_CITIZEN.id): Promise<Complaint[]> {
    this.loadFromStorage();
    await this.delay(100);
    return this.complaints.filter((c) => c.citizenId === citizenId);
  }

  async getComplaintByReference(referenceNumber: string): Promise<Complaint | null> {
    await this.delay(100);
    const cleaned = referenceNumber.trim();
    const upperCleaned = cleaned.toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === upperCleaned || c.id === cleaned
    );
    return found ? { ...found } : null;
  }

  async submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult> {
    await this.delay(200);

    const refNumber = generateMockReference(2026);
    const now = new Date().toISOString();
    const textToClassify = input.description.trim();

    let understanding: UnderstandingResult;
    if (input.clarificationAnswer) {
      understanding = resolveComplaintClarification(textToClassify, input.clarificationAnswer, championV11Model);
    } else {
      understanding = assessComplaintDraft(textToClassify, championV11Model);
    }

    let prediction: V11RelationAwareResult;
    let routedDepts: DepartmentId[] = [];
    let needsReview = false;

    if (understanding.state === 'ready') {
      prediction = understanding.prediction;
      routedDepts = [...understanding.departments];
      needsReview = prediction.needsReview;
    } else if (understanding.state === 'ask' || understanding.state === 'review') {
      prediction = understanding.prediction;
      routedDepts = [...prediction.departments];
      needsReview = true;
    } else {
      prediction = classifyV11RelationAware(textToClassify, championV11Model);
      routedDepts = [...prediction.departments];
      needsReview = prediction.needsReview;
    }

    if (routedDepts.length === 0) {
      routedDepts = [this.routeDepartment(textToClassify).id];
    }
    const primaryDeptId = routedDepts[0];
    const primaryDeptName = KARACHI_DEPARTMENTS[primaryDeptId]?.name || 'Municipal Agency';
    const status: ComplaintStatus = needsReview ? 'under_review' : 'assigned';
    const claimCode = generateClaimCode();

    const complaintId = `cmp-${Date.now()}`;
    const issues: ComplaintIssue[] = routedDepts.map((d, idx) => ({
      id: `iss-${d}-${Date.now()}-${idx + 1}`,
      complaintId,
      departmentId: d,
      departmentName: KARACHI_DEPARTMENTS[d]?.name,
      issueType: `${d}.reported_defect`,
      confidence: prediction.probabilities[d] ?? 0.85,
      status: needsReview ? 'under_review' : 'assigned',
      updatedAt: now,
    }));

    const probValues = Object.values(prediction.probabilities || {});
    const maxProb = probValues.length > 0 ? Math.max(...probValues) : 0.85;
    const guestTracking = generateGuestTrackingNumber();

    const newComplaint: Complaint = {
      id: complaintId,
      citizenId: null, // Guest complaint starts unclaimed
      referenceNumber: refNumber,
      citizenName: input.citizenName,
      district: input.district,
      locality: input.locality,
      publicLocation: input.publicLocation,
      title: input.title,
      description: input.description,
      detectedLanguage: 'roman_urdu',
      status,
      assignedDepartmentId: primaryDeptId,
      assignedDepartmentName: primaryDeptName,
      assignedDepartmentIds: routedDepts,
      predictedDepartmentId: primaryDeptId,
      predictedDepartmentIds: routedDepts,
      predictionConfidence: maxProb,
      isMultiLabel: routedDepts.length > 1,
      hasHazard: false,
      issues,
      submittedAt: now,
      updatedAt: now,
      isDemonstration: false,
      guestTrackingNumber: guestTracking.raw,
      guestTrackingFormatted: guestTracking.formatted,
      claimCodeHash: claimCode,
      timeline: [
        {
          id: `t-${Date.now()}`,
          status: 'submitted',
          title: 'Complaint Registered',
          titleUrdu: 'شکایت درج ہو گئی',
          description: 'Grievance submitted by citizen through public intake portal.',
          descriptionUrdu: 'شہری کی جانب سے شکایت پورٹل پر درج ہوئی۔',
          timestamp: now,
          actorRole: 'citizen',
        },
        {
          id: `t-${Date.now() + 1}`,
          status: status,
          title: prediction.needsReview ? 'Under Review' : 'Department Assigned',
          titleUrdu: prediction.needsReview ? 'زیرِ جائزہ' : 'محکمہ تفویض کر دیا گیا',
          description: prediction.needsReview
            ? 'Classifier flagged complaint for municipal clearinghouse review.'
            : `The classifier routed this complaint to ${routedDepts.map((d) => d.toUpperCase()).join(' & ')}.`,
          descriptionUrdu: prediction.needsReview
            ? 'شکایت جائزے کے لیے مارک کر دی گئی ہے۔'
            : 'درجہ بندی کے بعد شکایت متعلقہ محکمے کو بھیج دی گئی ہے۔',
          timestamp: now,
          actorRole: 'system',
        },
      ],
    };

    this.complaints.unshift(newComplaint);
    this.persistToStorage();

    return {
      referenceNumber: refNumber,
      isSimulated: false,
      timestamp: now,
      message: prediction.needsReview
        ? 'Your complaint was received and is awaiting safe routing review.'
        : 'Your complaint has been securely registered and routed.',
      departmentId: primaryDeptId,
      departments: routedDepts,
      status,
      needsReview,
      claimCode,
      guestTrackingNumber: guestTracking.formatted,
    };
  }

  async claimComplaint(
    referenceNumber: string,
    claimCode: string
  ): Promise<{ success: boolean; complaintId?: string; referenceNumber?: string; error?: string }> {
    await this.delay(100);
    const cleanedRef = referenceNumber.trim().toUpperCase();
    const cleanedCode = claimCode.trim().toUpperCase();

    const complaint = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === cleanedRef
    );

    if (!complaint) {
      return { success: false, error: 'Invalid reference number or claim code.' };
    }

    if (complaint.citizenId) {
      return { success: false, error: 'This complaint has already been claimed or linked to an account.' };
    }

    if (complaint.claimCodeHash && complaint.claimCodeHash.toUpperCase() !== cleanedCode) {
      return { success: false, error: 'Invalid reference number or claim code.' };
    }

    const now = new Date().toISOString();
    complaint.citizenId = DEMO_CITIZEN.id;
    complaint.claimedAt = now;
    complaint.claimCodeHash = null;
    complaint.updatedAt = now;

    complaint.timeline.push({
      id: `t-${Date.now()}`,
      status: complaint.status,
      title: 'Complaint Claimed',
      titleUrdu: 'شکایت اکاؤنٹ سے منسلک ہو گئی',
      description: 'Complaint securely linked to citizen account.',
      descriptionUrdu: 'شکایت محفوظ طریقے سے شہری کے اکاؤنٹ سے منسلک کر دی گئی ہے۔',
      timestamp: now,
      actorRole: 'citizen',
    });

    this.persistToStorage();

    return {
      success: true,
      complaintId: complaint.id,
      referenceNumber: complaint.referenceNumber,
    };
  }

  async getOverviewStats(): Promise<CitizenOverviewStats> {
    await this.delay(80);
    const totalComplaints = this.complaints.length;
    const pendingComplaints = this.complaints.filter(
      (c) => c.status === 'submitted' || c.status === 'under_review'
    ).length;
    const inProgressComplaints = this.complaints.filter(
      (c) => c.status === 'assigned' || c.status === 'accepted' || c.status === 'in_progress'
    ).length;
    const resolvedComplaints = this.complaints.filter(
      (c) => c.status === 'resolved'
    ).length;

    return {
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
    };
  }

  /**
   * Transforms an internal Complaint to a DepartmentComplaintView.
   * STRICT PRIVACY & PII REDACTION CONTRACT:
   * Citizen personal identifiers (citizenName, citizenPhone, citizenEmail, applicantAddress)
   * are completely omitted from department views. Only municipal incident location is exposed.
   */
  private toDepartmentView(c: Complaint): DepartmentComplaintView {
    return {
      id: c.id,
      referenceNumber: c.referenceNumber,
      district: c.district,
      locality: c.locality,
      publicLocation: c.publicLocation,
      title: c.title,
      description: c.description,
      sanitizedDescription: c.sanitizedDescription ?? c.description,
      generatedHeading: c.generatedHeading ?? c.title,
      factualSummary: c.factualSummary ?? c.description,
      redactionFlags: c.redactionFlags,
      redactionNeedsReview: c.redactionNeedsReview,
      detectedLanguage: c.detectedLanguage,
      status: c.status,
      assignedDepartmentId: c.assignedDepartmentId,
      assignedDepartmentName: c.assignedDepartmentName,
      assignedDepartmentIds: c.assignedDepartmentIds,
      isMultiLabel: c.isMultiLabel,
      issues: c.issues,
      hasHazard: c.hasHazard,
      hazardType: c.hazardType,
      submittedAt: c.submittedAt,
      updatedAt: c.updatedAt,
      timeline: [...c.timeline],
      isDemonstration: c.isDemonstration,
      manualPriority: c.manualPriority,
      manualPriorityReason: c.manualPriorityReason,
      manualPriorityBy: c.manualPriorityBy,
      manualPriorityAt: c.manualPriorityAt,
    };
  }

  /**
   * Retrieves complaints assigned strictly to the authenticated department.
   * DEPARTMENT ISOLATION: Department A cannot view Department B records.
   */
  async getDepartmentComplaints(departmentId: DepartmentId): Promise<DepartmentComplaintView[]> {
    await this.delay(100);
    return this.complaints
      .filter(
        (c) =>
          c.assignedDepartmentId === departmentId ||
          Boolean(c.assignedDepartmentIds && c.assignedDepartmentIds.includes(departmentId))
      )
      .map((c) => this.toDepartmentView(c));
  }

  /**
   * Retrieves uncertain complaints awaiting classification review.
   * Scoped to authorized clearinghouse reviewers.
   */
  async getReviewQueueComplaints(): Promise<DepartmentComplaintView[]> {
    return []; // This department mock has no authenticated administrator.
  }

  /**
   * Scoped lookup for a specific complaint by reference number.
   * Returns null if the complaint does not belong to the authorized department.
   */
  async getDepartmentComplaintByReference(
    departmentId: DepartmentId,
    referenceNumber: string
  ): Promise<DepartmentComplaintView | null> {
    await this.delay(100);
    const cleaned = referenceNumber.trim();
    const upperCleaned = cleaned.toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === upperCleaned || c.id === cleaned
    );

    const isAssigned =
      found &&
      (found.assignedDepartmentId === departmentId ||
        found.assignedDepartmentIds?.includes(departmentId));

    if (!found || !isAssigned) {
      return null;
    }

    return this.toDepartmentView(found);
  }

  /**
   * Updates complaint operational status by authorized department staff.
   * Validates department ownership, updates status, and appends an official timeline milestone.
   */
  async updateComplaintStatus(
    departmentId: DepartmentId,
    referenceNumber: string,
    newStatus: ComplaintStatus,
    note?: string,
    noteUrdu?: string
  ): Promise<{ success: boolean; complaint: DepartmentComplaintView }> {
    await this.delay(150);
    const cleaned = referenceNumber.trim();
    const upperCleaned = cleaned.toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === upperCleaned || c.id === cleaned
    );

    if (!found) {
      throw new Error(`Complaint ${referenceNumber} not found.`);
    }

    const isAssigned =
      found.assignedDepartmentId === departmentId ||
      Boolean(found.assignedDepartmentIds && found.assignedDepartmentIds.includes(departmentId));

    if (!isAssigned) {
      throw new Error(
        `Unauthorized: Complaint ${referenceNumber} does not belong to department ${departmentId}.`
      );
    }

    const now = new Date().toISOString();

    // Update issue if present
    if (found.issues && found.issues.length > 0) {
      const issue = found.issues.find((i) => i.departmentId === departmentId);
      if (issue) {
        issue.status = newStatus;
        issue.statusNotes = note;
        issue.updatedAt = now;
      }
      const allStatuses = found.issues.map((i) => i.status);
      if (allStatuses.every((s) => s === 'resolved')) {
        found.status = 'resolved';
      } else if (allStatuses.every((s) => s === 'rejected')) {
        found.status = 'rejected';
      } else if (allStatuses.some((s) => s === 'in_progress')) {
        found.status = 'in_progress';
      } else if (allStatuses.some((s) => s === 'accepted')) {
        found.status = 'accepted';
      } else if (allStatuses.some((s) => s === 'resolved')) {
        found.status = 'partly_resolved';
      } else {
        found.status = newStatus;
      }
    } else {
      found.status = newStatus;
    }
    found.updatedAt = now;

    const deptMeta = KARACHI_DEPARTMENTS[departmentId];
    const deptCode = deptMeta?.code || departmentId.toUpperCase();

    const statusTitles: Record<ComplaintStatus, { en: string; ur: string }> = {
      submitted: { en: 'Reopened', ur: 'شکایت دوبارہ کھولی گئی' },
      under_review: { en: 'Under Departmental Review', ur: 'محکمانہ جائزہ' },
      assigned: { en: 'Pending Acceptance', ur: 'توثیق کے منتظر' },
      accepted: { en: 'Complaint Accepted', ur: 'شکایت منظور کر لی گئی' },
      in_progress: { en: 'Remediation In Progress', ur: 'کارروائی جاری' },
      partly_resolved: { en: 'Partially Resolved', ur: 'جزوی طور پر حل شدہ' },
      resolved: { en: 'Issue Resolved', ur: 'مسئلہ حل ہو گیا' },
      rejected: { en: 'Complaint Closed', ur: 'شکایت بند' },
    };

    const titleInfo = statusTitles[newStatus] || {
      en: `Status updated to ${newStatus}`,
      ur: `سٹیٹس تبدیل: ${newStatus}`,
    };

    const newEvent: ComplaintTimelineEvent = {
      id: `t-dept-${Date.now()}`,
      status: newStatus,
      title: titleInfo.en,
      titleUrdu: titleInfo.ur,
      description:
        note && note.trim().length > 0
          ? note.trim()
          : `Status changed to ${newStatus.replace('_', ' ')}.`,
      descriptionUrdu:
        noteUrdu && noteUrdu.trim().length > 0
          ? noteUrdu.trim()
          : `سٹیٹس تبدیل: ${titleInfo.ur}`,
      timestamp: now,
      actorRole: 'department_officer',
      departmentCode: deptCode,
    };

    found.timeline.push(newEvent);
    this.persistToStorage();

    return {
      success: true,
      complaint: this.toDepartmentView(found),
    };
  }

  /**
   * For automated tests and QA only. Seeds test fixtures into the service.
   * Does not run in normal runtime unless explicitly invoked by a test.
   */
  seedTestComplaints(fixtures: Complaint[]): void {
    this.complaints = [...fixtures];
    this.persistToStorage();
  }

  /**
   * Reviews an uncertain complaint and assigns it to a confirmed department.
   */
  async reviewAndAssignComplaint(
    _complaintId: string,
    _targetDepartmentId: DepartmentId,
    _reviewNotes?: string
  ): Promise<{ success: boolean; complaint?: DepartmentComplaintView; error?: string }> {
    return { success: false, error: 'Administrator required for classification review.' };
  }

  /**
   * Adjusts priority of a complaint by authorized department staff.
   * STRICT SECURITY: Enforces department ownership and audits modification.
   */
  async overrideComplaintPriority(
    departmentId: DepartmentId,
    referenceNumber: string,
    newPriority: 'critical' | 'high' | 'normal' | 'low',
    reason: string
  ): Promise<{ success: boolean; complaint?: DepartmentComplaintView; error?: string }> {
    await this.delay(100);
    const cleaned = referenceNumber.trim();
    const upperCleaned = cleaned.toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === upperCleaned || c.id === cleaned
    );

    if (!found) {
      return { success: false, error: `Complaint ${referenceNumber} not found.` };
    }

    if (found.assignedDepartmentId !== departmentId) {
      return { success: false, error: `Unauthorized: Complaint ${referenceNumber} does not belong to department ${departmentId}.` };
    }

    const now = new Date().toISOString();
    found.manualPriority = newPriority;
    found.manualPriorityReason = reason.trim();
    found.manualPriorityBy = 'Authorized Staff Officer';
    found.manualPriorityAt = now;
    found.updatedAt = now;

    const deptMeta = KARACHI_DEPARTMENTS[departmentId];
    const deptCode = deptMeta?.code || departmentId.toUpperCase();

    found.timeline.push({
      id: `t-prio-${Date.now()}`,
      status: found.status,
      title: `Priority Adjusted to ${newPriority.toUpperCase()}`,
      titleUrdu: `ترجیح کو تبدیل کر کے ${newPriority.toUpperCase()} کیا گیا`,
      description: `Priority overridden by Authorized Staff Officer. Reason: ${reason.trim()}`,
      descriptionUrdu: `محکمانہ افسر کی جانب سے ترجیح تبدیل کی گئی۔ وجہ: ${reason.trim()}`,
      timestamp: now,
      actorRole: 'department_officer',
      departmentCode: deptCode,
    });

    this.persistToStorage();
    return { success: true, complaint: this.toDepartmentView(found) };
  }

  /**
   * Looks up minimal public-safe complaint status for a guest tracking number.
   */
  async trackGuestComplaint(trackingNumber: string): Promise<{
    found: boolean;
    public_status?: string;
    display_status?: string;
    public_category?: string;
    submitted_at?: string;
    updated_at?: string;
    public_updates?: Array<{ status: string; at: string; message: string }>;
    is_multilabel?: boolean;
    public_issues?: Array<{
      department_name: string;
      department_id: string;
      status: string;
      display_status: string;
    }>;
    error?: string;
  }> {
    await this.delay(60);
    const normalized = trackingNumber.replace(/\s+/g, '');
    if (!/^\d{24}$/.test(normalized)) {
      return {
        found: false,
        error: "We couldn't find a complaint with that number. Check it and try again.",
      };
    }

    const displayStatuses: Record<string, string> = {
      submitted: 'Complaint received',
      under_review: 'Being reviewed',
      assigned: 'Sent to department',
      accepted: 'Sent to department',
      in_progress: 'Work started',
      resolved: 'Work completed',
      closed: 'Closed',
      rejected: 'Closed',
    };

    const complaint = this.complaints.find((c) => c.guestTrackingNumber === normalized) || this.complaints[0];
    const deptMeta = complaint?.assignedDepartmentId
      ? KARACHI_DEPARTMENTS[complaint.assignedDepartmentId]
      : KARACHI_DEPARTMENTS['kmc'];

    const currentStatus = complaint?.status || 'under_review';

    return {
      found: true,
      public_status: currentStatus,
      display_status: displayStatuses[currentStatus] || 'Being reviewed',
      public_category: deptMeta?.name || 'Karachi Metropolitan Corporation (KMC / DMCs)',
      submitted_at: complaint?.submittedAt || '2026-11-14T10:15:00.000Z',
      updated_at: complaint?.updatedAt || '2026-11-15T14:30:00.000Z',
      is_multilabel: complaint?.isMultiLabel,
      public_issues: complaint?.issues?.map((i) => ({
        department_name: i.departmentName || KARACHI_DEPARTMENTS[i.departmentId]?.name || i.departmentId,
        department_id: i.departmentId,
        status: i.status,
        display_status: displayStatuses[i.status] || i.status,
      })),
      public_updates: [
        {
          status: 'submitted',
          at: complaint?.submittedAt || '2026-11-14T10:15:00.000Z',
          message: 'Citizen report received and registered in municipal tracking system.',
        },
        {
          status: 'under_review',
          at: complaint?.updatedAt || '2026-11-15T14:30:00.000Z',
          message: 'Case routed to relevant field department for ground verification.',
        },
      ],
    };
  }

  /**
   * Clears the complaint store.
   */
  clearComplaints(): void {
    this.complaints = [];
    this.persistToStorage();
  }

  private delay(ms: number): Promise<void> {
    const isTest = typeof globalThis !== 'undefined' &&
      (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test';
    if (isTest) {
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global singleton instance
export const complaintService: MockComplaintService = new MockComplaintService();
