-- V13.9 read-only security checks. Safe on both empty staging and production.
-- Each row must be PASS. No test users are created and no data is changed.
WITH function_checks AS (
  SELECT
    p.proname,
    NOT has_function_privilege('anon', p.oid, 'EXECUTE') AS anonymous_denied,
    p.proconfig IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(p.proconfig) config WHERE config LIKE 'search_path=%'
    ) AS path_pinned
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN (
      'is_main_admin',
      'get_active_staff_department',
      'approve_access_request',
      'reject_access_request',
      'revoke_staff_access',
      'submit_citizen_complaint',
      'staff_review_and_assign_complaint'
    )
), checks AS (
  SELECT 'All privileged entry points reject anon EXECUTE' AS check_name,
         COALESCE(bool_and(anonymous_denied), false) AS passed FROM function_checks
  UNION ALL
  SELECT 'All privileged entry points pin search_path',
         COALESCE(bool_and(path_pinned), false) FROM function_checks
  UNION ALL
  SELECT 'Authenticated user cannot directly update profiles.role',
         NOT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
  UNION ALL
  SELECT 'Anonymous users can read active department directory',
         has_table_privilege('anon', 'public.departments', 'SELECT')
  UNION ALL
  SELECT 'All public tables have RLS enabled',
         NOT EXISTS (
           SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
           WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
         )
  UNION ALL
  SELECT 'Complaint intake, when installed, is service_role only',
         NOT EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname='submit_citizen_complaint'
             AND (
               has_function_privilege('anon',p.oid,'EXECUTE')
               OR has_function_privilege('authenticated',p.oid,'EXECUTE')
               OR NOT has_function_privilege('service_role',p.oid,'EXECUTE')
             )
         )
)
SELECT check_name, CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks ORDER BY check_name;
