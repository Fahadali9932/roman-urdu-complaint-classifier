-- V13.18 staging integration test. All actors and proof objects are disposable.
-- This exercises real PostgreSQL constraints, RPCs, privileges, and RLS with
-- simulated JWT claims. It is NOT a signed-token or browser Auth E2E test.
-- Run only against the approved non-production staging project.
-- On success, the final ROLLBACK removes every test user, row and storage object.

BEGIN;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
) VALUES
  ('00000000-0000-0000-0000-000000000000','9b180000-0000-4000-8000-000000000001','authenticated','authenticated','v1318-head@example.invalid',now(),now(),'{}','{}'),
  ('00000000-0000-0000-0000-000000000000','9b180000-0000-4000-8000-000000000002','authenticated','authenticated','v1318-officer@example.invalid',now(),now(),'{}','{}'),
  ('00000000-0000-0000-0000-000000000000','9b180000-0000-4000-8000-000000000003','authenticated','authenticated','v1318-citizen@example.invalid',now(),now(),'{}','{}'),
  ('00000000-0000-0000-0000-000000000000','9b180000-0000-4000-8000-000000000004','authenticated','authenticated','v1318-other@example.invalid',now(),now(),'{}','{}');

UPDATE public.profiles SET role='department_staff' WHERE id IN (
  '9b180000-0000-4000-8000-000000000001',
  '9b180000-0000-4000-8000-000000000002',
  '9b180000-0000-4000-8000-000000000004'
);

INSERT INTO public.department_memberships
  (user_id,department_id,staff_role,status,approved_by)
VALUES
  ('9b180000-0000-4000-8000-000000000001','kmc','head','active','9b180000-0000-4000-8000-000000000001'),
  ('9b180000-0000-4000-8000-000000000002','kmc','officer','active','9b180000-0000-4000-8000-000000000001'),
  ('9b180000-0000-4000-8000-000000000004','kelectric','head','active','9b180000-0000-4000-8000-000000000004');

INSERT INTO public.complaints (
  id, reference_number, citizen_id, description, incident_district,
  incident_locality, incident_public_location, status, assigned_department_id,
  assigned_department_ids, predicted_department_id, prediction_confidence
) VALUES (
  '9b180000-0000-4000-8000-000000000100','KHI-V1318-TXN',
  '9b180000-0000-4000-8000-000000000003',
  'Tariq Road ka manhole khula hai; repair aur on-site proof darkar hai.',
  'District East','Tariq Road','Disposable test street', 'in_progress',
  'kmc',ARRAY['kmc'],'kmc',0.9
);

-- Unrelated department head cannot dispatch another department's cases.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
  IF public.v1318_is_department_head('kmc') THEN
    RAISE EXCEPTION 'FAIL: other department was elevated to KMC head';
  END IF;
END $test$;
RESET ROLE;

-- KMC head dispatches a real complaint UUID to an approved KMC officer.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; BEGIN
  IF NOT public.v1318_is_department_head('kmc') THEN
    RAISE EXCEPTION 'FAIL: approved MFA head denied';
  END IF;
  v_order := public.v1318_assign_work(
    'kmc','9b180000-0000-4000-8000-000000000100',
    ARRAY['9b180000-0000-4000-8000-000000000100'::uuid],
    'Manhole repair','9b180000-0000-4000-8000-000000000002',
    now()+interval '2 days','Inspect the manhole and submit original field evidence.'
  );
  IF v_order IS NULL THEN RAISE EXCEPTION 'FAIL: head dispatch returned no order'; END IF;
END $test$;
RESET ROLE;

-- AAL1 cannot read the order, despite having an active membership.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
  IF (SELECT count(*) FROM public.department_work_orders) <> 0 THEN
    RAISE EXCEPTION 'FAIL: AAL1 can read an assigned order';
  END IF;
END $test$;
RESET ROLE;

-- Assigned AAL2 officer can start work and request an extension.
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; BEGIN
  SELECT id INTO v_order FROM public.department_work_orders;
  IF v_order IS NULL OR (SELECT count(*) FROM public.department_work_orders) <> 1 THEN
    RAISE EXCEPTION 'FAIL: assigned officer cannot see own order';
  END IF;
  PERFORM public.v1318_start_work(v_order);
  PERFORM public.v1318_request_extension(
    v_order, now()+interval '3 days',
    'Traffic control is required before safe fieldwork.'
  );
