-- V13.11 staging-only transaction test. Never run against production.
-- Simulated SQL identities, not genuine Supabase Auth/HTTP sessions.
BEGIN;

DO $check$
BEGIN
  IF pg_catalog.has_function_privilege('anon', 'public.reserve_complaint_intake_quota(text,boolean)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', 'public.reserve_complaint_intake_quota(text,boolean)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FAIL: unauthorised quota RPC access'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app_private' AND c.relname = 'complaint_intake_rate_limits'
      AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'FAIL: quota table RLS absent'; END IF;
END;
$check$;

SET LOCAL ROLE service_role;
DO $quota$
DECLARE v_i integer; v_accepted integer := 0;
BEGIN
  FOR v_i IN 1..10 LOOP
    IF NOT public.reserve_complaint_intake_quota(repeat('a', 64), false)
    THEN RAISE EXCEPTION 'FAIL: valid guest quota rejected early'; END IF;
  END LOOP;
  IF public.reserve_complaint_intake_quota(repeat('a', 64), false)
  THEN RAISE EXCEPTION 'FAIL: guest quota exceeded without denial'; END IF;

  FOR v_i IN 1..30 LOOP
    IF NOT public.reserve_complaint_intake_quota(repeat('b', 64), true)
    THEN RAISE EXCEPTION 'FAIL: valid authenticated quota rejected early'; END IF;
  END LOOP;
  IF public.reserve_complaint_intake_quota(repeat('b', 64), true)
  THEN RAISE EXCEPTION 'FAIL: authenticated quota exceeded without denial'; END IF;

  IF public.reserve_complaint_intake_quota('not-a-hash', false)
  THEN RAISE EXCEPTION 'FAIL: invalid fingerprint accepted'; END IF;

  -- IP spoofing may change the client bucket. The global cap must still hold.
  FOR v_i IN 1..100 LOOP
    IF public.reserve_complaint_intake_quota(repeat(pg_catalog.md5(v_i::text), 2), false)
    THEN v_accepted := v_accepted + 1; END IF;
  END LOOP;
  IF v_accepted <> 80 THEN
    RAISE EXCEPTION 'FAIL: global minute cap bypassed, accepted %', v_accepted;
  END IF;
END;
$quota$;
RESET ROLE;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
) VALUES
('00000000-0000-0000-0000-000000000000','9b000000-0000-4000-8000-000000000001','authenticated','authenticated','v1311-admin@example.invalid',now(),now(),'{}','{}'),
('00000000-0000-0000-0000-000000000000','9b000000-0000-4000-8000-000000000002','authenticated','authenticated','v1311-kmc@example.invalid',now(),now(),'{}','{}'),
('00000000-0000-0000-0000-000000000000','9b000000-0000-4000-8000-000000000003','authenticated','authenticated','v1311-citizen@example.invalid',now(),now(),'{}','{}');

UPDATE public.profiles SET role = CASE
  WHEN id='9b000000-0000-4000-8000-000000000001' THEN 'main_admin'
  WHEN id='9b000000-0000-4000-8000-000000000002' THEN 'department_staff'
  ELSE 'citizen' END
WHERE id IN ('9b000000-0000-4000-8000-000000000001','9b000000-0000-4000-8000-000000000002','9b000000-0000-4000-8000-000000000003');

INSERT INTO public.department_memberships (user_id,department_id,status,approved_by)
VALUES ('9b000000-0000-4000-8000-000000000002','kmc','active','9b000000-0000-4000-8000-000000000001');

INSERT INTO public.complaints (
  id,reference_number,citizen_id,description,incident_district,
  incident_locality,incident_public_location,status,assigned_department_id,
  assigned_department_ids,predicted_department_id,prediction_confidence
) VALUES
('9b000000-0000-4000-8000-000000000100','KHI-V1311-ADMIN','9b000000-0000-4000-8000-000000000003',
 'Transformer aur road ke masle','District Central','Nazimabad','Test Street','assigned',
 'kmc',ARRAY['kmc','kelectric'],'kmc',0.8),
('9b000000-0000-4000-8000-000000000101','KHI-V1311-REVIEW','9b000000-0000-4000-8000-000000000003',
 'Complaint under review','District East','Gulshan','Test Street','under_review',
 NULL,ARRAY[]::text[],NULL,0.1);

INSERT INTO public.complaint_issues(complaint_id,department_id,issue_type,status) VALUES
('9b000000-0000-4000-8000-000000000100','kmc','road','assigned'),
('9b000000-0000-4000-8000-000000000100','kelectric','transformer','assigned');

SELECT pg_catalog.set_config('request.jwt.claim.sub','9b000000-0000-4000-8000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $check$ BEGIN
  BEGIN
    PERFORM public.admin_reassign_complaint('9b000000-0000-4000-8000-000000000100','ssgc','unauthorised');
    RAISE EXCEPTION 'FAIL: citizen reassigned admin case';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
END $check$;
RESET ROLE;

SELECT pg_catalog.set_config('request.jwt.claim.sub','9b000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.admin_reassign_complaint('9b000000-0000-4000-8000-000000000100','ssgc','Verified independent gas fault');
RESET ROLE;

SELECT pg_catalog.set_config('request.jwt.claim.sub','9b000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT public.staff_review_and_assign_complaint('9b000000-0000-4000-8000-000000000101','kelectric','Transformer fault verified');
RESET ROLE;

DO $check$ BEGIN
  IF (SELECT assigned_department_ids FROM public.complaints WHERE id='9b000000-0000-4000-8000-000000000100') <> ARRAY['ssgc']
    OR (SELECT count(*) FROM public.complaint_issues WHERE complaint_id='9b000000-0000-4000-8000-000000000100' AND status='rejected') <> 2
    OR (SELECT count(*) FROM public.complaint_issues WHERE complaint_id='9b000000-0000-4000-8000-000000000100' AND department_id='ssgc' AND status='assigned') <> 1
    OR (SELECT count(*) FROM public.complaint_issues WHERE complaint_id='9b000000-0000-4000-8000-000000000101' AND department_id='kelectric' AND status='assigned') <> 1
    OR (SELECT count(*) FROM public.complaint_audit_logs WHERE complaint_id IN ('9b000000-0000-4000-8000-000000000100','9b000000-0000-4000-8000-000000000101')) <> 2
  THEN RAISE EXCEPTION 'FAIL: reassignment/audit consistency'; END IF;
END $check$;

ROLLBACK;
SELECT 'PASS: durable quotas, service-only access, global cap, reassignment and audit (fixtures rolled back)' AS result;
