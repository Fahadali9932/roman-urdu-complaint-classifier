// Staging verification script for V25 Step 2A QA.
// Validates live authentication, MFA, and boundary security against https://jvbulmmdwovtgaxojxhn.supabase.co
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  beginDepartmentSignIn,
  beginAdminSignIn,
  enrollStaffTotp,
  verifyStaffTotp,
  verifyStaffSession,
  getStaffTotpFactors
} from '../src/services/v25StaffSession.ts';

const STAGING = 'https://jvbulmmdwovtgaxojxhn.supabase.co';

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i).toUpperCase();
    if (c === '=') break;
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, step = 30) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(time));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

// Locate manifest
const credDir = path.resolve('.credentials');
const files = fs.readdirSync(credDir).filter(f => f.startsWith('v25-step2-') && f.endsWith('.json'));
if (!files.length) {
  console.error('No v25-step2 manifest found in .credentials/');
  process.exit(1);
}
files.sort().reverse();
const manifestPath = path.join(credDir, files[0]);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`Loaded QA manifest: ${files[0]} (runId: ${manifest.runId})`);

const envContent = fs.readFileSync('.env.local', 'utf8');
const anonKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
if (!anonKeyMatch) {
  console.error('Could not find VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
const anonKey = anonKeyMatch[1].trim();

const stagingAdminPath = path.join(credDir, 'staging_admin.env');
let serviceRoleKey = null;
if (fs.existsSync(stagingAdminPath)) {
  const adminContent = fs.readFileSync(stagingAdminPath, 'utf8');
  const serviceKeyMatch = adminContent.match(/SUPABASE_STAGING_SERVICE_ROLE_KEY=(.*)/);
  if (serviceKeyMatch) {
    serviceRoleKey = serviceKeyMatch[1].trim();
  }
}

function makeClient() {
  return createClient(STAGING, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

function makeAdminClient() {
  if (!serviceRoleKey) return null;
  return createClient(STAGING, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

async function runTests() {
  // Pre-test: Clean up any existing MFA factors for test fixtures to ensure fresh enrollment & verification
  const adminClient = makeAdminClient();
  if (adminClient) {
    for (const acc of manifest.accounts) {
      if (acc.id) {
        try {
          const { data } = await adminClient.auth.admin.mfa.listFactors({ userId: acc.id });
          if (data?.factors?.length) {
            for (const f of data.factors) {
              await adminClient.auth.admin.mfa.deleteFactor({ id: f.id, userId: acc.id });
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  const results = [];
  const logTest = (name, passed, details = '') => {
    results.push({ name, passed, details });
    const mark = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${mark}: ${name} ${details ? '(' + details + ')' : ''}`);
  };

  const getAccount = (name) => {
    const acc = manifest.accounts.find(a => a.name === name);
    if (!acc) throw new Error(`Account ${name} not found in manifest`);
    return acc;
  };

  // Helper for fresh MFA enrollment and elevation
  async function completeMfa(client, role, department) {
    const enrollment = await enrollStaffTotp(client);
    const code = generateTOTP(enrollment.secret);
    return await verifyStaffTotp(client, enrollment.factorId, code, role, department);
  }

  // 1. Citizen A Login
  try {
    const cA = getAccount('citizen-a');
    const client = makeClient();
    const { data, error } = await client.auth.signInWithPassword({ email: cA.email, password: cA.password });
    if (error || !data.user) throw error || new Error('No user returned');
    const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).single();
    logTest('Citizen A Authentication', profile?.role === 'citizen', `User ID: ${data.user.id.slice(0, 8)}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('Citizen A Authentication', false, err.message);
  }

  // 2. Citizen B Login & Isolation
  try {
    const cB = getAccount('citizen-b');
    const client = makeClient();
    const { data, error } = await client.auth.signInWithPassword({ email: cB.email, password: cB.password });
    if (error || !data.user) throw error || new Error('No user returned');
    const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).single();
    // Verify citizen cannot read private department records
    const { data: memberships } = await client.from('department_memberships').select('id');
    const isolated = profile?.role === 'citizen' && (!memberships || memberships.length === 0);
    logTest('Citizen B Authentication & Isolation', isolated, `Memberships visible: ${memberships?.length ?? 0}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('Citizen B Authentication & Isolation', false, err.message);
  }

  // 3. Main Admin Authentication & MFA
  try {
    const admin = getAccount('admin');
    const client = makeClient();
    const state1 = await beginAdminSignIn(client, admin.email, admin.password);
    const mfaRequired = state1.state === 'mfa_required' && state1.role === 'main_admin';
    const state2 = await completeMfa(client, 'main_admin');
    const ready = state2.state === 'ready' && state2.role === 'main_admin';
    const { data: isMainAdmin } = await client.rpc('is_main_admin', { p_user_id: admin.id });
    logTest('Main Admin Authentication & AAL2 MFA', mfaRequired && ready && isMainAdmin === true, `AAL2 ready, is_main_admin: ${isMainAdmin}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('Main Admin Authentication & AAL2 MFA', false, err.message);
  }

  // 4. KMC Head Authentication & MFA
  try {
    const kmcHead = getAccount('kmc-head');
    const client = makeClient();
    const state1 = await beginDepartmentSignIn(client, {
      identifier: kmcHead.username,
      password: kmcHead.password,
      department: 'kmc',
      role: 'head'
    });
    const mfaRequired = state1.state === 'mfa_required' && state1.role === 'head' && state1.department === 'kmc';
    const state2 = await completeMfa(client, 'head', 'kmc');
    const headReady = state2.state === 'ready' && state2.role === 'head' && state2.department === 'kmc';
    logTest('KMC Department Head Authentication & MFA', mfaRequired && headReady, `Role: ${state2.role}, Dept: ${state2.department}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('KMC Department Head Authentication & MFA', false, err.message);
  }

  // 5. KWSC Head Authentication & MFA
  try {
    const kwscHead = getAccount('kwsc-head');
    const client = makeClient();
    const state1 = await beginDepartmentSignIn(client, {
      identifier: kwscHead.username,
      password: kwscHead.password,
      department: 'kwsc',
      role: 'head'
    });
    const mfaRequired = state1.state === 'mfa_required' && state1.role === 'head' && state1.department === 'kwsc';
    const state2 = await completeMfa(client, 'head', 'kwsc');
    const headReady = state2.state === 'ready' && state2.role === 'head' && state2.department === 'kwsc';
    logTest('KWSC Department Head Authentication & MFA', mfaRequired && headReady, `Role: ${state2.role}, Dept: ${state2.department}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('KWSC Department Head Authentication & MFA', false, err.message);
  }

  // 6. KMC Officer Authentication & MFA
  try {
    const kmcOff = getAccount('kmc-officer');
    const client = makeClient();
    const state1 = await beginDepartmentSignIn(client, {
      identifier: kmcOff.username,
      password: kmcOff.password,
      department: 'kmc',
      role: 'officer'
    });
    const mfaRequired = state1.state === 'mfa_required' && state1.role === 'officer' && state1.department === 'kmc';
    const state2 = await completeMfa(client, 'officer', 'kmc');
    const officerSuccess = (state2.state === 'ready' || state2.state === 'onboarding_required') && state2.role === 'officer';
    logTest('KMC Officer Authentication & MFA', mfaRequired && officerSuccess, `State: ${state2.state}, Dept: ${state2.department}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('KMC Officer Authentication & MFA', false, err.message);
  }

  // 7. KWSC Officer Authentication & MFA
  try {
    const kwscOff = getAccount('kwsc-officer');
    const client = makeClient();
    const state1 = await beginDepartmentSignIn(client, {
      identifier: kwscOff.username,
      password: kwscOff.password,
      department: 'kwsc',
      role: 'officer'
    });
    const mfaRequired = state1.state === 'mfa_required' && state1.role === 'officer' && state1.department === 'kwsc';
    const state2 = await completeMfa(client, 'officer', 'kwsc');
    const officerSuccess = (state2.state === 'ready' || state2.state === 'onboarding_required') && state2.role === 'officer';
    logTest('KWSC Officer Authentication & MFA', mfaRequired && officerSuccess, `State: ${state2.state}, Dept: ${state2.department}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('KWSC Officer Authentication & MFA', false, err.message);
  }

  // 8. Boundary Test: Wrong Department Access Denied
  try {
    const kwscOff = getAccount('kwsc-officer');
    const client = makeClient();
    let caught = false;
    try {
      await beginDepartmentSignIn(client, {
        identifier: kwscOff.username,
        password: kwscOff.password,
        department: 'kmc', // deliberate mismatch
        role: 'officer'
      });
    } catch {
      caught = true;
    }
    logTest('Boundary: Cross-Department Login Denied (KWSC staff on KMC)', caught, 'Access rejected at server boundary');
  } catch (err) {
    logTest('Boundary: Cross-Department Login Denied', false, err.message);
  }

  // 9. Boundary Test: Suspended Staff Login Denied
  try {
    const kmcSuspended = getAccount('kmc-suspended');
    const client = makeClient();
    let caught = false;
    try {
      await beginDepartmentSignIn(client, {
        identifier: kmcSuspended.username,
        password: kmcSuspended.password,
        department: 'kmc',
        role: 'officer'
      });
    } catch {
      caught = true;
    }
    logTest('Boundary: Suspended Staff Login Denied', caught, 'Suspended membership refused login token');
  } catch (err) {
    logTest('Boundary: Suspended Staff Login Denied', false, err.message);
  }

  // 10. Boundary Test: Forced Password Change Requirement
  try {
    const kmcPass = getAccount('kmc-password');
    const client = makeClient();
    const state1 = await beginDepartmentSignIn(client, {
      identifier: kmcPass.username,
      password: kmcPass.password,
      department: 'kmc',
      role: 'officer'
    });
    const mfaRequired = state1.state === 'mfa_required';
    const state2 = await completeMfa(client, 'officer', 'kmc');
    const forcedPassword = state2.state === 'password_change_required';
    logTest('Boundary: Forced Password Change State Enforced', mfaRequired && forcedPassword, `Resulting state: ${state2.state}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('Boundary: Forced Password Change State Enforced', false, err.message);
  }

  // 11. Boundary Test: Onboarding Restriction
  try {
    const kmcOnboard = getAccount('kmc-onboarding');
    const client = makeClient();
    const state1 = await beginDepartmentSignIn(client, {
      identifier: kmcOnboard.username,
      password: kmcOnboard.password,
      department: 'kmc',
      role: 'officer'
    });
    const mfaRequired = state1.state === 'mfa_required';
    const state2 = await completeMfa(client, 'officer', 'kmc');
    const onboardingEnforced = state2.state === 'onboarding_required';
    logTest('Boundary: Officer Onboarding Restriction Enforced', mfaRequired && onboardingEnforced, `Resulting state: ${state2.state}`);
    await client.auth.signOut();
  } catch (err) {
    logTest('Boundary: Officer Onboarding Restriction Enforced', false, err.message);
  }

  const allPassed = results.every(r => r.passed);
  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log('========================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
