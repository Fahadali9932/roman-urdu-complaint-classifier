import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type DepartmentId, type Department } from '../types';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';
import { staffAuthService } from '../services/staffAuthService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface DepartmentAuthSession {
  userId?: string;
  email?: string;
  username?: string;
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
  isCheckingSession: boolean;
  session: DepartmentAuthSession | null;
  signIn: (deptId: DepartmentId, accessKey?: string) => { success: boolean; error?: string };
  signInWithCredentials: (
    identifier: string,
    passwordAttempt: string,
    expectedDeptId?: DepartmentId
  ) => Promise<{
    success: boolean;
    status: 'approved' | 'mfa_required' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password' | 'wrong_department' | 'unavailable';
    rejectionReason?: string | null;
    error?: string;
  }>;
  completeMfaSignIn: () => Promise<{ success: boolean; error?: string }>;
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
  const [liveVerified, setLiveVerified] = useState(!isSupabaseConfigured() && !import.meta.env.PROD);
  const [isCheckingSession, setIsCheckingSession] = useState(isSupabaseConfigured());
  const [pendingMfa, setPendingMfa] = useState<DepartmentAuthSession | null>(null);
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

  // Verify real-time revocation on load or session change
  useEffect(() => {
    if (session?.userId) {
      const access = staffAuthService.checkCurrentStaffAccess(session.userId);
      if (!access.authorized && access.status === 'revoked') {
        signOut();
      }
    }
  }, [session]);

  const availableDepartments: Department[] = VALID_DEPARTMENT_IDS.map(
    (id) => KARACHI_DEPARTMENTS[id]
  ).filter(Boolean);

  const departmentId: DepartmentId | null = session ? session.departmentId : null;
  const departmentMeta: Department | null =
    departmentId && KARACHI_DEPARTMENTS[departmentId]
      ? KARACHI_DEPARTMENTS[departmentId]
      : null;

  const isAuthenticated = Boolean(session && session.departmentId && liveVerified);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    let canceled = false;
    (async () => {
      try {
      const auth = await supabase.auth.getUser();
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (canceled) return;
      if (auth.error || !auth.data.user || assurance.error || assurance.data?.currentLevel !== 'aal2') {
        setLiveVerified(false);
        setIsCheckingSession(false);
        return;
      }
      if (session?.userId !== auth.data.user.id) { setLiveVerified(false); setIsCheckingSession(false); return; }
      const { data } = await supabase.from('department_memberships').select('id')
        .eq('user_id', auth.data.user.id).eq('department_id', session.departmentId).eq('status','active').maybeSingle();
      if (!canceled) {setLiveVerified(Boolean(data));setIsCheckingSession(false);}
      } catch {
        if (!canceled) { setLiveVerified(false); setIsCheckingSession(false); }
      }
    })();
    return () => { canceled = true; };
  }, [session?.userId,session?.departmentId]);

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
    if (import.meta.env.PROD || isSupabaseConfigured()) return {success:false,error:'Live staff access requires invited email, password and authenticator verification.'};
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
    expectedDeptId?: DepartmentId
  ): Promise<{
    success: boolean;
    status: 'approved' | 'mfa_required' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password' | 'wrong_department' | 'unavailable';
    rejectionReason?: string | null;
    error?: string;
  }> => {
    if (import.meta.env.PROD && !isSupabaseConfigured()) {
      return { success:false,status:'unavailable',error:'Secure department authentication is not configured.' };
    }
    // Live staff sign in with their unique invited email. Legacy demo usernames
    // are permitted only in the explicitly unconfigured local demonstration.
    let res = isSupabaseConfigured()
      ? await staffAuthService.signInDepartmentStaff(identifier, passwordAttempt)
      : await staffAuthService.signInDepartmentStaffWithUsername(identifier, passwordAttempt, expectedDeptId);

    // Fallback to legacy email sign-in if not resolved as username and contains @
    if (
      !isSupabaseConfigured() && !res.success &&
      identifier.includes('@') &&
      (res.status === 'invalid_password' || res.status === 'not_found')
    ) {
      const emailRes = await staffAuthService.signInDepartmentStaff(identifier, passwordAttempt);
      res = emailRes;
    }

    if (res.success && res.session && res.session.departmentId) {
      const deptId = res.session.departmentId as DepartmentId;
      // The legacy email path is also required to obey the selected department.
      if (expectedDeptId && deptId !== expectedDeptId) {
        staffAuthService.signOutStaff();
        if (isSupabaseConfigured() && supabase) {
          await supabase.auth.signOut();
        }
        return {
          success: false,
          status: 'wrong_department',
          error: 'This staff account is not authorized for the selected department.',
        };
      }
      const dept = KARACHI_DEPARTMENTS[deptId];
      const newSession: DepartmentAuthSession = {
        userId: res.session.userId,
        email: res.session.email,
        username: res.session.username,
        departmentId: deptId,
        departmentName: res.session.departmentName || dept?.name || deptId,
        departmentCode: res.session.departmentCode || dept?.code || deptId.toUpperCase(),
        authenticatedAt: res.session.authenticatedAt,
      };

      if (isSupabaseConfigured() && supabase) {
        const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error || assurance.data?.currentLevel !== 'aal2') {
          setPendingMfa(newSession);
          setLiveVerified(false);
          return { success:false,status:'mfa_required',error:'Complete your authenticator verification to enter the department workspace.' };
        }
      }

      setSession(newSession);
      setLiveVerified(true);
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        }
      } catch {
        // Ignore
      }

      return { success: true, status: 'approved' };
    }

    return {
      success: false,
      status: res.status,
      rejectionReason: res.rejectionReason,
      error: res.error,
    };
  };

  const completeMfaSignIn = async () => {
    if (!pendingMfa || !supabase) return { success:false,error:'Start staff sign-in again.' };
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const user = await supabase.auth.getUser();
    if (assurance.error || assurance.data?.currentLevel !== 'aal2' || user.data.user?.id !== pendingMfa.userId) {
      return { success:false,error:'Authenticator verification is still required.' };
    }
    const { data, error } = await supabase.from('department_memberships').select('id')
      .eq('user_id',pendingMfa.userId).eq('department_id',pendingMfa.departmentId).eq('status','active').maybeSingle();
    if (error || !data) return { success:false,error:'Department authorization could not be verified.' };
    setSession(pendingMfa); setLiveVerified(true);
    sessionStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify(pendingMfa));
    setPendingMfa(null);
    setIsCheckingSession(false);
    return { success:true };
  };

  const signOut = () => {
    setSession(null);
    setPendingMfa(null);
    setLiveVerified(!isSupabaseConfigured() && !import.meta.env.PROD);
    if (isSupabaseConfigured()) void supabase?.auth.signOut();
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
        isCheckingSession,
        session,
        signIn,
        signInWithCredentials,
        completeMfaSignIn,
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
