-- ==============================================================================
-- AWAAZ-E-AWAM (آوازِ عوام) — V23.0B DATABASE RECONCILIATION & SECURITY
-- Migration: 20261208000000_v23_0b_database_reconciliation.sql
-- Additive, idempotent, lock-safe PostgreSQL migration reconciling operational models,
-- multi-department partial resolution, storage integrity, private buckets, and administrative HOD provisioning.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FORMAL OPERATIONAL MODEL RECONCILIATION
-- Document department_work_orders as authoritative operational model while
-- preserving legacy incident_cases tables without breaking foreign keys.
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.department_work_orders IS 
'AUTHORITATIVE OPERATIONAL MODEL (V16/V19/V23): Work orders dispatched by Department Heads to Field Officers.';

COMMENT ON TABLE public.incident_cases IS 
'LEGACY MODEL (V5): Preserved for schema backward compatibility. Operational queries should use department_work_orders.';

-- Forward-compatible view bridging work orders to legacy incident case schema
-- Explicitly configured WITH (security_invoker = true) to strictly enforce RLS policies of the caller.
CREATE OR REPLACE VIEW public.v23_operational_cases_view
WITH (security_invoker = true) AS
SELECT
  w.id AS case_id,
  w.department_id,
  w.case_label AS case_number,
  w.instructions,
  w.officer_id,
  w.status AS work_status,
  w.due_at,
  w.started_at,
  w.effective_deadline_at,
  w.gps_verified,
  w.anchor_complaint_id,
  c.reference_number,
  c.incident_district,
  c.incident_locality,
  c.status AS complaint_status,
  w.created_at,
  w.updated_at
FROM public.department_work_orders w
JOIN public.complaints c ON c.id = w.anchor_complaint_id;

-- ------------------------------------------------------------------------------
-- 2. STORAGE PATH INTEGRITY CONSTRAINTS
-- Prevent directory traversal (..) and invalid object key formats
-- ------------------------------------------------------------------------------
ALTER TABLE public.complaint_evidence
  DROP CONSTRAINT IF EXISTS chk_complaint_evidence_storage_path,
  ADD CONSTRAINT chk_complaint_evidence_storage_path
    CHECK (storage_path !~ '\.\.' AND storage_path ~ '^[0-9a-fA-F-]+/[0-9a-fA-F-]+\.[a-zA-Z0-9]+$');

ALTER TABLE public.department_work_evidence
  DROP CONSTRAINT IF EXISTS chk_department_work_evidence_storage_path,
  ADD CONSTRAINT chk_department_work_evidence_storage_path
    CHECK (storage_path !~ '\.\.' AND storage_path ~ '^[0-9a-fA-F-]+/[0-9a-fA-F-]+\.[a-zA-Z0-9]+$');

-- Ensure complaints status check constraint supports all lifecycle states including partly_resolved
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_status_check,
  ADD CONSTRAINT complaints_status_check
    CHECK (status IN ('submitted', 'under_review', 'assigned', 'in_progress', 'partly_resolved', 'resolved', 'rejected'));

