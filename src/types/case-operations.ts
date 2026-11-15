/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Case Operations Desk V5 Data Contracts
 * Defines types for Incident Cases, Memberships, Bulk Actions, and Pagination.
 */

import type { ComplaintStatus, DepartmentId } from './index';

export type CaseWorkStatus =
  | 'needs_acceptance'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'on_hold';

export type PriorityBand = 'critical' | 'high' | 'normal' | 'low';

export interface IncidentCaseSummary {
  id: string; // server UUID or synthetic ID (e.g., C-2051)
  caseNumber: string; // e.g. "C-2051"
  departmentId: DepartmentId; // authoritative staff-scoped association
  title: string; // human description, sanitized, no PII
  issueFamily: string; // e.g., "Roads", "Water", "Electricity"
  issueSubtype: string; // e.g., "Road damage", "Pipeline burst"
  publicPlace: string; // verified public landmark or road segment
  district: string; // e.g., "East", "Central", "South"
  locality: string; // e.g., "Gulshan-e-Iqbal", "Gulberg"
  workStatus: CaseWorkStatus;
  linkedReportCount: number;
  uniqueReporterCount: number; // calculated privacy-safe unique count
  pendingAcceptanceCount: number;
  priority: PriorityBand;
  priorityReason: string; // factual, explainable reason
  firstReportedAt: string; // ISO string
  lastReportedAt: string; // ISO string
  oldestPendingAt: string | null; // ISO string or null
  ageDays: number; // derived days since oldest pending
  assignedStaffId: string | null;
  assignedStaffLabel: string; // e.g., "Road works team" or "Unassigned"
  summary: string; // factual English narrative
  version: number; // optimistic concurrency token
}

export interface CaseReportRow {
  complaintId: string;
  referenceNumber: string;
  submittedAt: string;
  updatedAt: string;
  status: ComplaintStatus;
  sanitizedNarrativePreview: string; // sanitized Roman Urdu / English
  publicLocation: string | null;
  linkState: 'linked' | 'suggested';
  linkMethod?: 'auto_asset' | 'auto_cluster' | 'manual_staff';
  uniquePersonId?: string; // internal synthetic token for distinct reporter calculations
}

export interface CaseActivityEvent {
  id: string;
  caseId: string;
  eventType: 'created' | 'linked' | 'unlinked' | 'accepted' | 'status_change' | 'assigned' | 'comment';
  label: string;
  detail: string;
  actorLabel: string;
  createdAt: string; // ISO string
  formattedWhen: string; // "15 Nov 2026 · 11:10 AM PKT"
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkQueueFilter {
  savedView: 'needs' | 'unassigned' | 'mine' | 'all';
  displayMode: 'cases' | 'reports';
  searchQuery: string;
  area: string; // 'All areas' or specific locality
  issueType: string; // 'All issues' or specific issue
  sort: 'attention' | 'oldest' | 'most_reports' | 'recently_updated';
  page: number;
  pageSize: number;
}

export interface BulkAcceptPreview {
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  caseVersion: number;
  totalLinked: number;
  eligible: number;
  byExcludedStatus: Partial<Record<ComplaintStatus, number>>;
  userCanAccept: boolean;
  requiredConfirmationLabel: string;
}

export interface BulkAcceptResult {
  operationId: string;
  idempotentReplay: boolean;
  caseId: string;
  caseVersion: number;
  totalLinked: number;
  accepted: number;
  skippedIneligible: number;
  unchangedReferences?: string[];
  completedAt: string;
}

export interface AreaWorkloadSummary {
  area: string;
  activeCasesCount: number;
  linkedReportsCount: number;
  urgentCasesCount: number;
  oldestWaitDays: number;
  topIssues: string[];
}
