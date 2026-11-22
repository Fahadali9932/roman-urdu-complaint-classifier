import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../../supabase/migrations/20261203000000_v13_18_verified_department_work_orders.sql', import.meta.url),'utf8');
const citizen = readFileSync(new URL('../../src/components/citizen/CitizenProofPanel.tsx', import.meta.url),'utf8');
const service = readFileSync(new URL('../../src/features/department/services/fieldOperations.ts', import.meta.url),'utf8');

test('feedback is tied to an evidence version so new proof allows a new response',()=>{
  assert.match(sql,/evidence_id uuid NOT NULL REFERENCES public\.department_work_evidence\(id\)/);
  assert.match(sql,/PRIMARY KEY \(evidence_id, complaint_id\)/);
  assert.match(sql,/ON CONFLICT \(evidence_id,complaint_id\) DO NOTHING/);
  assert.match(sql,/f\.evidence_id=e\.id AND f\.complaint_id=p_complaint/);
});
test('citizen disputes automatically return orders for rework and retain an audit event',()=>{
  assert.match(sql,/IF p_verdict='disputed' THEN[\s\S]*?status='returned',citizen_dispute_pending=true/);
  assert.match(sql,/INSERT INTO public\.department_work_events\(order_id,actor_id,event_type,detail\)[\s\S]*?'citizen_feedback'/);
  assert.match(citizen,/order_status:decision==='disputed'\?'returned'/);
});
test('feedback expires after a 72-hour window and cannot be submitted after case closure',()=>{
  assert.match(sql,/now\(\)>v_order\.reviewed_at\+interval '72 hours'/);
  assert.match(sql,/c\.status<>'resolved'/);
  assert.match(citizen,/proof\.can_respond/);
});
test('unanswered closure requires a named MFA head decision and an auditable reason',()=>{
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.department_work_closure_reviews/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/public\.v1318_is_department_head\(v_order\.department_id\)/);
  assert.match(sql,/v_reviewed>now\(\)-interval '72 hours'/);
  assert.match(sql,/length\(trim\(coalesce\(p_nonresponse_reason,''\)\)\) NOT BETWEEN 20 AND 1200/);
  assert.match(sql,/INSERT INTO public\.department_work_closure_reviews/);
  assert.match(service,/p_nonresponse_reason:nonresponseReason\.trim\(\)/);
});
test('legacy resolved status transitions use the same evidence and citizen review gate',()=>{
  assert.match(sql,/IF NEW\.status='resolved'[\s\S]*?public\.v1318_resolution_ready\(OLD\.id\)/);
  assert.match(sql,/Only the primary department head may close verified reports/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.v1318_resolution_ready\(uuid\) FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT SELECT ON public\.department_work_orders[\s\S]*?public\.department_work_closure_reviews TO authenticated/);
});
