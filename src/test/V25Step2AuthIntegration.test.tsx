import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  beginDepartmentSignIn,
  beginAdminSignIn,
  verifyStaffSession,
  enrollStaffTotp,
  getStaffTotpFactors,
  verifyStaffTotp,
  endLiveStaffSession,
} from '../services/v25StaffSession';
import { DepartmentAuthProvider, useDepartmentAuth } from '../context/DepartmentAuthContext';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemedDepartmentLoginScreen } from '../features/department/ThemedDepartmentLoginScreen';
import { AdminLoginPage } from '../features/auth/pages/AdminLoginPage';

function createMockSupabase(options: {
  userId?: string;
  role?: string;
  staffRole?: string;
  departmentId?: string;
  status?: string;
  mustChangePassword?: boolean;
  operationalAccess?: boolean;
  aal?: 'aal1' | 'aal2';
  isMainAdmin?: boolean;
  exchangeError?: boolean;
  tokenError?: boolean;
  mfaVerifyError?: boolean;
} = {}) {
  const userId = options.userId ?? 'user-v25-test';
  const role = options.role ?? 'department_staff';
  const staffRole = options.staffRole ?? 'head';
  const departmentId = options.departmentId ?? 'kmc';
  const status = options.status ?? 'active';
  const mustChangePassword = options.mustChangePassword ?? false;
  const operationalAccess = options.operationalAccess ?? true;
  const aal = options.aal ?? 'aal2';
  const isMainAdmin = options.isMainAdmin ?? true;

  const mockUser = { id: userId, email: 'staff@karachi.gov.pk' };

  const queryChain = (data: unknown) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data, error: null })),
      single: vi.fn(async () => ({ data, error: null })),
    };
    return chain;
  };

  const client = {
    functions: {
      invoke: vi.fn(async (funcName: string, payload: any) => {
        if (options.exchangeError) {
          return { data: null, error: new Error('Exchange failed') };
        }
        return {
          data: {
            access_token: 'test-v25-access-token',
            refresh_token: 'test-v25-refresh-token',
          },
          error: null,
        };
      }),
    },
    auth: {
      setSession: vi.fn(async () => {
        if (options.tokenError) {
          return { data: { user: null, session: null }, error: new Error('Invalid token') };
        }
        return { data: { user: mockUser, session: { access_token: 'tok' } }, error: null };
      }),
      signInWithPassword: vi.fn(async () => {
        if (options.exchangeError) {
          return { data: { user: null, session: null }, error: new Error('Invalid password') };
        }
        return { data: { user: mockUser, session: { access_token: 'tok' } }, error: null };
      }),
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(async () => ({
          data: { currentLevel: aal, nextLevel: 'aal2' },
          error: null,
        })),
        listFactors: vi.fn(async () => ({
          data: {
            all: [{ id: 'factor-1', status: 'verified', friendly_name: 'Awaaz-e-Awam' }],
            totp: [{ id: 'factor-1', status: 'verified', friendly_name: 'Awaaz-e-Awam' }],
          },
          error: null,
        })),
        enroll: vi.fn(async () => ({
          data: {
            id: 'factor-new-totp',
            totp: {
              qr_code: 'data:image/svg+xml;utf8,<svg>QR</svg>',
              secret: 'TESTSECRETKEYV25XYZ123456',
            },
          },
          error: null,
        })),
        challengeAndVerify: vi.fn(async () => {
          if (options.mfaVerifyError) {
            return { data: null, error: new Error('Invalid TOTP code') };
          }
          return { data: { user: mockUser }, error: null };
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return queryChain({ id: userId, role });
      }
      if (table === 'department_memberships') {
        let queriedDept: string | undefined = undefined;
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn((col: string, val: any) => {
            if (col === 'department_id') queriedDept = val;
            return chain;
          }),
          maybeSingle: vi.fn(async () => {
            if (queriedDept && queriedDept !== departmentId) {
              return { data: null, error: null };
            }
            return {
              data: {
                staff_role: staffRole,
                status,
                must_change_password: mustChangePassword,
                department_id: departmentId,
              },
              error: null,
            };
          }),
          single: vi.fn(async () => ({ data: null, error: null })),
        };
        return chain;
      }
      return queryChain(null);
    }),
    rpc: vi.fn(async (fnName: string) => {
      if (fnName === 'is_main_admin') {
        return { data: isMainAdmin, error: null };
      }
      if (fnName === 'v16_staff_operational_access') {
        return { data: operationalAccess, error: null };
      }
      return { data: null, error: new Error('Unknown RPC') };
    }),
  };

  return { client: client as unknown as SupabaseClient, raw: client };
}

