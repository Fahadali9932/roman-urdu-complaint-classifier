-- =============================================================================
-- AWAAZ-E-AWAM — SECURITY HARDENING BEFORE FIRST LIVE RELEASE
-- Applies after the Phase 2 and Phase 3B migrations.
-- =============================================================================

-- Every legacy definer function must run with a fixed path; Phase 3B only
-- hardened a subset of the Phase 2 functions.
ALTER FUNCTION public.approve_access_request(UUID)
  SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.reject_access_request(UUID, TEXT)
  SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.approve_access_request(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_access_request(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_staff_access(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_provision_department_staff(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_auth_rate_limit(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_auth_attempt(TEXT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_main_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_staff_department(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_access_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_access_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) TO authenticated;

-- Deliberately no client grant for admin_provision_department_staff. Auth user
-- creation and invited-staff provisioning are performed only by the protected
-- Edge Function using SUPABASE_SERVICE_ROLE_KEY in its server environment.
-- The custom auth-rate-limit RPCs are also intentionally not public: a browser
-- caller could otherwise reset or exhaust another account's limiter.

-- Rebuild the administrator RPCs with fixed path and strict state transitions.
CREATE OR REPLACE FUNCTION public.approve_access_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_request public.department_access_requests%ROWTYPE;
BEGIN
    IF v_caller_id IS NULL OR NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can approve access requests.';
    END IF;

    SELECT * INTO v_request
    FROM public.department_access_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;
    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending requests can be approved.';
    END IF;

    UPDATE public.department_access_requests
    SET status = 'approved', reviewed_by = v_caller_id, reviewed_at = now(), updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
    VALUES (v_request.user_id, v_request.full_name, v_request.work_email, 'department_staff', now(), now())
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name, email = EXCLUDED.email,
          role = 'department_staff', updated_at = now();

    INSERT INTO public.department_memberships
      (user_id, department_id, status, approved_by, approved_at, updated_at)
    VALUES
      (v_request.user_id, v_request.department_id, 'active', v_caller_id, now(), now())
    ON CONFLICT (user_id, department_id) DO UPDATE
      SET status = 'active', approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at, revoked_by = NULL, revoked_at = NULL,
          revocation_reason = NULL, updated_at = now();

    INSERT INTO public.access_audit_log
      (action, target_user_id, target_email, department_id, actor_id, details)
    VALUES
      ('request_approved', v_request.user_id, v_request.work_email, v_request.department_id,
       v_caller_id, jsonb_build_object('request_id', p_request_id));

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_access_request(p_request_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_request public.department_access_requests%ROWTYPE;
BEGIN
    IF v_caller_id IS NULL OR NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can reject access requests.';
    END IF;
    IF coalesce(length(btrim(p_reason)), 0) = 0 THEN
        RAISE EXCEPTION 'A rejection reason is required.';
    END IF;

    SELECT * INTO v_request
    FROM public.department_access_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;
    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending requests can be rejected.';
    END IF;

    UPDATE public.department_access_requests
    SET status = 'rejected', rejection_reason = btrim(p_reason),
        reviewed_by = v_caller_id, reviewed_at = now(), updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.access_audit_log
      (action, target_user_id, target_email, department_id, actor_id, details)
    VALUES
      ('request_rejected', v_request.user_id, v_request.work_email, v_request.department_id,
       v_caller_id, jsonb_build_object('request_id', p_request_id));

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_staff_access(p_membership_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_membership public.department_memberships%ROWTYPE;
    v_target_email TEXT;
BEGIN
    IF v_caller_id IS NULL OR NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can revoke staff access.';
    END IF;
    IF coalesce(length(btrim(p_reason)), 0) = 0 THEN
        RAISE EXCEPTION 'A revocation reason is required.';
    END IF;

    SELECT * INTO v_membership
    FROM public.department_memberships
    WHERE id = p_membership_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership not found.';
    END IF;
    IF v_membership.status <> 'active' THEN
        RAISE EXCEPTION 'Only active memberships can be revoked.';
    END IF;

    UPDATE public.department_memberships
    SET status = 'revoked', revoked_by = v_caller_id, revoked_at = now(),
        revocation_reason = btrim(p_reason), updated_at = now()
    WHERE id = p_membership_id;

    UPDATE public.department_access_requests
    SET status = 'revoked', updated_at = now()
    WHERE user_id = v_membership.user_id
      AND department_id = v_membership.department_id
      AND status = 'approved';

    SELECT email INTO v_target_email FROM public.profiles WHERE id = v_membership.user_id;
    INSERT INTO public.access_audit_log
      (action, target_user_id, target_email, department_id, actor_id, details)
    VALUES
      ('access_revoked', v_membership.user_id, coalesce(v_target_email, 'unknown'),
       v_membership.department_id, v_caller_id,
       jsonb_build_object('membership_id', p_membership_id));

    RETURN jsonb_build_object('success', true, 'membership_id', p_membership_id, 'status', 'revoked');
END;
$$;

-- Keep the safe department projection subject to the caller's table RLS.
ALTER VIEW public.department_complaints_view
  SET (security_invoker = true, security_barrier = true);
REVOKE ALL ON public.department_complaints_view FROM PUBLIC, anon;
GRANT SELECT ON public.department_complaints_view TO authenticated;

-- Prevent an account owner from self-promoting by updating a role column.
DROP POLICY IF EXISTS "Users can update own non-role profile fields" ON public.profiles;
CREATE POLICY "Users can update own display profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- A requester cannot forge reviewer metadata or submit a non-pending request.
DROP POLICY IF EXISTS "Applicants can submit their own access request"
  ON public.department_access_requests;
CREATE POLICY "Applicants can submit clean pending access requests"
    ON public.department_access_requests FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND status = 'pending'
      AND rejection_reason IS NULL
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
    );

-- Descriptions reach department staff. Reject obvious direct identifiers so
-- contact details remain in complaint_citizen_private instead.
CREATE OR REPLACE FUNCTION public.reject_contact_identifiers_from_complaint()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.description ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}'
     OR NEW.description ~ '((\\+?92|0)?3[0-9]{2}[-[:space:]]?[0-9]{7})'
     OR NEW.description ~ '[0-9]{5}-?[0-9]{7}-?[0-9]' THEN
    RAISE EXCEPTION 'Complaint description must not contain contact or identity numbers.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS complaints_reject_contact_identifiers ON public.complaints;
CREATE TRIGGER complaints_reject_contact_identifiers
BEFORE INSERT OR UPDATE OF description ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.reject_contact_identifiers_from_complaint();

-- Explicit object privileges complement RLS and leave no accidental direct
-- write routes to roles or audit/security tables.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, email, updated_at) ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.department_access_requests TO authenticated;
GRANT SELECT ON public.department_memberships TO authenticated;
GRANT SELECT ON public.access_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.complaints TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.complaint_citizen_private TO authenticated;
GRANT SELECT ON public.complaint_timeline_events TO authenticated;

-- Do not inherit permissive access for future sensitive tables.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
