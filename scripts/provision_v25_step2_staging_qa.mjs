// Staging-only Auth Admin fixture provisioning. No production URL or browser credentials accepted.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const STAGING = 'https://jvbulmmdwovtgaxojxhn.supabase.co';
const marker = 'awaaz-v25-step2-qa';
const specs = [
  { name: 'citizen-a', role: 'citizen' },
  { name: 'citizen-b', role: 'citizen' },
  { name: 'admin', role: 'main_admin' },
  { name: 'kmc-head', role: 'department_staff', department: 'kmc', staffRole: 'head' },
  { name: 'kwsc-head', role: 'department_staff', department: 'kwsc', staffRole: 'head' },
  { name: 'kmc-officer', role: 'department_staff', department: 'kmc', staffRole: 'officer' },
  { name: 'kwsc-officer', role: 'department_staff', department: 'kwsc', staffRole: 'officer' },
  { name: 'kmc-suspended', role: 'department_staff', department: 'kmc', staffRole: 'officer', status: 'suspended' },
  { name: 'kmc-password', role: 'department_staff', department: 'kmc', staffRole: 'officer', passwordChange: true },
  { name: 'kmc-onboarding', role: 'department_staff', department: 'kmc', staffRole: 'officer', onboarding: true },
];
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const checked = (result, label) => {
  if (result.error) fail(label + ' failed; inspect staging dashboard securely.');
  return result.data;
};
const args = process.argv.slice(2);
if (!args.length || args[0] === '--dry-run') {
  console.log(JSON.stringify({ staging: STAGING, plannedAccounts: specs.map(s => ({ name: s.name, role: s.role, department: s.department ?? null })), writes: 0 }, null, 2));
  process.exit(0);
}
assert(process.env.SUPABASE_STAGING_URL === STAGING, 'Refusing any URL other than the designated staging project.');
const key = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;
assert(typeof key === 'string' && key.length > 30, 'Set a server-only staging service-role/secret key in the local environment.');
const supabase = createClient(STAGING, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
assert(['--apply', '--cleanup'].includes(args[0]), 'Use --dry-run, --apply or --cleanup <manifest>.');
const folder = resolve('.credentials');
await mkdir(folder, { recursive: true, mode: 0o700 });
async function removeFixtures(manifest) {
  assert(manifest?.marker === marker && manifest?.staging === STAGING && /^[a-f0-9]{12}$/.test(manifest.runId), 'Invalid fixture manifest.');
  const accounts = manifest.accounts.filter(a => a.id);
  for (const a of accounts) {
    assert(specs.some(s => s.name === a.name) && a.email === 'qa-v25-' + manifest.runId + '-' + a.name + '@example.com', 'Unrecognized fixture identity.');
    const { user } = checked(await supabase.auth.admin.getUserById(a.id), 'Fixture identity verification');
    assert(user?.email === a.email && user.app_metadata?.qa_fixture === marker && user.app_metadata?.qa_run === manifest.runId, 'Refusing to delete an unverified fixture.');
  }
  const ids = accounts.map(a => a.id);
  if (!ids.length) return;
  // Refuse cleanup after operational QA has started; deleting complaint owners could cascade into data loss.
  const { count: complaints, error: complaintError } = await supabase.from('complaints').select('id', { count: 'exact', head: true }).in('citizen_id', ids);
  assert(!complaintError && complaints === 0, 'Cleanup blocked: fixture-owned complaints exist or count unavailable.');
  const { count: orders, error: orderError } = await supabase.from('department_work_orders').select('id', { count: 'exact', head: true }).in('officer_id', ids);
  assert(!orderError && orders === 0, 'Cleanup blocked: fixture work orders exist or count unavailable.');
  // Remove fixture memberships only, before deleting their approving QA admin.
  checked(await supabase.from('department_memberships').delete().in('user_id', ids), 'Fixture membership cleanup');
  for (const a of accounts.slice().sort((x,y)=>Number(x.role==='main_admin')-Number(y.role==='main_admin'))) {
    checked(await supabase.auth.admin.deleteUser(a.id), 'Fixture user cleanup');
  }
}
if (args[0] === '--cleanup') {
  assert(args.length === 2 && resolve(args[1]).startsWith(folder + (process.platform === 'win32' ? '\\' : '/')), 'Cleanup requires a manifest under .credentials.');
  const manifest = JSON.parse(await readFile(resolve(args[1]), 'utf8'));
  await removeFixtures(manifest);
  console.log('Verified QA fixtures deleted. Remove the local credential manifest securely.');
  process.exit(0);
}
assert(args.length === 1, 'Unexpected arguments.');
const runId = randomBytes(6).toString('hex');
const output = resolve(folder, 'v25-step2-' + runId + '.json');
const manifest = { marker, staging: STAGING, runId, accounts: [] };
await writeFile(output, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
const save = async () => writeFile(output, JSON.stringify(manifest, null, 2), { mode: 0o600 });
try {
  const depts = checked(await supabase.from('departments').select('id,is_active').in('id', ['kmc','kwsc']), 'Staging department preflight');
  assert(depts.length === 2 && depts.every(d => d.is_active), 'QA departments must exist and be active.');
  for (const s of specs) {
    const email = 'qa-v25-' + runId + '-' + s.name + '@example.com';
    const password = randomBytes(32).toString('base64url') + '!7aA';
    const record = { name: s.name, email, password, role: s.role, department: s.department ?? null, staffRole: s.staffRole ?? null, id: null };
    manifest.accounts.push(record);
    await save(); // preserve recoverable local credential material before the remote create
    const { user } = checked(await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: 'QA ' + s.name },
      app_metadata: { qa_fixture: marker, qa_run: runId },
    }), 'Auth Admin account creation');
    assert(user?.id && user.email === email, 'Unexpected created account identity.');
    record.id = user.id;
    await save();
    const profile = checked(await supabase.from('profiles').update({ role: s.role }).eq('id', user.id).select('id,role').single(), 'QA profile assignment');
    assert(profile.id === user.id && profile.role === s.role, 'QA role assignment not confirmed.');
    if (s.department) {
      const admin = manifest.accounts.find(a => a.role === 'main_admin');
      assert(admin?.id, 'QA administrator must be created first.');
      record.username = 'qa-' + runId + '-' + s.name;
      record.employeeId = 'QA-' + runId.toUpperCase() + '-' + s.name.toUpperCase();
      await save();
      const membership = checked(await supabase.from('department_memberships').insert({
        user_id: user.id, department_id: s.department, approved_by: admin.id,
        staff_role: s.staffRole, status: s.status ?? 'active',
        staff_username: record.username, employee_id: record.employeeId,
        must_change_password: s.passwordChange ?? false,
        requires_officer_onboarding: s.onboarding ?? false,
        ...(s.status === 'suspended' ? { suspended_by: admin.id, suspended_at: new Date().toISOString(), suspension_reason: 'Disposable QA fixture' } : {}),
      }).select('id,user_id,department_id,staff_role,status').single(), 'QA membership creation');
      assert(membership.user_id === user.id && membership.department_id === s.department && membership.staff_role === s.staffRole && membership.status === (s.status ?? 'active'), 'QA membership mismatch.');
    }
  }
  console.log(JSON.stringify({ status: 'PROVISIONED', runId, accounts: manifest.accounts.length, credentialFile: output, warning: 'Keep manifest private; never print, upload, or commit it. Real MFA and login still require browser testing.' }));
} catch (e) {
  // Do not log raw API errors or credential data. Manifest permits deliberate recovery/cleanup.
  console.error('Provisioning stopped. No existing accounts were modified. Preserve the private manifest for recovery: ' + output);
  console.error(e instanceof Error && e.message.endsWith('failed; inspect staging dashboard securely.') ? e.message : 'Review the staging dashboard and fixture manifest privately.');
  process.exitCode = 1;
}
