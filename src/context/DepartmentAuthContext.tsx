import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { type DepartmentId, type Department } from '../types';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';

export interface DepartmentAuthSession {
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

  const availableDepartments: Department[] = VALID_DEPARTMENT_IDS.map(
    (id) => KARACHI_DEPARTMENTS[id]
  ).filter(Boolean);

  const departmentId: DepartmentId | null = session ? session.departmentId : null;
  const departmentMeta: Department | null =
    departmentId && KARACHI_DEPARTMENTS[departmentId]
      ? KARACHI_DEPARTMENTS[departmentId]
      : null;

  const isAuthenticated = Boolean(session && session.departmentId);

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

  const signOut = () => {
    setSession(null);
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
