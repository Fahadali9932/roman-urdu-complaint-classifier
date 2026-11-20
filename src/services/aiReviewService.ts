/**
 * AWAAZ-E-AWAM (آوازِ عوام) — AI Human Review & Continuous Learning Service
 *
 * Shared authenticated review ledger when Supabase is configured, with a
 * browser-local demonstration fallback when Supabase is absent.
 * No approval automatically retrains or promotes a model.
 * Regex redaction handles common phone/CNIC/email formats, not every identifier.
 */

import type { DepartmentId } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

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
const CIVIC_DEPARTMENTS: DepartmentId[] = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

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
    if (!isSupabaseConfigured()) this.loadFromStorage();
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
    if (isSupabaseConfigured()) return;
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

  /** Refreshes the shared queue using the authenticated administrator RPC. */
  public async refreshReviewQueue(): Promise<ReviewQueueItem[]> {
    if (!isSupabaseConfigured()) return this.getReviewQueue();
    if (!supabase) throw new Error('Secure review service is unavailable.');
    const { data, error } = await supabase.rpc('get_ai_classification_review_queue');
    if (error || !Array.isArray(data)) {
      throw new Error('Shared review queue could not be loaded. Check migration and administrator permissions.');
    }
    this.queue = data.map((item: ReviewQueueItem) => ({
      ...item,
      text: this.scrubPII(String(item.text || '')),
      flagReason: this.scrubPII(String(item.flagReason || '')),
    }));
    return this.getReviewQueue();
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
    if (params.flagReason.trim().length < 10 || params.flagReason.trim().length > 1000) {
      throw new Error('Please provide a review reason of 10–1000 characters.');
    }
    const scrubbedText = this.scrubPII(params.text);
    if (isSupabaseConfigured()) {
      if (!supabase) throw new Error('Secure review service is unavailable.');
      const { data, error } = await supabase.rpc('staff_flag_ai_classification_review', {
        p_complaint_id: params.complaintId,
        p_suggested_department: params.suggestedDepartment,
        p_reason: this.scrubPII(params.flagReason.trim()),
      });
      if (error || typeof data !== 'string') {
        throw new Error('Flag could not be saved to the shared queue. Check staff access and database migration.');
      }
      return {
        ...params, id: data, text: scrubbedText,
        flagReason: this.scrubPII(params.flagReason.trim()),
        flaggedAt: new Date().toISOString(), status: 'pending', piiScrubbed: true,
      };
    }
    const pending = this.queue.find((i) => i.complaintId === params.complaintId && i.status === 'pending');
    if (pending) return pending;
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
      flagReason: this.scrubPII(params.flagReason),
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
    const confirmedDepartments = [...new Set(params.confirmedDepartments)];
    if (confirmedDepartments.length < 1 || confirmedDepartments.length > 2 ||
        confirmedDepartments.some((d) => !CIVIC_DEPARTMENTS.includes(d))) {
      throw new Error('Choose one or two valid departments. Three-department cases require separate human triage.');
    }
    if (isSupabaseConfigured()) {
      if (!supabase) throw new Error('Secure review service is unavailable.');
      const { error } = await supabase.rpc('admin_decide_ai_classification_review', {
        p_review_id: params.itemId, p_action: 'resolve',
        p_confirmed_departments: confirmedDepartments,
        p_notes: this.scrubPII(params.resolutionNotes),
      });
      if (error) throw new Error('Administrator decision was not saved. The complaint remains in review.');
      await this.refreshReviewQueue();
      return this.queue.find((i) => i.id === params.itemId) || null;
    }
    const item = this.queue.find((i) => i.id === params.itemId);
    if (!item || item.status !== 'pending') return null;

    item.status = 'resolved';
    item.confirmedDepartments = confirmedDepartments;
    item.resolutionNotes = this.scrubPII(params.resolutionNotes);
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
          expected_departments: confirmedDepartments,
          verified_by: params.adminId,
          verified_at: item.resolvedAt,
          notes: item.resolutionNotes,
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
    if (isSupabaseConfigured()) {
      if (!supabase) throw new Error('Secure review service is unavailable.');
      const { error } = await supabase.rpc('admin_decide_ai_classification_review', {
        p_review_id: itemId, p_action: 'dismiss', p_confirmed_departments: [],
        p_notes: this.scrubPII(notes),
      });
      if (error) throw new Error('Dismissal was not saved. The complaint remains in review.');
      await this.refreshReviewQueue();
      return this.queue.find((i) => i.id === itemId) || null;
    }
    const item = this.queue.find((i) => i.id === itemId);
    if (!item || item.status !== 'pending') return null;

    item.status = 'dismissed';
    item.resolutionNotes = this.scrubPII(notes);
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
    if (isSupabaseConfigured()) {
      return this.queue.filter((item) => item.status === 'resolved' && item.confirmedDepartments?.length)
        .map((item) => ({
          id: item.complaintId, text: item.text,
          expected_departments: item.confirmedDepartments!,
          verified_by: item.resolvedByAdminId || '', verified_at: item.resolvedAt || '',
          notes: item.resolutionNotes || '',
        }));
    }
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
