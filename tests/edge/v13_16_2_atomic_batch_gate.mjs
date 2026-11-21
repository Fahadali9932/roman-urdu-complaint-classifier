import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const service = fs.readFileSync(path.join(root, 'src/services/CaseOperationsService.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/features/department/components/CaseDetailPage.tsx'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261121195517_v13_16_2_atomic_department_batch_acceptance.sql'), 'utf8');
const guardMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261121202000_v13_16_2_reconcile_atomic_acceptance_guards.sql'), 'utf8');

test('live bulk acceptance is a single RPC, never a partial client loop', () => {
  assert.match(service, /\.rpc\('staff_accept_department_report_batch'/);
  const fn = service.split('async executeBulkAcceptance(')[1].split('async getCaseById(')[0];
  assert.doesNotMatch(fn, /staff_update_complaint_status/);
  assert.match(fn, /if \(error \|\| !data\?\.success/);
});

test('server batch checks caller, membership, assignment, cardinality and state', () => {
  for (const required of [
    'auth.uid()', 'department_memberships', "m.status = 'active'",
    'p_department_id', 'cardinality(p_complaint_ids) > 100',
    'Duplicate complaint IDs', "v_report.status <> 'assigned'",
    'assigned_department_ids', 'staff_update_complaint_status(',
  ]) assert.ok(migration.includes(required), `Missing required invariant: ${required}`);
});

test('ledger keeps server idempotency private and scoped', () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON public\.staff_batch_acceptance_requests FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /UNIQUE \(actor_id, department_id, idempotency_key\)/);
  assert.match(migration, /request_fingerprint IS DISTINCT FROM v_fingerprint/);
  assert.match(migration, /SET search_path = ''/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.staff_accept_department_report_batch[\s\S]+TO authenticated/);
});

test('follow-up migration makes admin checks null-safe and verifies delegated RPC outcome', () => {
  assert.match(guardMigration, /COALESCE\(public\.is_main_admin\(v_actor\), false\)/);
  assert.match(guardMigration, /v_report\.status IS DISTINCT FROM 'assigned'/);
  assert.match(guardMigration, /INTO v_single_result/);
  assert.match(guardMigration, /COALESCE\(\(v_single_result->>'success'\)::boolean, false\)/);
});

test('client preserves a retry key until server confirms acceptance', () => {
  assert.match(page, /pendingAcceptKey\.current \?\? `idemp-\$\{crypto\.randomUUID\(\)\}`/);
  assert.match(page, /pendingAcceptKey\.current = idempotencyKey/);
  assert.match(page, /pendingAcceptKey\.current = null/);
});