END $test$;
RESET ROLE;

-- An unrelated AAL2 officer/head cannot see the order.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
  IF (SELECT count(*) FROM public.department_work_orders) <> 0 THEN
    RAISE EXCEPTION 'FAIL: cross-department order exposed';
  END IF;
END $test$;
RESET ROLE;

-- KMC head approves extension before the first evidence submission.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; BEGIN
  SELECT id INTO v_order FROM public.department_work_orders;
  PERFORM public.v1318_decide_extension(v_order,true);
  IF (SELECT due_at FROM public.department_work_orders WHERE id=v_order)
    <= now()+interval '2 days' THEN
    RAISE EXCEPTION 'FAIL: extension did not update due date';
  END IF;
END $test$;
RESET ROLE;

-- Service role's authorized proof RPC requires an existing private object.
-- These objects are never made public and disappear with transaction ROLLBACK.
INSERT INTO storage.objects(bucket_id,name)
SELECT 'department-work-proof-private','work/kmc/'||id||'/v1318-first.png'
FROM public.department_work_orders;
SET LOCAL ROLE service_role;
SELECT public.v1318_record_proof(
  (SELECT id FROM public.department_work_orders),
  '9b180000-0000-4000-8000-000000000002',
  'work/kmc/'||(SELECT id FROM public.department_work_orders)||'/v1318-first.png',
  'image/png',100,repeat('a',64),24.87,67.06,15
);
RESET ROLE;

-- Head approves the first evidence version. Citizen review is still required.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; BEGIN
  SELECT id INTO v_order FROM public.department_work_orders;
  PERFORM public.v1318_review_proof(v_order,true,'Original pin unavailable; reviewed independent field evidence.');
  BEGIN
    PERFORM public.v1318_close_verified_order(v_order);
    RAISE EXCEPTION 'FAIL: head bypassed 72-hour citizen review';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
END $test$;
RESET ROLE;

-- Owner disputes proof version one; order returns for rework.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; BEGIN
  SELECT order_id INTO v_order FROM public.v1318_my_work_proofs('9b180000-0000-4000-8000-000000000100');
  IF v_order IS NULL THEN RAISE EXCEPTION 'FAIL: citizen cannot view approved proof'; END IF;
  PERFORM public.v1318_citizen_feedback(v_order,
    '9b180000-0000-4000-8000-000000000100','disputed',
    'Manhole is still open; new evidence is required.');
END $test$;
RESET ROLE;

