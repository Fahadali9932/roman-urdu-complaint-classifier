/**
 * V13.12 hosted Supabase authorization matrix. Genuine Auth password sessions,
 * actual PostgREST/RPC permissions, staging ONLY. No service-role key.
 *
 * The five users and two complaints must already be disposable, independently
 * authorized staging fixtures. This script NEVER creates or changes records.
 * Run with `node tests/edge/v13_12_real_auth_staging.mjs` after supplying the
 * variables listed in docs/v11/V13_12_REAL_AUTH_TEST_GATE.md.
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export const STAGING_REF = 'jvbulmmdwovtgaxojxhn';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicAnonKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  const segments = key.split('.');
  if (segments.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    return claims.role === 'anon';
  } catch {
    return false;
  }
}

const PERSONAS = [
  ['citizenA', 'CITIZEN_A', 'citizen'],
  ['citizenB', 'CITIZEN_B', 'citizen'],
  ['staffKmc', 'STAFF_KMC', 'department_staff'],
  ['staffElectric', 'STAFF_KELECTRIC', 'department_staff'],
  ['admin', 'ADMIN', 'main_admin'],
];

export function loadStagingConfig(env = process.env) {
  const prefix = 'V1312_';
  const missing = [];
  const required = (key) => {
    const value = env[prefix + key]?.trim();
    if (!value) missing.push(prefix + key);
    return value;
  };

  const url = required('STAGING_URL');
  const anonKey = required('ANON_KEY');
  const cases = {
    kmc: required('KMC_COMPLAINT_ID'),
    electric: required('KELECTRIC_COMPLAINT_ID'),
  };
  const accounts = Object.fromEntries(PERSONAS.map(([id, suffix, role]) => [id, {
    email: required(`${suffix}_EMAIL`),
    password: required(`${suffix}_PASSWORD`),
    role,
  }]));

  if (missing.length) {
    throw new Error(`BLOCKED: Missing staging fixture variables: ${missing.join(', ')}`);
  }
  if (url !== `https://${STAGING_REF}.supabase.co`) {
    throw new Error('BLOCKED: Staging URL mismatch. Production or an unknown project is forbidden.');
  }
  if (!isPublicAnonKey(anonKey)) {
    throw new Error('BLOCKED: Use only the STAGING publishable/anon key; service-role and secret keys are forbidden.');
  }
  if (!UUID.test(cases.kmc) || !UUID.test(cases.electric) || cases.kmc === cases.electric) {
    throw new Error('BLOCKED: Two distinct valid staging complaint UUIDs are required.');
  }
  if (new Set(PERSONAS.map(([id]) => accounts[id].email.toLowerCase())).size !== 5) {
    throw new Error('BLOCKED: All five Auth accounts must be distinct.');
  }
  return { url, anonKey, cases, accounts };
}

export function assertForbiddenResponse(result, context) {
  assert.notEqual(result.status, 200, `${context}: protected RPC unexpectedly succeeded`);
  const code = String(result.body?.code || '').toUpperCase();
  const message = String(result.body?.message || '').toLowerCase();
  assert.ok(
    code === '42501' || /authoriz|forbidden|permission|not allowed|unauthoriz/.test(message),
    `${context}: failure did not demonstrate authorization denial`,
  );
}

async function fetchJson(config, path, token, { method = 'GET', body } = {}) {
  const headers = {
    apikey: config.anonKey,
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${config.url}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const value = await response.text();
  let parsed = null;
  if (value) {
    try { parsed = JSON.parse(value); } catch { throw new Error(`Invalid JSON from ${method} ${path.split('?')[0]} (HTTP ${response.status})`); }
  }
  return { status: response.status, body: parsed };
}

async function login(config, account) {
  const r = await fetchJson(config, '/auth/v1/token?grant_type=password', null, {
    method: 'POST', body: { email: account.email, password: account.password },
  });
  assert.equal(r.status, 200, `Authenticated staging login failed for ${account.role}; check confirmation/credentials`);
  assert.ok(r.body?.access_token && r.body?.user?.id && UUID.test(r.body.user.id), 'Auth session must be genuine');
  const me = await fetchJson(config, '/auth/v1/user', r.body.access_token);
  assert.equal(me.status, 200, 'Auth /user validation failed');
  assert.equal(me.body?.id, r.body.user.id, 'JWT session identity mismatch');
  return { id: me.body.id, token: r.body.access_token, role: account.role };
}

const rest = (table, clause, columns = 'id') =>
  `/rest/v1/${table}?select=${encodeURIComponent(columns)}${clause ? `&${clause}` : ''}`;
const byId = (id) => `id=eq.${encodeURIComponent(id)}`;
const byComplaint = (id) => `complaint_id=eq.${encodeURIComponent(id)}`;

async function rows(config, token, table, clause, columns) {
  const r = await fetchJson(config, rest(table, clause, columns), token);
  assert.equal(r.status, 200, `Expected authorized SELECT for ${table}; HTTP ${r.status}`);
  assert.ok(Array.isArray(r.body), `${table}: expected a row array`);
  return r.body;
}

async function visibleCount(config, session, table, key, id, columns) {
  const clause = `${key}=eq.${encodeURIComponent(id)}`;
  return (await rows(config, session.token, table, clause, columns)).length;
}

export async function runHostedMatrix(config) {
  const sessions = {};
  for (const [id] of PERSONAS) sessions[id] = await login(config, config.accounts[id]);
  assert.equal(new Set(PERSONAS.map(([id]) => sessions[id].id)).size, 5, 'Distinct Auth users required');

  for (const [id, , role] of PERSONAS) {
    const mine = await rows(config, sessions[id].token, 'profiles', byId(sessions[id].id), 'id,role');
    assert.equal(mine.length, 1, `${id}: own profile must be visible`);
    assert.equal(mine[0]?.role, role, `${id}: unexpected verified database role`);
    for (const [otherId] of PERSONAS) {
      if (otherId === id || id === 'admin') continue;
      assert.equal(await visibleCount(config, sessions[id], 'profiles', 'id', sessions[otherId].id, 'id'), 0,
        `${id}: another user's profile leaked`);
    }
  }

  const { kmc, electric } = config.cases;
  for (const [id, issueId] of [['citizenA', kmc], ['citizenB', electric]]) {
    const own = await rows(config, sessions[id].token, 'complaints', byId(issueId),
      'id,citizen_id,assigned_department_ids,assigned_department_id,status');
    assert.equal(own.length, 1, `${id}: fixture complaint unavailable to its owner`);
    assert.equal(own[0]?.citizen_id, sessions[id].id, `${id}: fixture is not citizen-owned`);
    assert.equal(own[0]?.status, 'assigned', `${id}: fixture must be assigned (not under_review)`);
    const expected = id === 'citizenA' ? 'kmc' : 'kelectric';
    assert.ok(own[0].assigned_department_id === expected || own[0].assigned_department_ids?.includes(expected),
      `${id}: fixture is not assigned to ${expected}`);
    assert.equal(await visibleCount(config, sessions[id], 'complaint_citizen_private', 'complaint_id', issueId, 'complaint_id'), 1,
      `${id}: private fixture unavailable to owner`);
  }

  for (const [id, ownId, otherId] of [
    ['citizenA', kmc, electric], ['citizenB', electric, kmc],
    ['staffKmc', kmc, electric], ['staffElectric', electric, kmc],
  ]) {
    assert.equal(await visibleCount(config, sessions[id], 'complaints', 'id', ownId, 'id'), 1,
      `${id}: permitted complaint not visible`);
    assert.equal(await visibleCount(config, sessions[id], 'complaints', 'id', otherId, 'id'), 0,
      `${id}: cross-tenant or cross-department complaint leaked`);
    if (id.startsWith('staff')) {
      for (const issueId of [ownId, otherId]) {
        assert.equal(await visibleCount(config, sessions[id], 'complaint_citizen_private', 'complaint_id', issueId, 'complaint_id'), 0,
          `${id}: staff could read private citizen details`);
      }
    } else {
      assert.equal(await visibleCount(config, sessions[id], 'complaint_citizen_private', 'complaint_id', otherId, 'complaint_id'), 0,
        `${id}: another citizen's private data leaked`);
    }
  }

  for (const issueId of [kmc, electric]) {
    assert.equal(await visibleCount(config, sessions.admin, 'complaints', 'id', issueId, 'id'), 1,
      'Admin cannot inspect staging fixture');
  }
  const memberships = [
    ['staffKmc', 'kmc'], ['staffElectric', 'kelectric'],
  ];
  for (const [id, dept] of memberships) {
    const mine = await rows(config, sessions[id].token, 'department_memberships',
      `user_id=eq.${sessions[id].id}&status=eq.active`, 'department_id,status');
    assert.ok(mine.some((row) => row.department_id === dept), `${id}: missing active membership`);
  }

  for (const [id] of PERSONAS.filter(([id]) => id !== 'admin')) {
    const q = await fetchJson(config, '/rest/v1/rpc/get_ai_classification_review_queue', sessions[id].token,
      { method: 'POST', body: {} });
    assertForbiddenResponse(q, `${id}: admin review queue`);
    const c = await fetchJson(config, '/rest/v1/rpc/admin_reassign_complaint', sessions[id].token,
      { method: 'POST', body: {
        p_complaint_id: '00000000-0000-4000-8000-000000000000',
        p_new_department_id: 'kmc',
        p_reason: 'V13.12 authorization denial probe',
      } });
    assertForbiddenResponse(c, `${id}: admin reassignment`);
  }
  const adminQueue = await fetchJson(config, '/rest/v1/rpc/get_ai_classification_review_queue', sessions.admin.token,
    { method: 'POST', body: {} });
  assert.equal(adminQueue.status, 200, 'Authenticated admin cannot retrieve review queue');
  assert.ok(Array.isArray(adminQueue.body), 'Admin review queue returned unexpected shape');

  return { passed: true, authenticatedUsers: 5, fixtures: 2,
    checked: ['real-jwt', 'profile-roles', 'citizen-isolation', 'department-isolation',
      'private-data-isolation', 'staff-memberships', 'admin-rpc-denial', 'admin-queue'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runHostedMatrix(loadStagingConfig());
    console.log(`PASS V13.12 hosted staging Auth matrix: ${result.authenticatedUsers} genuine Auth sessions, ${result.fixtures} pre-existing fixtures; ${result.checked.join(', ')}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown staging verification error';
    console.error(message);
    process.exitCode = message.startsWith('BLOCKED:') ? 2 : 1;
  }
}
