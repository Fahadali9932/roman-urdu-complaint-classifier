-- V13.10: disposable SQL actor-isolation verification for staging only.
-- This is NOT an Auth HTTP / JWT end-to-end test. Actor identity is simulated
-- with SET LOCAL ROLE + request.jwt.claim.sub. All fixtures ROLLBACK.
-- Run as a staging DB administrator, never as a browser user.

BEGIN;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
) VALUES
  ('00000000-0000-0000-0000-000000000000', '9a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'v1310-admin@example.invalid', now(), now(), '{"full_name":"Test Admin"}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '9a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'v1310-citizen1@example.invalid', now(), now(), '{"full_name":"Test Citizen One"}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '9a000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'v1310-citizen2@example.invalid', now(), now(), '{"full_name":"Test Citizen Two"}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '9a000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'v1310-kwsc@example.invalid', now(), now(), '{"full_name":"Test Water Staff"}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '9a000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'v1310-ke@example.invalid', now(), now(), '{"full_name":"Test Electric Staff"}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '9a000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'v1310-otherstaff@example.invalid', now(), now(), '{"full_name":"Test Unrelated Staff"}', '{}');

-- The auth.users trigger inserts citizen profiles for each disposable actor.
UPDATE public.profiles
SET role = CASE id
  WHEN '9a000000-0000-4000-8000-000000000001' THEN 'main_admin'
  WHEN '9a000000-0000-4000-8000-000000000004' THEN 'department_staff'
  WHEN '9a000000-0000-4000-8000-000000000005' THEN 'department_staff'
  WHEN '9a000000-0000-4000-8000-000000000006' THEN 'department_staff'
  ELSE 'citizen'
END;

INSERT INTO public.department_memberships (user_id, department_id, status, approved_by)
VALUES
  ('9a000000-0000-4000-8000-000000000004', 'kwsc', 'active', '9a000000-0000-4000-8000-000000000001'),
  ('9a000000-0000-4000-8000-000000000005', 'kelectric', 'active', '9a000000-0000-4000-8000-000000000001'),
  ('9a000000-0000-4000-8000-000000000006', 'ssgc', 'active', '9a000000-0000-4000-8000-000000000001');

INSERT INTO public.complaints (
  id, reference_number, citizen_id, description, incident_district,
  incident_locality, incident_public_location, status, assigned_department_id,
  assigned_department_ids, predicted_department_id, prediction_confidence,
  guest_tracking_hash
) VALUES (
  '9a000000-0000-4000-8000-000000000100', 'KHI-V1310-ISOLATION',
  '9a000000-0000-4000-8000-000000000002',
  'Pani ki line tooti hai aur transformer bhi kharab hai.',
  'District Central', 'Liaquatabad', 'Test Street 1', 'assigned',
  'kwsc', ARRAY['kwsc', 'kelectric'], 'kwsc', 0.8, repeat('a', 64)
);

INSERT INTO public.complaint_citizen_private (
  complaint_id, citizen_name, citizen_phone, citizen_email, residential_address
) VALUES (
  '9a000000-0000-4000-8000-000000000100', 'Test Citizen One',
  '03000000000', 'v1310-citizen1@example.invalid', 'Fictional Test Address'
);

INSERT INTO public.complaint_issues (complaint_id, department_id, issue_type, status)
VALUES
  ('9a000000-0000-4000-8000-000000000100', 'kwsc', 'water_pipe_break', 'assigned'),
  ('9a000000-0000-4000-8000-000000000100', 'kelectric', 'transformer_fault', 'assigned');

INSERT INTO public.incident_cases (
  id, case_number, department_id, title, summary, issue_subtype,
  district, locality, place_corridor, priority_band
) VALUES (
  '9a000000-0000-4000-8000-000000000200', 'CASE-V1310-INTERNAL', 'kwsc',
  'Water pipe test case', 'Disposable test case summary', 'pipeline',
  'District Central', 'Liaquatabad', 'Test Street 1', 'standard'
);

INSERT INTO public.case_batch_operations (
  case_id, operation_type, idempotency_key, affected_reports_count,
  executed_by, result_json
) VALUES (
  '9a000000-0000-4000-8000-000000000200', 'bulk_accept',
  'v1310-guarded-idempotency-key', 1, 'Test Water Staff',
  '{"success":true,"caseNumber":"CASE-V1310-INTERNAL","marker":"authorized-only"}'
);

-- Citizen 1 sees their case, two issues, and their own private details.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  IF auth.uid() <> '9a000000-0000-4000-8000-000000000002'::uuid
    OR (SELECT count(*) FROM public.complaints WHERE reference_number='KHI-V1310-ISOLATION') <> 1
    OR (SELECT count(*) FROM public.complaint_issues) <> 2
    OR (SELECT count(*) FROM public.complaint_citizen_private) <> 1
  THEN RAISE EXCEPTION 'FAIL: citizen owner isolation'; END IF;
END;
$check$;
RESET ROLE;

-- Citizen 2 must not see citizen 1's complaint, private data or issues.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000003', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  IF (SELECT count(*) FROM public.complaints WHERE reference_number='KHI-V1310-ISOLATION') <> 0
    OR (SELECT count(*) FROM public.complaint_issues) <> 0
    OR (SELECT count(*) FROM public.complaint_citizen_private) <> 0
  THEN RAISE EXCEPTION 'FAIL: cross-citizen data exposure'; END IF;
END;
$check$;
RESET ROLE;

-- KWSC staff gets the water issue, not electric issue, and no private details.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000004', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  IF (SELECT count(*) FROM public.complaints WHERE reference_number='KHI-V1310-ISOLATION') <> 1
    OR (SELECT count(*) FROM public.complaint_issues) <> 1
    OR (SELECT count(*) FROM public.complaint_issues WHERE department_id='kwsc') <> 1
    OR (SELECT count(*) FROM public.complaint_citizen_private) <> 0
  THEN RAISE EXCEPTION 'FAIL: water-staff department isolation'; END IF;
END;
$check$;
RESET ROLE;

-- K-Electric staff gets only the electric issue; unrelated SSGC sees none.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000005', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  IF (SELECT count(*) FROM public.complaint_issues) <> 1
    OR (SELECT count(*) FROM public.complaint_issues WHERE department_id='kelectric') <> 1
    OR (SELECT count(*) FROM public.complaint_citizen_private) <> 0
  THEN RAISE EXCEPTION 'FAIL: electric-staff department isolation'; END IF;
END;
$check$;
RESET ROLE;

SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000006', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  IF (SELECT count(*) FROM public.complaints WHERE reference_number='KHI-V1310-ISOLATION') <> 0
    OR (SELECT count(*) FROM public.complaint_issues) <> 0
    OR (SELECT count(*) FROM public.complaint_citizen_private) <> 0
  THEN RAISE EXCEPTION 'FAIL: unrelated staff data exposure'; END IF;
END;
$check$;
RESET ROLE;

-- An unverified citizen/staff browser cannot write classifier assignments.
DO $check$
BEGIN
  IF has_table_privilege('authenticated', 'public.complaints', 'INSERT')
    OR has_table_privilege('authenticated', 'public.complaint_issues', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.complaint_issues', 'INSERT')
  THEN RAISE EXCEPTION 'FAIL: direct complaint or issue write was granted'; END IF;
END;
$check$;

-- Anonymous guest lookup is allowlisted; do not return contact details.
SET LOCAL ROLE anon;
DO $check$
DECLARE v_record jsonb;
BEGIN
  SELECT public.get_guest_complaint_status(repeat('a',64)) INTO v_record;
  IF coalesce(v_record->>'found','false') <> 'true'
    OR v_record ? 'citizen_phone' OR v_record ? 'citizen_email'
    OR v_record ? 'residential_address' OR v_record ? 'description'
  THEN RAISE EXCEPTION 'FAIL: guest status lookup or PII redaction'; END IF;
END;
$check$;
RESET ROLE;

-- Test staff escalation, administrator-only review, two-department resolution.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000006', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  BEGIN
    PERFORM public.staff_flag_ai_classification_review(
      '9a000000-0000-4000-8000-000000000100', 'ssgc', 'Wrong-department staff must be blocked');
    RAISE EXCEPTION 'FAIL: unrelated staff flagged another department case';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Only active staff assigned%' THEN RAISE; END IF;
  END;
END;
$check$;
RESET ROLE;

SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000004', true);
SET LOCAL ROLE authenticated;
DO $check$
DECLARE v_review uuid;
BEGIN
  SELECT public.staff_flag_ai_classification_review(
    '9a000000-0000-4000-8000-000000000100', 'kelectric',
    'Independent electricity problem overlooked. Phone 03001234567') INTO v_review;
  IF v_review IS NULL OR v_review <> public.staff_flag_ai_classification_review(
    '9a000000-0000-4000-8000-000000000100', 'kelectric',
    'Duplicate test flag should return same review')
  THEN RAISE EXCEPTION 'FAIL: staff review creation/deduplication'; END IF;
  BEGIN
    PERFORM public.get_ai_classification_review_queue();
    RAISE EXCEPTION 'FAIL: staff accessed admin-only AI queue';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Main administrator authorization required%' THEN RAISE; END IF;
  END;
END;
$check$;
RESET ROLE;

SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $check$
DECLARE v_queue jsonb;
DECLARE v_review uuid;
BEGIN
  SELECT public.get_ai_classification_review_queue() INTO v_queue;
  IF jsonb_array_length(v_queue) <> 1
    OR (v_queue->0->>'flagReason') LIKE '%03001234567%'
  THEN RAISE EXCEPTION 'FAIL: admin AI review queue or phone redaction'; END IF;
  SELECT (v_queue->0->>'id')::uuid INTO v_review;
  BEGIN
    PERFORM public.admin_decide_ai_classification_review(
      v_review, 'resolve', ARRAY['kwsc','kelectric','ssgc'], 'too many departments');
    RAISE EXCEPTION 'FAIL: three-department decision was allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'One or two unique active departments are required%' THEN RAISE; END IF;
  END;
  PERFORM public.admin_decide_ai_classification_review(
    v_review, 'resolve', ARRAY['kelectric'], 'Electric issue confirmed by test admin');
END;
$check$;
RESET ROLE;

DO $check$
BEGIN
  IF (SELECT status FROM public.complaints WHERE id='9a000000-0000-4000-8000-000000000100') <> 'assigned'
    OR (SELECT assigned_department_ids FROM public.complaints WHERE id='9a000000-0000-4000-8000-000000000100') <> ARRAY['kelectric']
    OR (SELECT count(*) FROM public.ai_classification_reviews WHERE status='resolved') <> 1
    OR (SELECT count(*) FROM public.complaint_issues WHERE department_id='kwsc' AND status='rejected') <> 1
  THEN RAISE EXCEPTION 'FAIL: human-reviewed department correction'; END IF;
END;
$check$;

-- A cached batch result must be hidden from other department's staff.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000004', true);
SET LOCAL ROLE authenticated;
DO $check$
DECLARE v_cached jsonb;
BEGIN
  SELECT public.staff_accept_incident_case_reports(
    '9a000000-0000-4000-8000-000000000200',
    'v1310-guarded-idempotency-key', NULL) INTO v_cached;
  IF v_cached->>'marker' <> 'authorized-only'
  THEN RAISE EXCEPTION 'FAIL: assigned staff cannot retrieve authorized cached result'; END IF;
END;
$check$;
RESET ROLE;

SELECT pg_catalog.set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000005', true);
SET LOCAL ROLE authenticated;
DO $check$
BEGIN
  BEGIN
    PERFORM public.staff_accept_incident_case_reports(
      '9a000000-0000-4000-8000-000000000200',
      'v1310-guarded-idempotency-key', NULL);
    RAISE EXCEPTION 'FAIL: different department saw cached incident operation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Unauthorized: You do not have active staff credentials%'
    THEN RAISE; END IF;
  END;
END;
$check$;
RESET ROLE;

ROLLBACK;

SELECT 'PASS: citizen/staff/guest isolation, triage, correction, incident cache (rolled back)' AS result;