-- Officer reworks and submits a new, distinct proof version.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.v1318_start_work((SELECT id FROM public.department_work_orders));
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name)
SELECT 'department-work-proof-private','work/kmc/'||id||'/v1318-second.png'
FROM public.department_work_orders;
SET LOCAL ROLE service_role;
SELECT public.v1318_record_proof(
  (SELECT id FROM public.department_work_orders),
  '9b180000-0000-4000-8000-000000000002',
  'work/kmc/'||(SELECT id FROM public.department_work_orders)||'/v1318-second.png',
  'image/png',120,repeat('b',64),24.87,67.06,12
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.v1318_review_proof((SELECT id FROM public.department_work_orders),
  true,'Follow-up inspection confirms rework and new evidence.');
RESET ROLE;

-- Citizen confirms version two. Historical dispute must remain auditable.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; BEGIN
  SELECT order_id INTO v_order FROM public.v1318_my_work_proofs('9b180000-0000-4000-8000-000000000100');
  PERFORM public.v1318_citizen_feedback(v_order,
    '9b180000-0000-4000-8000-000000000100','confirmed','Repaired successfully.');
END $test$;
RESET ROLE;

-- Primary head closes verified record; timeline and feedback survive.
SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_closed integer; BEGIN
  SELECT public.v1318_close_verified_order(id) INTO v_closed
  FROM public.department_work_orders;
  IF v_closed<>1 OR
    (SELECT status FROM public.complaints WHERE reference_number='KHI-V1318-TXN')<>'resolved' OR
    (SELECT count(*) FROM public.complaint_timeline_events WHERE status='resolved')<>1 THEN
    RAISE EXCEPTION 'FAIL: complaint closure or timeline is incorrect';
  END IF;
END $test$;
RESET ROLE;

-- Head's normal RLS intentionally hides a citizen's private written feedback.
-- Audit the two immutable versions as the staging test administrator only.
DO $test$ BEGIN
  IF (SELECT count(*) FROM public.department_work_feedback)<>2 OR
    (SELECT count(*) FROM public.department_work_feedback WHERE verdict='disputed')<>1 OR
    (SELECT count(*) FROM public.department_work_feedback WHERE verdict='confirmed')<>1 THEN
    RAISE EXCEPTION 'FAIL: dispute / confirmation history was not preserved';
  END IF;
END $test$;

-- A separate unanswered case verifies the documented 72-hour exception.
INSERT INTO public.complaints (
  id,reference_number,citizen_id,description,incident_district,
  incident_locality,incident_public_location,status,assigned_department_id,
  assigned_department_ids,predicted_department_id,prediction_confidence
) VALUES (
  '9b180000-0000-4000-8000-000000000101','KHI-V1318-SILENT',
  '9b180000-0000-4000-8000-000000000003',
  'Pothole repaired but the citizen has not responded.',
  'District East','Tariq Road','Disposable test street','in_progress',
  'kmc',ARRAY['kmc'],'kmc',0.8
);

SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.v1318_assign_work(
  'kmc','9b180000-0000-4000-8000-000000000101',
  ARRAY['9b180000-0000-4000-8000-000000000101'::uuid],
  'Pothole repair','9b180000-0000-4000-8000-000000000002',
  now()+interval '2 days','Repair and document the second test case.'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.v1318_start_work(id) FROM public.department_work_orders
  WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101';
RESET ROLE;

INSERT INTO storage.objects(bucket_id,name)
SELECT 'department-work-proof-private','work/kmc/'||id||'/v1318-unanswered.png'
FROM public.department_work_orders
WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101';
SET LOCAL ROLE service_role;
SELECT public.v1318_record_proof(
  (SELECT id FROM public.department_work_orders
    WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101'),
  '9b180000-0000-4000-8000-000000000002',
  'work/kmc/'||(SELECT id FROM public.department_work_orders
    WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101')||'/v1318-unanswered.png',
  'image/png',140,repeat('c',64),24.87,67.06,10
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','9b180000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"9b180000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.v1318_review_proof(id,true,'Independently verified second repair.')
FROM public.department_work_orders
WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101';
DO $test$ DECLARE v_order uuid; BEGIN
  SELECT id INTO v_order FROM public.department_work_orders
    WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101';
  BEGIN
    PERFORM public.staff_update_complaint_status(
      '9b180000-0000-4000-8000-000000000101','resolved',
      'Finished','مکمل','Attempt legacy close','پرانا طریقہ');
    RAISE EXCEPTION 'FAIL: legacy RPC bypassed 72-hour review gate';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.v1318_close_verified_order(v_order,
      'Supervisory evidence is complete, but review period has not elapsed.');
    RAISE EXCEPTION 'FAIL: head closed before 72-hour deadline';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
END $test$;
RESET ROLE;

-- Advance only the test record's reviewed_at to simulate passage of time.
UPDATE public.department_work_orders
SET reviewed_at=now()-interval '73 hours'
WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101';

SET LOCAL ROLE authenticated;
DO $test$ DECLARE v_order uuid; v_closed integer; BEGIN
  SELECT id INTO v_order FROM public.department_work_orders
    WHERE anchor_complaint_id='9b180000-0000-4000-8000-000000000101';
  BEGIN
    PERFORM public.v1318_close_verified_order(v_order,'');
    RAISE EXCEPTION 'FAIL: unanswered closure did not demand a reason';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
  v_closed := public.v1318_close_verified_order(v_order,
    'No citizen reply after the published 72-hour window; supervisor examined the approved evidence and recorded a justification.');
  IF v_closed <> 1 THEN
    RAISE EXCEPTION 'FAIL: reasoned 72-hour closure was not recorded';
  END IF;
END $test$;
RESET ROLE;

DO $test$ BEGIN
  IF (SELECT count(*) FROM public.department_work_closure_reviews)<>1 OR
    (SELECT count(*) FROM public.complaints WHERE status='resolved')<>2 THEN
    RAISE EXCEPTION 'FAIL: 72-hour waiver not audited or complaint not closed';
  END IF;
END $test$;

-- Deliberate rollback: no test Auth users, proof objects, or complaints remain.
ROLLBACK;
