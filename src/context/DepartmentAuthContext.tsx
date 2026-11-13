import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type DepartmentId, type Department } from '../types';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';
import { staffAuthService } from '../services/staffAuthService';

export interface DepartmentAuthSession {
  userId?: string;
  email?: string;
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
  signIn: (deptId: DepartmentId, accessKey?: string) => { success: boolean; error?: string };
  signInWithCredentials: (
    email: string,
    passwordAttempt: string
  ) => Promise<{
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password';
    rejectionReason?: string | null;
    error?: string;
  }>;
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
    email: string,
    passwordAttempt: string
  ): Promise<{
    success: boolean;
    status: 'approved' | 'pending' | 'rejected' | 'revoked' | 'not_found' | 'invalid_password';
    rejectionReason?: string | null;
    error?: string;
  }> => {
    const res = await staffAuthService.signInDepartmentStaff(email, passwordAttempt);
    if (res.success && res.session && res.session.departmentId) {
      const deptId = res.session.departmentId as DepartmentId;
      const dept = KARACHI_DEPARTMENTS[deptId];
      const newSession: DepartmentAuthSession = {
        userId: res.session.userId,
        email: res.session.email,
        departmentId: deptId,
        departmentName: res.session.departmentName || dept?.name || deptId,
        departmentCode: res.session.departmentCode || dept?.code || deptId.toUpperCase(),
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

      return { success: true, status: 'approved' };
    }

    return {
      success: false,
      status: res.status,
      rejectionReason: res.rejectionReason,
      error: res.error,
    };
  };

  const signOut = () => {
    setSession(null);
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
        signIn,
        signInWithCredentials,
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
