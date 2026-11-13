import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  localSupabaseAdapter,
  type DepartmentRow,
  type DepartmentAccessRequestRow,
  type DepartmentMembershipRow,
  type AccessAuditLogRow,
  type ProfileRow,
} from './LocalSupabaseAdapter';

export type StaffRole = 'main_admin' | 'department_staff' | 'citizen';

export interface DepartmentAccessRequestWithDept extends DepartmentAccessRequestRow {
  department: DepartmentRow;
}

export interface DepartmentMembershipWithDetails extends DepartmentMembershipRow {
  department: DepartmentRow;
  profile: ProfileRow;
}

export interface StaffSession {
  userId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  authenticatedAt: string;
}

export interface AdminSession {
  userId: string;
  email: string;
  fullName: string;
  role: 'main_admin';
  authenticatedAt: string;
}

const STAFF_SESSION_KEY = 'awaaz_staff_session_v2';
const ADMIN_SESSION_KEY = 'awaaz_admin_session_v2';

class StaffAuthService {
  // ---------------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------------
  public async getDepartments(): Promise<DepartmentRow[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('id');
      if (!error && data) return data as DepartmentRow[];
    }
    return localSupabaseAdapter.getDepartments();
  }

  // ---------------------------------------------------------------------------
  // Request Access (Employee submits request)
  // ---------------------------------------------------------------------------
  public async requestDepartmentAccess(params: {
    departmentId: string;
    fullName: string;
    workEmail: string;
    password: string;
  }): Promise<{ success: boolean; requestId?: string; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        // Sign up with Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: params.workEmail,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              department_id: params.departmentId,
              role: 'department_staff',
            },
          },
        });

        if (authErr) {
          return { success: false, error: authErr.message };
        }

        if (authData.user) {
          // Submit request to department_access_requests
          const { data: reqData, error: reqErr } = await supabase
            .from('department_access_requests')
            .insert({
              user_id: authData.user.id,
              department_id: params.departmentId,
              full_name: params.fullName,
              work_email: params.workEmail,
              status: 'pending',
            })
            .select()
            .single();

          if (reqErr) {
            return { success: false, error: reqErr.message };
          }
          return { success: true, requestId: reqData?.id };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Database error';
        return { success: false, error: message };
      }
    }

    // Fallback to offline / local database
    return localSupabaseAdapter.submitAccessRequest(params);
  }

  // ---------------------------------------------------------------------------
  // Staff Sign-In (Verifies approval status)
  // ---------------------------------------------------------------------------
  public async signInDepartmentStaff(
    workEmail: string,
    passwordAttempt: string
  ): Promise<{
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password';
    session?: StaffSession;
    rejectionReason?: string | null;
    error?: string;
  }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: workEmail,
          password: passwordAttempt,
        });

        if (authErr) {
          return {
            success: false,
            status: 'invalid_password',
            error: authErr.message,
          };
        }

        const user = authData.user;
        if (!user) {
          return { success: false, status: 'not_found', error: 'User not found.' };
        }

        // Check active membership
        const { data: memberships, error: memErr } = await supabase
          .from('department_memberships')
          .select('*, departments(*)')
          .eq('user_id', user.id);

        if (memErr) {
          return { success: false, status: 'not_found', error: memErr.message };
        }

        const activeMembership = memberships?.find((m) => m.status === 'active');
        if (activeMembership) {
          const staffSession: StaffSession = {
            userId: user.id,
            email: user.email || workEmail,
            fullName: user.user_metadata?.full_name || 'Department Staff',
            role: 'department_staff',
            departmentId: activeMembership.department_id,
            departmentName: activeMembership.departments?.name,
            departmentCode: activeMembership.departments?.code,
            authenticatedAt: new Date().toISOString(),
          };
          this.setStoredStaffSession(staffSession);
          return {
            success: true,
            status: 'approved',
            session: staffSession,
          };
        }

        const revokedMembership = memberships?.find((m) => m.status === 'revoked');
        if (revokedMembership) {
          return {
            success: false,
            status: 'revoked',
            rejectionReason: revokedMembership.revocation_reason,
            error: `Your departmental access has been revoked: ${
              revokedMembership.revocation_reason || 'Access withdrawn by Main Administrator.'
            }`,
          };
        }

        // Check requests
        const { data: reqs } = await supabase
          .from('department_access_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestReq = reqs?.[0];
        if (latestReq) {
          if (latestReq.status === 'pending') {
            return {
              success: false,
              status: 'pending',
              error: 'Your access request is currently pending review by the Main Administrator.',
            };
          }
          if (latestReq.status === 'rejected') {
            return {
              success: false,
              status: 'rejected',
              rejectionReason: latestReq.rejection_reason,
              error: `Your access request was rejected: ${
                latestReq.rejection_reason || 'Department verification was unsuccessful.'
              }`,
            };
          }
        }

        return {
          success: false,
          status: 'not_found',
          error: 'No active department membership found for this account.',
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication service error';
        return { success: false, status: 'not_found', error: message };
      }
    }

    // Local / Offline Adapter
    const result = localSupabaseAdapter.authenticateStaff(workEmail, passwordAttempt);
    if (result.success && result.user && result.department) {
      const staffSession: StaffSession = {
        userId: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: 'department_staff',
        departmentId: result.department.id,
        departmentName: result.department.name,
        departmentCode: result.department.code,
        authenticatedAt: new Date().toISOString(),
      };
      this.setStoredStaffSession(staffSession);
      return {
        success: true,
        status: 'approved',
        session: staffSession,
      };
    }

    return {
      success: false,
      status: result.status,
      rejectionReason: result.rejectionReason,
      error: result.error,
    };
  }

  // ---------------------------------------------------------------------------
  // Main Administrator Sign-In
  // ---------------------------------------------------------------------------
  public async signInMainAdmin(
    email: string,
    passwordAttempt: string
  ): Promise<{
    success: boolean;
    session?: AdminSession;
    error?: string;
  }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: passwordAttempt,
        });

        if (error || !data.user) {
          return { success: false, error: error?.message || 'Invalid administrator credentials.' };
        }

        // Verify role in profiles
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profErr || profile?.role !== 'main_admin') {
          return {
            success: false,
            error: 'Unauthorized: Account does not have Main Administrator privileges.',
          };
        }

        const adminSession: AdminSession = {
          userId: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: 'main_admin',
          authenticatedAt: new Date().toISOString(),
        };
        this.setStoredAdminSession(adminSession);
        return { success: true, session: adminSession };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Database error';
        return { success: false, error: message };
      }
    }

    // Local / Offline Adapter
    const result = localSupabaseAdapter.authenticateAdmin(email, passwordAttempt);
    if (result.success && result.user) {
      const adminSession: AdminSession = {
        userId: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: 'main_admin',
        authenticatedAt: new Date().toISOString(),
      };
      this.setStoredAdminSession(adminSession);
      return { success: true, session: adminSession };
    }

    return { success: false, error: result.error };
  }

  // ---------------------------------------------------------------------------
  // Immediate Revocation Real-Time Check
  // ---------------------------------------------------------------------------
  public checkCurrentStaffAccess(userId: string): {
    authorized: boolean;
    status: 'active' | 'revoked' | 'not_found';
    departmentId?: string;
    reason?: string;
  } {
    // Synchronous immediate check against authoritative state
    return localSupabaseAdapter.checkCurrentStaffAccess(userId);
  }

  // ---------------------------------------------------------------------------
  // Session Persistence
  // ---------------------------------------------------------------------------
  public getCurrentStaffSession(): StaffSession | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(STAFF_SESSION_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private setStoredStaffSession(session: StaffSession): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
      }
    } catch {
      // Storage unavailable
    }
  }

  public signOutStaff(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(STAFF_SESSION_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }

  public getCurrentAdminSession(): AdminSession | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private setStoredAdminSession(session: AdminSession): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      }
    } catch {
      // Storage unavailable
    }
  }

  public signOutAdmin(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: Request Approval & Rejection
  // ---------------------------------------------------------------------------
  public async getPendingDepartmentRequests(): Promise<DepartmentAccessRequestWithDept[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('department_access_requests')
        .select('*, department:departments(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) return data as unknown as DepartmentAccessRequestWithDept[];
    }
    return localSupabaseAdapter.getPendingRequests();
  }

  public async getAllDepartmentRequests(): Promise<DepartmentAccessRequestWithDept[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('department_access_requests')
        .select('*, department:departments(*)')
        .order('created_at', { ascending: false });

      if (!error && data) return data as unknown as DepartmentAccessRequestWithDept[];
    }
    return localSupabaseAdapter.getAllRequests();
  }

  public async approveDepartmentRequest(
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.rpc('approve_access_request', {
        p_request_id: requestId,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    const admin = this.getCurrentAdminSession();
    return localSupabaseAdapter.approveAccessRequest(requestId, admin?.userId);
  }

  public async rejectDepartmentRequest(
    requestId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.rpc('reject_access_request', {
        p_request_id: requestId,
        p_reason: reason,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    const admin = this.getCurrentAdminSession();
    return localSupabaseAdapter.rejectAccessRequest(requestId, reason, admin?.userId);
  }

  // ---------------------------------------------------------------------------
  // Main Administrator: Memberships & Immediate Revocation
  // ---------------------------------------------------------------------------
  public async getApprovedDepartmentMemberships(): Promise<DepartmentMembershipWithDetails[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('department_memberships')
        .select('*, department:departments(*), profile:profiles(*)')
        .eq('status', 'active')
        .order('approved_at', { ascending: false });

      if (!error && data) return data as unknown as DepartmentMembershipWithDetails[];
    }
    return localSupabaseAdapter.getApprovedMemberships();
  }

  public async getAllDepartmentMemberships(): Promise<DepartmentMembershipWithDetails[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('department_memberships')
        .select('*, department:departments(*), profile:profiles(*)')
        .order('created_at', { ascending: false });

      if (!error && data) return data as unknown as DepartmentMembershipWithDetails[];
    }
    return localSupabaseAdapter.getAllMemberships();
  }

  public async revokeDepartmentAccess(
    membershipId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.rpc('revoke_staff_access', {
        p_membership_id: membershipId,
        p_reason: reason,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    const admin = this.getCurrentAdminSession();
    return localSupabaseAdapter.revokeStaffAccess(membershipId, reason, admin?.userId);
  }

  public getAccessAuditLog(): AccessAuditLogRow[] {
    return localSupabaseAdapter.getAuditLog();
  }

  public resetLocalDatabase(): void {
    localSupabaseAdapter.resetToDefault();
    this.signOutStaff();
    this.signOutAdmin();
  }
}

export const staffAuthService = new StaffAuthService();
