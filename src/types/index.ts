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
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type DepartmentId =
  | 'kwsc'
  | 'sswmb'
  | 'kelectric'
  | 'kmc'
  | 'sbca'
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
  citizenPhone: string;
  district: KarachiDistrict;
  locality: string;
  privateAddress?: string;
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
  citizenPhone: string;
  district: KarachiDistrict;
  locality: string;
  privateAddress?: string;
  title: string;
  description: string;
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
