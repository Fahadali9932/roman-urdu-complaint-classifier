import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Complaint,
  ComplaintStatus,
  ComplaintSubmissionInput,
  DepartmentComplaintView,
  DepartmentId,
  ComplaintTimelineEvent,
  CitizenOverviewStats,
  SubmissionResult,
} from '../types';
import type { IComplaintService } from './IComplaintService';
import { complaintService as mockComplaintService } from './MockComplaintService';

const fallback = mockComplaintService;

const formatTimelineEvents = (rows: any[] = []): ComplaintTimelineEvent[] =>
  rows
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      status: r.status,
      title: r.title,
      titleUrdu: r.title_urdu,
      description: r.description,
      descriptionUrdu: r.description_urdu,
      timestamp: r.created_at,
      actorRole:
        r.actor_role === 'department_staff'
          ? 'department_officer'
          : r.actor_role === 'main_admin'
          ? 'administrator'
          : r.actor_role,
    }));

const mapComplaintRow = (r: any): Complaint => ({
  id: r.id,
  citizenId: r.citizen_id,
  citizenName: '',
  referenceNumber: r.reference_number,
  district: r.incident_district,
  locality: r.incident_locality,
  publicLocation: r.incident_public_location,
  title: r.title ?? 'Public complaint',
  description: r.description,
  detectedLanguage: r.detected_language,
  status: r.status,
  assignedDepartmentId: r.assigned_department_id,
  predictedDepartmentId: r.predicted_department_id,
  predictionConfidence: r.prediction_confidence == null ? undefined : Number(r.prediction_confidence),
  submittedAt: r.created_at,
  updatedAt: r.updated_at,
  timeline: formatTimelineEvents(r.complaint_timeline_events),
  isDemonstration: r.is_demonstration,
});

const COMPLAINT_SELECT_QUERY = '*, complaint_timeline_events(*)';

export class ComplaintSubmissionError extends Error {
  constructor(
    message: string,
    public readonly code: 'AUTHENTICATION_REQUIRED' | 'CITIZEN_ACCOUNT_REQUIRED' | 'VALIDATION_FAILED' | 'SUBMISSION_UNAVAILABLE'
  ) {
    super(message);
    this.name = 'ComplaintSubmissionError';
  }
}

type FunctionErrorPayload = { error?: unknown; code?: unknown };

const safeSubmissionError = async (cause: unknown): Promise<ComplaintSubmissionError> => {
  const response = (cause as { context?: unknown } | null)?.context as
    | { status?: unknown; clone?: () => { json: () => Promise<unknown> } }
    | undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;
  let payload: FunctionErrorPayload | undefined;

  try {
    const body = await response?.clone?.().json();
    if (body && typeof body === 'object') payload = body as FunctionErrorPayload;
  } catch {
    // A gateway response can be empty or non-JSON. The status remains enough
    // to provide a safe action without exposing transport or database details.
  }

  if (status === 401) {
    return new ComplaintSubmissionError(
      'Unable to connect to submission service. Please ensure the latest Edge Function is deployed in Supabase.',
      'SUBMISSION_UNAVAILABLE'
    );
  }
  if (status === 403 || payload?.code === 'CITIZEN_ACCOUNT_REQUIRED') {
    return new ComplaintSubmissionError(
      'Please use a citizen account to submit a complaint.',
      'CITIZEN_ACCOUNT_REQUIRED'
    );
  }
  if (status === 400 || payload?.code === 'INVALID_COMPLAINT_PAYLOAD') {
    return new ComplaintSubmissionError(
      'Please review the complaint details and try again. Your entered details have not been cleared.',
      'VALIDATION_FAILED'
    );
  }
  return new ComplaintSubmissionError(
    'We could not submit the complaint right now. Your entered details are still here; please try again shortly.',
    'SUBMISSION_UNAVAILABLE'
  );
};

export class SupabaseComplaintService implements IComplaintService {
  async getComplaints(): Promise<Complaint[]> {
    return this.getCitizenComplaints();
  }

