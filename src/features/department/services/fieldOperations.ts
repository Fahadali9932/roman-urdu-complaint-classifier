import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { getLocalDemoStaffRole } from '../auth/departmentIdentities';
import { findAdvisoryIncidentMatches, type IncidentPin } from './incidentMatching';

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
  employee_id?: string | null;
  staff_username?: string | null;
  membership_status?: 'active' | 'suspended' | 'revoked';
  must_change_password?: boolean;
  suspension_reason?: string | null;
}

export interface CandidateWorkOrderMatch {
  order_id: string;
  anchor_complaint_id: string;
  anchor_reference: string;
  case_label: string;
  public_location: string;
  officer_id: string;
  officer_name: string;
  status: WorkState;
  due_at: string;
  distance_m: number;
  linked_count: number;
  issue_types: string[];
  match_confidence: 'exact_issue_and_pin' | 'uncertain_subtype_pin';
  can_direct_attach: boolean;
}

export interface WorkOrderLinkedReport {
  order_id: string;
  complaint_id: string;
  reference_number: string;
  status: string;
  heading: string;
  public_location: string;
  attached_at?: string;
}

export interface ProvisionOfficerResult {
  officerUserId: string;
  employeeId: string;
  staffUsername: string;
  temporaryAccessKey: string;
  mustChangePassword: boolean;
}

export interface ResetOfficerCredentialsResult {
  officerUserId: string;
  temporaryAccessKey: string;
  mustChangePassword: boolean;
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
  assigned_duration_hours?: number;
  effective_deadline_at?: string | null;
  rejection_reason?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_accuracy_m?: number | null;
  gps_distance_m?: number | null;
  gps_verified?: boolean;
  extension_requested_due_at: string | null;
  extension_reason: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  citizen_dispute_pending: boolean;
}

export interface StaffNotification {
  id: string;
  user_id?: string | null;
  department_id: string;
  title: string;
  message: string;
  notification_type: 'general' | 'assignment' | 'warning' | 'deadline' | 'verification' | 'system';
  is_read: boolean;
  link_url?: string | null;
  created_at: string;
}

export interface OfficerWarning {
  id: string;
  officer_id: string;
  department_id: string;
  issued_by: string;
  reason: string;
  severity: 'advisory' | 'formal' | 'final';
  issued_at: string;
}

export interface OfficerActivityHeartbeat {
  id: string;
  officer_id: string;
  department_id: string;
  last_active_at: string;
  active_view: string;
}

