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
CREATE OR REPLACE VIEW public.v23_operational_cases_view AS
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

-- ------------------------------------------------------------------------------
-- 3. RECONCILE MULTI-DEPARTMENT RESOLUTION STATUS
-- If one department approves an order on a multi-department complaint,
-- update the complaint status to 'partly_resolved' until all orders are verified.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v23_sync_multi_dept_complaint_status(p_complaint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_orders integer;
  v_verified_orders integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'verified')
  INTO v_total_orders, v_verified_orders
  FROM public.department_work_orders
  WHERE anchor_complaint_id = p_complaint_id;

  IF v_total_orders > 0 THEN
    IF v_verified_orders = v_total_orders THEN
      -- All departments resolved their work orders
      UPDATE public.complaints
      SET status = 'resolved', updated_at = now()
      WHERE id = p_complaint_id AND status <> 'resolved';
    ELSIF v_verified_orders > 0 THEN
      -- At least one department resolved, others pending
      UPDATE public.complaints
      SET status = 'partly_resolved', updated_at = now()
      WHERE id = p_complaint_id AND status NOT IN ('resolved', 'partly_resolved');
    END IF;
  END IF;
END;
$$;

-- Trigger on work order status changes to synchronize parent complaint
CREATE OR REPLACE FUNCTION public.v23_trigger_work_order_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status) AND NEW.anchor_complaint_id IS NOT NULL THEN
    PERFORM public.v23_sync_multi_dept_complaint_status(NEW.anchor_complaint_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_v23_work_order_status_sync ON public.department_work_orders;
CREATE TRIGGER trg_v23_work_order_status_sync
AFTER UPDATE OF status ON public.department_work_orders
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
-- 6. PRIVATE STORAGE BUCKET ARCHITECTURE
-- Ensure private storage buckets exist with strict size and MIME type limits
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'v23_staff_profile_photos_insert' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY v23_staff_profile_photos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'staff-profile-photos-private'
      AND (
        -- User uploading their own profile photo
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_main_admin(auth.uid())
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'v23_staff_profile_photos_select' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY v23_staff_profile_photos_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'staff-profile-photos-private'
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.department_memberships dm
          WHERE dm.user_id = auth.uid() AND dm.staff_role = 'head' AND dm.status = 'active'
        )
        OR public.is_main_admin(auth.uid())
      )
    );
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.v23_haversine_distance_meters(numeric, numeric, numeric, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.v23_admin_provision_initial_hod(uuid, text, text, text) TO authenticated, service_role;
GRANT SELECT ON public.v23_operational_cases_view TO authenticated;
