/**
 * AWAAZ-E-AWAM — Local Supabase PostgreSQL & Auth Adapter
 *
 * Emulates the exact PostgreSQL database schema, RLS constraints,
 * and security definer procedures defined in:
 * supabase/migrations/20261113000000_staff_access_management.sql
 *
 * Ensures 100% offline testing, zero external API dependencies,
 * zero credit cards, and instant reactive testing while maintaining
 * identical table semantics.
 */

import {
  resolveDepartmentIdentity,
} from '../features/department/auth/departmentIdentities';

export interface DepartmentRow {
  id: string;
  name: string;
  name_urdu: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: 'main_admin' | 'department_staff' | 'citizen';
  created_at: string;
  updated_at: string;
}

export interface DepartmentAccessRequestRow {
  id: string;
  user_id: string;
  department_id: string;
  full_name: string;
  work_email: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMembershipRow {
  id: string;
  user_id: string;
  department_id: string;
  status: 'active' | 'revoked';
  approved_by: string;
  approved_at: string;
  revoked_by?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessAuditLogRow {
  id: string;
  action:
    | 'request_submitted'
    | 'request_approved'
    | 'request_rejected'
    | 'access_revoked'
    | 'admin_provisioned';
  target_user_id: string;
  target_email: string;
  department_id?: string | null;
  actor_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface ComplaintRow {
  id: string;
  reference_number: string;
  citizen_id: string;
  title?: string | null;
  description: string;
  detected_language: 'roman_urdu' | 'english' | 'urdu';
  incident_district: string;
  incident_locality: string;
  incident_public_location: string;
  status: 'submitted' | 'under_review' | 'assigned' | 'accepted' | 'in_progress' | 'resolved' | 'rejected';
  assigned_department_id: string;
  predicted_department_id?: string | null;
  prediction_confidence?: number | null;
  is_reviewed_by_admin: boolean;
  is_demonstration: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplaintCitizenPrivateRow {
  complaint_id: string;
  citizen_name: string;
  citizen_phone: string;
  citizen_email?: string | null;
  residential_address: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintTimelineEventRow {
  id: string;
  complaint_id: string;
  status: 'submitted' | 'under_review' | 'assigned' | 'accepted' | 'in_progress' | 'resolved' | 'rejected';
  title: string;
  title_urdu: string;
  description: string;
  description_urdu: string;
  actor_role: 'system' | 'citizen' | 'department_staff' | 'main_admin';
  actor_id?: string | null;
  created_at: string;
}

export interface AuthRateLimitRow {
  id: string;
  identifier: string;
  failed_attempts: number;
  first_attempt_at: string;
  last_attempt_at: string;
  locked_until?: string | null;
}

interface StoredUserCredential {
  userId: string;
  email: string;
  passwordHash: string; // Emulated hashed storage
}

export interface NotificationOutboxRow {
  id: string;
  complaint_id: string;
  recipient_email: string;
  recipient_name: string;
  event_type: string;
  status: string;
  payload: Record<string, unknown>;
  delivery_status: string;
  delivery_error?: string | null;
  created_at: string;
  sent_at?: string | null;
}

interface DatabaseState {
  departments: DepartmentRow[];
  profiles: ProfileRow[];
  credentials: StoredUserCredential[];
  requests: DepartmentAccessRequestRow[];
  memberships: DepartmentMembershipRow[];
  auditLogs: AccessAuditLogRow[];
  complaints: ComplaintRow[];
  citizenPrivateDetails: ComplaintCitizenPrivateRow[];
  timelineEvents: ComplaintTimelineEventRow[];
  rateLimits: AuthRateLimitRow[];
  notificationOutbox: NotificationOutboxRow[];
}

const STORAGE_KEY = 'awaaz_local_supabase_db_v2';

const SEED_DEPARTMENTS: DepartmentRow[] = [
  {
    id: 'kwsc',
    name: 'Karachi Water & Sewerage Corporation (KW&SC)',
    name_urdu: 'کراچی واٹر اینڈ سیوریج کارپوریشن',
    code: 'KWSC',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'kelectric',
    name: 'K-Electric (Infrastructure & Distribution)',
    name_urdu: 'کے الیکٹرک (انفراسٹرکچر و تقسیم)',
    code: 'KE',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sswmb',
    name: 'Sindh Solid Waste Management Board (SSWMB)',
    name_urdu: 'سندھ سالڈ ویسٹ مینجمنٹ بورڈ',
    code: 'SSWMB',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ssgc',
    name: 'Sui Southern Gas Company (SSGC)',
    name_urdu: 'سوئی سدرن گیس کمپنی',
    code: 'SSGC',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'kmc',
    name: 'Karachi Metropolitan Corporation (KMC / DMCs)',
    name_urdu: 'کراچی میٹروپولیٹن کارپوریشن',
    code: 'KMC',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sbca',
    name: 'Sindh Building Control Authority (SBCA)',
    name_urdu: 'سندھ بلڈنگ کنٹرول اتھارٹی',
    code: 'SBCA',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const SEED_ADMIN_ID = 'admin-seed-uuid-001';
const SEED_ADMIN_EMAIL = 'admin@example.org';
// In-memory hash equivalent for AdminPass123!
const hashPassword = (pwd: string): string => `sha256_emulated_${btoa(pwd)}`;

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class LocalSupabaseAdapter {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as DatabaseState;
          if (parsed && Array.isArray(parsed.departments) && Array.isArray(parsed.profiles)) {
            parsed.complaints = Array.isArray(parsed.complaints) ? parsed.complaints : [];
            parsed.citizenPrivateDetails = Array.isArray(parsed.citizenPrivateDetails)
              ? parsed.citizenPrivateDetails
              : [];
            parsed.timelineEvents = Array.isArray(parsed.timelineEvents)
              ? parsed.timelineEvents
              : [];
            parsed.rateLimits = Array.isArray(parsed.rateLimits) ? parsed.rateLimits : [];
            return parsed;
          }
        }
      }
    } catch {
      // Local storage unavailable
    }
    return this.initializeDefaultState();
  }

  private saveState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {
      // Local storage unavailable
    }
  }

  public resetToDefault(): void {
    this.state = this.initializeDefaultState();
    this.saveState();
  }

  private initializeDefaultState(): DatabaseState {
    const adminProfile: ProfileRow = {
      id: SEED_ADMIN_ID,
      full_name: 'Main Administrator (Civic Oversight)',
      email: SEED_ADMIN_EMAIL,
      role: 'main_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const adminCredential: StoredUserCredential = {
      userId: SEED_ADMIN_ID,
      email: SEED_ADMIN_EMAIL.toLowerCase(),
      passwordHash: hashPassword('AdminPass123!'),
    };

    return {
      departments: [...SEED_DEPARTMENTS],
      profiles: [adminProfile],
      credentials: [adminCredential],
      requests: [],
      memberships: [],
      auditLogs: [
        {
          id: 'audit-seed-001',
          action: 'admin_provisioned',
          target_user_id: SEED_ADMIN_ID,
          target_email: SEED_ADMIN_EMAIL,
          actor_id: SEED_ADMIN_ID,
          details: { note: 'Initial Main Administrator provisioned' },
          created_at: new Date().toISOString(),
        },
      ],
      complaints: [],
      citizenPrivateDetails: [],
      timelineEvents: [],
      rateLimits: [],
      notificationOutbox: [],
    };
  }

  // ---------------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------------
  public getDepartments(): DepartmentRow[] {
    return this.state.departments.filter((d) => d.is_active);
  }

  public getDepartmentById(id: string): DepartmentRow | undefined {
    return this.state.departments.find((d) => d.id === id);
  }

  // ---------------------------------------------------------------------------
  // Access Requests (Staff Registration)
  // ---------------------------------------------------------------------------
  public submitAccessRequest(params: {
    departmentId: string;
    fullName: string;
    workEmail: string;
    password: string;
  }): { success: boolean; requestId?: string; error?: string } {
    const emailNorm = params.workEmail.trim().toLowerCase();
    const dept = this.getDepartmentById(params.departmentId);
    if (!dept) {
      return { success: false, error: 'Selected department does not exist.' };
    }

    // Check existing profile or credential
    let user = this.state.profiles.find((p) => p.email.toLowerCase() === emailNorm);
    let userId = user ? user.id : `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (!user) {
      user = {
        id: userId,
        full_name: params.fullName.trim(),
        email: emailNorm,
        role: 'citizen', // Default unprivileged until approved
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.state.profiles.push(user);
    } else {
      user.full_name = params.fullName.trim();
      user.updated_at = new Date().toISOString();
    }

    // Upsert credential
    const existingCredIdx = this.state.credentials.findIndex(
      (c) => c.email.toLowerCase() === emailNorm
    );
    const newCred: StoredUserCredential = {
      userId,
      email: emailNorm,
      passwordHash: hashPassword(params.password),
    };
    if (existingCredIdx >= 0) {
      this.state.credentials[existingCredIdx] = newCred;
    } else {
      this.state.credentials.push(newCred);
    }

    // Check if an existing request is pending or rejected
    const existingReq = this.state.requests.find(
      (r) => r.user_id === userId && r.department_id === params.departmentId
    );

    const requestId = existingReq ? existingReq.id : generateId('req');
    const now = new Date().toISOString();

    if (existingReq) {
      existingReq.status = 'pending';
      existingReq.full_name = params.fullName.trim();
      existingReq.work_email = emailNorm;
      existingReq.rejection_reason = null;
      existingReq.reviewed_by = null;
      existingReq.reviewed_at = null;
      existingReq.updated_at = now;
    } else {
      this.state.requests.push({
        id: requestId,
        user_id: userId,
        department_id: params.departmentId,
        full_name: params.fullName.trim(),
        work_email: emailNorm,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
    }

    // Record audit log
    this.state.auditLogs.unshift({
      id: generateId('audit'),
      action: 'request_submitted',
      target_user_id: userId,
      target_email: emailNorm,
      department_id: params.departmentId,
      actor_id: userId,
      details: { requestId, departmentCode: dept.code },
      created_at: now,
    });

    this.saveState();
    return { success: true, requestId };
  }

  // ---------------------------------------------------------------------------
  // Authentication: Staff
  // ---------------------------------------------------------------------------
  public authenticateStaff(
    workEmail: string,
    passwordAttempt: string
  ): {
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password';
    user?: ProfileRow;
    department?: DepartmentRow;
    membership?: DepartmentMembershipRow;
    rejectionReason?: string | null;
    error?: string;
  } {
    const emailNorm = workEmail.trim().toLowerCase();
    const cred = this.state.credentials.find((c) => c.email.toLowerCase() === emailNorm);
    const profile = this.state.profiles.find((p) => p.email.toLowerCase() === emailNorm);

    if (!cred || !profile) {
      return {
        success: false,
        status: 'not_found',
        error: 'No departmental access request or account found with this work email.',
      };
    }

    if (cred.passwordHash !== hashPassword(passwordAttempt)) {
      return {
        success: false,
        status: 'invalid_password',
        error: 'Invalid password. Please check your credentials.',
      };
    }

    // Check membership (active or revoked)
    const membership = this.state.memberships.find(
      (m) => m.user_id === profile.id && m.status === 'active'
    );

    if (membership) {
      const dept = this.getDepartmentById(membership.department_id);
      return {
        success: true,
        status: 'approved',
        user: profile,
        department: dept,
        membership,
      };
    }

    // Check if membership is revoked
    const revokedMembership = this.state.memberships.find(
      (m) => m.user_id === profile.id && m.status === 'revoked'
    );
    if (revokedMembership) {
      const dept = this.getDepartmentById(revokedMembership.department_id);
      return {
        success: false,
        status: 'revoked',
        user: profile,
        department: dept,
        membership: revokedMembership,
        rejectionReason: revokedMembership.revocation_reason,
        error: `Your departmental access has been revoked: ${
          revokedMembership.revocation_reason || 'Access withdrawn by Main Administrator.'
        }`,
      };
    }

    // Check access requests
    const latestRequest = [...this.state.requests]
      .filter((r) => r.user_id === profile.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!latestRequest) {
      return {
        success: false,
        status: 'not_found',
        error: 'No departmental access record found.',
      };
    }

    const dept = this.getDepartmentById(latestRequest.department_id);

    if (latestRequest.status === 'pending') {
      return {
        success: false,
        status: 'pending',
        user: profile,
        department: dept,
        error: 'Your access request is currently pending review by the Main Administrator.',
      };
    }

    if (latestRequest.status === 'rejected') {
      return {
        success: false,
        status: 'rejected',
        user: profile,
        department: dept,
        rejectionReason: latestRequest.rejection_reason,
        error: `Your access request was rejected: ${
          latestRequest.rejection_reason || 'Department verification was unsuccessful.'
        }`,
      };
    }

    if (latestRequest.status === 'revoked') {
      return {
        success: false,
        status: 'revoked',
        user: profile,
        department: dept,
        error: 'Your access has been revoked by the Main Administrator.',
      };
    }

    return {
      success: false,
      status: 'not_found',
      error: 'Unable to verify departmental authorization.',
    };
  }

  /**
   * Ensures that a specific department demonstration identity is provisioned in local state on demand.
   */
  public ensureDemonstrationAccount(username: string): void {
    const identity = resolveDepartmentIdentity(username);
    if (!identity) return;

    let profile = this.state.profiles.find(
      (p) => p.email.toLowerCase() === identity.authEmail.toLowerCase()
    );
    if (!profile) {
      profile = {
        id: `staff-${identity.departmentId}-demo-01`,
        full_name: identity.defaultTitle,
        email: identity.authEmail,
        role: 'department_staff',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.state.profiles.push(profile);
    }

    let membership = this.state.memberships.find(
      (m) => m.department_id === identity.departmentId && m.user_id === profile!.id
    );
    if (!membership) {
      membership = {
        id: `mem-${identity.departmentId}-demo-01`,
        user_id: profile.id,
        department_id: identity.departmentId,
        status: 'active',
        approved_by: SEED_ADMIN_ID,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.state.memberships.push(membership);
    }

    let cred = this.state.credentials.find(
      (c) => c.email.toLowerCase() === identity.authEmail.toLowerCase()
    );
    if (!cred) {
      cred = {
        userId: profile.id,
        email: identity.authEmail.toLowerCase(),
        passwordHash: hashPassword('DemoAccessKey2026!Secure'),
      };
      this.state.credentials.push(cred);
    }
    this.saveState();
  }

  /**
   * Real Username + Access Key staff authentication
   * Resolves department username, checks department boundary, and validates credentials.
   */
  public authenticateStaffWithUsername(
    rawUsername: string,
    accessKey: string,
    expectedDeptId?: string
  ): {
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password' | 'wrong_department';
    user?: ProfileRow;
    department?: DepartmentRow;
    membership?: DepartmentMembershipRow;
    rejectionReason?: string | null;
    error?: string;
  } {
    const identity = resolveDepartmentIdentity(rawUsername);
    if (identity) {
      // Server-side department check: prevent cross-department theme sign-in
      if (expectedDeptId && identity.departmentId !== expectedDeptId) {
        const targetName =
          expectedDeptId === 'kmc'
            ? 'Roads & Infrastructure'
            : this.getDepartmentById(expectedDeptId)?.name || expectedDeptId.toUpperCase();
        return {
          success: false,
          status: 'wrong_department',
          error: `Access Denied: Your staff account is authorized for "${identity.departmentName}". You cannot access the ${targetName} console with these credentials.`,
        };
      }

      this.ensureDemonstrationAccount(identity.username);

      const authRes = this.authenticateStaff(identity.authEmail, accessKey);
      if (!authRes.success && authRes.status === 'invalid_password') {
        return {
          ...authRes,
          error: 'Invalid username or access key.',
        };
      }
      return authRes;
    }

    // Fallback: If rawUsername is an email (e.g. test setups or legacy accounts)
    const emailRes = this.authenticateStaff(rawUsername, accessKey);
    if (!emailRes.success) {
      return {
        ...emailRes,
        status: emailRes.status === 'not_found' ? 'invalid_password' : emailRes.status,
        error:
          emailRes.status === 'invalid_password' || emailRes.status === 'not_found'
            ? 'Invalid username or access key.'
            : emailRes.error,
      };
    }
    if (expectedDeptId && emailRes.department && emailRes.department.id !== expectedDeptId) {
      const targetName =
        expectedDeptId === 'kmc'
          ? 'Roads & Infrastructure'
          : this.getDepartmentById(expectedDeptId)?.name || expectedDeptId.toUpperCase();
      return {
        success: false,
        status: 'wrong_department',
        department: emailRes.department,
        user: emailRes.user,
        membership: emailRes.membership,
        error: `Access Denied: Your staff account is authorized for "${emailRes.department.name}". You cannot access the ${targetName} console with these credentials.`,
      };
    }
    return emailRes;
  }

  /**
   * Updates or sets an access key for a department username (for testing and admin management).
   */
  public setDepartmentAccessKey(username: string, accessKey: string): boolean {
    const identity = resolveDepartmentIdentity(username);
    if (!identity) return false;
    const cred = this.state.credentials.find(
      (c) => c.email.toLowerCase() === identity.authEmail.toLowerCase()
    );
    if (cred) {
      cred.passwordHash = hashPassword(accessKey);
      this.saveState();
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Authentication: Main Administrator
  // ---------------------------------------------------------------------------
  public authenticateAdmin(
    email: string,
    passwordAttempt: string
  ): {
    success: boolean;
    user?: ProfileRow;
    error?: string;
  } {
    const emailNorm = email.trim().toLowerCase();
    const cred = this.state.credentials.find((c) => c.email.toLowerCase() === emailNorm);
    const profile = this.state.profiles.find((p) => p.email.toLowerCase() === emailNorm);

    if (!cred || !profile || profile.role !== 'main_admin') {
      return {
        success: false,
        error: 'Unauthorized. Only registered Main Administrators can access this console.',
      };
    }

    if (cred.passwordHash !== hashPassword(passwordAttempt)) {
      return {
        success: false,
        error: 'Invalid administrator credentials.',
      };
    }

    return {
      success: true,
      user: profile,
    };
  }

  // ---------------------------------------------------------------------------
  // Real-Time Immediate Revocation Check
  // ---------------------------------------------------------------------------
  public checkCurrentStaffAccess(userId: string): {
    authorized: boolean;
    status: 'active' | 'revoked' | 'not_found';
    departmentId?: string;
    reason?: string;
  } {
    const membership = this.state.memberships.find((m) => m.user_id === userId);
    if (!membership) {
      return { authorized: false, status: 'not_found' };
    }
    if (membership.status === 'revoked') {
      return {
        authorized: false,
        status: 'revoked',
        departmentId: membership.department_id,
        reason: membership.revocation_reason || 'Access revoked by administrator.',
      };
    }
    return {
      authorized: true,
      status: 'active',
      departmentId: membership.department_id,
    };
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: List Requests
  // ---------------------------------------------------------------------------
  public getPendingRequests(): (DepartmentAccessRequestRow & { department: DepartmentRow })[] {
    return this.state.requests
      .filter((r) => r.status === 'pending')
      .map((r) => ({
        ...r,
        department: this.getDepartmentById(r.department_id) || {
          id: r.department_id,
          name: r.department_id,
          name_urdu: r.department_id,
          code: r.department_id.toUpperCase(),
          is_active: true,
          created_at: r.created_at,
        },
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getAllRequests(): (DepartmentAccessRequestRow & { department: DepartmentRow })[] {
    return this.state.requests
      .map((r) => ({
        ...r,
        department: this.getDepartmentById(r.department_id) || {
          id: r.department_id,
          name: r.department_id,
          name_urdu: r.department_id,
          code: r.department_id.toUpperCase(),
          is_active: true,
          created_at: r.created_at,
        },
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: Approve Request (Security Definer equivalent)
  // ---------------------------------------------------------------------------
  public approveAccessRequest(
    requestId: string,
    callerAdminId: string = SEED_ADMIN_ID
  ): { success: boolean; error?: string } {
    const req = this.state.requests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: `Request not found: ${requestId}` };
    }

    const now = new Date().toISOString();

    // Update request
    req.status = 'approved';
    req.reviewed_by = callerAdminId;
    req.reviewed_at = now;
    req.updated_at = now;

    // Update profile role
    const profile = this.state.profiles.find((p) => p.id === req.user_id);
    if (profile) {
      profile.role = 'department_staff';
      profile.updated_at = now;
    }

    // Upsert membership
    const existingMembership = this.state.memberships.find(
      (m) => m.user_id === req.user_id && m.department_id === req.department_id
    );

    if (existingMembership) {
      existingMembership.status = 'active';
      existingMembership.approved_by = callerAdminId;
      existingMembership.approved_at = now;
      existingMembership.revoked_by = null;
      existingMembership.revoked_at = null;
      existingMembership.revocation_reason = null;
      existingMembership.updated_at = now;
    } else {
      this.state.memberships.push({
        id: generateId('mem'),
        user_id: req.user_id,
        department_id: req.department_id,
        status: 'active',
        approved_by: callerAdminId,
        approved_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    // Record audit log
    this.state.auditLogs.unshift({
      id: generateId('audit'),
      action: 'request_approved',
      target_user_id: req.user_id,
      target_email: req.work_email,
      department_id: req.department_id,
      actor_id: callerAdminId,
      details: { requestId },
      created_at: now,
    });

    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: Reject Request
  // ---------------------------------------------------------------------------
  public rejectAccessRequest(
    requestId: string,
    reason: string,
    callerAdminId: string = SEED_ADMIN_ID
  ): { success: boolean; error?: string } {
    const req = this.state.requests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: `Request not found: ${requestId}` };
    }

    const now = new Date().toISOString();
    req.status = 'rejected';
    req.rejection_reason = reason;
    req.reviewed_by = callerAdminId;
    req.reviewed_at = now;
    req.updated_at = now;

    this.state.auditLogs.unshift({
      id: generateId('audit'),
      action: 'request_rejected',
      target_user_id: req.user_id,
      target_email: req.work_email,
      department_id: req.department_id,
      actor_id: callerAdminId,
      details: { requestId, reason },
      created_at: now,
    });

    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: List Memberships
  // ---------------------------------------------------------------------------
  public getApprovedMemberships(): (DepartmentMembershipRow & {
    department: DepartmentRow;
    profile: ProfileRow;
  })[] {
    return this.state.memberships
      .filter((m) => m.status === 'active')
      .map((m) => ({
        ...m,
        department: this.getDepartmentById(m.department_id) || {
          id: m.department_id,
          name: m.department_id,
          name_urdu: m.department_id,
          code: m.department_id.toUpperCase(),
          is_active: true,
          created_at: m.created_at,
        },
        profile: this.state.profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id,
          full_name: 'Authorized Staff',
          email: 'staff@example.org',
          role: 'department_staff',
          created_at: m.created_at,
          updated_at: m.updated_at,
        },
      }))
      .sort((a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime());
  }

  public getAllMemberships(): (DepartmentMembershipRow & {
    department: DepartmentRow;
    profile: ProfileRow;
  })[] {
    return this.state.memberships
      .map((m) => ({
        ...m,
        department: this.getDepartmentById(m.department_id) || {
          id: m.department_id,
          name: m.department_id,
          name_urdu: m.department_id,
          code: m.department_id.toUpperCase(),
          is_active: true,
          created_at: m.created_at,
        },
        profile: this.state.profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id,
          full_name: 'Staff Member',
          email: 'staff@example.org',
          role: 'department_staff',
          created_at: m.created_at,
          updated_at: m.updated_at,
        },
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: Revoke Staff Access (Immediate Revocation)
  // ---------------------------------------------------------------------------
  public revokeStaffAccess(
    membershipId: string,
    reason: string,
    callerAdminId: string = SEED_ADMIN_ID
  ): { success: boolean; error?: string } {
    const membership = this.state.memberships.find((m) => m.id === membershipId);
    if (!membership) {
      return { success: false, error: `Membership not found: ${membershipId}` };
    }

    const now = new Date().toISOString();
    membership.status = 'revoked';
    membership.revoked_by = callerAdminId;
    membership.revoked_at = now;
    membership.revocation_reason = reason;
    membership.updated_at = now;

    // Mark corresponding request as revoked
    const correspondingReq = this.state.requests.find(
      (r) => r.user_id === membership.user_id && r.department_id === membership.department_id
    );
    if (correspondingReq) {
      correspondingReq.status = 'revoked';
      correspondingReq.updated_at = now;
    }

    const targetProfile = this.state.profiles.find((p) => p.id === membership.user_id);

    this.state.auditLogs.unshift({
      id: generateId('audit'),
      action: 'access_revoked',
      target_user_id: membership.user_id,
      target_email: targetProfile?.email || 'unknown@example.org',
      department_id: membership.department_id,
      actor_id: callerAdminId,
      details: { membershipId, reason },
      created_at: now,
    });

    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Audit Log
  // ---------------------------------------------------------------------------
  public getAuditLog(): AccessAuditLogRow[] {
    return [...this.state.auditLogs];
  }

  // ===========================================================================
  // PHASE 3B: CORE COMPLAINT TABLES, PRIVACY ISOLATION & RLS ENFORCEMENT
  // ===========================================================================

  public isMainAdmin(userId: string): boolean {
    const profile = this.state.profiles.find((p) => p.id === userId);
    return profile?.role === 'main_admin';
  }

  // ---------------------------------------------------------------------------
  // Helper: Profile & Membership Creation (Test Harness)
  // ---------------------------------------------------------------------------
  public createTestProfile(
    id: string,
    fullName: string,
    email: string,
    role: 'citizen' | 'department_staff' | 'main_admin'
  ): ProfileRow {
    const existing = this.state.profiles.find((p) => p.id === id);
    if (existing) {
      existing.full_name = fullName;
      existing.email = email;
      existing.role = role;
      existing.updated_at = new Date().toISOString();
      this.saveState();
      return existing;
    }
    const profile: ProfileRow = {
      id,
      full_name: fullName,
      email,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.profiles.push(profile);
    this.saveState();
    return profile;
  }

  public createTestMembership(
    userId: string,
    departmentId: string,
    status: 'active' | 'revoked' = 'active',
    approvedBy: string = SEED_ADMIN_ID
  ): DepartmentMembershipRow {
    const existing = this.state.memberships.find(
      (m) => m.user_id === userId && m.department_id === departmentId
    );
    if (existing) {
      existing.status = status;
      existing.updated_at = new Date().toISOString();
      this.saveState();
      return existing;
    }
    const membership: DepartmentMembershipRow = {
      id: generateId('mem'),
      user_id: userId,
      department_id: departmentId,
      status,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.memberships.push(membership);
    this.saveState();
    return membership;
  }

  public createTestCredentials(
    userId: string,
    email: string,
    passwordAttempt: string
  ): void {
    const emailNorm = email.trim().toLowerCase();
    const existingCredIdx = this.state.credentials.findIndex(
      (c) => c.email.toLowerCase() === emailNorm
    );
    const newCred: StoredUserCredential = {
      userId,
      email: emailNorm,
      passwordHash: hashPassword(passwordAttempt),
    };
    if (existingCredIdx >= 0) {
      this.state.credentials[existingCredIdx] = newCred;
    } else {
      this.state.credentials.push(newCred);
    }
    this.saveState();
  }

  // ---------------------------------------------------------------------------
  // RLS: INSERT Complaint (Citizens own id or Admin, title optional/null)
  // ---------------------------------------------------------------------------
  public insertComplaint(
    complaintInput: {
      reference_number: string;
      citizen_id: string;
      title?: string | null;
      description: string;
      detected_language?: 'roman_urdu' | 'english' | 'urdu';
      incident_district: string;
      incident_locality: string;
      incident_public_location: string;
      assigned_department_id: string;
      status?: 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
      predicted_department_id?: string | null;
      prediction_confidence?: number | null;
      is_demonstration?: boolean;
    },
    callerUserId: string
  ): { success: boolean; complaint?: ComplaintRow; error?: string } {
    const isAdmin = this.isMainAdmin(callerUserId);
    if (!isAdmin && callerUserId !== complaintInput.citizen_id) {
      return {
        success: false,
        error: 'RLS Permission Denied: Citizens can only insert complaints for their own authenticated account.',
      };
    }

    const callerProfile = this.state.profiles.find((p) => p.id === callerUserId);
    if (callerProfile?.role === 'department_staff' && !isAdmin) {
      return {
        success: false,
        error: 'RLS Permission Denied: Department staff cannot insert citizen complaints.',
      };
    }

    const now = new Date().toISOString();
    const newComplaint: ComplaintRow = {
      id: generateId('cmp'),
      reference_number: complaintInput.reference_number,
      citizen_id: complaintInput.citizen_id,
      title: complaintInput.title || null,
      description: complaintInput.description,
      detected_language: complaintInput.detected_language || 'roman_urdu',
      incident_district: complaintInput.incident_district,
      incident_locality: complaintInput.incident_locality,
      incident_public_location: complaintInput.incident_public_location,
      status: complaintInput.status || 'submitted',
      assigned_department_id: complaintInput.assigned_department_id,
      predicted_department_id: complaintInput.predicted_department_id || null,
      prediction_confidence: complaintInput.prediction_confidence ?? null,
      is_reviewed_by_admin: false,
      is_demonstration: complaintInput.is_demonstration ?? false,
      created_at: now,
      updated_at: now,
    };

    this.state.complaints.push(newComplaint);
    this.saveState();
    return { success: true, complaint: newComplaint };
  }

  // ---------------------------------------------------------------------------
  // RLS: INSERT Citizen Private Details (Strictly isolated PII)
  // ---------------------------------------------------------------------------
  public insertCitizenPrivateDetails(
    details: {
      complaint_id: string;
      citizen_name: string;
      citizen_phone: string;
      citizen_email?: string | null;
      residential_address: string;
    },
    callerUserId: string
  ): { success: boolean; error?: string } {
    const isAdmin = this.isMainAdmin(callerUserId);
    const complaint = this.state.complaints.find((c) => c.id === details.complaint_id);
    if (!complaint) {
      return { success: false, error: 'Foreign Key Violation: Complaint not found.' };
    }

    if (!isAdmin && complaint.citizen_id !== callerUserId) {
      return {
        success: false,
        error: 'RLS Permission Denied: Cannot insert private details for a complaint owned by another user.',
      };
    }

    const now = new Date().toISOString();
    const newPrivateRow: ComplaintCitizenPrivateRow = {
      complaint_id: details.complaint_id,
      citizen_name: details.citizen_name,
      citizen_phone: details.citizen_phone,
      citizen_email: details.citizen_email || null,
      residential_address: details.residential_address,
      created_at: now,
      updated_at: now,
    };

    const existingIdx = this.state.citizenPrivateDetails.findIndex(
      (p) => p.complaint_id === details.complaint_id
    );
    if (existingIdx >= 0) {
      this.state.citizenPrivateDetails[existingIdx] = newPrivateRow;
    } else {
      this.state.citizenPrivateDetails.push(newPrivateRow);
    }

    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // RLS: SELECT Complaints
  // Citizens: citizen_id = auth.uid() (Database ownership only; NO reference-header bypass)
  // Staff: assigned_department_id === membership.department_id AND status = 'active'
  // Admin: ALL
  // ---------------------------------------------------------------------------
  public selectComplaints(callerUserId: string): ComplaintRow[] {
    const isAdmin = this.isMainAdmin(callerUserId);
    if (isAdmin) {
      return [...this.state.complaints];
    }

    const activeMembership = this.state.memberships.find(
      (m) => m.user_id === callerUserId && m.status === 'active'
    );
    if (activeMembership) {
      return this.state.complaints.filter(
        (c) => c.assigned_department_id === activeMembership.department_id
      );
    }

    return this.state.complaints.filter((c) => c.citizen_id === callerUserId);
  }

  // ---------------------------------------------------------------------------
  // RLS: SELECT Citizen Private Details (ZERO STAFF PERMISSION)
  // Returns PII ONLY to authenticated Citizen owner or Admin.
  // Department staff receive NULL / 0 rows (No name, phone, email, home address).
  // ---------------------------------------------------------------------------
  public selectCitizenPrivateDetails(
    complaintId: string,
    callerUserId: string
  ): ComplaintCitizenPrivateRow | null {
    const isAdmin = this.isMainAdmin(callerUserId);
    const complaint = this.state.complaints.find((c) => c.id === complaintId);
    if (!complaint) return null;

    if (!isAdmin && complaint.citizen_id !== callerUserId) {
      return null;
    }

    const details = this.state.citizenPrivateDetails.find((p) => p.complaint_id === complaintId);
    return details ? { ...details } : null;
  }

  // ---------------------------------------------------------------------------
  // RLS: SELECT Timeline Events
  // Accessible only if caller has access to parent complaint
  // ---------------------------------------------------------------------------
  public selectTimelineEvents(
    complaintId: string,
    callerUserId: string
  ): ComplaintTimelineEventRow[] {
    const accessibleComplaints = this.selectComplaints(callerUserId);
    const canAccess = accessibleComplaints.some((c) => c.id === complaintId);
    if (!canAccess) {
      return [];
    }

    return this.state.timelineEvents
      .filter((e) => e.complaint_id === complaintId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // ---------------------------------------------------------------------------
  // RPC: staff_update_complaint_status
  // Security Definer function enforcing:
  // 1. Staff active membership in assigned department
  // 2. Strict status transition state machine
  // 3. Immutable timeline insertion
  // ---------------------------------------------------------------------------
  public staffUpdateComplaintStatus(
    params: {
      complaint_id: string;
      new_status: 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
      title_en: string;
      title_ur: string;
      note_en: string;
      note_ur: string;
    },
    callerUserId: string
  ): { success: boolean; old_status?: string; new_status?: string; error?: string } {
    const complaint = this.state.complaints.find((c) => c.id === params.complaint_id);
    if (!complaint) {
      return { success: false, error: `Complaint not found: ${params.complaint_id}` };
    }

    const isAdmin = this.isMainAdmin(callerUserId);

    if (!isAdmin) {
      const membership = this.state.memberships.find(
        (m) =>
          m.user_id === callerUserId &&
          m.department_id === complaint.assigned_department_id &&
          m.status === 'active'
      );
      if (!membership) {
        return {
          success: false,
          error: 'Unauthorized: You do not have active staff credentials for this department.',
        };
      }

      const current = complaint.status;
      const next = params.new_status;

      if (current === 'resolved' || current === 'rejected') {
        return {
          success: false,
          error: `Invalid status transition: Cannot update complaint in terminal status: ${current}`,
        };
      }

      const validTransitions: Record<string, string[]> = {
        submitted: ['under_review', 'assigned', 'rejected'],
        under_review: ['assigned', 'in_progress', 'rejected'],
        assigned: ['accepted', 'rejected'],
        accepted: ['in_progress', 'rejected'],
        in_progress: ['resolved', 'rejected'],
        resolved: [],
        rejected: [],
      };

      if (!validTransitions[current]?.includes(next)) {
        return {
          success: false,
          error: `Invalid status transition: ${current} -> ${next}`,
        };
      }
    }

    const oldStatus = complaint.status;
    const now = new Date().toISOString();
    complaint.status = params.new_status;
    complaint.updated_at = now;

    this.state.timelineEvents.push({
      id: generateId('time'),
      complaint_id: params.complaint_id,
      status: params.new_status,
      title: params.title_en,
      title_urdu: params.title_ur,
      description: params.note_en,
      description_urdu: params.note_ur,
      actor_role: isAdmin ? 'main_admin' : 'department_staff',
      actor_id: callerUserId,
      created_at: now,
    });

    // Queue notification in outbox if citizen email exists (Server-side definer)
    const privateRow = this.state.citizenPrivateDetails?.find(
      (cp) => cp.complaint_id === params.complaint_id
    );
    if (privateRow?.citizen_email) {
      if (!this.state.notificationOutbox) this.state.notificationOutbox = [];
      this.state.notificationOutbox.push({
        id: generateId('notif'),
        complaint_id: params.complaint_id,
        recipient_email: privateRow.citizen_email,
        recipient_name: privateRow.citizen_name,
        event_type: 'status_updated',
        status: params.new_status,
        payload: {
          reference_number: complaint.reference_number,
          title_en: params.title_en,
          note_en: params.note_en,
          title_ur: params.title_ur,
          note_ur: params.note_ur,
        },
        delivery_status: 'logged',
        created_at: now,
      });
    }

    this.saveState();
    return {
      success: true,
      old_status: oldStatus,
      new_status: params.new_status,
    };
  }

  public getNotificationOutbox(): NotificationOutboxRow[] {
    return this.state.notificationOutbox || [];
  }

  // ---------------------------------------------------------------------------
  // RPC: admin_provision_department_staff
  // Server-side trusted provisioning: links user to department with role
  // ---------------------------------------------------------------------------
  public adminProvisionDepartmentStaff(
    params: {
      userId: string;
      email: string;
      fullName: string;
      departmentId: string;
    },
    callerAdminId: string = SEED_ADMIN_ID
  ): { success: boolean; error?: string } {
    if (!this.isMainAdmin(callerAdminId)) {
      return {
        success: false,
        error: 'Unauthorized: Only Main Administrators can provision staff accounts.',
      };
    }

    const dept = this.getDepartmentById(params.departmentId);
    if (!dept) {
      return {
        success: false,
        error: `Department does not exist or is inactive: ${params.departmentId}`,
      };
    }

    const now = new Date().toISOString();
    let profile = this.state.profiles.find((p) => p.id === params.userId);
    if (profile) {
      profile.full_name = params.fullName;
      profile.email = params.email.toLowerCase();
      profile.role = 'department_staff';
      profile.updated_at = now;
    } else {
      profile = {
        id: params.userId,
        full_name: params.fullName,
        email: params.email.toLowerCase(),
        role: 'department_staff',
        created_at: now,
        updated_at: now,
      };
      this.state.profiles.push(profile);
    }

    let membership = this.state.memberships.find(
      (m) => m.user_id === params.userId && m.department_id === params.departmentId
    );
    if (membership) {
      membership.status = 'active';
      membership.approved_by = callerAdminId;
      membership.revoked_by = null;
      membership.revoked_at = null;
      membership.revocation_reason = null;
      membership.updated_at = now;
    } else {
      membership = {
        id: generateId('mem'),
        user_id: params.userId,
        department_id: params.departmentId,
        status: 'active',
        approved_by: callerAdminId,
        approved_at: now,
        created_at: now,
        updated_at: now,
      };
      this.state.memberships.push(membership);
    }

    this.state.auditLogs.unshift({
      id: generateId('audit'),
      action: 'admin_provisioned',
      target_user_id: params.userId,
      target_email: params.email.toLowerCase(),
      department_id: params.departmentId,
      actor_id: callerAdminId,
      details: { department: params.departmentId },
      created_at: now,
    });

    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // RPC: admin_reassign_complaint
  // Corrects misclassified department routing
  // ---------------------------------------------------------------------------
  public adminReassignComplaint(
    complaintId: string,
    newDepartmentId: string,
    reason: string,
    callerAdminId: string = SEED_ADMIN_ID
  ): { success: boolean; error?: string } {
    if (!this.isMainAdmin(callerAdminId)) {
      return {
        success: false,
        error: 'Unauthorized: Only Main Administrators can reassign complaints.',
      };
    }

    const complaint = this.state.complaints.find((c) => c.id === complaintId);
    if (!complaint) {
      return { success: false, error: `Complaint not found: ${complaintId}` };
    }

    const oldDept = complaint.assigned_department_id;
    const now = new Date().toISOString();
    complaint.assigned_department_id = newDepartmentId;
    complaint.is_reviewed_by_admin = true;
    complaint.updated_at = now;

    this.state.timelineEvents.push({
      id: generateId('time'),
      complaint_id: complaintId,
      status: complaint.status,
      title: 'Department Reassigned by Administrator',
      title_urdu: 'ایڈمنسٹریٹر کی جانب سے محکمہ تبدیل کیا گیا',
      description: `Rerouted from ${oldDept} to ${newDepartmentId}. Reason: ${reason}`,
      description_urdu: `شکایت دوسرے محکمے کو منتقل کر دی گئی۔ وجہ: ${reason}`,
      actor_role: 'main_admin',
      actor_id: callerAdminId,
      created_at: now,
    });

    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // RLS: Direct UPDATE & DELETE Restrictions
  // Staff and Citizens are DENIED direct update and delete on complaints
  // ---------------------------------------------------------------------------
  public directUpdateComplaint(
    complaintId: string,
    updates: Partial<ComplaintRow>,
    callerUserId: string
  ): { success: boolean; error?: string } {
    if (!this.isMainAdmin(callerUserId)) {
      return {
        success: false,
        error:
          'RLS Permission Denied: Direct update on complaints is disallowed. Staff must use staff_update_complaint_status RPC.',
      };
    }

    const complaint = this.state.complaints.find((c) => c.id === complaintId);
    if (!complaint) return { success: false, error: 'Complaint not found.' };

    Object.assign(complaint, updates, { updated_at: new Date().toISOString() });
    this.saveState();
    return { success: true };
  }

  public directDeleteComplaint(
    complaintId: string,
    callerUserId: string
  ): { success: boolean; error?: string } {
    if (!this.isMainAdmin(callerUserId)) {
      return {
        success: false,
        error: 'RLS Permission Denied: Only Main Administrators can delete complaints.',
      };
    }

    const idx = this.state.complaints.findIndex((c) => c.id === complaintId);
    if (idx === -1) return { success: false, error: 'Complaint not found.' };

    this.state.complaints.splice(idx, 1);
    this.state.citizenPrivateDetails = this.state.citizenPrivateDetails.filter(
      (p) => p.complaint_id !== complaintId
    );
    this.state.timelineEvents = this.state.timelineEvents.filter(
      (t) => t.complaint_id !== complaintId
    );
    this.saveState();
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Server-Enforced Authentication Rate Limiter
  // Progressive backoff: 0-3: 0s, 4-5: 2s, 6-9: 5s, 10+: 15-min lock
  // ---------------------------------------------------------------------------
  public checkAuthRateLimit(identifier: string): {
    allowed: boolean;
    delay_seconds?: number;
    retry_after_seconds?: number;
    error?: string;
  } {
    const norm = identifier.trim().toLowerCase();
    const record = this.state.rateLimits.find((r) => r.identifier === norm);
    if (!record) {
      return { allowed: true, delay_seconds: 0 };
    }

    const now = new Date();
    if (record.locked_until && new Date(record.locked_until) > now) {
      const remainingSeconds = Math.ceil(
        (new Date(record.locked_until).getTime() - now.getTime()) / 1000
      );
      return {
        allowed: false,
        retry_after_seconds: remainingSeconds,
        error: 'Too many failed login attempts. Please wait before retrying.',
      };
    }

    if (record.failed_attempts >= 10) {
      record.locked_until = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      this.saveState();
      return {
        allowed: false,
        retry_after_seconds: 900,
        error: 'Account locked for 15 minutes due to repeated authentication failures.',
      };
    } else if (record.failed_attempts >= 6) {
      return { allowed: true, delay_seconds: 5 };
    } else if (record.failed_attempts >= 4) {
      return { allowed: true, delay_seconds: 2 };
    }

    return { allowed: true, delay_seconds: 0 };
  }

  public recordAuthAttempt(identifier: string, isSuccess: boolean): void {
    const norm = identifier.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = this.state.rateLimits.find((r) => r.identifier === norm);

    if (isSuccess) {
      if (existing) {
        const idx = this.state.rateLimits.indexOf(existing);
        this.state.rateLimits.splice(idx, 1);
        this.saveState();
      }
      return;
    }

    if (existing) {
      existing.failed_attempts += 1;
      existing.last_attempt_at = now;
    } else {
      this.state.rateLimits.push({
        id: generateId('rate'),
        identifier: norm,
        failed_attempts: 1,
        first_attempt_at: now,
        last_attempt_at: now,
        locked_until: null,
      });
    }
    this.saveState();
  }
}

// Global Singleton Instance
export const localSupabaseAdapter = new LocalSupabaseAdapter();
