import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const source = (path) => readFileSync(join(root, path), 'utf8');

test('browser complaints query explicitly excludes claim and tracking digests', () => {
  const code = source('src/services/SupabaseComplaintService.ts');
  const projection = code.match(/const COMPLAINT_SELECT_QUERY = '([^']+)'/);
  assert.ok(projection, 'Typed complaint projection should be a constant literal');
  assert.ok(projection[1].includes('reference_number'));
  assert.ok(projection[1].includes('complaint_timeline_events(*)'));
  assert.doesNotMatch(projection[1], /(?:^|,)\s*\*(?:,|$)/);
  assert.doesNotMatch(projection[1], /claim_code_hash|guest_tracking_hash/);
});

test('department case synchronization uses a safe explicit projection', () => {
  const code = source('src/services/CaseOperationsService.ts');
  assert.doesNotMatch(code, /\.from\('complaints'\)\s*\.select\('\*'\)/);
  assert.match(code, /\.from\('complaints'\)\s*\/\/[^\n]*\n\s*\.select\('id, citizen_id/);
});

test('database migration removes table-wide SELECT and denies bearer digests', () => {
  const sql = source('supabase/migrations/20261201000000_v13_13_hide_guest_claim_credentials.sql');
  assert.match(sql, /REVOKE SELECT ON TABLE public\.complaints FROM authenticated/i);
  assert.match(sql, /attname NOT IN \('claim_code_hash', 'guest_tracking_hash'\)/);
  assert.match(sql, /has_column_privilege\('authenticated', 'public\.complaints', 'claim_code_hash', 'SELECT'\)/);
  assert.match(sql, /has_column_privilege\('authenticated', 'public\.complaints', 'guest_tracking_hash', 'SELECT'\)/);
});

test('real-session gate probes both private digests for every persona', () => {
  const code = source('tests/edge/v13_12_real_auth_staging.mjs');
  assert.match(code, /\['claim_code_hash', 'guest_tracking_hash'\]/);
  assert.match(code, /assertForbiddenResponse\(leak/);
});
