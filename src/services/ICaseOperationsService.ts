/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Case Operations Service Interface
 * Defines contracts for server-paged case lists, reports, area rollups, and bulk operations.
 */

import type {
  DepartmentId,
  IncidentCaseSummary,
  CaseReportRow,
  CaseActivityEvent,
  CursorPage,
  WorkQueueFilter,
  BulkAcceptPreview,
  BulkAcceptResult,
  AreaWorkloadSummary,
} from '../types';

export interface ICaseOperationsService {
  listDepartmentCases(
    deptId: DepartmentId,
    filter: WorkQueueFilter
  ): Promise<CursorPage<IncidentCaseSummary>>;

  listDepartmentReports(
    deptId: DepartmentId,
    filter: WorkQueueFilter
  ): Promise<CursorPage<CaseReportRow & { caseId: string; caseTitle: string; area: string }>>;

  getCaseDetail(caseId: string): Promise<IncidentCaseSummary | null>;

  listCaseReports(
    caseId: string,
    search?: string,
    page?: number,
    pageSize?: number
  ): Promise<CursorPage<CaseReportRow>>;

  listCaseActivity(caseId: string): Promise<CaseActivityEvent[]>;

  listAreaWorkload(deptId: DepartmentId): Promise<AreaWorkloadSummary[]>;

  previewBulkAcceptance(caseId: string): Promise<BulkAcceptPreview>;

  executeBulkAcceptance(
    caseId: string,
    idempotencyKey: string
  ): Promise<BulkAcceptResult>;

  getDepartmentWorkSummary(
    deptId: DepartmentId
  ): Promise<{
    departmentId: DepartmentId;
    totalCases: number;
    totalReports: number;
    casesNeedingResponse: number;
    casesAccepted: number;
    reportsAwaitingAck: number;
    casesInProgress: number;
    casesCompleted: number;
    casesUnassigned: number;
    urgentCases: number;
    awaitingAcceptance: number;
  }>;
}
