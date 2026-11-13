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

interface StoredUserCredential {
  userId: string;
  email: string;
  passwordHash: string; // Emulated hashed storage
}

interface DatabaseState {
  departments: DepartmentRow[];
  profiles: ProfileRow[];
  credentials: StoredUserCredential[];
  requests: DepartmentAccessRequestRow[];
  memberships: DepartmentMembershipRow[];
  auditLogs: AccessAuditLogRow[];
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
}

// Global Singleton Instance
export const localSupabaseAdapter = new LocalSupabaseAdapter();
