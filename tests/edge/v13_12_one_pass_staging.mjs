/**
 * One-command V13.12 staging-only real-Auth verification.
 * Provisions five disposable confirmed Auth users via the official Auth Admin
 * API, creates two fictional complaints via the hosted intake Edge Function,
 * verifies the real-JWT access matrix, and deletes its own fixtures in finally.
 * Requires a staging-only service-role key supplied via the environment.
 * NEVER bundle this file, key, or credentials into a browser application.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import { isPublicAnonKey, runHostedMatrix, STAGING_REF } from './v13_12_real_auth_staging.mjs';

const URL = `https://${STAGING_REF}.supabase.co`;
const PERSONAS = [
  ['citizenA', 'citizen', 'Citizen A'],
  ['citizenB', 'citizen', 'Citizen B'],
  ['staffKmc', 'department_staff', 'KMC Staff'],
  ['staffElectric', 'department_staff', 'K-Electric Staff'],
  ['admin', 'main_admin', 'Test Admin'],
];

export function validateFixtureKeys(env = process.env) {
  if (env.V1312_STAGING_URL !== URL) {
    throw new Error('BLOCKED: Explicit staging URL required. Other projects are forbidden.');
  }
  if (!env.V1312_STAGING_ANON_KEY || !isPublicAnonKey(env.V1312_STAGING_ANON_KEY)) {
    throw new Error('BLOCKED: A valid staging publishable/anon key is required.');
  }
  const secret = env.V1312_STAGING_SERVICE_ROLE_KEY || '';
  const jwt = secret.split('.');
  let role = '';
  try {
    if (jwt.length === 3) role = JSON.parse(Buffer.from(jwt[1], 'base64url').toString('utf8')).role;
  } catch { /* invalid */ }
  if (!secret.startsWith('sb_secret_') && role !== 'service_role') {
    throw new Error('BLOCKED: Genuine staging-only service role credential missing.');
  }
  return { url: URL, anonKey: env.V1312_STAGING_ANON_KEY, secret };
}

async function createCase(config, account, payload) {
  const publicClient = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signedIn, error: authError } = await publicClient.auth.signInWithPassword({
    email: account.email, password: account.password,
  });
  if (authError || !signedIn?.session?.access_token) throw new Error('Fixture citizen Auth sign-in failed');
  const response = await fetch(`${config.url}/functions/v1/submit-classified-complaint`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${signedIn.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });
  const result = await response.json();
  if (response.status !== 200 || !result?.complaint_id) {
    throw new Error(`Hosted intake failed for fictional fixture (HTTP ${response.status})`);
  }
  return result.complaint_id;
}

