-- V13.9: remove accidentally public SECURITY DEFINER complaint RPC routes.
-- Guest submissions must enter through submit-classified-complaint Edge Function,
-- which validates input, computes server-side routing, and calls as service_role.
-- Guarded lookup makes this safe on staff-only staging before core tables land.
DO $guard$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'submit_citizen_complaint'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_function);
  END LOOP;

  -- KMC review must remain callable by authenticated staff only; authorization
  -- is separately enforced inside the function using auth.uid() + membership.
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'staff_review_and_assign_complaint'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', v_function);
  END LOOP;
END;
$guard$;
