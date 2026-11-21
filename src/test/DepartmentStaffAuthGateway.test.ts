import { beforeEach, describe, expect, it, vi } from 'vitest';

const gateway = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  memberships: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      signInWithPassword: gateway.signIn,
      signOut: gateway.signOut,
    },
    from: (table: string) => ({
      select: () => ({
        eq: table === 'department_memberships'
          ? gateway.memberships
          : () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
}));

import { staffAuthService } from '../services/staffAuthService';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';

describe('Department staff live-auth gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    gateway.signOut.mockResolvedValue({ error: null });
  });

  it('keeps invalid credentials generic to prevent account enumeration', async () => {
    gateway.signIn.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
    });

    const result = await staffAuthService.signInDepartmentStaffWithUsername(
      'roads-01', 'incorrect-key', 'kmc'
    );

    expect(result).toMatchObject({
      success: false,
      status: 'invalid_password',
      error: 'Invalid username or access key.',
    });
    expect(gateway.signIn).toHaveBeenCalledTimes(1);
  });

  it('reports Supabase network failures as unavailable, not wrong credentials', async () => {
    gateway.signIn.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' },
    });

    const result = await staffAuthService.signInDepartmentStaffWithUsername(
      'roads-01', 'unimportant', 'kmc'
    );

    expect(result.status).toBe('unavailable');
    expect(result.error).toContain('Authentication service is unavailable');
  });

  it('does not permit live Supabase sign-in to fall back to browser demo identities', async () => {
    const localAuth = vi.spyOn(localSupabaseAdapter, 'authenticateStaffWithUsername');

    const result = await staffAuthService.signInDepartmentStaffWithUsername(
      'unrecognized-staff', 'unimportant', 'kmc'
    );

    expect(result.status).toBe('invalid_password');
    expect(localAuth).not.toHaveBeenCalled();
    expect(gateway.signIn).not.toHaveBeenCalled();
  });

  it('requires an active membership after successful password authentication', async () => {
    gateway.signIn.mockResolvedValue({
      data: { user: { id: 'staff-user', email: 'staff@example.org', user_metadata: {} } },
      error: null,
    });
    gateway.memberships.mockResolvedValue({ data: [], error: null });

    const result = await staffAuthService.signInDepartmentStaffWithUsername(
      'roads-01', 'valid-but-not-approved', 'kmc'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active department membership');
    expect(gateway.signOut).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('awaaz_staff_session_v2')).toBeNull();
  });
});
