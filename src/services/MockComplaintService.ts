import {
  type Complaint,
  type ComplaintSubmissionInput,
  type CitizenOverviewStats,
  type SubmissionResult,
  type DepartmentId,
  type DepartmentComplaintView,
  type ComplaintStatus,
  type ComplaintTimelineEvent,
  DEMO_CITIZEN,
} from '../types';
import { IComplaintService } from './IComplaintService';
import { MOCK_COMPLAINTS, KARACHI_DEPARTMENTS } from '../mocks/complaints';
import { generateMockReference } from '../utils/referenceGenerator';

export class MockComplaintService implements IComplaintService {
  private complaints: Complaint[] = [...MOCK_COMPLAINTS];

  async getComplaints(): Promise<Complaint[]> {
    // Simulate brief network latency for realistic loading states
    await this.delay(150);
    return [...this.complaints];
  }

  async getCitizenComplaints(citizenId: string = DEMO_CITIZEN.id): Promise<Complaint[]> {
    await this.delay(150);
    return this.complaints.filter((c) => c.citizenId === citizenId);
  }

  async getComplaintByReference(referenceNumber: string): Promise<Complaint | null> {
    await this.delay(200);
    const cleaned = referenceNumber.trim().toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === cleaned
    );
    return found ? { ...found } : null;
  }

  async submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult> {
    await this.delay(350);

    const refNumber = generateMockReference(2026);
    const now = new Date().toISOString();

    // Create a local demonstration complaint belonging to the active demo citizen
    const newComplaint: Complaint = {
      id: `sim-${Date.now()}`,
      citizenId: DEMO_CITIZEN.id,
      referenceNumber: refNumber,
      citizenName: input.citizenName,
      district: input.district,
      locality: input.locality,
      title: input.title,
      description: input.description,
      detectedLanguage: 'roman_urdu',
      status: 'submitted',
      assignedDepartmentId: 'unassigned',
      assignedDepartmentName: 'Awaiting Automated AI Classification (Phase 3)',
      submittedAt: now,
      updatedAt: now,
      isDemonstration: true,
      timeline: [
        {
          id: `t-sim-${Date.now()}`,
          status: 'submitted',
          title: 'Complaint Registered (Simulation)',
          titleUrdu: 'شکایت درج ہو گئی (ڈیمو)',
          description:
            'Grievance captured successfully in demonstration mode. In Phase 2, this will persist to Supabase PostgreSQL.',
          descriptionUrdu:
            'شکایت ڈیمو موڈ میں درج ہوئی۔ فیز 2 میں اسے سپابیس ڈیٹا بیس سے منسلک کیا جائے گا۔',
          timestamp: now,
          actorRole: 'citizen',
        },
      ],
    };

    // Prepend to in-memory list
    this.complaints.unshift(newComplaint);

    return {
      referenceNumber: refNumber,
      isSimulated: true,
      timestamp: now,
      message:
        'Frontend validation passed! This is a demonstration submission. Backend database and AI classification will be connected in Phase 2 & 3.',
    };
  }

  async getOverviewStats(): Promise<CitizenOverviewStats> {
    await this.delay(100);
    const totalComplaints = this.complaints.length;
    const pendingComplaints = this.complaints.filter(
      (c) => c.status === 'submitted' || c.status === 'under_review'
    ).length;
    const inProgressComplaints = this.complaints.filter(
      (c) => c.status === 'assigned' || c.status === 'in_progress'
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
   * STRICT PRIVACY: Omits citizenName, citizenPhone, citizenEmail, and applicantAddress.
   */
  private toDepartmentView(c: Complaint): DepartmentComplaintView {
    return {
      id: c.id,
      referenceNumber: c.referenceNumber,
      district: c.district,
      locality: c.locality,
      title: c.title,
      description: c.description,
      detectedLanguage: c.detectedLanguage,
      status: c.status,
      assignedDepartmentId: c.assignedDepartmentId,
      assignedDepartmentName: c.assignedDepartmentName,
      predictedDepartmentId: c.predictedDepartmentId,
      predictionConfidence: c.predictionConfidence,
      submittedAt: c.submittedAt,
      updatedAt: c.updatedAt,
      timeline: [...c.timeline],
      isDemonstration: c.isDemonstration,
    };
  }

  /**
   * Retrieves all complaints assigned to the specified department.
   * STRICT SECURITY: Only complaints matching departmentId are returned.
   */
  async getDepartmentComplaints(departmentId: DepartmentId): Promise<DepartmentComplaintView[]> {
    await this.delay(150);
    return this.complaints
      .filter((c) => c.assignedDepartmentId === departmentId)
      .map((c) => this.toDepartmentView(c));
  }

  /**
   * Looks up a complaint by reference scoped strictly to the authorized department.
   * If reference exists but belongs to a different department, returns null (prevents unauthorized access).
   */
  async getDepartmentComplaintByReference(
    departmentId: DepartmentId,
    referenceNumber: string
  ): Promise<DepartmentComplaintView | null> {
    await this.delay(150);
    const cleaned = referenceNumber.trim().toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === cleaned
    );

    if (!found || found.assignedDepartmentId !== departmentId) {
      return null;
    }

    return this.toDepartmentView(found);
  }

  /**
   * Updates complaint status by an authorized department officer.
   * Synchronously mutates the complaint and appends an official timeline event.
   */
  async updateComplaintStatus(
    departmentId: DepartmentId,
    referenceNumber: string,
    newStatus: ComplaintStatus,
    note?: string,
    noteUrdu?: string
  ): Promise<{ success: boolean; complaint: DepartmentComplaintView }> {
    await this.delay(200);
    const cleaned = referenceNumber.trim().toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === cleaned
    );

    if (!found) {
      throw new Error(`Complaint ${referenceNumber} not found.`);
    }

    if (found.assignedDepartmentId !== departmentId) {
      throw new Error(`Unauthorized: Complaint ${referenceNumber} does not belong to department ${departmentId}.`);
    }

    const now = new Date().toISOString();
    found.status = newStatus;
    found.updatedAt = now;

    const deptMeta = KARACHI_DEPARTMENTS[departmentId];
    const deptCode = deptMeta?.code || departmentId.toUpperCase();

    const statusTitles: Record<ComplaintStatus, { en: string; ur: string }> = {
      submitted: { en: 'Complaint Reopened / Registered', ur: 'شکایت دوبارہ کھولی گئی' },
      under_review: { en: 'Under Departmental Review', ur: 'محکمانہ جائزے کے تحت' },
      assigned: { en: 'Field Team Dispatched', ur: 'فیلڈ ٹیم روانہ کر دی گئی' },
      in_progress: { en: 'Remediation In Progress', ur: 'مسئلے پر کام جاری ہے' },
      resolved: { en: 'Issue Resolved & Verified', ur: 'مسئلہ حل ہو گیا اور تصدیق مکمل' },
      rejected: { en: 'Complaint Closed / Not Actionable', ur: 'شکایت بند / ناقابل عمل' },
    };

    const titleInfo = statusTitles[newStatus] || {
      en: `Status updated to ${newStatus}`,
      ur: `سٹیٹس اپڈیٹ: ${newStatus}`,
    };

    const newEvent: ComplaintTimelineEvent = {
      id: `t-dept-${Date.now()}`,
      status: newStatus,
      title: titleInfo.en,
      titleUrdu: titleInfo.ur,
      description:
        note && note.trim().length > 0
          ? note.trim()
          : `Official status transitioned to ${newStatus.replace('_', ' ')} by ${deptCode} operations officer.`,
      descriptionUrdu:
        noteUrdu && noteUrdu.trim().length > 0
          ? noteUrdu.trim()
          : `محکمہ ${deptMeta?.nameUrdu || deptCode} کے افسر نے سٹیٹس ${titleInfo.ur} میں تبدیل کیا۔`,
      timestamp: now,
      actorRole: 'department_officer',
      departmentCode: deptCode,
    };

    found.timeline.push(newEvent);

    return {
      success: true,
      complaint: this.toDepartmentView(found),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global singleton instance for Phase 1
export const complaintService: IComplaintService = new MockComplaintService();
