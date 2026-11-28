import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type DepartmentId, type Department } from '../types';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';
import { staffAuthService } from '../services/staffAuthService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  beginDepartmentSignIn,
  verifyStaffSession,
  enrollStaffTotp,
  getStaffTotpFactors,
  verifyStaffTotp,
  endLiveStaffSession,
  type StaffLoginState,
} from '../services/v25StaffSession';

export interface DepartmentAuthSession {
  userId?: string;
  email?: string;
  username?: string;
  role?: 'head' | 'officer';
  departmentId: DepartmentId;
  departmentName: string;
  departmentCode: string;
  authenticatedAt: string;
}

export interface DepartmentAuthContextType {
  departmentId: DepartmentId | null;
  departmentMeta: Department | null;
  availableDepartments: Department[];
  isAuthenticated: boolean;
  session: DepartmentAuthSession | null;
  loginFlowState: StaffLoginState | null;
  signIn: (deptId: DepartmentId, accessKey?: string) => { success: boolean; error?: string };
  signInWithCredentials: (
    identifier: string,
    passwordAttempt: string,
    expectedDeptId?: DepartmentId,
    role?: 'head' | 'officer'
  ) => Promise<{
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password' | 'wrong_department' | 'mfa_required' | 'password_change_required' | 'onboarding_required';
    rejectionReason?: string | null;
    error?: string;
    loginState?: StaffLoginState;
  }>;
  submitMfaCode: (
    factorId: string,
    code: string,
    role: 'head' | 'officer',
    department: DepartmentId
  ) => Promise<{
    success: boolean;
    status: 'approved' | 'mfa_required' | 'password_change_required' | 'onboarding_required' | 'error';
    error?: string;
    loginState?: StaffLoginState;
  }>;
  enrollMfa: () => Promise<{ factorId: string; qrCode: string; secret: string }>;
  getMfaFactors: () => Promise<Array<{ id: string; friendlyName?: string }>>;
  cancelLoginFlow: () => Promise<void>;
  updateStaffPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  checkRevocationStatus: () => { authorized: boolean; reason?: string };
  signOut: () => void;
}

const VALID_DEPARTMENT_IDS: DepartmentId[] = [
  'kelectric',
  'sswmb',
  'ssgc',
  'kwsc',
  'kmc',
  'sbca',
];

const SESSION_STORAGE_KEY = 'awaaz_department_auth_session_v1';

export const DepartmentAuthContext = createContext<DepartmentAuthContextType | undefined>(
  undefined
);

