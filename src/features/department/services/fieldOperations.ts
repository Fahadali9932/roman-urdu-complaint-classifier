import { isSupabaseConfigured, supabase } from '../../../lib/supabase';

export type WorkState = 'assigned' | 'in_progress' | 'pending_review' | 'verified' | 'returned';
export type StaffPosition = 'head' | 'officer';

export interface DepartmentOfficer {
  user_id: string;
  display_name: string;
  staff_role: StaffPosition;
  active_cases: number;
  verified_cases: number;
  on_time_cases: number;
  overdue_cases: number;
  disputed_cases: number;
}

export interface DepartmentWorkOrder {
  id: string;
  department_id: string;
  anchor_complaint_id: string;
  case_label: string;
  officer_id: string;
  assigned_by: string;
  instructions: string;
  assigned_at: string;
  due_at: string;
  original_due_at: string;
  started_at: string | null;
  status: WorkState;
  extension_requested_due_at: string | null;
  extension_reason: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  citizen_dispute_pending: boolean;
}

export interface DepartmentProof {
  id: string;
  order_id: string;
  storage_path: string;
  location_result: 'near' | 'needs_review' | 'no_original_pin';
  original_distance_m: number | null;
  accuracy_m: number;
  duplicate_warning: boolean;
  submitted_at: string;
  decision: 'pending' | 'approved' | 'rejected';
}

export interface CitizenWorkProof {
  order_id: string;
  department_id: string;
  storage_path: string;
  submitted_at: string;
  distance_m: number | null;
  location_result: DepartmentProof['location_result'];
  feedback: 'confirmed' | 'disputed' | null;
  order_status: WorkState;
  response_expires_at: string | null;
  can_respond: boolean;
  signed_url?: string;
}

export type AssignmentInput = {
  departmentId: string;
  anchorComplaintId: string;
  reportIds: string[];
  caseLabel: string;
  officerId: string;
  dueAt: string;
  instructions: string;
};

export const isLocalFieldDemo = () =>
  (import.meta.env.DEV || import.meta.env.MODE === 'test') && !isSupabaseConfigured();

const devTeam: DepartmentOfficer[] = import.meta.env.PROD ? [] : [
  { user_id: 'local-officer-a', display_name: 'Field Officer A', staff_role: 'officer', active_cases: 2, verified_cases: 12, on_time_cases: 11, overdue_cases: 0, disputed_cases: 0 },
  { user_id: 'local-officer-b', display_name: 'Field Officer B', staff_role: 'officer', active_cases: 4, verified_cases: 9, on_time_cases: 7, overdue_cases: 1, disputed_cases: 1 },
  { user_id: 'local-officer-c', display_name: 'Field Officer C', staff_role: 'officer', active_cases: 1, verified_cases: 6, on_time_cases: 5, overdue_cases: 0, disputed_cases: 0 },
];
const devOrders: DepartmentWorkOrder[] = [];

function requireSupabase() {
  if (!isSupabaseConfigured() || !supabase) throw new Error('A verified staging Supabase connection is required for live work management.');
  return supabase;
}

const requireSuccess = <T>(result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
};

export function workDeadline(order: Pick<DepartmentWorkOrder,'due_at'|'status'>, now = Date.now()) {
  if (order.status === 'verified') return 'verified' as const;
  const remaining = new Date(order.due_at).getTime() - now;
  if (remaining <= 0) return 'overdue' as const;
  if (remaining <= 24 * 60 * 60 * 1000) return 'approaching' as const;
  return 'on_track' as const;
}

/** Ratings are indicative, not a disciplinary grade. Do not rate new staff below five verified cases. */
export function officerRating(officer: Pick<DepartmentOfficer,'verified_cases'|'on_time_cases'|'disputed_cases'>) {
  if (officer.verified_cases < 5) return null;
  const verified = Math.max(1, officer.verified_cases);
  const onTime = Math.min(1, officer.on_time_cases / verified);
  const lowDisputes = 1 - Math.min(1, officer.disputed_cases / verified);
  return Math.round((1 + 4 * (0.7 * onTime + 0.3 * lowDisputes)) * 10) / 10;
}

class FieldOperationsService {
  async getMyRole(departmentId: string, userId: string): Promise<StaffPosition | null> {
    if (isLocalFieldDemo()) return 'head';
    const client = requireSupabase();
    const result = await client.from('department_memberships')
      .select('staff_role').eq('department_id', departmentId).eq('user_id', userId)
      .eq('status', 'active').maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data?.staff_role === 'head' ? 'head' : result.data?.staff_role === 'officer' ? 'officer' : null;
  }

  async team(departmentId: string): Promise<DepartmentOfficer[]> {
    if (isLocalFieldDemo()) return [...devTeam];
    return requireSuccess(await requireSupabase().rpc('v1318_department_team', { p_department: departmentId })) as DepartmentOfficer[];
  }

