-- V13.16.2 staging regression: execute as privileged migration runner.
-- Read-only invariants; this never creates citizens, reports or staff accounts.
DO $$
DECLARE
  v_function oid := 'public.staff_accept_department_report_batch(text,uuid[],text)'::regprocedure;
  v_config text;
BEGIN
  IF NOT has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'Authorized staff role cannot invoke atomic batch RPC';
  END IF;
  IF has_function_privilege('anon', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'Atomic batch RPC exposed to anonymous/public execution';
  END IF;
  IF has_table_privilege('authenticated', 'public.staff_batch_acceptance_requests', 'SELECT')
     OR has_table_privilege('authenticated', 'public.staff_batch_acceptance_requests', 'INSERT')
     OR has_table_privilege('anon', 'public.staff_batch_acceptance_requests', 'SELECT') THEN
    RAISE EXCEPTION 'Batch idempotency ledger is directly accessible to unprivileged roles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'staff_batch_acceptance_requests'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Batch idempotency ledger RLS is disabled';
  END IF;
  SELECT array_to_string(p.proconfig, ',') INTO v_config
  FROM pg_catalog.pg_proc p WHERE p.oid = v_function;
  -- PostgreSQL 17 serializes an empty search_path as search_path="".
  IF v_config NOT IN ('search_path=', 'search_path=""') THEN
    RAISE EXCEPTION 'Atomic batch RPC is missing pinned empty search_path';
  END IF;
  IF NOT (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid = v_function) THEN
    RAISE EXCEPTION 'Atomic batch RPC must enforce server-side authorization';
  END IF;
  RAISE NOTICE 'V13.16.2 atomic batch grant, RLS, search_path and definer invariants PASS';
END;
$$;
