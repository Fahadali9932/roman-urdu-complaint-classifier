-- Read-only staging gate. Run after every schema backfill step and before
-- creating or inviting test accounts. A single FAIL blocks real-user testing.
-- This script intentionally performs no changes and requires no sample PII.

WITH inventory AS (
  SELECT
    to_regclass('public.complaints') IS NOT NULL AS has_complaints,
    to_regclass('public.complaint_citizen_private') IS NOT NULL AS has_private,
    to_regclass('public.complaint_issues') IS NOT NULL AS has_issues,
    to_regclass('public.ai_classification_reviews') IS NOT NULL AS has_ai_reviews
), policies AS (
  SELECT
    coalesce(bool_and(c.relrowsecurity), false) AS all_complaint_tables_have_rls
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname IN (
      'complaints', 'complaint_citizen_private', 'complaint_issues',
      'ai_classification_reviews'
    )
), exposed_functions AS (
  SELECT count(*) AS anon_privileged_definers
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
    -- Guest tracking by secret is a deliberate public endpoint and must be
    -- evaluated separately for brute-force resistance and PII redaction.
    AND p.proname <> 'get_guest_complaint_status'
), exposed_views AS (
  SELECT count(*) AS definer_views
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND NOT coalesce('security_invoker=true' = ANY(c.reloptions), false)
    AND pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
)
SELECT 'Required complaint schema' AS check_name,
       CASE WHEN has_complaints AND has_private AND has_issues AND has_ai_reviews
         THEN 'PASS' ELSE 'FAIL' END AS status
FROM inventory
UNION ALL
SELECT 'Complaint tables use RLS',
       CASE WHEN all_complaint_tables_have_rls AND
         (SELECT has_complaints AND has_private AND has_issues AND has_ai_reviews FROM inventory)
         THEN 'PASS' ELSE 'FAIL' END
FROM policies
UNION ALL
SELECT 'No anonymous privileged SECURITY DEFINER RPCs',
       CASE WHEN anon_privileged_definers = 0 THEN 'PASS' ELSE 'FAIL' END
FROM exposed_functions
UNION ALL
SELECT 'No anonymous SECURITY DEFINER views',
       CASE WHEN definer_views = 0 THEN 'PASS' ELSE 'FAIL' END
FROM exposed_views;
