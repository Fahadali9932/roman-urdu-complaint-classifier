/**
 * AWAAZ-E-AWAM (آوازِ عوام) — AI Human Review & Continuous Learning Service
 *
 * Implements Phase 4 Human-Verified Continuous Learning:
 * - Queues complaints flagged as misclassified or requiring human review.
 * - Enforces PII scrubbing before records are queued for training data.
 * - Provides authenticated approval, rejection, and multi-label correction workflows.
 * - Persists verified corrections for curriculum retraining.
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

// Initial seed review items to allow immediate verification of the Human Review Queue
const SEED_REVIEW_ITEMS: ReviewQueueItem[] = [
  {
    id: 'rev-001',
    complaintId: 'comp-seed-101',
    referenceNumber: 'AA-2026-881923',
    text: 'bijli ki taar tooti hui zameen par pari hai aur sath hi sadak ka gaddha bhi gehra hai log gir rahe hain',
    originalDepartments: ['kelectric'],
    suggestedDepartment: 'kmc',
    flaggedByStaffId: 'staff-ke-01',
    flaggedByStaffName: 'Tariq Mehmood (KE Line Operations)',
    flaggedByDepartment: 'kelectric',
    flagReason: 'Complaint mentions both broken live wire AND deep road pothole causing injuries. Needs dual dispatch to KMC as well.',
    flaggedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'pending',
    piiScrubbed: true,
  },
  {
    id: 'rev-002',
    complaintId: 'comp-seed-102',
    referenceNumber: 'AA-2026-882044',
    text: 'Makan malik bina notice diye rent 25 hazar barha raha hai aur dhamki de raha hai k ghar khali karo',
    originalDepartments: ['kmc'],
    suggestedDepartment: 'out_of_scope',
    flaggedByStaffId: 'staff-kmc-02',
    flaggedByStaffName: 'Nasir Khan (KMC Infrastructure)',
    flaggedByDepartment: 'kmc',
    flagReason: 'Private rental/landlord dispute mistakenly routed to KMC due to street mention. Out of municipal scope.',
    flaggedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: 'pending',
    piiScrubbed: true,
  },
  {
    id: 'rev-003',
    complaintId: 'comp-seed-103',
    referenceNumber: 'AA-2026-882190',
    text: 'gutter ka ganda paani ubal kar gali me jama ho gaya hai aur kachra bhi pichle char din se nahi uthaya gaya',
    originalDepartments: ['kwsc'],
    suggestedDepartment: 'sswmb',
    flaggedByStaffId: 'staff-kwsc-01',
    flaggedByStaffName: 'Farhan Ali (KWSC Drainage)',
    flaggedByDepartment: 'kwsc',
    flagReason: 'Sewage overflow is accompanied by uncollected solid waste accumulating for 4 days. Dual assignment to KWSC + SSWMB needed.',
    flaggedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    status: 'pending',
    piiScrubbed: true,
  },
];

class AiReviewService {
  private queue: ReviewQueueItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.queue = JSON.parse(raw);
          return;
        }
      }
    } catch {
      // Fallback to in-memory seed
    }
    this.queue = [...SEED_REVIEW_ITEMS];
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
   * PII Sanitization helper: scrubs phone numbers, CNIC, and personal patterns
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
