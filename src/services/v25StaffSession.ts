import type { SupabaseClient } from '@supabase/supabase-js';

export type LiveStaffRole = 'main_admin' | 'head' | 'officer';
export type StaffLoginState =
  | { state: 'mfa_required'; userId: string; role: LiveStaffRole; department?: string }
  | { state: 'password_change_required'; userId: string; role: 'head' | 'officer'; department: string }
  | { state: 'onboarding_required'; userId: string; role: 'head' | 'officer'; department: string }
  | { state: 'ready'; userId: string; role: LiveStaffRole; department?: string };
const DEPARTMENTS = new Set(['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca']);
const denied = () => new Error('Authentication or access verification failed.');

export function parseCredentialExchange(value: unknown): { access_token: string; refresh_token: string } {
  if (typeof value !== 'object' || value === null) throw denied();
  const row = value as Record<string, unknown>;
  if (typeof row.access_token !== 'string' || !row.access_token.trim()
    || typeof row.refresh_token !== 'string' || !row.refresh_token.trim()) throw denied();
  return { access_token: row.access_token, refresh_token: row.refresh_token };
}

async function clearLocalSession(client: SupabaseClient): Promise<void> {
  try { await client.auth.signOut({ scope: 'local' }); } catch { /* never grant access on failure */ }
}

/** Recheck the server-side identity after password auth, MFA, refresh, or onboarding. */
export async function verifyStaffSession(
  client: SupabaseClient,
  role: LiveStaffRole,
  department?: string,
): Promise<StaffLoginState> {
  if (role !== 'main_admin' && (!department || !DEPARTMENTS.has(department))) throw denied();
  if (role === 'main_admin' && department) throw denied();
  const { data: identity, error: identityError } = await client.auth.getUser();
  const userId = identity.user?.id;
  if (identityError || !userId) throw denied();
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('role').eq('id', userId).maybeSingle();
  if (profileError || profile?.role !== (role === 'main_admin' ? 'main_admin' : 'department_staff')) throw denied();
  let membership: { must_change_password: boolean } | undefined;
  if (role !== 'main_admin') {
    const { data, error } = await client.from('department_memberships')
      .select('staff_role,status,must_change_password,department_id')
      .eq('user_id', userId).eq('department_id', department!).maybeSingle();
    if (error || !data || data.staff_role !== role || data.status !== 'active') throw denied();
    membership = data;
  }
  const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || !assurance) throw denied();
  if (assurance.currentLevel !== 'aal2') return { state: 'mfa_required', userId, role, department };
  if (role === 'main_admin') {
    const { data, error } = await client.rpc('is_main_admin', { p_user_id: userId });
    if (error || data !== true) throw denied();
    return { state: 'ready', userId, role };
  }
  if (membership?.must_change_password) return { state: 'password_change_required', userId, role, department: department! };
  const { data: operational, error: operationalError } = await client.rpc('v16_staff_operational_access', {
    p_user: userId, p_department: department, p_required_role: role,
  });
  if (operationalError) throw denied();
  if (operational !== true) {
    if (role === 'officer') return { state: 'onboarding_required', userId, role, department: department! };
    throw denied();
  }
  return { state: 'ready', userId, role, department };
}

/** Never resolve a username to email in the browser; no offline fallback. */
export async function beginDepartmentSignIn(
  client: SupabaseClient,
  input: { identifier: string; password: string; department: string; role: 'head' | 'officer' },
): Promise<StaffLoginState> {
  const identifier = input.identifier.trim().toLowerCase();
  if (!identifier || identifier.length > 120 || !input.password || input.password.length > 512
    || !DEPARTMENTS.has(input.department)) throw denied();
  try {
    const { data, error } = await client.functions.invoke('staff-credential-exchange', {
      body: { identifier, password: input.password, department: input.department },
    });
    if (error) throw denied();
    const tokens = parseCredentialExchange(data);
    const session = await client.auth.setSession(tokens);
    if (session.error || !session.data.user || !session.data.session) throw denied();
    return await verifyStaffSession(client, input.role, input.department);
  } catch {
    await clearLocalSession(client);
    throw denied();
  }
}

export async function beginAdminSignIn(
  client: SupabaseClient, email: string, password: string,
): Promise<StaffLoginState> {
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user || !data.session) throw denied();
    return await verifyStaffSession(client, 'main_admin');
  } catch {
    await clearLocalSession(client);
    throw denied();
  }
}

/** Call from an explicit MFA screen. Do not log the returned QR or secret. */
export async function enrollStaffTotp(client: SupabaseClient) {
  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Awaaz-e-Awam' });
  if (error || !data) throw denied();
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function getStaffTotpFactors(client: SupabaseClient) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error || !data) throw denied();
  return data.totp.filter(factor => factor.status === 'verified').map(factor => ({ id: factor.id, friendlyName: factor.friendly_name }));
}

export async function verifyStaffTotp(
  client: SupabaseClient, factorId: string, code: string, role: LiveStaffRole, department?: string,
): Promise<StaffLoginState> {
  if (!/^\d{6}$/.test(code.trim())) throw denied();
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  if (error) throw denied();
  try {
    const result = await verifyStaffSession(client, role, department);
    if (result.state === 'mfa_required') throw denied();
    return result;
  } catch {
    await clearLocalSession(client);
    throw denied();
  }
}

export async function endLiveStaffSession(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw denied();
}