export async function runOnePass(env = process.env) {
  const config = validateFixtureKeys(env); // Must happen before ANY remote write.
  const admin = createClient(config.url, config.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = randomBytes(8).toString('hex');
  const fixtureStreet = `V13.12 QA Street ${suffix}`;
  const accounts = {};
  const userIds = [];
  const complaintIds = [];
  const cleanupErrors = [];
  let verdict;

  try {
    for (const [id, role, label] of PERSONAS) {
      const email = `v1312-${suffix}-${id.toLowerCase()}@example.invalid`;
      const password = `StagingOnly-${randomBytes(28).toString('base64url')}!`;
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: `V13.12 Fixture ${label}` },
      });
      if (error || !data?.user?.id) throw new Error(`Auth Admin could not create disposable ${id}`);
      userIds.push(data.user.id);
      accounts[id] = { email, password, role, userId: data.user.id };

      const { data: profile, error: profileError } = await admin.from('profiles')
        .update({ role }).eq('id', data.user.id).select('id,role').single();
      if (profileError || profile?.role !== role) throw new Error(`Could not configure ${id}'s staging profile`);
    }

    for (const [id, dept] of [['staffKmc', 'kmc'], ['staffElectric', 'kelectric']]) {
      const { error } = await admin.from('department_memberships').insert({
        user_id: accounts[id].userId,
        department_id: dept,
        status: 'active',
        approved_by: accounts.admin.userId,
      });
      if (error) throw new Error(`Could not create staging membership for ${id}`);
    }

    const common = {
      incidentDistrict: 'District Central',
      incidentLocality: 'V13.12 Test Locality',
      incidentPublicLocation: fixtureStreet,
      citizenPhone: '03000000000',
      residentialAddress: 'Fictional university QA test address',
    };
    const complaintA = await createCase(config, accounts.citizenA, {
      ...common,
      citizenName: 'V13.12 Test Citizen A',
      citizenEmail: accounts.citizenA.email,
      description: 'Hamari gali mein road bohat toot gayi hai aur gehre gadday hain. KMC se request hai is broken sadak ko repair karwayen.',
    });
    complaintIds.push(complaintA);
    const complaintB = await createCase(config, accounts.citizenB, {
      ...common,
      citizenName: 'V13.12 Test Citizen B',
      citizenEmail: accounts.citizenB.email,
      description: 'Hamare area ka transformer jal gaya hai aur das din se bijli bilkul band hai. K Electric transformer repair karwayen.',
    });
    complaintIds.push(complaintB);

    // These fictional records are RLS sentinels, not an accuracy benchmark.
    // Normalize their assignment so a threshold-dependent classifier decision
    // does not make a legitimate authorization test non-deterministic.
    for (const [id, dept] of [[complaintA, 'kmc'], [complaintB, 'kelectric']]) {
      const { data, error } = await admin.from('complaints').update({
        status: 'assigned', assigned_department_id: dept,
        assigned_department_ids: [dept], is_multilabel: false,
      }).eq('id', id).select('id').single();
      if (error || data?.id !== id) throw new Error('Could not prepare fictional complaint isolation sentinel');
    }

    const matrixConfig = {
      url: config.url, anonKey: config.anonKey,
      cases: { kmc: complaintA, electric: complaintB },
      accounts,
    };
    verdict = await runHostedMatrix(matrixConfig);
  } finally {
    // Auth Admin may create a user even if its HTTP response is lost. Recover
    // only users carrying this run's cryptographically random email marker.
    try {
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw error;
        const users = data?.users || [];
        for (const user of users) {
          if (user.email?.startsWith(`v1312-${suffix}-`) && user.email.endsWith('@example.invalid')) {
            userIds.push(user.id);
          }
        }
        if (users.length < 100) break;
        if (page === 20) throw new Error('Auth fixture discovery exceeded safety page budget');
      }
    } catch { cleanupErrors.push('users:discovery'); }
    // Recover any committed fixture whose HTTP reply was lost; match the
    // generated marker AND our newly created citizen account IDs. Never do
    // an unscoped cleanup on staging.
    if (userIds.length) {
      try {
        const { data, error } = await admin.from('complaints').select('id')
          .eq('incident_public_location', fixtureStreet).in('citizen_id', userIds);
        if (error) throw error;
        for (const row of data || []) complaintIds.push(row.id);
      } catch { cleanupErrors.push('complaints:discovery'); }
    }
    for (const id of new Set(complaintIds)) {
      try {
        const { error } = await admin.from('complaints').delete().eq('id', id);
        if (error) throw error;
      } catch { cleanupErrors.push(`complaint:${id}`); }
    }
    for (const id of [...new Set(userIds)].reverse()) {
      try {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
      } catch { cleanupErrors.push(`user:${id}`); }
    }
    if (complaintIds.length) {
      const { data, error } = await admin.from('complaints').select('id').in('id', complaintIds);
      if (error || data?.length) cleanupErrors.push('complaints:verification');
    }
    if (userIds.length) {
      const { data, error } = await admin.from('profiles').select('id').in('id', userIds);
      if (error || data?.length) cleanupErrors.push('users:verification');
    }
    if (cleanupErrors.length) {
      console.error('Manual staging-only cleanup required for the following fixture IDs (no credentials):',
        cleanupErrors.join(', '));
      throw new Error('V13.12 fixture cleanup was not fully verified; release blocked');
    }
  }

  assert.ok(verdict?.passed, 'Real-JWT matrix did not complete successfully');
  return { ...verdict, cleanedUp: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runOnePass();
    console.log(`PASS: ${result.authenticatedUsers} genuine Auth accounts, ${result.fixtures} Edge complaints; staging test fixtures removed.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unknown hosted staging error');
    process.exitCode = 1;
  }
}
