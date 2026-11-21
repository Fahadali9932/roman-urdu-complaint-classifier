import test from 'node:test';
import assert from 'node:assert/strict';
import { assertForbiddenResponse, isPublicAnonKey, loadStagingConfig, STAGING_REF } from './v13_12_real_auth_staging.mjs';
import { validateFixtureKeys } from './v13_12_one_pass_staging.mjs';

const dummyConfig = () => {
  const env = {
    V1312_STAGING_URL: `https://${STAGING_REF}.supabase.co`,
    V1312_ANON_KEY: 'sb_publishable_unit_test_only',
    V1312_KMC_COMPLAINT_ID: '00000000-0000-4000-8000-000000000001',
    V1312_KELECTRIC_COMPLAINT_ID: '00000000-0000-4000-8000-000000000002',
  };
  for (const name of ['CITIZEN_A', 'CITIZEN_B', 'STAFF_KMC', 'STAFF_KELECTRIC', 'ADMIN']) {
    env[`V1312_${name}_EMAIL`] = `${name.toLowerCase()}@example.invalid`;
    env[`V1312_${name}_PASSWORD`] = 'not-a-real-credential';
  }
  return env;
};

test('requires all five genuine Auth fixture credential pairs before any request', () => {
  assert.throws(() => loadStagingConfig({}), /BLOCKED: Missing staging fixture variables/);
});

test('never accepts a production or unfamiliar Supabase hostname', () => {
  const env = dummyConfig();
  env.V1312_STAGING_URL = 'https://different-production.supabase.co';
  assert.throws(() => loadStagingConfig(env), /Staging URL mismatch/);
});

test('requires distinct genuine people and case fixture identifiers', () => {
  const env = dummyConfig();
  env.V1312_CITIZEN_B_EMAIL = env.V1312_CITIZEN_A_EMAIL;
  assert.throws(() => loadStagingConfig(env), /must be distinct/);
  env.V1312_CITIZEN_B_EMAIL = 'citizen_b@example.invalid';
  env.V1312_KELECTRIC_COMPLAINT_ID = env.V1312_KMC_COMPLAINT_ID;
  assert.throws(() => loadStagingConfig(env), /Two distinct/);
});

test('accepts complete configuration without printing any credentials', () => {
  const config = loadStagingConfig(dummyConfig());
  assert.equal(config.url, `https://${STAGING_REF}.supabase.co`);
  assert.equal(Object.keys(config.accounts).length, 5);
});

test('rejects service role and secret keys, preventing privileged false passes', () => {
  const env = dummyConfig();
  env.V1312_ANON_KEY = 'sb_secret_never_for_client';
  assert.throws(() => loadStagingConfig(env), /service-role and secret keys/);
  const jwt = (role) => [
    Buffer.from('{}').toString('base64url'),
    Buffer.from(JSON.stringify({ role })).toString('base64url'),
    'signature',
  ].join('.');
  assert.equal(isPublicAnonKey(jwt('service_role')), false);
  assert.equal(isPublicAnonKey(jwt('anon')), true);
});

test('distinguishes actual authorization denial from an unavailable RPC', () => {
  assert.doesNotThrow(() => assertForbiddenResponse({ status: 403, body: { code: '42501' } }, 'test'));
  assert.doesNotThrow(() => assertForbiddenResponse({ status: 400, body: { message: 'Main administrator authorization required' } }, 'test'));
  assert.throws(() => assertForbiddenResponse({ status: 200, body: {} }, 'test'), /unexpectedly succeeded/);
  assert.throws(() => assertForbiddenResponse({ status: 404, body: { message: 'Function not found' } }, 'test'), /did not demonstrate/);
});

test('one-pass provisioning demands an explicitly matching staging project and privileged server-only key', () => {
  const env = {
    V1312_STAGING_URL: `https://${STAGING_REF}.supabase.co`,
    V1312_STAGING_ANON_KEY: 'sb_publishable_staging_test',
    V1312_STAGING_SERVICE_ROLE_KEY: 'sb_secret_staging_test',
  };
  assert.equal(validateFixtureKeys(env).url, env.V1312_STAGING_URL);
  assert.throws(() => validateFixtureKeys({ ...env, V1312_STAGING_URL: 'https://wrong.supabase.co' }), /Explicit staging URL/);
  assert.throws(() => validateFixtureKeys({ ...env, V1312_STAGING_SERVICE_ROLE_KEY: 'sb_publishable_not_a_service_role' }), /service role credential missing/);
});
