-- V13.16.2: Atomically accept the reports in a staff-visible (potentially
-- virtual) incident group. An array of complaint UUIDs avoids relying on
-- client-generated case identifiers such as C-2001 as database UUIDs.
-- All status changes, citizen timeline events and notification outbox writes
-- occur in the same PostgreSQL transaction through the existing authorized RPC.

CREATE TABLE IF NOT EXISTS public.staff_batch_acceptance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  department_id text NOT NULL REFERENCES public.departments(id),
  idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL,
  result_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_batch_acceptance_requests_key_unique
    UNIQUE (actor_id, department_id, idempotency_key)
);

ALTER TABLE public.staff_batch_acceptance_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_batch_acceptance_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.staff_accept_department_report_batch(
  p_department_id text,
  p_complaint_ids uuid[],
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_ids uuid[];
  v_fingerprint text;
  v_operation public.staff_batch_acceptance_requests%ROWTYPE;
  v_report record;
  v_result jsonb;
  v_accepted integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;

  IF p_department_id IS NULL OR p_department_id = 'unassigned'
     OR NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id) THEN
    RAISE EXCEPTION 'An assigned department is required.' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_main_admin(v_actor) AND NOT EXISTS (
    SELECT 1 FROM public.department_memberships m
    WHERE m.user_id = v_actor AND m.department_id = p_department_id
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active staff membership is required for this department.'
      USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8
     OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'A valid idempotency key is required.' USING ERRCODE = '22023';
  END IF;

  IF p_complaint_ids IS NULL OR cardinality(p_complaint_ids) = 0
     OR cardinality(p_complaint_ids) > 100 OR array_position(p_complaint_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Provide 1 to 100 valid complaint IDs.' USING ERRCODE = '22023';
  END IF;

  SELECT ARRAY(SELECT DISTINCT val FROM unnest(p_complaint_ids) AS val ORDER BY val)
    INTO v_ids;
  IF cardinality(v_ids) <> cardinality(p_complaint_ids) THEN
    RAISE EXCEPTION 'Duplicate complaint IDs are not allowed.' USING ERRCODE = '22023';
  END IF;

  v_fingerprint := pg_catalog.md5(p_department_id || ':' || array_to_string(v_ids, ','));

  -- Unique insertion serializes concurrent requests with the same key.
  -- The ledger row is rolled back automatically if any report fails.
  INSERT INTO public.staff_batch_acceptance_requests
    (actor_id, department_id, idempotency_key, request_fingerprint)
  VALUES (v_actor, p_department_id, p_idempotency_key, v_fingerprint)
  ON CONFLICT (actor_id, department_id, idempotency_key) DO NOTHING;

  SELECT * INTO v_operation
  FROM public.staff_batch_acceptance_requests
  WHERE actor_id = v_actor AND department_id = p_department_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF v_operation.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
    RAISE EXCEPTION 'This idempotency key belongs to a different batch.' USING ERRCODE = '22023';
  END IF;
  IF v_operation.result_json IS NOT NULL THEN
    RETURN v_operation.result_json || pg_catalog.jsonb_build_object('idempotentReplay', true);
  END IF;

  -- Explicit sorted row locks prevent deadlocks and all-or-nothing behaviour
  -- ensures a failed batch never leaves some citizen reports accepted.
  FOR v_report IN
    SELECT c.id, c.status, c.assigned_department_id, c.assigned_department_ids
    FROM public.complaints c
    WHERE c.id = ANY(v_ids)
    ORDER BY c.id
    FOR UPDATE
  LOOP
    IF v_report.assigned_department_id IS DISTINCT FROM p_department_id THEN
      RAISE EXCEPTION 'A report is not assigned to this department.' USING ERRCODE = '42501';
    END IF;
    -- The legacy single-status workflow cannot safely represent independent
    -- acceptance by more than one agency; force those to issue-level review.
    IF pg_catalog.cardinality(coalesce(v_report.assigned_department_ids, ARRAY[]::text[])) > 1 THEN
      RAISE EXCEPTION 'Multi-department reports require issue-level review.' USING ERRCODE = '22023';
    END IF;
    IF v_report.status <> 'assigned' THEN
      RAISE EXCEPTION 'Every report must be assigned and awaiting acceptance.' USING ERRCODE = '22023';
    END IF;

    PERFORM public.staff_update_complaint_status(
      v_report.id,
      'accepted',
      'Complaint Accepted by Department',
      'شکایت محکمہ نے قبول کر لی',
      'Your assigned department has accepted the complaint.',
      'متعلقہ محکمہ نے شکایت قبول کر لی ہے۔'
    );
    v_accepted := v_accepted + 1;
  END LOOP;

  IF v_accepted <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Some reports were missing; no changes were committed.' USING ERRCODE = '22023';
  END IF;

  v_result := pg_catalog.jsonb_build_object(
    'success', true,
    'operationId', v_operation.id,
    'acceptedCount', v_accepted,
    'idempotentReplay', false,
    'executedAt', now()
  );
  UPDATE public.staff_batch_acceptance_requests
  SET result_json = v_result WHERE id = v_operation.id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_accept_department_report_batch(text, uuid[], text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_accept_department_report_batch(text, uuid[], text)
  TO authenticated;