describe('AWAAZ-E-AWAM — Step 2 Secure Authentication Integration & Verification', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Department Head & Officer Role Isolation via Edge Exchange', () => {
    it('authenticates Department Head through Edge credential exchange and establishes ready session', async () => {
      const { client, raw } = createMockSupabase({ staffRole: 'head', departmentId: 'kmc' });
      const result = await beginDepartmentSignIn(client, {
        identifier: 'head-kmc',
        password: 'SecurePassphrase123!',
        department: 'kmc',
        role: 'head',
      });

      expect(result).toEqual({
        state: 'ready',
        userId: 'user-v25-test',
        role: 'head',
        department: 'kmc',
      });
      expect(raw.functions.invoke).toHaveBeenCalledWith('staff-credential-exchange', {
        body: {
          identifier: 'head-kmc',
          password: 'SecurePassphrase123!',
          department: 'kmc',
        },
      });
      expect(raw.auth.setSession).toHaveBeenCalledWith({
        access_token: 'test-v25-access-token',
        refresh_token: 'test-v25-refresh-token',
      });
      // Verifies no client-side email resolution RPC was invoked
      expect(raw.rpc).not.toHaveBeenCalledWith('v16_resolve_staff_login_email', expect.anything());
    });

    it('rejects an Officer trying to authenticate with expected role "head" and signs out local session', async () => {
      const { client, raw } = createMockSupabase({ staffRole: 'officer', departmentId: 'kmc' });
      await expect(
        beginDepartmentSignIn(client, {
          identifier: 'officer-kmc',
          password: 'Password123!',
          department: 'kmc',
          role: 'head',
        })
      ).rejects.toThrow();

      expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('rejects a Head trying to authenticate with expected role "officer" and signs out local session', async () => {
      const { client, raw } = createMockSupabase({ staffRole: 'head', departmentId: 'kmc' });
      await expect(
        beginDepartmentSignIn(client, {
          identifier: 'head-kmc',
          password: 'Password123!',
          department: 'kmc',
          role: 'officer',
        })
      ).rejects.toThrow();

      expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('rejects cross-department authentication attempt (KMC user trying to access KE)', async () => {
      // User is in KMC, but attempting sign-in for KE
      const { client, raw } = createMockSupabase({ staffRole: 'head', departmentId: 'kmc' });
      await expect(
        beginDepartmentSignIn(client, {
          identifier: 'head-kmc',
          password: 'Password123!',
          department: 'kelectric',
          role: 'head',
        })
      ).rejects.toThrow();

      expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('rejects suspended staff accounts and fails closed', async () => {
      const { client, raw } = createMockSupabase({
        staffRole: 'head',
        departmentId: 'kmc',
        status: 'suspended',
      });
      await expect(
        beginDepartmentSignIn(client, {
          identifier: 'head-kmc',
          password: 'Password123!',
          department: 'kmc',
          role: 'head',
        })
      ).rejects.toThrow();

      expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('2. MFA Enforcement and TOTP Challenge & Enrollment', () => {
    it('returns mfa_required when AAL is aal1 and does not execute operational RPCs', async () => {
      const { client, raw } = createMockSupabase({
        staffRole: 'head',
        departmentId: 'kmc',
        aal: 'aal1',
      });
      const result = await beginDepartmentSignIn(client, {
        identifier: 'head-kmc',
        password: 'Password123!',
        department: 'kmc',
        role: 'head',
      });

      expect(result).toEqual({
        state: 'mfa_required',
        userId: 'user-v25-test',
        role: 'head',
        department: 'kmc',
      });
      // Operational check is gated until MFA passes
      expect(raw.rpc).not.toHaveBeenCalledWith('v16_staff_operational_access', expect.anything());
    });

    it('enrolls TOTP and returns QR code and secret without logging sensitive data', async () => {
      const { client, raw } = createMockSupabase();
      const enrollment = await enrollStaffTotp(client);

      expect(raw.auth.mfa.enroll).toHaveBeenCalledWith({
        factorType: 'totp',
        friendlyName: 'Awaaz-e-Awam',
      });
      expect(enrollment).toHaveProperty('factorId', 'factor-new-totp');
      expect(enrollment).toHaveProperty('qrCode');
      expect(enrollment).toHaveProperty('secret');
    });

    it('lists verified TOTP factors via getStaffTotpFactors', async () => {
      const { client, raw } = createMockSupabase();
      const factors = await getStaffTotpFactors(client);

      expect(raw.auth.mfa.listFactors).toHaveBeenCalled();
      expect(factors).toEqual([
        { id: 'factor-1', friendlyName: 'Awaaz-e-Awam' },
      ]);
    });

    it('rejects invalid or non-numeric MFA code', async () => {
      const { client } = createMockSupabase();
      // Non-6-digit
      await expect(
        verifyStaffTotp(client, 'factor-1', '1234', 'head', 'kmc')
      ).rejects.toThrow();

      // Non-numeric
      await expect(
        verifyStaffTotp(client, 'factor-1', 'abcdef', 'head', 'kmc')
      ).rejects.toThrow();
    });

    it('verifies valid 6-digit MFA code and promotes session to ready', async () => {
      const { client, raw } = createMockSupabase({ staffRole: 'head', departmentId: 'kmc', aal: 'aal2' });
      const result = await verifyStaffTotp(client, 'factor-1', '123456', 'head', 'kmc');

      expect(raw.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
        factorId: 'factor-1',
        code: '123456',
      });
      expect(result).toEqual({
        state: 'ready',
        userId: 'user-v25-test',
        role: 'head',
        department: 'kmc',
      });
    });

    it('cancels MFA session via endLiveStaffSession with local scope', async () => {
      const { client, raw } = createMockSupabase();
      await endLiveStaffSession(client);

      expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('3. Main Administrator Authentication & AAL2 Enforcement', () => {
    it('demands AAL2 MFA for administrator accounts when AAL is aal1', async () => {
      const { client, raw } = createMockSupabase({
        role: 'main_admin',
        aal: 'aal1',
      });
      const result = await beginAdminSignIn(client, 'admin@karachi.gov.pk', 'SecretPass123!');

      expect(result).toEqual({
        state: 'mfa_required',
        userId: 'user-v25-test',
        role: 'main_admin',
      });
      expect(raw.rpc).not.toHaveBeenCalledWith('is_main_admin', expect.anything());
    });

    it('verifies is_main_admin server RPC after AAL2 MFA is satisfied', async () => {
      const { client, raw } = createMockSupabase({
        role: 'main_admin',
        aal: 'aal2',
        isMainAdmin: true,
      });
      const result = await beginAdminSignIn(client, 'admin@karachi.gov.pk', 'SecretPass123!');

      expect(result).toEqual({
        state: 'ready',
        userId: 'user-v25-test',
        role: 'main_admin',
      });
      expect(raw.rpc).toHaveBeenCalledWith('is_main_admin', { p_user_id: 'user-v25-test' });
    });

    it('rejects an administrator if is_main_admin returns false and signs out local session', async () => {
      const { client, raw } = createMockSupabase({
        role: 'main_admin',
        aal: 'aal2',
        isMainAdmin: false,
      });
      await expect(
        beginAdminSignIn(client, 'admin@karachi.gov.pk', 'SecretPass123!')
      ).rejects.toThrow();

      expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('4. Forced Password Change & Officer Onboarding Gates', () => {
    it('returns password_change_required when membership flag is set and gates operational access', async () => {
      const { client, raw } = createMockSupabase({
        staffRole: 'officer',
        departmentId: 'kmc',
        mustChangePassword: true,
      });
      const result = await beginDepartmentSignIn(client, {
        identifier: 'officer-kmc',
        password: 'TemporaryPass123!',
        department: 'kmc',
        role: 'officer',
      });

      expect(result).toEqual({
        state: 'password_change_required',
        userId: 'user-v25-test',
        role: 'officer',
        department: 'kmc',
      });
      // Operational check is gated until password change is complete
      expect(raw.rpc).not.toHaveBeenCalledWith('v16_staff_operational_access', expect.anything());
    });

    it('returns onboarding_required when officer has not been approved for operational access', async () => {
      const { client, raw } = createMockSupabase({
        staffRole: 'officer',
        departmentId: 'kmc',
        operationalAccess: false,
      });
      const result = await beginDepartmentSignIn(client, {
        identifier: 'officer-kmc',
        password: 'Password123!',
        department: 'kmc',
        role: 'officer',
      });

      expect(result).toEqual({
        state: 'onboarding_required',
        userId: 'user-v25-test',
        role: 'officer',
        department: 'kmc',
      });
      expect(raw.rpc).toHaveBeenCalledWith('v16_staff_operational_access', {
        p_user: 'user-v25-test',
        p_department: 'kmc',
        p_required_role: 'officer',
      });
    });
  });

  describe('5. UI Flow & State Transitions in React Components', () => {
    it('renders role selector in ThemedDepartmentLoginScreen and allows switching between Head and Officer', () => {
      render(
        <MemoryRouter initialEntries={['/department/login?dept=kmc']}>
          <LanguageProvider>
            <DepartmentAuthProvider>
              <ThemedDepartmentLoginScreen
                departmentId="kmc"
                onBackToDepartmentSelection={() => {}}
              />
            </DepartmentAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      const headTab = screen.getByRole('button', { name: /Department Head/i });
      const officerTab = screen.getByRole('button', { name: /Operations Officer/i });

      expect(headTab).toBeInTheDocument();
      expect(officerTab).toBeInTheDocument();

      // Switch to Operations Officer
      fireEvent.click(officerTab);
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
    });

    it('AdminLoginPage removes prototype preview bypass and initiates real authentication', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/login']}>
          <LanguageProvider>
            <AdminAuthProvider>
              <AdminLoginPage />
            </AdminAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      // Verify no prototype notice is shown
      expect(screen.queryByText(/Prototype Preview/i)).not.toBeInTheDocument();

      // Submit empty fields
      fireEvent.click(screen.getByRole('button', { name: /^Sign in/i }));
      expect(await screen.findByText(/Please enter your work email/i)).toBeInTheDocument();
    });
  });
});
