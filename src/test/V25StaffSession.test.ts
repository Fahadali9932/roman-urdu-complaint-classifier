import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beginDepartmentSignIn, beginAdminSignIn, parseCredentialExchange, verifyStaffSession, verifyStaffTotp, endLiveStaffSession } from '../services/v25StaffSession';

function mockClient(options: { role?: string; staffRole?: string; status?: string; aal?: string; passwordChange?: boolean; operational?: boolean; exchangeError?: boolean; tokenError?: boolean; invalidMfa?: boolean } = {}) {
  const user = { id: 'qa-user' };
  const profile = { role: options.role ?? 'department_staff' };
  const membership = { staff_role: options.staffRole ?? 'officer', status: options.status ?? 'active', must_change_password: options.passwordChange ?? false, department_id: 'kmc' };
  const chain = (value: unknown) => {
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: value, error: null })) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); return query;
  };
  const raw = {
    functions: { invoke: vi.fn(async () => ({ data: { access_token: 'qa-access', refresh_token: 'qa-refresh' }, error: options.exchangeError ? new Error('denied') : null })) },
    auth: {
      setSession: vi.fn(async () => ({ data: { user, session: {} }, error: options.tokenError ? new Error('bad token') : null })),
      signInWithPassword: vi.fn(async () => ({ data: { user, session: {} }, error: null })),
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(async () => ({ data: { currentLevel: options.aal ?? 'aal2' }, error: null })),
        challengeAndVerify: vi.fn(async () => ({ error: options.invalidMfa ? new Error('bad code') : null })),
      },
    },
    from: vi.fn((table: string) => chain(table === 'profiles' ? profile : membership)),
    rpc: vi.fn(async () => ({ data: options.operational ?? true, error: null })),
  };
  return { raw, client: raw as unknown as SupabaseClient };
}
const input = { identifier: ' Officer-01 ', password: 'qa-password', department: 'kmc', role: 'officer' as const };
describe('V25 staff session integration', () => {
  it('rejects malformed token responses', () => {
    for (const value of [null, {}, { access_token: 'a' }, { access_token: '', refresh_token: 'r' }, { access_token: 'a', refresh_token: 7 }]) {
      expect(() => parseCredentialExchange(value)).toThrow();
    }
  });
  it('exchanges normalized identifiers and never calls direct email lookup', async () => {
    const { client, raw } = mockClient();
    expect(await beginDepartmentSignIn(client, input)).toMatchObject({ state: 'ready', department: 'kmc', role: 'officer' });
    expect(raw.functions.invoke).toHaveBeenCalledWith('staff-credential-exchange', { body: { identifier: 'officer-01', password: 'qa-password', department: 'kmc' } });
    expect(raw.auth.setSession).toHaveBeenCalledWith({ access_token: 'qa-access', refresh_token: 'qa-refresh' });
    expect(raw.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(raw.rpc).not.toHaveBeenCalledWith('v16_resolve_staff_login_email', expect.anything());
  });
  it('does not grant workspace access before MFA', async () => {
    const { client, raw } = mockClient({ aal: 'aal1' });
    expect(await beginDepartmentSignIn(client, input)).toMatchObject({ state: 'mfa_required' });
    expect(raw.rpc).not.toHaveBeenCalled();
  });
  it('rejects a different staff role and clears the session', async () => {
    const { client, raw } = mockClient({ staffRole: 'head' });
    await expect(beginDepartmentSignIn(client, input)).rejects.toThrow();
    expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('rejects suspended memberships', async () => {
    const { client, raw } = mockClient({ status: 'suspended' });
    await expect(beginDepartmentSignIn(client, input)).rejects.toThrow();
    expect(raw.auth.signOut).toHaveBeenCalled();
  });
  it('requires a password change before workspace entry', async () => {
    const { client, raw } = mockClient({ passwordChange: true });
    expect(await beginDepartmentSignIn(client, input)).toMatchObject({ state: 'password_change_required' });
    expect(raw.rpc).not.toHaveBeenCalled();
  });
  it('does not grant workspace access until officer onboarding is approved', async () => {
    const { client } = mockClient({ operational: false });
    expect(await beginDepartmentSignIn(client, input)).toMatchObject({ state: 'onboarding_required' });
  });
  it('rejects a failed exchange without attempting to set tokens', async () => {
    const { client, raw } = mockClient({ exchangeError: true });
    await expect(beginDepartmentSignIn(client, input)).rejects.toThrow();
    expect(raw.auth.setSession).not.toHaveBeenCalled();
    expect(raw.auth.signOut).toHaveBeenCalled();
  });
  it('rejects a failed token establishment', async () => {
    const { client, raw } = mockClient({ tokenError: true });
    await expect(beginDepartmentSignIn(client, input)).rejects.toThrow();
    expect(raw.auth.signOut).toHaveBeenCalled();
  });
  it('requires MFA for administrators as well', async () => {
    const { client, raw } = mockClient({ role: 'main_admin', aal: 'aal1' });
    expect(await beginAdminSignIn(client, 'qa@example.invalid', 'qa-password')).toMatchObject({ state: 'mfa_required' });
    expect(raw.rpc).not.toHaveBeenCalled();
  });
  it('requires server confirmation for an MFA-verified administrator', async () => {
    const { client, raw } = mockClient({ role: 'main_admin' });
    expect(await beginAdminSignIn(client, 'qa@example.invalid', 'qa-password')).toMatchObject({ state: 'ready' });
    expect(raw.rpc).toHaveBeenCalledWith('is_main_admin', { p_user_id: 'qa-user' });
  });
  it('rejects an invalid MFA code without granting access', async () => {
    const { client } = mockClient({ invalidMfa: true });
    await expect(verifyStaffTotp(client, 'qa-factor', '123456', 'officer', 'kmc')).rejects.toThrow();
  });
  it('rechecks authorization after successful MFA', async () => {
    const { client } = mockClient();
    expect(await verifyStaffTotp(client, 'qa-factor', '123456', 'officer', 'kmc')).toMatchObject({ state: 'ready' });
  });
  it('rejects a citizen from staff session verification', async () => {
    const { client } = mockClient({ role: 'citizen' });
    await expect(verifyStaffSession(client, 'officer', 'kmc')).rejects.toThrow();
  });
  it('signs out the actual Supabase session', async () => {
    const { client, raw } = mockClient();
    await endLiveStaffSession(client);
    expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
