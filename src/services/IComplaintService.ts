import {
  type Complaint,
  type ComplaintSubmissionInput,
  type CitizenOverviewStats,
  type SubmissionResult,
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
}
