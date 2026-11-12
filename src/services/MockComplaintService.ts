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
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';
import { generateMockReference } from '../utils/referenceGenerator';

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
    await this.delay(100);
    return this.complaints.filter((c) => c.citizenId === citizenId);
  }

  async getComplaintByReference(referenceNumber: string): Promise<Complaint | null> {
    await this.delay(100);
    const cleaned = referenceNumber.trim().toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === cleaned
    );
    return found ? { ...found } : null;
  }

  async submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult> {
    await this.delay(200);

    const refNumber = generateMockReference(2026);
    const now = new Date().toISOString();
    const routed = this.routeDepartment(`${input.title} ${input.description}`);

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      citizenId: DEMO_CITIZEN.id,
      referenceNumber: refNumber,
      citizenName: input.citizenName,
      district: input.district,
      locality: input.locality,
      publicLocation: input.publicLocation,
      title: input.title,
      description: input.description,
      detectedLanguage: 'roman_urdu',
      status: 'submitted',
      assignedDepartmentId: routed.id,
      assignedDepartmentName: routed.name,
      submittedAt: now,
      updatedAt: now,
      isDemonstration: false,
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
      ],
    };

    this.complaints.unshift(newComplaint);
    this.persistToStorage();

    return {
      referenceNumber: refNumber,
      isSimulated: true,
      timestamp: now,
      message:
        'Frontend validation passed! This is a demonstration submission. Backend database and AI classification will be connected in Phase 2 & 3.',
    };
  }

  async getOverviewStats(): Promise<CitizenOverviewStats> {
    await this.delay(80);
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
      detectedLanguage: c.detectedLanguage,
      status: c.status,
      assignedDepartmentId: c.assignedDepartmentId,
      assignedDepartmentName: c.assignedDepartmentName,
      submittedAt: c.submittedAt,
      updatedAt: c.updatedAt,
      timeline: [...c.timeline],
      isDemonstration: c.isDemonstration,
    };
  }

  /**
   * Retrieves complaints assigned strictly to the authenticated department.
   * DEPARTMENT ISOLATION: Department A cannot view Department B records.
   */
  async getDepartmentComplaints(departmentId: DepartmentId): Promise<DepartmentComplaintView[]> {
    await this.delay(100);
    return this.complaints
      .filter((c) => c.assignedDepartmentId === departmentId)
      .map((c) => this.toDepartmentView(c));
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
    const cleaned = referenceNumber.trim().toUpperCase();
    const found = this.complaints.find(
      (c) => c.referenceNumber.toUpperCase() === cleaned
    );

    if (!found) {
      throw new Error(`Complaint ${referenceNumber} not found.`);
    }

    if (found.assignedDepartmentId !== departmentId) {
      throw new Error(
        `Unauthorized: Complaint ${referenceNumber} does not belong to department ${departmentId}.`
      );
    }

    const now = new Date().toISOString();
    found.status = newStatus;
    found.updatedAt = now;

    const deptMeta = KARACHI_DEPARTMENTS[departmentId];
    const deptCode = deptMeta?.code || departmentId.toUpperCase();

    const statusTitles: Record<ComplaintStatus, { en: string; ur: string }> = {
      submitted: { en: 'Reopened', ur: 'شکایت دوبارہ کھولی گئی' },
      under_review: { en: 'Under Departmental Review', ur: 'محکمانہ جائزہ' },
      assigned: { en: 'Work Assigned', ur: 'کام تفویض' },
      in_progress: { en: 'Remediation In Progress', ur: 'کارروائی جاری' },
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