export interface DepartmentProof {
  id: string;
  order_id: string;
  storage_path: string;
  before_storage_path?: string | null;
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
  before_storage_path?: string | null;
  submitted_at: string;
  distance_m: number | null;
  location_result: DepartmentProof['location_result'];
  feedback: 'confirmed' | 'disputed' | null;
  order_status: WorkState;
  response_expires_at: string | null;
  can_respond: boolean;
  signed_url?: string;
  before_signed_url?: string;
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
const devOrders: DepartmentWorkOrder[] = import.meta.env.PROD ? [] : [
  {
    id: 'local-dev-order-01',
    department_id: 'kmc',
    anchor_complaint_id: 'local-complaint-anchor-01',
    case_label: 'Main University Road — Broken Asphalt & Deep Pothole',
    officer_id: 'local-officer-a',
    assigned_by: 'local-demonstration',
    status: 'in_progress',
    instructions: 'Inspect damaged road surface near NED gate and submit photo proof.',
    assigned_at: new Date(Date.now() - 7200000).toISOString(),
    original_due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    started_at: new Date(Date.now() - 3600000).toISOString(),
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  },
  {
    id: 'local-dev-order-02',
    department_id: 'kmc',
    anchor_complaint_id: 'local-complaint-anchor-02',
    case_label: 'Shahrah-e-Faisal — Street Light Maintenance & Patching',
    officer_id: 'local-officer-a',
    assigned_by: 'local-demonstration',
    status: 'pending_review',
    instructions: 'Replace damaged curb stones and photograph completed surface.',
    assigned_at: new Date(Date.now() - 86400000).toISOString(),
    original_due_at: new Date(Date.now() + 86400000).toISOString(),
    due_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: new Date(Date.now() - 14400000).toISOString(),
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  },
  {
    id: 'local-dev-order-03',
    department_id: 'kmc',
    anchor_complaint_id: 'local-complaint-anchor-03',
    case_label: 'Rashid Minhas Road — Pothole & Storm Drain Clearing',
    officer_id: 'local-officer-b',
    assigned_by: 'local-demonstration',
    status: 'assigned',
    instructions: 'Deploy road grader crew for asphalt restoration.',
    assigned_at: new Date().toISOString(),
    original_due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    started_at: null,
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  },
  {
    id: 'local-dev-order-04',
    department_id: 'kmc',
    anchor_complaint_id: 'local-complaint-anchor-04',
    case_label: 'Gulshan Block 6 — Road Patching & Curbs Verified',
    officer_id: 'local-officer-a',
    assigned_by: 'local-demonstration',
    status: 'verified',
    instructions: 'Completed surface leveling and curbs installation.',
    assigned_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    original_due_at: new Date(Date.now() - 86400000).toISOString(),
    due_at: new Date(Date.now() - 86400000).toISOString(),
    started_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: new Date(Date.now() - 86400000).toISOString(),
    review_note: 'Verified by Executive Engineer. High quality finish.',
    citizen_dispute_pending: false,
  },
];
const devProofs: DepartmentProof[] = import.meta.env.PROD ? [] : [
  {
    id: 'local-dev-proof-01',
    order_id: 'local-dev-order-02',
    storage_path: 'local-demo/after-repair.jpg',
    before_storage_path: 'local-demo/before-repair.jpg',
    location_result: 'near',
    original_distance_m: 14,
    accuracy_m: 8,
    duplicate_warning: false,
    submitted_at: new Date().toISOString(),
    decision: 'pending',
  },
  {
    id: 'local-dev-proof-02',
    order_id: 'local-dev-order-04',
    storage_path: 'local-demo/after-repair.jpg',
    before_storage_path: 'local-demo/before-repair.jpg',
    location_result: 'near',
    original_distance_m: 10,
    accuracy_m: 5,
    duplicate_warning: false,
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    decision: 'approved',
  },
];

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
    if (isLocalFieldDemo()) return getLocalDemoStaffRole(departmentId, userId);
    const client = requireSupabase();
    const result = await client.from('department_memberships')
      .select('staff_role').eq('department_id', departmentId).eq('user_id', userId)
      .eq('status', 'active').maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data?.staff_role === 'head' ? 'head' : result.data?.staff_role === 'officer' ? 'officer' : null;
  }

  async team(departmentId: string): Promise<DepartmentOfficer[]> {
    if (isLocalFieldDemo()) return devTeam.filter((o) => o.membership_status !== 'suspended').map((o) => ({ ...o }));
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
        throw new Error(`Work order ${old.id} already exists for this anchor report. Use append-only attachment instead of resetting links.`);
      }
      const id = crypto.randomUUID();
      devOrders.push({ id, department_id: input.departmentId,
        anchor_complaint_id: input.anchorComplaintId, case_label: input.caseLabel,
        officer_id: input.officerId, assigned_by: 'local-demonstration',
        instructions: input.instructions, assigned_at: now, original_due_at: input.dueAt,
        due_at: input.dueAt, started_at: null, status: 'assigned',
        extension_requested_due_at: null, extension_reason: null, reviewed_at: null, review_note: null,
        citizen_dispute_pending: false });
      return id;
    }
    return requireSuccess(await requireSupabase().rpc('v1318_assign_work', {
      p_department: input.departmentId, p_anchor: input.anchorComplaintId,
      p_reports: input.reportIds, p_case_label: input.caseLabel,
      p_officer: input.officerId, p_due: input.dueAt, p_instructions: input.instructions,
    })) as string;
  }

  async officersDirectory(departmentId: string): Promise<DepartmentOfficer[]> {
    if (isLocalFieldDemo()) {
      return devTeam.map((o) => ({
        ...o,
        employee_id: o.employee_id ?? o.user_id.replace(/^local-/, ''),
        staff_username: o.staff_username ?? `${departmentId}-${o.user_id.replace(/^local-/, '')}`,
        membership_status: o.membership_status ?? 'active',
        must_change_password: o.must_change_password ?? false,
      }));
    }
    const client = requireSupabase();
    const res = await client.rpc('v16_department_officers', { p_department: departmentId });
    if (!res.error && Array.isArray(res.data)) {
      return res.data.map((row: Record<string, unknown>) => ({
        user_id: String(row.user_id),
        display_name: String(row.display_name || 'Field officer'),
        staff_role: row.staff_role === 'head' ? 'head' : 'officer',
        active_cases: Number(row.active_cases || 0),
        verified_cases: Number(row.verified_cases || 0),
        on_time_cases: Number(row.on_time_cases || 0),
        overdue_cases: Number(row.overdue_cases || 0),
        disputed_cases: Number(row.disputed_cases || 0),
        employee_id: row.employee_id ? String(row.employee_id) : null,
        staff_username: row.staff_username ? String(row.staff_username) : null,
        membership_status: (row.membership_status as DepartmentOfficer['membership_status']) || 'active',
        must_change_password: Boolean(row.must_change_password),
        suspension_reason: row.suspension_reason ? String(row.suspension_reason) : null,
      }));
    }
    return this.team(departmentId);
  }

  async orderLinksMap(departmentId: string): Promise<Map<string, WorkOrderLinkedReport[]>> {
    const map = new Map<string, WorkOrderLinkedReport[]>();
    if (isLocalFieldDemo()) {
      for (const order of devOrders) {
        if (order.department_id !== departmentId) continue;
        map.set(order.id, [{
          order_id: order.id,
          complaint_id: order.anchor_complaint_id,
          reference_number: `KHI-2026-${order.anchor_complaint_id.slice(-4).toUpperCase()}`,
          status: order.status === 'verified' ? 'resolved' : 'in_progress',
          heading: order.case_label,
          public_location: 'Karachi',
          attached_at: order.assigned_at,
        }]);
      }
      return map;
    }
    const client = requireSupabase();
    const { data: links, error } = await client
      .from('department_work_order_reports')
      .select('order_id, complaint_id, attached_at, complaints(id, reference_number, status, generated_heading, title, incident_public_location, incident_locality)')
      .eq('department_id', departmentId);
    if (error || !Array.isArray(links)) return map;
    for (const row of links as Array<Record<string, unknown>>) {
      const orderId = String(row.order_id);
      const comp = (row.complaints || {}) as Record<string, unknown>;
      const list = map.get(orderId) || [];
      list.push({
        order_id: orderId,
        complaint_id: String(row.complaint_id),
        reference_number: String(comp.reference_number || String(row.complaint_id).slice(0, 12)),
        status: String(comp.status || 'in_progress'),
        heading: String(comp.generated_heading || comp.title || 'Linked citizen report'),
        public_location: String(comp.incident_public_location || comp.incident_locality || 'Karachi'),
        attached_at: row.attached_at ? String(row.attached_at) : undefined,
      });
      map.set(orderId, list);
    }
    return map;
  }

  async findCandidateOrders(
    departmentId: string,
    complaintId: string,
    radiusMetres = 30,
    includeUncertain = false,
    demoIncoming?: { issueTypes: string[]; pin: IncidentPin | null; orderLocations?: Map<string, { pin: IncidentPin | null; issueTypes: string[]; location: string; ref: string }> }
  ): Promise<CandidateWorkOrderMatch[]> {
    if (isLocalFieldDemo()) {
      if (!demoIncoming) return [];
      const activeIncidents = devOrders
        .filter((o) => o.department_id === departmentId && ['assigned', 'in_progress', 'returned', 'pending_review'].includes(o.status))
        .map((o) => {
          const meta = demoIncoming.orderLocations?.get(o.anchor_complaint_id);
          return {
            orderId: o.id,
            complaintId: o.anchor_complaint_id,
            departmentId,
            status: o.status,
            issueTypes: meta?.issueTypes || ['road_damage'],
            pin: meta?.pin || null,
            order: o,
            meta,
          };
        });
      return findAdvisoryIncidentMatches(
        {
          complaintId,
          departmentId,
          issueTypes: demoIncoming.issueTypes,
          pin: demoIncoming.pin,
        },
        activeIncidents,
        { includeUncertain, radiusMetres }
      ).map((m) => ({
        order_id: m.incident.orderId,
        anchor_complaint_id: m.incident.complaintId,
        anchor_reference: m.incident.meta?.ref || `WO-${m.incident.orderId.slice(0, 8)}`,
        case_label: m.incident.order.case_label,
        public_location: m.incident.meta?.location || 'Karachi',
        officer_id: m.incident.order.officer_id,
        officer_name: devTeam.find((t) => t.user_id === m.incident.order.officer_id)?.display_name || 'Field Officer',
        status: m.incident.order.status,
        due_at: m.incident.order.due_at,
        distance_m: Math.round(m.distanceMetres * 100) / 100,
        linked_count: 1,
        issue_types: [...m.incident.issueTypes],
        match_confidence: m.matchConfidence,
        can_direct_attach: m.canDirectAttach,
      }));
    }

    const client = requireSupabase();
    const res = await client.rpc('v16_find_candidate_orders', {
      p_department: departmentId,
      p_complaint_id: complaintId,
      p_radius_m: radiusMetres,
      p_include_uncertain: includeUncertain,
    });
    if (res.error) throw new Error(res.error.message);
    return (Array.isArray(res.data) ? res.data : []) as CandidateWorkOrderMatch[];
  }

  async createWorkOrderWithAdvisory(input: {
    departmentId: string;
    complaintId: string;
    officerId: string;
    dueAt: string;
    instructions: string;
    caseLabel: string;
    idempotencyKey: string;
    expectedCandidateOrderIds?: string[];
  }): Promise<{ orderId: string; mode: 'created'; idempotentReplay: boolean }> {
    if (isLocalFieldDemo()) {
      const id = await this.assign({
        departmentId: input.departmentId,
        anchorComplaintId: input.complaintId,
        reportIds: [input.complaintId],
        caseLabel: input.caseLabel,
        officerId: input.officerId,
        dueAt: input.dueAt,
        instructions: input.instructions,
      });
      return { orderId: id, mode: 'created', idempotentReplay: false };
    }
    const client = requireSupabase();
    const data = requireSuccess(await client.rpc('v16_create_work_order_with_advisory', {
      p_department: input.departmentId,
      p_complaint_id: input.complaintId,
      p_officer: input.officerId,
      p_due: input.dueAt,
      p_instructions: input.instructions,
      p_case_label: input.caseLabel,
      p_idempotency_key: input.idempotencyKey,
      p_expected_candidate_order_ids: input.expectedCandidateOrderIds || [],
    })) as { orderId: string; mode: 'created'; idempotentReplay: boolean };
    return data;
  }

  async attachReportToWorkOrder(input: {
    departmentId: string;
    orderId: string;
    complaintId: string;
    idempotencyKey: string;
    reason?: string;
  }): Promise<{ orderId: string; complaintId: string; mode: 'attached'; idempotentReplay: boolean }> {
    if (isLocalFieldDemo()) {
      const target = devOrders.find((o) => o.id === input.orderId && o.department_id === input.departmentId);
      if (!target) throw new Error('Target work order not found in this department.');
      if (target.status === 'verified' || target.status === 'pending_review') {
        throw new Error('Cannot attach reports to completed or proof-pending work orders.');
      }
      return { orderId: input.orderId, complaintId: input.complaintId, mode: 'attached', idempotentReplay: false };
    }
    const client = requireSupabase();
    return requireSuccess(await client.rpc('v16_attach_report_to_work_order', {
      p_department: input.departmentId,
      p_order_id: input.orderId,
      p_complaint_id: input.complaintId,
      p_idempotency_key: input.idempotencyKey,
      p_reason: input.reason || 'Confirmed same physical incident by department head',
    })) as { orderId: string; complaintId: string; mode: 'attached'; idempotentReplay: boolean };
  }

  async detachReportFromWorkOrder(input: {
    departmentId: string;
    orderId: string;
    complaintId: string;
    reason: string;
  }): Promise<void> {
    if (isLocalFieldDemo()) return;
    requireSuccess(await requireSupabase().rpc('v16_detach_report_from_work_order', {
      p_department: input.departmentId,
      p_order_id: input.orderId,
      p_complaint_id: input.complaintId,
      p_reason: input.reason,
    }));
  }

  async reassignWorkOrderOfficer(input: {
    departmentId: string;
    orderId: string;
    newOfficerId: string;
    reason: string;
  }): Promise<void> {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === input.orderId && o.department_id === input.departmentId);
      if (!order) throw new Error('Work order not found.');
      if (order.status === 'verified') throw new Error('Completed verified orders cannot be reassigned.');
      order.officer_id = input.newOfficerId;
      return;
    }
    requireSuccess(await requireSupabase().rpc('v16_reassign_work_order_officer', {
      p_department: input.departmentId,
      p_order_id: input.orderId,
      p_new_officer: input.newOfficerId,
      p_reason: input.reason,
    }));
  }

  async provisionOfficer(input: {
    departmentId: string;
    fullName: string;
    employeeId: string;
  }): Promise<ProvisionOfficerResult> {
    if (isLocalFieldDemo()) {
      const cleanEmp = input.employeeId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (devTeam.some((o) => (o.employee_id || o.user_id) === cleanEmp)) {
        throw new Error(`Employee ID '${cleanEmp}' is already registered in this department.`);
      }
      const userId = `local-officer-${cleanEmp}`;
      const key = `TMP-${crypto.randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
      devTeam.push({
        user_id: userId,
        display_name: input.fullName.trim(),
        staff_role: 'officer',
        active_cases: 0,
        verified_cases: 0,
        on_time_cases: 0,
        overdue_cases: 0,
        disputed_cases: 0,
        employee_id: cleanEmp,
        staff_username: `${input.departmentId}-${cleanEmp}`,
        membership_status: 'active',
        must_change_password: true,
      });
      return {
        officerUserId: userId,
        employeeId: cleanEmp,
        staffUsername: `${input.departmentId}-${cleanEmp}`,
        temporaryAccessKey: key,
        mustChangePassword: true,
      };
    }
    const { data, error } = await requireSupabase().functions.invoke('manage-department-officers', {
      body: { action: 'create_officer', departmentId: input.departmentId, fullName: input.fullName, employeeId: input.employeeId },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to provision field officer.');
    return data as ProvisionOfficerResult;
  }

  async resetOfficerCredentials(input: {
    departmentId: string;
    targetUserId: string;
  }): Promise<ResetOfficerCredentialsResult> {
    if (isLocalFieldDemo()) {
      const off = devTeam.find((o) => o.user_id === input.targetUserId);
      if (!off || off.staff_role !== 'officer') throw new Error('Officer not found in your department.');
      off.must_change_password = true;
      return {
        officerUserId: input.targetUserId,
        temporaryAccessKey: `RST-${crypto.randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
        mustChangePassword: true,
      };
    }
    const { data, error } = await requireSupabase().functions.invoke('manage-department-officers', {
      body: { action: 'reset_credentials', departmentId: input.departmentId, targetUserId: input.targetUserId },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to reset officer credentials.');
    return data as ResetOfficerCredentialsResult;
  }

  async suspendOfficer(input: { departmentId: string; targetUserId: string; reason: string }): Promise<void> {
    if (isLocalFieldDemo()) {
      const off = devTeam.find((o) => o.user_id === input.targetUserId);
      if (!off || off.staff_role !== 'officer') throw new Error('Officer not found.');
      off.membership_status = 'suspended';
      off.suspension_reason = input.reason;
      return;
    }
    const { data, error } = await requireSupabase().functions.invoke('manage-department-officers', {
      body: { action: 'suspend_officer', departmentId: input.departmentId, targetUserId: input.targetUserId, reason: input.reason },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to suspend officer.');
  }

  async reactivateOfficer(input: { departmentId: string; targetUserId: string }): Promise<void> {
    if (isLocalFieldDemo()) {
      const off = devTeam.find((o) => o.user_id === input.targetUserId);
      if (!off || off.staff_role !== 'officer') throw new Error('Officer not found.');
      off.membership_status = 'active';
      off.suspension_reason = null;
      return;
    }
    const { data, error } = await requireSupabase().functions.invoke('manage-department-officers', {
      body: { action: 'reactivate_officer', departmentId: input.departmentId, targetUserId: input.targetUserId },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to reactivate officer.');
  }

  async completeFirstLoginPassword(newPassword: string): Promise<void> {
    if (isLocalFieldDemo()) return;
    const { data, error } = await requireSupabase().functions.invoke('manage-department-officers', {
      body: { action: 'complete_first_login_password', newPassword },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to update passphrase.');
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
    if (isLocalFieldDemo()) {
      return devProofs.find((p) => p.order_id === orderId) || null;
    }
    const result = await requireSupabase().from('department_work_evidence').select('*')
      .eq('order_id', orderId).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data as DepartmentProof | null;
  }

  async submitEvidence(
    orderId: string,
    evidenceOrPhoto: File | { afterPhoto: File; beforePhoto?: File | null; location: GeolocationCoordinates },
    legacyCoords?: GeolocationCoordinates
  ) {
    const afterPhoto = evidenceOrPhoto instanceof File ? evidenceOrPhoto : evidenceOrPhoto.afterPhoto;
    const beforePhoto = evidenceOrPhoto instanceof File ? null : evidenceOrPhoto.beforePhoto;
    const coords = evidenceOrPhoto instanceof File ? legacyCoords! : evidenceOrPhoto.location;

    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) order.status = 'pending_review';
      const proofId = 'local-dev-proof-' + Date.now();
      const newProof: DepartmentProof = {
        id: proofId,
        order_id: orderId,
        storage_path: 'local-demo/after-' + afterPhoto.name,
        before_storage_path: beforePhoto ? 'local-demo/before-' + beforePhoto.name : null,
        location_result: 'near',
        original_distance_m: 14,
        accuracy_m: coords?.accuracy || 10,
        duplicate_warning: false,
        submitted_at: new Date().toISOString(),
        decision: 'pending',
      };
      devProofs.unshift(newProof);
      return { success: true, proof_id: proofId, message: 'Proof registered for supervisor review.' };
    }

    const client = requireSupabase();
    const body = new FormData();
    body.append('orderId', orderId);
    body.append('photo', afterPhoto);
    if (beforePhoto) {
      body.append('beforePhoto', beforePhoto);
    }
    body.append('latitude', String(coords.latitude));
    body.append('longitude', String(coords.longitude));
    body.append('accuracy', String(coords.accuracy));
    const { data, error } = await client.functions.invoke('upload-department-work-proof', { body });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Evidence upload failed.');
    return data;
  }

  async review(orderId: string, approved: boolean, note: string) {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) {
        order.status = approved ? 'verified' : 'returned';
        order.reviewed_at = new Date().toISOString();
        order.review_note = note;
      }
      const p = devProofs.find((item) => item.order_id === orderId);
      if (p) {
        p.decision = approved ? 'approved' : 'rejected';
      }
      return;
    }
    requireSuccess(await requireSupabase().rpc('v1318_review_proof', { p_order: orderId, p_approve: approved, p_note: note }));
  }

  async citizenProofs(complaintId: string): Promise<CitizenWorkProof[]> {
    if (!isSupabaseConfigured() || !supabase) return [];
    const client = supabase;
    let rows: CitizenWorkProof[];
    const v14Res = await client.rpc('v14_my_work_proofs', { p_complaint: complaintId });
    if (!v14Res.error && Array.isArray(v14Res.data)) {
      rows = v14Res.data as CitizenWorkProof[];
    } else {
      rows = requireSuccess(await client.rpc('v1318_my_work_proofs', { p_complaint: complaintId })) as CitizenWorkProof[];
    }
    const proofRows = await Promise.all(rows.map(async (proof) => {
      const [{ data, error }, beforeSigned] = await Promise.all([
        client.storage.from('department-work-proof-private').createSignedUrl(proof.storage_path, 300),
        proof.before_storage_path
          ? client.storage.from('department-work-proof-private').createSignedUrl(proof.before_storage_path, 300)
          : Promise.resolve({ data: null, error: null }),
      ]);
      return {
        ...proof,
        signed_url: error ? undefined : data?.signedUrl,
        before_signed_url: beforeSigned?.error ? undefined : beforeSigned?.data?.signedUrl,
      };
    }));
    return proofRows;
  }

  async citizenReview(orderId: string, complaintId: string, decision: 'confirmed' | 'disputed', note: string) {
    requireSuccess(await requireSupabase().rpc('v1318_citizen_feedback', {
      p_order: orderId, p_complaint: complaintId, p_verdict: decision, p_note: note,
    }));
  }

  // --- V19 ENHANCED METHODS (Commencement Deadlines, GPS Audit & Lifecycle) ---

  async startWorkOrder(orderId: string): Promise<{ success: boolean; effectiveDeadlineAt: string }> {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      const startTime = new Date().toISOString();
      const deadline = new Date(Date.now() + (order?.assigned_duration_hours || 72) * 3600000).toISOString();
      if (order) {
        order.status = 'in_progress';
        order.started_at = startTime;
        order.effective_deadline_at = deadline;
        order.due_at = deadline;
      }
      return { success: true, effectiveDeadlineAt: deadline };
    }
    const res = requireSuccess(await requireSupabase().rpc('v19_start_work_order', { p_order_id: orderId })) as {
      success: boolean;
      effectiveDeadlineAt: string;
    };
    return res;
  }

  async submitWorkCompletion(
    orderId: string,
    storagePath: string,
    coords: { latitude: number; longitude: number; accuracy: number }
  ): Promise<{ success: boolean; gpsVerified: boolean; distanceMeters?: number }> {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) {
        order.status = 'pending_review';
        order.gps_latitude = coords.latitude;
        order.gps_longitude = coords.longitude;
        order.gps_accuracy_m = coords.accuracy;
        order.gps_distance_m = 14.5;
        order.gps_verified = true;
      }
      const proofId = 'local-v19-proof-' + Date.now();
      devProofs.unshift({
        id: proofId,
        order_id: orderId,
        storage_path: storagePath,
        location_result: 'near',
        original_distance_m: 14.5,
        accuracy_m: coords.accuracy,
        duplicate_warning: false,
        submitted_at: new Date().toISOString(),
        decision: 'pending',
      });
      return { success: true, gpsVerified: true, distanceMeters: 14.5 };
    }
    const res = requireSuccess(await requireSupabase().rpc('v19_submit_work_completion', {
      p_order_id: orderId,
      p_storage_path: storagePath,
      p_lat: coords.latitude,
      p_lng: coords.longitude,
      p_accuracy: coords.accuracy,
    })) as { success: boolean; gpsVerified: boolean; distanceMeters?: number };
    return res;
  }

  async approveResolution(orderId: string): Promise<{ success: boolean }> {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      if (order) {
        order.status = 'verified';
        order.reviewed_at = new Date().toISOString();
        order.review_note = 'Supervisory approval granted.';
      }
      const p = devProofs.find((item) => item.order_id === orderId);
      if (p) p.decision = 'approved';
      return { success: true };
    }
    const res = requireSuccess(await requireSupabase().rpc('v19_approve_resolution', { p_order_id: orderId })) as {
      success: boolean;
    };
    return res;
  }

  async returnCorrection(orderId: string, reason: string, correctionHours = 24): Promise<{ success: boolean; newDeadline: string }> {
    if (isLocalFieldDemo()) {
      const order = devOrders.find((o) => o.id === orderId);
      const newDeadline = new Date(Date.now() + correctionHours * 3600000).toISOString();
      if (order) {
        order.status = 'returned';
        order.review_note = reason;
        order.effective_deadline_at = newDeadline;
        order.due_at = newDeadline;
        order.instructions = (order.instructions || '') + '\n[CORRECTION REQUIRED]: ' + reason;
      }
      const p = devProofs.find((item) => item.order_id === orderId);
      if (p) p.decision = 'rejected';
      return { success: true, newDeadline };
    }
    const res = requireSuccess(await requireSupabase().rpc('v19_return_correction', {
      p_order_id: orderId,
      p_reason: reason,
      p_correction_hours: correctionHours,
    })) as { success: boolean; newDeadline: string };
    return res;
  }

  async rejectDepartmentComplaint(complaintId: string, reason: string): Promise<{ success: boolean }> {
    if (isLocalFieldDemo()) {
      return { success: true };
    }
    const res = requireSuccess(await requireSupabase().rpc('v19_reject_department_complaint', {
      p_complaint_id: complaintId,
      p_reason: reason,
    })) as { success: boolean };
    return res;
  }

  async fetchNotifications(departmentId: string, userId?: string): Promise<StaffNotification[]> {
    if (isLocalFieldDemo()) {
      return [
        {
          id: 'notif-01',
          user_id: userId || 'local-demo',
          department_id: departmentId,
          title: 'Resolution Evidence Submitted',
          message: 'Field Officer Tariq submitted evidence for Order #local-dev-order-02.',
          notification_type: 'verification',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'notif-02',
          user_id: userId || 'local-demo',
          department_id: departmentId,
          title: 'New Urgent Complaint Intake',
          message: 'High priority asphalt failure reported on University Road.',
          notification_type: 'assignment',
          is_read: true,
          created_at: new Date(Date.now() - 14400000).toISOString(),
        },
      ];
    }
    const query = requireSupabase()
      .from('staff_notifications')
      .select('*')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: false });
    if (userId) {
      query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as StaffNotification[];
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    if (isLocalFieldDemo()) return;
    const { error } = await requireSupabase()
      .from('staff_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw new Error(error.message);
  }

  async fetchOfficerWarnings(departmentId: string, officerId: string): Promise<OfficerWarning[]> {
    if (isLocalFieldDemo()) {
      return [
        {
          id: 'warn-01',
          officer_id: officerId,
          department_id: departmentId,
          issued_by: 'local-hod',
          reason: 'Late arrival to urgent water pipe burst site.',
          severity: 'formal',
          issued_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
    }
    const { data, error } = await requireSupabase()
      .from('officer_warnings')
      .select('*')
      .eq('department_id', departmentId)
      .eq('officer_id', officerId)
      .order('issued_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as OfficerWarning[];
  }

  async recordHeartbeat(departmentId: string, officerId: string, view: string): Promise<void> {
    if (isLocalFieldDemo()) return;
    await requireSupabase()
      .from('officer_activity_heartbeats')
      .upsert(
        {
          officer_id: officerId,
          department_id: departmentId,
          last_active_at: new Date().toISOString(),
          active_view: view,
        },
        { onConflict: 'officer_id' }
      );
  }
}

export const fieldOperations = new FieldOperationsService();
