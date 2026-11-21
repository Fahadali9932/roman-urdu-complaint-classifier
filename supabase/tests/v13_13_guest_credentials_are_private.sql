-- Run on a staging database after the V13.13 migration.
DO $check$
BEGIN
  IF pg_catalog.has_table_privilege('authenticated', 'public.complaints', 'SELECT')
     OR pg_catalog.has_column_privilege('authenticated', 'public.complaints', 'claim_code_hash', 'SELECT')
     OR pg_catalog.has_column_privilege('authenticated', 'public.complaints', 'guest_tracking_hash', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: Authenticated users can read a complaint guest credential digest';
  END IF;
  IF NOT pg_catalog.has_column_privilege('authenticated', 'public.complaints', 'reference_number', 'SELECT')
     OR NOT pg_catalog.has_column_privilege('authenticated', 'public.complaints', 'status', 'SELECT')
     OR NOT pg_catalog.has_column_privilege('service_role', 'public.complaints', 'claim_code_hash', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: Complaint reads or service role access regressed';
  END IF;
  RAISE NOTICE 'PASS: Guest digests hidden; standard complaint reads preserved';
END;
$check$;
