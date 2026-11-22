import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../../supabase/migrations/20261203000000_v13_18_verified_department_work_orders.sql', import.meta.url), 'utf8');
const proof = readFileSync(new URL('../../supabase/functions/upload-department-work-proof/index.ts', import.meta.url),'utf8');
const invite = readFileSync(new URL('../../supabase/functions/provision-department-staff/index.ts', import.meta.url),'utf8');

test('work orders use durable anchor complaint ids and department scoped assignments',()=>{
  assert.match(sql,/anchor_complaint_id uuid NOT NULL REFERENCES public\.complaints/);
  assert.match(sql,/UNIQUE \(department_id, anchor_complaint_id\)/);
  assert.match(sql,/m\.staff_role='officer'/);
  assert.match(sql,/v1318_is_department_head\(p_department\)/);
});
test('new work data has row policies, guarded direct mutations and private proof storage',()=>{
  for (const table of ['department_work_orders','department_work_order_reports','department_work_evidence','department_work_feedback','department_work_events']) assert.match(sql,new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  assert.match(sql,/REVOKE ALL ON public\.department_work_orders/);
  assert.match(sql,/public\.v1318_can_download_proof\(name\)/);
  assert.match(sql,/department-work-proof-private/,'private bucket');
  assert.match(sql,/p_sha256/);
  assert.match(sql,/duplicate_warning/);
});
test('officers cannot bypass photographed proof by updating a resolved complaint',()=>{
  assert.match(sql,/CREATE TRIGGER v1318_guard_complaint_status/);
  assert.match(sql,/NEW\.status='resolved'/);
  assert.match(sql,/e\.decision='approved'/);
  assert.match(sql,/m\.staff_role='head'/);
  assert.match(sql,/auth\.jwt\(\)->>'aal'='aal2'/);
});
test('head-initiated citizen closure requires approved proof and uses existing audited transition',()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.v1318_close_verified_order/);
  assert.match(sql,/public\.staff_update_complaint_status\(v_report\.id,'resolved'/);
  assert.match(sql,/Another assigned department has not verified its work/);
});
test('proof upload requires authenticated individual officer, verified second factor and bounding',()=>{
  assert.match(proof,/auth\.getUser\(bearer\)/);
  assert.match(proof,/claims\.aal === "aal2"/);
  assert.match(proof,/staff_role/);
  assert.match(proof,/Math\.min|const LIMIT = 1024 \* 1024/);
  assert.match(proof,/\.rpc\("v1318_record_proof"/);
  assert.doesNotMatch(proof,/serviceRoleKey:\s*import\.meta\.env\.VITE_/);
});
test('admin invitations use verified email, unique individual membership and role',()=>{
  assert.match(invite,/inviteUserByEmail\(email/);
  assert.match(invite,/staff_role: staffRole/);
  assert.match(invite,/claims\.aal !== "aal2"/);
  assert.doesNotMatch(invite,/DemoAccessKey2026/);
});
