/**
 * AWAAZ-E-AWAM (آوازِ عوام) — AI Human Review & Continuous Learning Service
 *
 * Browser-local prototype for review and manually verified correction export.
 * This is not an authenticated shared ledger or automatic training pipeline.
 * Regex redaction handles common phone/CNIC/email formats, not every identifier.
 */

import type { DepartmentId } from '../types';

export interface ReviewQueueItem {
  id: string;
  complaintId: string;
  referenceNumber: string;
  text: string;
  originalDepartments: DepartmentId[];
  suggestedDepartment: DepartmentId | 'out_of_scope' | 'unknown';
  flaggedByStaffId: string;
  flaggedByStaffName: string;
  flaggedByDepartment: DepartmentId;
  flagReason: string;
  flaggedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedAt?: string;
  resolvedByAdminId?: string;
  confirmedDepartments?: DepartmentId[];
  resolutionNotes?: string;
  piiScrubbed: boolean;
}

const STORAGE_KEY = 'awaaz_ai_review_queue_v11';
const VERIFIED_STORAGE_KEY = 'awaaz_ai_verified_corrections_v11';

// These exact identifiers belonged to three fabricated V11.5 demo entries.
// Remove only those entries during migration; preserve all genuine records.
const LEGACY_DEMO_IDS = new Map([
  ['rev-001', 'comp-seed-101'],
  ['rev-002', 'comp-seed-102'],
  ['rev-003', 'comp-seed-103'],
]);

export class AiReviewService {
  private queue: ReviewQueueItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored: unknown = JSON.parse(raw);
          if (Array.isArray(stored)) {
            this.queue = stored.filter((item: ReviewQueueItem) =>
              item && !(LEGACY_DEMO_IDS.has(item.id) && LEGACY_DEMO_IDS.get(item.id) === item.complaintId)
            );
            if (this.queue.length !== stored.length) this.saveToStorage();
            return;
          }
          // Retain malformed stored bytes for recovery rather than overwriting them.
          return;
        }
      }
    } catch {
      // Storage unavailable: use an empty local queue.
      return;
    }
    this.queue = [];
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch {}
  }

  /**
   * Partial sanitization: common phone numbers, CNIC and email; names/addresses may remain
   */
  public scrubPII(text: string): string {
    return text
      .replace(/\b03\d{2}[-.\s]?\d{7}\b/g, '[PHONE REDACTED]')
      .replace(/\b\d{5}[-]?\d{7}[-]?\d{1}\b/g, '[CNIC REDACTED]')
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL REDACTED]');
  }

  /**
   * Flags a complaint as misclassified or requiring human review from the department portal.
   */
  public async flagComplaintForReview(params: {
    complaintId: string;
    referenceNumber: string;
    text: string;
    originalDepartments: DepartmentId[];
    suggestedDepartment: DepartmentId | 'out_of_scope' | 'unknown';
    flaggedByStaffId: string;
    flaggedByStaffName: string;
    flaggedByDepartment: DepartmentId;
    flagReason: string;
  }): Promise<ReviewQueueItem> {
    const scrubbedText = this.scrubPII(params.text);
    const item: ReviewQueueItem = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      complaintId: params.complaintId,
      referenceNumber: params.referenceNumber,
      text: scrubbedText,
      originalDepartments: params.originalDepartments,
      suggestedDepartment: params.suggestedDepartment,
      flaggedByStaffId: params.flaggedByStaffId,
      flaggedByStaffName: params.flaggedByStaffName,
      flaggedByDepartment: params.flaggedByDepartment,
      flagReason: params.flagReason,
      flaggedAt: new Date().toISOString(),
      status: 'pending',
      piiScrubbed: true,
    };

    this.queue.unshift(item);
    this.saveToStorage();
    return item;
  }

  /**
   * Retrieves all items currently in the review queue.
   */
  public getReviewQueue(statusFilter?: 'pending' | 'resolved' | 'dismissed'): ReviewQueueItem[] {
    if (statusFilter) {
      return this.queue.filter((i) => i.status === statusFilter);
    }
    return [...this.queue];
  }

  /**
   * Administrator approves and resolves a human review item with confirmed departments.
   */
  public async resolveReviewItem(params: {
    itemId: string;
    confirmedDepartments: DepartmentId[];
    resolutionNotes: string;
    adminId: string;
  }): Promise<ReviewQueueItem | null> {
    const item = this.queue.find((i) => i.id === params.itemId);
    if (!item) return null;

    item.status = 'resolved';
    item.confirmedDepartments = params.confirmedDepartments;
    item.resolutionNotes = params.resolutionNotes;
    item.resolvedByAdminId = params.adminId;
    item.resolvedAt = new Date().toISOString();

    this.saveToStorage();

    // Persist to verified corrections log for curriculum training
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawVerified = localStorage.getItem(VERIFIED_STORAGE_KEY) || '[]';
        const list = JSON.parse(rawVerified);
        list.push({
          id: item.complaintId,
          text: item.text,
          expected_departments: params.confirmedDepartments,
          verified_by: params.adminId,
          verified_at: item.resolvedAt,
          notes: params.resolutionNotes,
        });
        localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}

    return item;
  }

  /**
   * Administrator dismisses a review item as invalid flag without retraining update.
   */
  public async dismissReviewItem(itemId: string, notes: string, adminId: string): Promise<ReviewQueueItem | null> {
    const item = this.queue.find((i) => i.id === itemId);
    if (!item) return null;

    item.status = 'dismissed';
    item.resolutionNotes = notes;
    item.resolvedByAdminId = adminId;
    item.resolvedAt = new Date().toISOString();

    this.saveToStorage();
    return item;
  }

  /**
   * Returns verified corrections ready for export into curriculum training format.
   */
  public getVerifiedCorrections(): Array<{
    id: string;
    text: string;
    expected_departments: DepartmentId[];
    verified_by: string;
    verified_at: string;
    notes: string;
  }> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawVerified = localStorage.getItem(VERIFIED_STORAGE_KEY);
        if (rawVerified) {
          return JSON.parse(rawVerified);
        }
      }
    } catch {}
    return [];
  }
}

export const aiReviewService = new AiReviewService();
