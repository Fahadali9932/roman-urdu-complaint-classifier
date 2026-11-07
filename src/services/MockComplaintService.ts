import {
  type Complaint,
  type ComplaintSubmissionInput,
  type CitizenOverviewStats,
  type SubmissionResult,
  DEMO_CITIZEN,
} from '../types';
import { IComplaintService } from './IComplaintService';
import { MOCK_COMPLAINTS } from '../mocks/complaints';
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
      citizenPhone: input.citizenPhone,
      district: input.district,
      locality: input.locality,
      privateAddress: input.privateAddress,
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global singleton instance for Phase 1
export const complaintService: IComplaintService = new MockComplaintService();
