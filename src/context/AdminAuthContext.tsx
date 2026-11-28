import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { staffAuthService, type AdminSession } from '../services/staffAuthService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  beginAdminSignIn,
  verifyStaffSession,
  enrollStaffTotp,
  getStaffTotpFactors,
  verifyStaffTotp,
  endLiveStaffSession,
  type StaffLoginState,
} from '../services/v25StaffSession';

export interface AdminAuthContextType {
  adminSession: AdminSession | null;
  isAuthenticated: boolean;
  loginFlowState: StaffLoginState | null;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    status?: 'approved' | 'mfa_required' | 'error';
    error?: string;
    loginState?: StaffLoginState;
  }>;
  submitMfaCode: (factorId: string, code: string) => Promise<{
    success: boolean;
    status?: 'approved' | 'mfa_required' | 'error';
    error?: string;
    loginState?: StaffLoginState;
  }>;
  enrollMfa: () => Promise<{ factorId: string; qrCode: string; secret: string }>;
  getMfaFactors: () => Promise<Array<{ id: string; friendlyName?: string }>>;
  cancelLoginFlow: () => Promise<void>;
  signOut: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    return staffAuthService.getCurrentAdminSession();
  });
  const [loginFlowState, setLoginFlowState] = useState<StaffLoginState | null>(null);

  // Re-verify admin session on load / token refresh
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      const current = staffAuthService.getCurrentAdminSession();
      if (current?.userId !== adminSession?.userId) {
        setAdminSession(current);
      }
      return;
    }

    let active = true;
    const reverify = async () => {
      if (!adminSession?.userId) return;
      try {
        const result = await verifyStaffSession(supabase!, 'main_admin');
        if (result.state !== 'ready' && active) {
          signOut();
        }
      } catch {
        if (active) {
          signOut();
        }
      }
    };

    if (adminSession?.userId) {
      void reverify();
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT' || !s) {
        if (active) {
          setAdminSession(null);
          setLoginFlowState(null);
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setTimeout(() => {
          if (active) void reverify();
        }, 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [adminSession?.userId]);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const state = await beginAdminSignIn(supabase, email, password);
        setLoginFlowState(state);

        if (state.state === 'ready') {
          const session: AdminSession = {
            userId: state.userId,
            email: email.trim(),
            fullName: 'Main Administrator',
            role: 'main_admin',
            authenticatedAt: new Date().toISOString(),
          };
          setAdminSession(session);
          return { success: true, status: 'approved' as const, loginState: state };
        } else if (state.state === 'mfa_required') {
          return { success: false, status: 'mfa_required' as const, loginState: state };
        }
        return { success: false, status: 'error' as const, error: 'Administrator access verification failed.' };
      } catch (err: unknown) {
        setLoginFlowState(null);
        const msg = err instanceof Error ? err.message : 'Administrator authentication failed.';
        return {
          success: false,
          status: 'error' as const,
          error: msg.includes('access verification')
            ? 'Invalid administrator credentials, unverified role, or access restricted.'
            : msg,
        };
      }
    }

    // Offline / test adapter
    const res = await staffAuthService.signInMainAdmin(email, password);
    if (res.success && res.session) {
      setAdminSession(res.session);
      return { success: true, status: 'approved' as const };
    }
    return { success: false, status: 'error' as const, error: res.error || 'Administrator authentication failed.' };
  };

  const submitMfaCode = async (factorId: string, code: string) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const state = await verifyStaffTotp(supabase, factorId, code, 'main_admin');
        setLoginFlowState(state);

        if (state.state === 'ready') {
          const session: AdminSession = {
            userId: state.userId,
            email: 'admin@karachi.gov.pk',
            fullName: 'Main Administrator',
            role: 'main_admin',
            authenticatedAt: new Date().toISOString(),
          };
          setAdminSession(session);
          return { success: true, status: 'approved' as const, loginState: state };
        }
        return { success: false, status: state.state as any, loginState: state };
      } catch (err: unknown) {
        return {
          success: false,
          status: 'error' as const,
          error: 'Invalid or expired 6-digit MFA code. Please try again.',
        };
      }
    }

    // Offline mock
    if (/^\d{6}$/.test(code.trim())) {
      const readyState: StaffLoginState = {
        state: 'ready',
        userId: adminSession?.userId || 'mock-admin',
        role: 'main_admin',
      };
      setLoginFlowState(readyState);
      return { success: true, status: 'approved' as const, loginState: readyState };
    }
    return { success: false, status: 'error' as const, error: 'Invalid verification code.' };
  };

  const enrollMfa = async () => {
    if (isSupabaseConfigured() && supabase) {
      return await enrollStaffTotp(supabase);
    }
    return {
      factorId: 'mock-admin-factor',
      qrCode: 'data:image/png;base64,mockAdminQR',
      secret: 'ADMINMOCKSECRETKEY12345678',
    };
  };

  const getMfaFactors = async () => {
    if (isSupabaseConfigured() && supabase) {
      return await getStaffTotpFactors(supabase);
    }
    return [];
  };

  const cancelLoginFlow = async () => {
    setLoginFlowState(null);
    if (isSupabaseConfigured() && supabase) {
      try {
        await endLiveStaffSession(supabase);
      } catch {}
    }
  };

  const signOut = () => {
    if (isSupabaseConfigured() && supabase) {
      endLiveStaffSession(supabase).catch(() => {});
    }
    staffAuthService.signOutAdmin();
    setAdminSession(null);
    setLoginFlowState(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminSession,
        isAuthenticated: Boolean(adminSession && adminSession.role === 'main_admin'),
        loginFlowState,
        signIn,
        submitMfaCode,
        enrollMfa,
        getMfaFactors,
        cancelLoginFlow,
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
    return {
      adminSession: staffAuthService.getCurrentAdminSession(),
      isAuthenticated: Boolean(staffAuthService.getCurrentAdminSession()?.role === 'main_admin'),
      loginFlowState: null,
      signIn: async (email, password) => {
        const res = await staffAuthService.signInMainAdmin(email, password);
        return { success: res.success, status: res.success ? 'approved' : 'error', error: res.error };
      },
      submitMfaCode: async () => ({ success: true, status: 'approved' }),
      enrollMfa: async () => ({ factorId: 'mock', qrCode: '', secret: '' }),
      getMfaFactors: async () => [],
      cancelLoginFlow: async () => {},
      signOut: () => staffAuthService.signOutAdmin(),
    };
  }
  return context;
};
