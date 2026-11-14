import {
  type Complaint,
  type ComplaintSubmissionInput,
  type CitizenOverviewStats,
  type SubmissionResult,
  type DepartmentId,
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../types';

export interface IComplaintService {
  /**
   * Retrieves all complaints for the current authenticated citizen
   */
  getComplaints(): Promise<Complaint[]>;

  /**
   * Retrieves complaints explicitly belonging to a specific citizen ID (ownership model)
   */
  getCitizenComplaints(citizenId?: string): Promise<Complaint[]>;

  /**
   * Looks up a complaint by its municipal reference number (e.g. KHI-2026-7842)
   */
  getComplaintByReference(referenceNumber: string): Promise<Complaint | null>;

  /**
   * Submits a new citizen complaint (returns simulated result in Phase 1)
   */
  submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult>;

  /**
   * Retrieves summary counts for the citizen dashboard
   */
  getOverviewStats(): Promise<CitizenOverviewStats>;

  /**
   * Retrieves all complaints assigned to the specified department.
   * STRICT SECURITY: Only complaints where assignedDepartmentId === departmentId are returned.
   * PRIVACY: Citizen personal identifiers (name, phone, address) are strictly redacted.
   */
  getDepartmentComplaints(departmentId: DepartmentId): Promise<DepartmentComplaintView[]>;

  /**
   * Looks up a complaint by reference number scoped strictly to an authorized department.
   * If the reference exists but belongs to a different department, returns null.
   */
  getDepartmentComplaintByReference(
    departmentId: DepartmentId,
    referenceNumber: string
  ): Promise<DepartmentComplaintView | null>;

  /**
   * Updates complaint status by an authorized department officer.
   * STRICT SECURITY: Verifies that the complaint is assigned to the authorized department.
   */
  updateComplaintStatus(
    departmentId: DepartmentId,
    referenceNumber: string,
    newStatus: ComplaintStatus,
    note?: string,
    noteUrdu?: string
  ): Promise<{ success: boolean; complaint: DepartmentComplaintView }>;

  /**
   * Securely claims an unclaimed guest complaint using reference number and private claim code.
   * Links the complaint to the currently authenticated citizen.
   */
  claimComplaint(
    referenceNumber: string,
    claimCode: string
  ): Promise<{ success: boolean; complaintId?: string; referenceNumber?: string; error?: string }>;
}