  async orders(departmentId: string): Promise<DepartmentWorkOrder[]> {
    if (isLocalFieldDemo()) return devOrders.filter((o) => o.department_id === departmentId).map((o) => ({ ...o }));
    return requireSuccess(await requireSupabase().from('department_work_orders')
      .select('*').eq('department_id', departmentId).order('due_at', { ascending: true })) as DepartmentWorkOrder[];
  }

  async assign(input: AssignmentInput): Promise<string> {
    if (isLocalFieldDemo()) {
      const old = devOrders.find((o) => o.department_id === input.departmentId && o.anchor_complaint_id === input.anchorComplaintId);
      const now = new Date().toISOString();
      if (old) {
        if (old.status === 'verified') throw new Error('Verified cases cannot be reassigned.');
        Object.assign(old, { officer_id: input.officerId, instructions: input.instructions, due_at: input.dueAt, status: 'assigned' });
        return old.id;
      }
      const id = crypto.randomUUID();
      devOrders.push({ id, department_id: input.departmentId,
        anchor_complaint_id: input.anchorComplaintId, case_label: input.caseLabel,
        officer_id: input.officerId, assigned_by: 'local-demonstration',
        instructions: input.instructions, assigned_at: now, original_due_at: input.dueAt,
        due_at: input.dueAt, started_at: null, status: 'assigned',
        extension_requested_due_at: null, extension_reason: null, reviewed_at: null, review_note: null,
        citizen_dispute_pending:false });
      return id;
    }
    return requireSuccess(await requireSupabase().rpc('v1318_assign_work', {
      p_department: input.departmentId, p_anchor: input.anchorComplaintId,
      p_reports: input.reportIds, p_case_label: input.caseLabel,
      p_officer: input.officerId, p_due: input.dueAt, p_instructions: input.instructions,
    })) as string;
  }

  async start(orderId: string) {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) order.status = 'in_progress';
      return;
    }
    requireSuccess(await requireSupabase().rpc('v1318_start_work', { p_order: orderId }));
  }

  async closeVerified(orderId: string, nonresponseReason = ''): Promise<number> {
    if (isLocalFieldDemo()) return 1;
    return requireSuccess(await requireSupabase().rpc('v1318_close_verified_order', {
      p_order: orderId,p_nonresponse_reason:nonresponseReason.trim(),
    })) as number;
  }

  async requestExtension(orderId: string, dueAt: string, reason: string) {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) { order.extension_requested_due_at = dueAt; order.extension_reason = reason; }
      return;
    }
    requireSuccess(await requireSupabase().rpc('v1318_request_extension', { p_order: orderId, p_due: dueAt, p_reason: reason }));
  }

  async decideExtension(orderId: string, approve: boolean) {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) {
        if (approve && order.extension_requested_due_at) order.due_at = order.extension_requested_due_at;
        order.extension_requested_due_at = null;
      }
      return;
    }
    requireSuccess(await requireSupabase().rpc('v1318_decide_extension', { p_order: orderId, p_approve: approve }));
  }

  async proof(orderId: string): Promise<DepartmentProof | null> {
    if (isLocalFieldDemo()) return null;
    const result = await requireSupabase().from('department_work_evidence').select('*')
      .eq('order_id', orderId).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data as DepartmentProof | null;
  }

  async submitEvidence(orderId: string, photo: File, coords: GeolocationCoordinates) {
    if (isLocalFieldDemo()) throw new Error('Evidence validation requires a real, MFA-verified staging officer account. Demo photos are never accepted as real work.');
    const client = requireSupabase();
    const body = new FormData();
    body.append('orderId', orderId);
    body.append('photo', photo);
    body.append('latitude', String(coords.latitude));
    body.append('longitude', String(coords.longitude));
    body.append('accuracy', String(coords.accuracy));
    const { data, error } = await client.functions.invoke('upload-department-work-proof', { body });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Evidence upload failed.');
    return data;
  }

  async review(orderId: string, approved: boolean, note: string) {
    if (isLocalFieldDemo()) throw new Error('Real photograph verification requires staging; demonstration evidence cannot close a case.');
    requireSuccess(await requireSupabase().rpc('v1318_review_proof', { p_order: orderId, p_approve: approved, p_note: note }));
  }

  async citizenProofs(complaintId: string): Promise<CitizenWorkProof[]> {
    if (!isSupabaseConfigured() || !supabase) return [];
    const client = supabase;
    const rows = requireSuccess(await client.rpc('v1318_my_work_proofs', { p_complaint: complaintId })) as CitizenWorkProof[];
    const proofRows = await Promise.all(rows.map(async (proof) => {
      const { data, error } = await client.storage.from('department-work-proof-private')
        .createSignedUrl(proof.storage_path, 300);
      return { ...proof, signed_url: error ? undefined : data?.signedUrl };
    }));
    return proofRows;
  }

  async citizenReview(orderId: string, complaintId: string, decision: 'confirmed' | 'disputed', note: string) {
    requireSuccess(await requireSupabase().rpc('v1318_citizen_feedback', {
      p_order: orderId, p_complaint: complaintId, p_verdict: decision, p_note: note,
    }));
  }
}

export const fieldOperations = new FieldOperationsService();