export const DepartmentAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<DepartmentAuthSession | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed: DepartmentAuthSession = JSON.parse(stored);
          if (parsed && VALID_DEPARTMENT_IDS.includes(parsed.departmentId)) {
            return parsed;
          }
        }
      }
    } catch {
      // Storage unavailable
    }
    return null;
  });

  const [loginFlowState, setLoginFlowState] = useState<StaffLoginState | null>(null);

  // Server-side identity re-verification on load, token refresh, and auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      if (session?.userId) {
        const access = staffAuthService.checkCurrentStaffAccess(session.userId);
        if (!access.authorized && access.status === 'revoked') {
          signOut();
        }
      }
      return;
    }

    let active = true;

    const reverify = async () => {
      if (!session?.userId || !session?.departmentId) return;
      try {
        const result = await verifyStaffSession(
          supabase!,
          session.role || 'head',
          session.departmentId
        );
        if (result.state !== 'ready' && active) {
          signOut();
        }
      } catch {
        if (active) {
          signOut();
        }
      }
    };

    if (session?.userId && session?.departmentId) {
      void reverify();
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT' || !s) {
        if (active) {
          setSession(null);
          setLoginFlowState(null);
          try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          } catch {}
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Schedule outside synchronous callback
        setTimeout(() => {
          if (active) void reverify();
        }, 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [session?.userId, session?.departmentId, session?.role]);

  const availableDepartments: Department[] = VALID_DEPARTMENT_IDS.map(
    (id) => KARACHI_DEPARTMENTS[id]
  ).filter(Boolean);

  const departmentId: DepartmentId | null = session ? session.departmentId : null;
  const departmentMeta: Department | null =
    departmentId && KARACHI_DEPARTMENTS[departmentId]
      ? KARACHI_DEPARTMENTS[departmentId]
      : null;

  const isAuthenticated = Boolean(session && session.departmentId);

  const checkRevocationStatus = (): { authorized: boolean; reason?: string } => {
    if (!session?.userId) {
      return { authorized: isAuthenticated };
    }
    const access = staffAuthService.checkCurrentStaffAccess(session.userId);
    if (!access.authorized && access.status === 'revoked') {
      signOut();
      return { authorized: false, reason: access.reason };
    }
    return { authorized: true };
  };

  const signIn = (deptId: DepartmentId, _accessKey?: string): { success: boolean; error?: string } => {
    if (!VALID_DEPARTMENT_IDS.includes(deptId)) {
      return { success: false, error: 'Invalid department identifier.' };
    }

    const dept = KARACHI_DEPARTMENTS[deptId];
    const newSession: DepartmentAuthSession = {
      departmentId: deptId,
      departmentName: dept?.name || deptId,
      departmentCode: dept?.code || deptId.toUpperCase(),
      authenticatedAt: new Date().toISOString(),
    };

    setSession(newSession);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      }
    } catch {
      // Ignore
    }

    return { success: true };
  };

  const signInWithCredentials = async (
    identifier: string,
    passwordAttempt: string,
    expectedDeptId?: DepartmentId,
    role: 'head' | 'officer' = 'head'
  ): Promise<{
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password' | 'wrong_department' | 'mfa_required' | 'password_change_required' | 'onboarding_required';
    rejectionReason?: string | null;
    error?: string;
    loginState?: StaffLoginState;
  }> => {
    const deptId = expectedDeptId || 'kmc';

    // 1. Live Mode: Secure edge credential exchange with fail-closed security
    if (isSupabaseConfigured() && supabase) {
      try {
        const state = await beginDepartmentSignIn(supabase, {
          identifier,
          password: passwordAttempt,
          department: deptId,
          role,
        });

        setLoginFlowState(state);

        if (state.state === 'ready') {
          const dept = KARACHI_DEPARTMENTS[deptId];
          const newSession: DepartmentAuthSession = {
            userId: state.userId,
            username: identifier.trim(),
            role: state.role as 'head' | 'officer',
            departmentId: deptId,
            departmentName: dept?.name || deptId,
            departmentCode: dept?.code || deptId.toUpperCase(),
            authenticatedAt: new Date().toISOString(),
          };

          setSession(newSession);
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
            }
          } catch {}

          return { success: true, status: 'approved', loginState: state };
        } else if (state.state === 'mfa_required') {
          return { success: false, status: 'mfa_required', loginState: state };
        } else if (state.state === 'password_change_required') {
          return { success: false, status: 'password_change_required', loginState: state };
        } else if (state.state === 'onboarding_required') {
          return { success: false, status: 'onboarding_required', loginState: state };
        }

        return { success: false, status: 'not_found', error: 'Authentication failed.' };
      } catch (err: unknown) {
        setLoginFlowState(null);
        const msg = err instanceof Error ? err.message : 'Authentication service error';
        return {
          success: false,
          status: 'invalid_password',
          error: msg.includes('access verification')
            ? 'Authentication failed: Invalid credentials, unauthorized department, or inactive account.'
            : msg,
        };
      }
    }

    // 2. Offline / Mock Mode for Unit Tests and Prototype Demonstration
    let res = await staffAuthService.signInDepartmentStaffWithUsername(
      identifier,
      passwordAttempt,
      expectedDeptId
    );

    if (!res.success && identifier.includes('@')) {
      const emailRes = await staffAuthService.signInDepartmentStaff(identifier, passwordAttempt);
      res = emailRes;
    }

    if (res.success && res.session && res.session.departmentId) {
      const dId = res.session.departmentId as DepartmentId;

      if (expectedDeptId && dId !== expectedDeptId) {
        const otherDept = res.session.departmentName || dId.toUpperCase();
        const targetThemeName = expectedDeptId === 'kmc' ? 'Roads & Infrastructure' : (KARACHI_DEPARTMENTS[expectedDeptId]?.name || expectedDeptId.toUpperCase());
        return {
          success: false,
          status: 'wrong_department',
          error: `Access Denied: Your staff account is authorized for "${otherDept}". You cannot access the ${targetThemeName} console with these credentials. Please return to Department Selection.`,
        };
      }

      const dept = KARACHI_DEPARTMENTS[dId];
      const newSession: DepartmentAuthSession = {
        userId: res.session.userId,
        email: res.session.email,
        username: res.session.username,
        role,
        departmentId: dId,
        departmentName: res.session.departmentName || dept?.name || dId,
        departmentCode: res.session.departmentCode || dept?.code || dId.toUpperCase(),
        authenticatedAt: res.session.authenticatedAt,
      };

      setSession(newSession);
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        }
      } catch {
        // Ignore
      }

      return {
        success: true,
        status: 'approved',
        loginState: { state: 'ready', userId: res.session.userId, role, department: dId },
      };
    }

    return {
      success: false,
      status: res.status,
      rejectionReason: res.rejectionReason,
      error: res.error,
    };
  };

  const submitMfaCode = async (
    factorId: string,
    code: string,
    role: 'head' | 'officer',
    department: DepartmentId
  ): Promise<{
    success: boolean;
    status: 'approved' | 'mfa_required' | 'password_change_required' | 'onboarding_required' | 'error';
    error?: string;
    loginState?: StaffLoginState;
  }> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const state = await verifyStaffTotp(supabase, factorId, code, role, department);
        setLoginFlowState(state);

        if (state.state === 'ready') {
          const dept = KARACHI_DEPARTMENTS[department];
          const newSession: DepartmentAuthSession = {
            userId: state.userId,
            role: state.role as 'head' | 'officer',
            departmentId: department,
            departmentName: dept?.name || department,
            departmentCode: dept?.code || department.toUpperCase(),
            authenticatedAt: new Date().toISOString(),
          };

          setSession(newSession);
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
            }
          } catch {}

          return { success: true, status: 'approved', loginState: state };
        }

        return { success: false, status: state.state as any, loginState: state };
      } catch (err: unknown) {
        return {
          success: false,
          status: 'error',
          error: 'Invalid or expired 6-digit verification code. Please check your authenticator app and try again.',
        };
      }
    }

    if (/^\d{6}$/.test(code.trim())) {
      const readyState: StaffLoginState = {
        state: 'ready',
        userId: session?.userId || 'mock-id',
        role,
        department,
      };
      setLoginFlowState(readyState);
      return { success: true, status: 'approved', loginState: readyState };
    }
    return { success: false, status: 'error', error: 'Invalid verification code.' };
  };

  const enrollMfa = async (): Promise<{ factorId: string; qrCode: string; secret: string }> => {
    if (isSupabaseConfigured() && supabase) {
      return await enrollStaffTotp(supabase);
    }
    return {
      factorId: 'mock-factor-001',
      qrCode: 'data:image/png;base64,mockQR',
      secret: 'MOCKTOTPSECRETKEY12345678',
    };
  };

  const getMfaFactors = async (): Promise<Array<{ id: string; friendlyName?: string }>> => {
    if (isSupabaseConfigured() && supabase) {
      return await getStaffTotpFactors(supabase);
    }
    return [];
  };

  const cancelLoginFlow = async (): Promise<void> => {
    setLoginFlowState(null);
    if (isSupabaseConfigured() && supabase) {
      try {
        await endLiveStaffSession(supabase);
      } catch {}
    }
  };

  const updateStaffPassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 15) {
      return {
        success: false,
        error: 'Passphrase must be at least 15 characters long (NIST SP 800-63B standard).',
      };
    }
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        if (session?.userId && session?.departmentId && session?.role) {
          const nextState = await verifyStaffSession(supabase, session.role, session.departmentId);
          setLoginFlowState(nextState);
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update passphrase.';
        return { success: false, error: msg };
      }
    }
    return { success: true };
  };

  const signOut = () => {
    setSession(null);
    setLoginFlowState(null);
    if (isSupabaseConfigured() && supabase) {
      endLiveStaffSession(supabase).catch(() => {});
    }
    staffAuthService.signOutStaff();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <DepartmentAuthContext.Provider
      value={{
        departmentId,
        departmentMeta,
        availableDepartments,
        isAuthenticated,
        session,
        loginFlowState,
        signIn,
        signInWithCredentials,
        submitMfaCode,
        enrollMfa,
        getMfaFactors,
        cancelLoginFlow,
        updateStaffPassword,
        checkRevocationStatus,
        signOut,
      }}
    >
      {children}
    </DepartmentAuthContext.Provider>
  );
};

export const useDepartmentAuth = (): DepartmentAuthContextType => {
  const context = useContext(DepartmentAuthContext);
  if (!context) {
    throw new Error('useDepartmentAuth must be used within a DepartmentAuthProvider');
  }
  return context;
};
