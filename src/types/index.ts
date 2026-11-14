/**
 * Roman Urdu Complaint Classifier — Domain Type Definitions
 * Greenwich University, Karachi, Pakistan
 */

export type Language = 'en' | 'ur';

export type KarachiDistrict =
  | 'District East'
  | 'District West'
  | 'District Central'
  | 'District South'
  | 'District Malir'
  | 'District Korangi'
  | 'District Keamari';

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type DepartmentId =
  | 'kwsc'
  | 'sswmb'
  | 'kelectric'
  | 'kmc'
  | 'sbca'
  | 'ssgc'
  | 'unassigned';

export interface Department {
  id: DepartmentId;
  name: string;
  nameUrdu: string;
  code: string;
  description: string;
  descriptionUrdu: string;
  iconName: string;
}

/**
 * Department-facing complaint view.
 * PRIVACY CONTRACT: Strictly excludes citizenName, citizenPhone, citizenEmail, and applicantAddress.
 */
export interface DepartmentComplaintView {
  id: string;
  referenceNumber: string;
  district: KarachiDistrict;
  locality: string;
  publicLocation?: string;
  title: string;
  description: string;
  detectedLanguage: DetectedLanguage;
  status: ComplaintStatus;
  assignedDepartmentId: DepartmentId;
  assignedDepartmentName?: string;
  predictedDepartmentId?: DepartmentId;
  predictionConfidence?: number;
  submittedAt: string;
  updatedAt: string;
  timeline: ComplaintTimelineEvent[];
  isDemonstration: boolean;
}

export type DetectedLanguage = 'roman_urdu' | 'english' | 'urdu';

export interface ComplaintTimelineEvent {
  id: string;
  status: ComplaintStatus;
  title: string;
  titleUrdu: string;
  description: string;
  descriptionUrdu: string;
  timestamp: string;
  actorRole: 'system' | 'citizen' | 'department_officer' | 'administrator';
  departmentCode?: string;
}

export interface Complaint {
  id: string;
  citizenId?: string;
  referenceNumber: string;
  citizenName: string;
  district: KarachiDistrict;
  locality: string;
  publicLocation?: string;
  title: string;
  description: string;
  detectedLanguage: DetectedLanguage;
  status: ComplaintStatus;
  assignedDepartmentId: DepartmentId;
  assignedDepartmentName?: string;
  predictedDepartmentId?: DepartmentId;
  predictionConfidence?: number;
  submittedAt: string;
  updatedAt: string;
  timeline: ComplaintTimelineEvent[];
  isDemonstration: boolean;
}

export interface CitizenProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  district: KarachiDistrict;
  isFictionalDemoUser: true;
}

export const DEMO_CITIZEN: CitizenProfile = {
  id: 'cit-demo-bilal-2026',
  fullName: 'Muhammad Bilal',
  phone: '+92 300 2345678',
  email: 'bilal.citizen@awaaz-e-awam.pk',
  district: 'District East',
  isFictionalDemoUser: true,
};

export interface ComplaintSubmissionInput {
  citizenName: string;
  citizenPhone?: string;
  citizenEmail?: string;
  residentialAddress?: string;
  district: KarachiDistrict;
  locality: string;
  publicLocation?: string;
  title: string;
  description: string;
  /** Explicit opt-in for fictional, controlled test submissions only. */
  isDemonstration?: boolean;
}

/**
 * Transient applicant details collected during active browser session.
 * PRIVACY CONTRACT: citizenPhone and applicantAddress are transient and MUST NOT
 * be written to database persistence, browser storage, or department-facing views.
 */
export interface ApplicantFormData {
  citizenName: string;
  citizenPhone: string;
  citizenEmail: string;
  applicantAddress: string;
}

/**
 * Problem location data for municipal routing.
 */
export interface ProblemLocationData {
  locality: string;
  district: KarachiDistrict | '';
  isDistrictAutoResolved: boolean;
  districtNeedsConfirmation: boolean;
  publicLocation: string; // Street, Block or Nearby Landmark
}

/**
 * Complaint content details.
 */
export interface ComplaintDetailsData {
  title: string;
  description: string;
}

/**
 * Complete in-memory complaint form state.
 */
export interface FullComplaintFormState {
  applicant: ApplicantFormData;
  location: ProblemLocationData;
  complaint: ComplaintDetailsData;
}

/**
 * Explicit allowlist for future persistable complaint payload.
 * EXCLUDES citizenPhone and applicantAddress.
 */
export interface PersistableComplaintData {
  id?: string;
  citizenName: string;
  district: KarachiDistrict;
  locality: string;
  publicLocation: string;
  title: string;
  description: string;
  detectedLanguage: DetectedLanguage;
  status: ComplaintStatus;
  submittedAt: string;
}

export interface CitizenOverviewStats {
  totalComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
}

export interface SubmissionResult {
  referenceNumber: string;
  isSimulated: boolean;
  timestamp: string;
  message: string;
}

/**
 * Phase 3B: Database Schema Representation of public.complaints
 */
export interface DbComplaint {
  id: string;
  reference_number: string;
  citizen_id: string;
  title?: string | null;
  description: string;
  detected_language: DetectedLanguage;
  incident_district: KarachiDistrict;
  incident_locality: string;
  incident_public_location: string;
  status: ComplaintStatus;
  assigned_department_id: DepartmentId;
  predicted_department_id?: DepartmentId | null;
  prediction_confidence?: number | null;
  is_reviewed_by_admin: boolean;
  is_demonstration: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Phase 3B: Database Schema Representation of public.complaint_citizen_private (Strictly Isolated PII)
 */
export interface DbComplaintCitizenPrivate {
  complaint_id: string;
  citizen_name: string;
  citizen_phone: string;
  citizen_email?: string | null;
  residential_address: string;
  created_at: string;
  updated_at: string;
}

/**
 * Phase 3B: Database Schema Representation of public.complaint_timeline_events (Immutable Audit Trail)
 */
export interface DbComplaintTimelineEvent {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  title: string;
  title_urdu: string;
  description: string;
  description_urdu: string;
  actor_role: 'system' | 'citizen' | 'department_staff' | 'main_admin';
  actor_id?: string | null;
  created_at: string;
}