-- ------------------------------------------------------------------------------
-- 3. RECONCILE MULTI-DEPARTMENT RESOLUTION STATUS
-- Synchronizes overall complaint completion against EVERY required department
-- (from complaint_issues, assigned_department_ids, or assigned_department_id).
-- Fully covers all 9 lifecycle scenarios:
-- 1. All required departments verified -> resolved
-- 2. Subset of required departments verified -> partly_resolved
-- 3. Returned resolution/rework drops resolved back -> partly_resolved or in_progress
-- 4. Unassigned required department -> never resolved (partly_resolved or assigned/in_progress)
-- 5. Fieldwork in progress, none verified -> in_progress
-- 6. Orders assigned / pending acceptance -> assigned
-- 7. All required departments rejected -> rejected
-- 8. Returned for rework -> in_progress (or partly_resolved if other depts verified)
-- 9. No assigned orders -> preserves initial intake status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v23_sync_multi_dept_complaint_status(p_complaint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_status text;
  v_target_dept_count integer := 0;
  v_assigned_count integer := 0;
  v_verified_count integer := 0;
  v_in_progress_count integer := 0;
  v_rework_count integer := 0;
  v_rejected_count integer := 0;
  v_new_status text := NULL;
BEGIN
  IF p_complaint_id IS NULL THEN
    RETURN;
  END IF;

  SELECT status INTO v_current_status
  FROM public.complaints
  WHERE id = p_complaint_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Identify distinct required departments for this complaint
  WITH required_departments AS (
    SELECT DISTINCT department_id
    FROM public.complaint_issues
    WHERE complaint_id = p_complaint_id AND department_id IS NOT NULL
    UNION
    SELECT DISTINCT unnest(assigned_department_ids) AS department_id
    FROM public.complaints
    WHERE id = p_complaint_id AND assigned_department_ids IS NOT NULL
    UNION
    SELECT assigned_department_id AS department_id
    FROM public.complaints
    WHERE id = p_complaint_id AND assigned_department_id IS NOT NULL
  ),
  all_target_depts AS (
    SELECT department_id FROM required_departments
    UNION
    SELECT DISTINCT department_id
    FROM public.department_work_orders
    WHERE anchor_complaint_id = p_complaint_id AND department_id IS NOT NULL
  ),
  dept_orders_summary AS (
    SELECT
      t.department_id,
      count(w.id) AS orders_count,
      count(w.id) FILTER (WHERE w.status = 'verified') AS verified_count,
      count(w.id) FILTER (WHERE w.status IN ('in_progress', 'completed')) AS in_progress_count,
      count(w.id) FILTER (WHERE w.status = 'returned_for_rework') AS rework_count,
      count(w.id) FILTER (WHERE w.status = 'rejected') AS rejected_count
    FROM all_target_depts t
    LEFT JOIN public.department_work_orders w
      ON w.anchor_complaint_id = p_complaint_id AND w.department_id = t.department_id
    GROUP BY t.department_id
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE orders_count > 0),
    count(*) FILTER (WHERE verified_count > 0),
    count(*) FILTER (WHERE in_progress_count > 0),
    count(*) FILTER (WHERE rework_count > 0),
    count(*) FILTER (WHERE orders_count > 0 AND rejected_count = orders_count)
  INTO
    v_target_dept_count,
    v_assigned_count,
    v_verified_count,
    v_in_progress_count,
    v_rework_count,
    v_rejected_count
  FROM dept_orders_summary;

  IF v_target_dept_count = 0 THEN
    RETURN;
  END IF;

  -- Scenario 1: All required departments have completed and verified work
  IF v_verified_count = v_target_dept_count THEN
    v_new_status := 'resolved';

  -- Scenario 2: At least one department is verified, but not all required departments are verified
  ELSIF v_verified_count > 0 THEN
    v_new_status := 'partly_resolved';

  -- Scenario 7: All required departments have assigned orders and every order is rejected
  ELSIF v_assigned_count = v_target_dept_count AND v_rejected_count = v_target_dept_count THEN
    v_new_status := 'rejected';

  -- Scenario 5 & 8: Active field operations or rework in progress with zero verified departments
  ELSIF v_in_progress_count > 0 OR v_rework_count > 0 THEN
    v_new_status := 'in_progress';

  -- Scenario 6: Orders exist and are assigned/pending acceptance, none active or verified
  ELSIF v_assigned_count > 0 THEN
    -- If currently submitted or under_review, advance to assigned
    IF v_current_status IN ('submitted', 'under_review') THEN
      v_new_status := 'assigned';
    ELSIF v_current_status IN ('resolved', 'partly_resolved') THEN
      -- Scenario 3: Returned resolution drops back when no orders remain verified
      v_new_status := 'assigned';
    END IF;

  -- Scenario 9: No work orders exist yet; preserve current status
  ELSE
    RETURN;
  END IF;

  -- Apply status transition if different from current
  IF v_new_status IS NOT NULL AND v_new_status IS DISTINCT FROM v_current_status THEN
    UPDATE public.complaints
    SET status = v_new_status, updated_at = now()
    WHERE id = p_complaint_id;
  END IF;
END;
$$;

-- Restricted grants: only service_role should execute status synchronization directly
REVOKE EXECUTE ON FUNCTION public.v23_sync_multi_dept_complaint_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v23_sync_multi_dept_complaint_status(uuid) TO service_role;

-- Trigger on work order creation, status change, or deletion to synchronize parent complaint
CREATE OR REPLACE FUNCTION public.v23_trigger_work_order_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.anchor_complaint_id IS NOT NULL THEN
      PERFORM public.v23_sync_multi_dept_complaint_status(OLD.anchor_complaint_id);
    END IF;
    RETURN OLD;
  ELSE
    IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
      IF NEW.anchor_complaint_id IS NOT NULL THEN
        PERFORM public.v23_sync_multi_dept_complaint_status(NEW.anchor_complaint_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.v23_trigger_work_order_status_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v23_trigger_work_order_status_sync() TO service_role;

DROP TRIGGER IF EXISTS trg_v23_work_order_status_sync ON public.department_work_orders;
CREATE TRIGGER trg_v23_work_order_status_sync
AFTER INSERT OR UPDATE OF status OR DELETE ON public.department_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.v23_trigger_work_order_status_sync();

-- ------------------------------------------------------------------------------
-- 4. SERVER-SIDE HAVERSINE DISTANCE HELPER
-- Recomputes physical proximity independently in meters (Earth radius = 6371000m)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v23_haversine_distance_meters(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_rad double precision := 0.017453292519943295; -- pi / 180
  v_dlat double precision;
  v_dlon double precision;
  v_a double precision;
  v_c double precision;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  v_dlat := (lat2 - lat1) * v_rad;
  v_dlon := (lon2 - lon1) * v_rad;
  v_a := sin(v_dlat / 2.0)^2 + cos(lat1 * v_rad) * cos(lat2 * v_rad) * sin(v_dlon / 2.0)^2;
  v_c := 2.0 * atan2(sqrt(v_a), sqrt(1.0 - v_a));
  RETURN round((6371000.0 * v_c)::numeric, 2);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. SECURE INITIAL HOD ADMINISTRATIVE PROVISIONING
-- Authorized administrative mechanism to provision initial HOD accounts
-- without exposing service-role keys or requiring central admin frontend.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v23_admin_provision_initial_hod(
  p_user_id uuid,
  p_department_id text,
  p_full_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_dept_exists boolean;
  v_membership_id uuid;
BEGIN
  -- Caller must be main_admin or executing under service role
  IF v_caller IS NOT NULL AND NOT public.is_main_admin(v_caller) THEN
    RAISE EXCEPTION 'Only Main Administrator can provision initial Department Heads.' USING ERRCODE = '42501';
  END IF;

  -- Validate target department
  SELECT EXISTS (
    SELECT 1 FROM public.departments WHERE id = p_department_id AND is_active = true
  ) INTO v_dept_exists;

  IF NOT v_dept_exists THEN
    RAISE EXCEPTION 'Department % is not active or does not exist.', p_department_id USING ERRCODE = 'P0002';
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, full_name, email, role, updated_at)
  VALUES (p_user_id, p_full_name, p_email, 'department_staff', now())
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, role = 'department_staff', updated_at = now();

  -- Upsert active HOD membership
  INSERT INTO public.department_memberships (
    user_id,
    department_id,
    staff_role,
    status,
    approved_by,
    approved_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_department_id,
    'head',
    'active',
    COALESCE(v_caller, p_user_id),
    now(),
    now()
  )
  ON CONFLICT (user_id, department_id) DO UPDATE
  SET
    staff_role = 'head',
    status = 'active',
    revoked_at = NULL,
    revocation_reason = NULL,
    updated_at = now()
  RETURNING id INTO v_membership_id;

  -- Record in audit log
  INSERT INTO public.access_audit_log (
    action,
    target_user_id,
    target_email,
    department_id,
    actor_id,
    details
  )
  VALUES (
    'admin_provisioned',
    p_user_id,
    p_email,
    p_department_id,
    v_caller,
    jsonb_build_object('role', 'head', 'provisioned_at', now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'membershipId', v_membership_id,
    'departmentId', p_department_id,
    'userId', p_user_id,
    'role', 'head'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. PRIVATE STORAGE BUCKET ARCHITECTURE & STRICT DEPARTMENT PHOTO POLICY
-- Ensure private storage buckets exist with strict size and MIME type limits.
-- HOD can ONLY view photos of officers within their OWN active department.
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('complaint-evidence-private', 'complaint-evidence-private', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('department-work-proof-private', 'department-work-proof-private', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('staff-profile-photos-private', 'staff-profile-photos-private', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage object policies for staff-profile-photos-private
DROP POLICY IF EXISTS v23_staff_profile_photos_insert ON storage.objects;
CREATE POLICY v23_staff_profile_photos_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'staff-profile-photos-private'
  AND (
    -- User uploading their own profile photo (folder name is user_id)
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_main_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS v23_staff_profile_photos_select ON storage.objects;
CREATE POLICY v23_staff_profile_photos_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'staff-profile-photos-private'
  AND (
    -- Officer selecting their own profile photo
    (storage.foldername(name))[1] = auth.uid()::text
    -- Department Head selecting photo of an officer in the SAME department
    OR EXISTS (
      SELECT 1
      FROM public.department_memberships head_mem
      JOIN public.department_memberships officer_mem
        ON head_mem.department_id = officer_mem.department_id
      WHERE head_mem.user_id = auth.uid()
        AND head_mem.staff_role = 'head'
        AND head_mem.status = 'active'
        AND officer_mem.user_id::text = (storage.foldername(name))[1]
        AND officer_mem.status = 'active'
    )
    OR public.is_main_admin(auth.uid())
  )
);

-- ------------------------------------------------------------------------------
-- 7. OFFICER ONBOARDING OTPS & SECURE CONTACT EMAIL
-- Server-side OTP delivery and verification table with salted SHA-256 hash,
-- attempt limits, expiration, and resend cooldown.
-- ------------------------------------------------------------------------------
ALTER TABLE public.officer_profile_details
  ADD COLUMN IF NOT EXISTS contact_email text;

CREATE TABLE IF NOT EXISTS public.officer_onboarding_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  otp_hash text NOT NULL,
  salt text NOT NULL,
  attempts_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  resend_cooldown_until timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_otps_user ON public.officer_onboarding_otps(user_id);
ALTER TABLE public.officer_onboarding_otps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.officer_onboarding_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.officer_onboarding_otps TO service_role;

GRANT EXECUTE ON FUNCTION public.v23_haversine_distance_meters(numeric, numeric, numeric, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.v23_admin_provision_initial_hod(uuid, text, text, text) TO authenticated, service_role;
GRANT SELECT ON public.v23_operational_cases_view TO authenticated;
