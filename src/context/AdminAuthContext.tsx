import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { staffAuthService, type AdminSession } from '../services/staffAuthService';

export interface AdminAuthContextType {
  adminSession: AdminSession | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    return staffAuthService.getCurrentAdminSession();
  });

  useEffect(() => {
    const current = staffAuthService.getCurrentAdminSession();
    if (current?.userId !== adminSession?.userId) {
      setAdminSession(current);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await staffAuthService.signInMainAdmin(email, password);
    if (res.success && res.session) {
      setAdminSession(res.session);
      return { success: true };
    }
    return { success: false, error: res.error || 'Administrator authentication failed.' };
  };

  const signOut = () => {
    staffAuthService.signOutAdmin();
    setAdminSession(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminSession,
        isAuthenticated: Boolean(adminSession && adminSession.role === 'main_admin'),
        signIn,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    // Graceful fallback for test environments or isolated screen rendering
    return {
      adminSession: staffAuthService.getCurrentAdminSession(),
      isAuthenticated: Boolean(staffAuthService.getCurrentAdminSession()?.role === 'main_admin'),
      signIn: async (email, password) => {
        const res = await staffAuthService.signInMainAdmin(email, password);
        return { success: res.success, error: res.error };
      },
      signOut: () => staffAuthService.signOutAdmin(),
    };
  }
  return context;
};