  async getCitizenComplaints(): Promise<Complaint[]> {
    if (!isSupabaseConfigured() || !supabase) return fallback.getCitizenComplaints();
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(COMPLAINT_SELECT_QUERY)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapComplaintRow);
    } catch {
      throw new Error('Your complaint records could not be loaded from the live service. Please refresh and try again.');
    }
  }

  async getComplaintByReference(referenceNumber: string): Promise<Complaint | null> {
    if (!isSupabaseConfigured() || !supabase) return fallback.getComplaintByReference(referenceNumber);
    const cleaned = referenceNumber.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned);

    let queryBuilder = supabase.from('complaints').select(COMPLAINT_SELECT_QUERY);
    if (isUuid) {
      queryBuilder = queryBuilder.or(`reference_number.eq.${cleaned.toUpperCase()},id.eq.${cleaned}`);
    } else {
      queryBuilder = queryBuilder.eq('reference_number', cleaned.toUpperCase());
    }

    const { data, error } = await queryBuilder.maybeSingle();
    if (error) throw error;
    return data ? mapComplaintRow(data) : null;
  }

  async submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult> {
    if (!isSupabaseConfigured() || !supabase) return fallback.submitComplaint(input);

    const { data, error } = await supabase.functions.invoke('submit-classified-complaint', {
      body: {
        title: input.title,
        description: input.description,
        incidentDistrict: input.district,
        incidentLocality: input.locality,
        incidentPublicLocation: input.publicLocation,
        citizenName: input.citizenName,
        citizenPhone: input.citizenPhone,
        citizenEmail: input.citizenEmail,
        residentialAddress: input.residentialAddress,
        isDemonstration: false,
      },
    });
    if (error) {
      const subError = await safeSubmissionError(error);
      // A configured live backend must never turn a failed request into a
      // browser-only ticket. That creates a reference which staff can neither
      // see nor action, and falsely tells the citizen that the case was filed.
      throw subError;
    }
    if (data?.error) {
      throw new ComplaintSubmissionError(
        'We could not submit the complaint right now. Your entered details are still here; please try again shortly.',
        'SUBMISSION_UNAVAILABLE'
      );
    }
    return {
      referenceNumber: data.reference_number,
      isSimulated: false,
      timestamp: new Date().toISOString(),
      message: data.needs_review
        ? 'Your complaint was received and is awaiting safe routing review.'
        : 'Your complaint was securely routed to the responsible department.',
      departmentId: data.prediction?.departmentId || data.assigned_department_id || data.predicted_department_id,
      status: data.status,
      needsReview: Boolean(data.needs_review),
      claimCode: data.claim_code,
    };
  }

  async claimComplaint(
    referenceNumber: string,
    claimCode: string
  ): Promise<{ success: boolean; complaintId?: string; referenceNumber?: string; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return fallback.claimComplaint(referenceNumber, claimCode);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return {
        success: false,
        error: 'Please sign in or create a citizen account before claiming a complaint.',
      };
    }

    const cleanRef = referenceNumber.trim().toUpperCase();
    const cleanCode = claimCode.trim().toUpperCase();

    // Compute SHA-256 hash using Web Crypto API if available
    let claimCodeHash = cleanCode;
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgUint8 = new TextEncoder().encode(cleanCode);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        claimCodeHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {
      claimCodeHash = cleanCode;
    }

    const { data, error } = await supabase.rpc('claim_guest_complaint', {
      p_reference_number: cleanRef,
      p_claim_code_hash: claimCodeHash,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Invalid reference number or claim code. Please check and try again.',
      };
    }

    return {
      success: true,
      complaintId: data?.complaint_id,
      referenceNumber: data?.reference_number,
    };
  }

  async getOverviewStats(): Promise<CitizenOverviewStats> {
    const rows = await this.getCitizenComplaints();
    return {
      totalComplaints: rows.length,
      pendingComplaints: rows.filter((x) => x.status === 'submitted' || x.status === 'under_review').length,
      inProgressComplaints: rows.filter((x) => x.status === 'assigned' || x.status === 'in_progress').length,
      resolvedComplaints: rows.filter((x) => x.status === 'resolved').length,
    };
  }

  async getDepartmentComplaints(departmentId: DepartmentId): Promise<DepartmentComplaintView[]> {
    if (!isSupabaseConfigured() || !supabase) return fallback.getDepartmentComplaints(departmentId);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(COMPLAINT_SELECT_QUERY)
        .eq('assigned_department_id', departmentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const remote = ((data ?? []).map(mapComplaintRow) as DepartmentComplaintView[]);
      return remote;
    } catch {
      throw new Error('Assigned complaints could not be loaded from the live service. Please refresh and try again.');
    }
  }

  async getReviewQueueComplaints(): Promise<DepartmentComplaintView[]> {
    if (!isSupabaseConfigured() || !supabase) return fallback.getReviewQueueComplaints();
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(COMPLAINT_SELECT_QUERY)
        .eq('status', 'under_review')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const remote = ((data ?? []).map(mapComplaintRow) as DepartmentComplaintView[]);
      return remote;
    } catch {
      throw new Error('Review queue complaints could not be loaded from the live service. Please refresh and try again.');
    }
  }

  async getDepartmentComplaintByReference(
    departmentId: DepartmentId,
    referenceNumber: string
  ): Promise<DepartmentComplaintView | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return fallback.getDepartmentComplaintByReference(departmentId, referenceNumber);
    }
    const cleaned = referenceNumber.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned);

    let queryBuilder = supabase
      .from('complaints')
      .select(COMPLAINT_SELECT_QUERY);

    if (isUuid) {
      queryBuilder = queryBuilder.or(`reference_number.eq.${cleaned.toUpperCase()},id.eq.${cleaned}`);
    } else {
      queryBuilder = queryBuilder.eq('reference_number', cleaned.toUpperCase());
    }

    const { data, error } = await queryBuilder.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.assigned_department_id !== departmentId && !(departmentId === 'kmc' && data.status === 'under_review')) {
      return null;
    }
    return mapComplaintRow(data) as DepartmentComplaintView;
  }

  async updateComplaintStatus(
    departmentId: DepartmentId,
    referenceNumber: string,
    newStatus: ComplaintStatus,
    note = '',
    noteUrdu = ''
  ): Promise<{ success: boolean; complaint: DepartmentComplaintView }> {
    if (!isSupabaseConfigured() || !supabase) {
      return fallback.updateComplaintStatus(departmentId, referenceNumber, newStatus, note, noteUrdu);
    }

    const item = await this.getDepartmentComplaintByReference(departmentId, referenceNumber);
    if (!item) {
      throw new Error(`Complaint ${referenceNumber} is not assigned to your department.`);
    }

    const statusTitles: Record<ComplaintStatus, { en: string; ur: string }> = {
      submitted: { en: 'Complaint Reopened', ur: 'شکایت دوبارہ کھولی گئی' },
      under_review: { en: 'Under Departmental Review', ur: 'محکمانہ جائزہ شروع' },
      assigned: { en: 'Pending Department Acceptance', ur: 'محکمانہ توثیق کے منتظر' },
      accepted: { en: 'Complaint Accepted by Department', ur: 'محکمے کی جانب سے شکایت منظور کر لی گئی' },
      in_progress: { en: 'Remediation In Progress', ur: 'ازالے کی کارروائی جاری' },
      resolved: { en: 'Remediation Verified & Resolved', ur: 'مسئلہ حل کر دیا گیا ہے' },
      rejected: { en: 'Complaint Closed / Not Actionable', ur: 'شکایت بند کر دی گئی' },
    };

    const titleInfo = statusTitles[newStatus] || {
      en: `Status updated to ${newStatus.replace('_', ' ')}`,
      ur: 'شکایت کی پیش رفت تبدیل ہو گئی',
    };

    const titleEn = titleInfo.en;
    const titleUr = titleInfo.ur;
    const noteEn = note.trim() || `Status changed to ${newStatus.replace('_', ' ')}.`;
    const noteUr =
      noteUrdu.trim() ||
      (newStatus === 'resolved'
        ? 'فیلڈ تصدیق کے بعد شکایت حل کر دی گئی ہے۔'
        : 'محکمہ کی جانب سے کارروائی کی تفصیلات درج کی گئیں۔');

    const { error } = await supabase.rpc('staff_update_complaint_status', {
      p_complaint_id: item.id,
      p_new_status: newStatus,
      p_title_en: titleEn,
      p_title_ur: titleUr,
      p_note_en: noteEn,
      p_note_ur: noteUr,
    });

    if (error) {
      if (error.message?.includes('Invalid status transition') && newStatus === 'accepted') {
        throw new Error(
          'Database migration required: Please run migration 20261117000000_department_acceptance_workflow.sql in the Supabase Dashboard SQL Editor to permit the "accepted" status transition.'
        );
      }
      throw new Error(error.message || 'Failed to update complaint status in database.');
    }

    // The database transaction queues a notification in the private outbox.
    // Do not invoke a client-visible function here: the delivery worker needs
    // provider credentials and must be deployed/configured independently.

    const updated = await this.getDepartmentComplaintByReference(departmentId, item.id);
    if (!updated) {
      throw new Error('Updated complaint could not be reloaded.');
    }

    return { success: true, complaint: updated };
  }

  async reviewAndAssignComplaint(
    complaintId: string,
    targetDepartmentId: DepartmentId,
    reviewNotes?: string
  ): Promise<{ success: boolean; complaint?: DepartmentComplaintView; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return fallback.reviewAndAssignComplaint(complaintId, targetDepartmentId, reviewNotes);
    }

    const { error } = await supabase.rpc('staff_review_and_assign_complaint', {
      p_complaint_id: complaintId,
      p_target_department_id: targetDepartmentId,
      p_notes: reviewNotes || null,
    });

    if (error) {
      if (error.message?.includes('Could not find the function') || error.message?.includes('schema cache')) {
        throw new Error(
          'Database migration required: Please run migration 20261120000000_staff_classification_review_queue.sql in the Supabase Dashboard SQL Editor to enable staff classification review.'
        );
      }
      return {
        success: false,
        error: error.message || 'Failed to review and assign complaint in database.',
      };
    }

    const { data: updatedData } = await supabase
      .from('complaints')
      .select(COMPLAINT_SELECT_QUERY)
      .eq('id', complaintId)
      .maybeSingle();

    return {
      success: true,
      complaint: updatedData ? (mapComplaintRow(updatedData) as DepartmentComplaintView) : undefined,
    };
  }
}

export const supabaseComplaintService = new SupabaseComplaintService();
