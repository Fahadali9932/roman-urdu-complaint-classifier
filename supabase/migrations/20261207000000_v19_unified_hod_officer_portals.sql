-- ==============================================================================
-- V19: UNIFIED HOD & OFFICER PORTALS — COMMENCEMENT DEADLINES,
--      GPS ACCURACY AUDIT, EVIDENCE VERIFICATION & NOTIFICATIONS
-- Additive, idempotent, lock-safe PostgreSQL migration built against verified schema.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. WORK ORDERS EXTENSION: COMMENCEMENT DEADLINES & GPS PROXIMITY AUDITING
-- ------------------------------------------------------------------------------
ALTER TABLE public.department_work_orders
  ADD COLUMN IF NOT EXISTS assigned_duration_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS effective_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS gps_latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS gps_longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS gps_accuracy_m numeric(6, 2),
  ADD COLUMN IF NOT EXISTS gps_distance_m numeric(8, 2),
  ADD COLUMN IF NOT EXISTS gps_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS evidence_integrity_status text NOT NULL DEFAULT 'verified';

-- Backfill effective_deadline_at for active/in-progress orders lacking it
UPDATE public.department_work_orders
SET effective_deadline_at = due_at
WHERE effective_deadline_at IS NULL AND due_at IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. STAFF NOTIFICATIONS & COMMUNICATIONS LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general' CHECK (notification_type IN ('general', 'assignment', 'warning', 'deadline', 'verification', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_dept
  ON public.staff_notifications(user_id, department_id, is_read);

-- ------------------------------------------------------------------------------
-- 3. FORMAL OFFICER SUPERVISORY NOTICES / WARNINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'formal' CHECK (severity IN ('advisory', 'formal', 'final')),
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_warnings_officer_dept
  ON public.officer_warnings(officer_id, department_id);

-- ------------------------------------------------------------------------------
-- 4. OFFICER ACTIVITY HEARTBEATS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_activity_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  active_view text NOT NULL DEFAULT 'work'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_officer_heartbeat_officer
  ON public.officer_activity_heartbeats(officer_id);

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES FOR NOTIFICATIONS, WARNINGS & HEARTBEATS
-- ------------------------------------------------------------------------------
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_activity_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_notifications_select_policy ON public.staff_notifications;
CREATE POLICY staff_notifications_select_policy ON public.staff_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = staff_notifications.department_id
        AND m.role = 'head'
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS staff_notifications_update_policy ON public.staff_notifications;
CREATE POLICY staff_notifications_update_policy ON public.staff_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS officer_warnings_select_policy ON public.officer_warnings;
CREATE POLICY officer_warnings_select_policy ON public.officer_warnings
  FOR SELECT TO authenticated
  USING (
    officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = officer_warnings.department_id
        AND m.role = 'head'
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS officer_heartbeats_policy ON public.officer_activity_heartbeats;
CREATE POLICY officer_heartbeats_policy ON public.officer_activity_heartbeats
  FOR ALL TO authenticated
  USING (
    officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = officer_activity_heartbeats.department_id
        AND m.role = 'head'
        AND m.status = 'active'
    )
  );

-- ------------------------------------------------------------------------------
-- 6. STORED PROCEDURE: START WORK ORDER (COMMENCEMENT DEADLINE INITIALIZATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_start_work_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_start_time timestamptz := now();
  v_deadline timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id;
  END IF;

  -- Only assigned officer or active department head can start work
  IF v_order.officer_id <> v_uid THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.department_memberships
      WHERE user_id = v_uid
        AND department_id = v_order.department_id
        AND role = 'head'
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Unauthorized to start work order %.', p_order_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Calculate commencement-based deadline
  v_deadline := v_start_time + (COALESCE(v_order.assigned_duration_hours, 72) || ' hours')::interval;

  UPDATE public.department_work_orders
  SET
    status = 'in_progress',
    started_at = COALESCE(started_at, v_start_time),
    effective_deadline_at = COALESCE(effective_deadline_at, v_deadline),
    due_at = COALESCE(effective_deadline_at, v_deadline)
  WHERE id = p_order_id;

  -- Notify department head that officer has commenced field execution
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type, link_url)
  SELECT
    m.user_id,
    v_order.department_id,
    'Field Work Commenced',
    'Work order #' || SUBSTRING(p_order_id::text, 1, 8) || ' has been started in the field.',
    'assignment',
    '/department'
  FROM public.department_memberships m
  WHERE m.department_id = v_order.department_id
    AND m.role = 'head'
    AND m.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', 'in_progress',
    'startedAt', v_start_time,
    'effectiveDeadlineAt', v_deadline
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. STORED PROCEDURE: SUBMIT WORK COMPLETION (GPS PROXIMITY AUDIT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_submit_work_completion(
  p_order_id uuid,
  p_storage_path text,
  p_lat numeric,
  p_lng numeric,
  p_accuracy numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_complaint record;
  v_distance_m numeric := NULL;
  v_is_verified boolean := false;
  v_evidence_id uuid;
  v_rad double precision;
  v_dlat double precision;
  v_dlng double precision;
  v_a double precision;
  v_c double precision;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id;
  END IF;

  IF v_order.officer_id <> v_uid THEN
    RAISE EXCEPTION 'Only assigned field officer may submit completion proof.' USING ERRCODE = '42501';
  END IF;

  -- Fetch linked anchor complaint coordinates for Haversine distance verification
  SELECT latitude, longitude INTO v_complaint
  FROM public.complaints
  WHERE id = v_order.anchor_complaint_id;

  IF v_complaint.latitude IS NOT NULL AND v_complaint.longitude IS NOT NULL AND p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    -- Haversine formula calculation in meters (Earth radius ~ 6,371,000 meters)
    v_rad := 0.017453292519943295; -- pi / 180
    v_dlat := (p_lat - v_complaint.latitude) * v_rad;
    v_dlng := (p_lng - v_complaint.longitude) * v_rad;
    v_a := sin(v_dlat / 2)^2 + cos(v_complaint.latitude * v_rad) * cos(p_lat * v_rad) * sin(v_dlng / 2)^2;
    v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
    v_distance_m := ROUND((6371000 * v_c)::numeric, 2);

    -- 30-meter municipal verification threshold
    IF v_distance_m <= 30.0 THEN
      v_is_verified := true;
    END IF;
  ELSE
    -- If no baseline coordinates exist, mark coordinates recorded without proximity failure
    v_is_verified := true;
  END IF;

  -- Insert into department work evidence
  INSERT INTO public.department_work_evidence (
    order_id,
    storage_path,
    location_result,
    original_distance_m,
    accuracy_m,
    submitted_at,
    decision
  ) VALUES (
    p_order_id,
    p_storage_path,
    CASE WHEN v_is_verified THEN 'near' ELSE 'needs_review' END,
    v_distance_m,
    COALESCE(p_accuracy, 10.0),
    now(),
    'pending'
  ) RETURNING id INTO v_evidence_id;

  -- Update work order status and GPS verification state
  UPDATE public.department_work_orders
  SET
    status = 'pending_review',
    gps_latitude = p_lat,
    gps_longitude = p_lng,
    gps_accuracy_m = p_accuracy,
    gps_distance_m = v_distance_m,
    gps_verified = v_is_verified
  WHERE id = p_order_id;

  -- Notify HOD that evidence is queued for supervisory verification
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type, link_url)
  SELECT
    m.user_id,
    v_order.department_id,
    'Resolution Evidence Ready for Verification',
    'Officer submitted completion evidence for Order #' || SUBSTRING(p_order_id::text, 1, 8) ||
      ' (Proximity: ' || COALESCE(v_distance_m::text || 'm', 'N/A') || ').',
    'verification',
    '/department'
  FROM public.department_memberships m
  WHERE m.department_id = v_order.department_id
    AND m.role = 'head'
    AND m.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'evidenceId', v_evidence_id,
    'gpsVerified', v_is_verified,
    'distanceMeters', v_distance_m
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. STORED PROCEDURE: APPROVE RESOLUTION (HOD SUPERVISORY ACCEPTANCE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_approve_resolution(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id;
  END IF;

  -- Check caller is active HOD of this department
  IF NOT EXISTS (
    SELECT 1 FROM public.department_memberships
    WHERE user_id = v_uid
      AND department_id = v_order.department_id
      AND role = 'head'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active department head may approve work resolution.' USING ERRCODE = '42501';
  END IF;

  -- Update work order to verified
  UPDATE public.department_work_orders
  SET
    status = 'verified',
    reviewed_at = now(),
    review_note = 'Supervisory approval granted.'
  WHERE id = p_order_id;

  -- Update evidence table
  UPDATE public.department_work_evidence
  SET decision = 'approved'
  WHERE order_id = p_order_id;

  -- Update parent complaint status to closed/resolved
  UPDATE public.complaints
  SET
    status = 'resolved',
    updated_at = now()
  WHERE id = v_order.anchor_complaint_id;

  -- Update attached linked reports
  UPDATE public.complaints c
  SET
    status = 'resolved',
    updated_at = now()
  FROM public.department_work_order_reports r
  WHERE r.order_id = p_order_id
    AND c.id = r.complaint_id;

  -- Notify officer that work has been verified and closed
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type)
  VALUES (
    v_order.officer_id,
    v_order.department_id,
    'Work Order Approved & Closed',
    'Your resolution proof for Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' was verified by the Department Head.',
    'verification'
  );

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', 'verified'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. STORED PROCEDURE: RETURN WORK FOR CORRECTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_return_correction(
  p_order_id uuid,
  p_reason text,
  p_correction_hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_new_deadline timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Correction reason is mandatory.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.department_memberships
    WHERE user_id = v_uid
      AND department_id = v_order.department_id
      AND role = 'head'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active department head may return work orders for correction.' USING ERRCODE = '42501';
  END IF;

  v_new_deadline := now() + (COALESCE(p_correction_hours, 24) || ' hours')::interval;

  -- Update work order
  UPDATE public.department_work_orders
  SET
    status = 'returned',
    reviewed_at = now(),
    review_note = p_reason,
    effective_deadline_at = v_new_deadline,
    due_at = v_new_deadline,
    instructions = instructions || E'\n[CORRECTION REQUIRED]: ' || p_reason
  WHERE id = p_order_id;

  -- Update evidence table decision
  UPDATE public.department_work_evidence
  SET decision = 'rejected'
  WHERE order_id = p_order_id;

  -- Notify assigned officer of correction
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type)
  VALUES (
    v_order.officer_id,
    v_order.department_id,
    'Correction Required on Field Task',
    'Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' was returned by Department Head: ' || p_reason,
    'warning'
  );

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', 'returned',
    'newDeadline', v_new_deadline
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. STORED PROCEDURE: REJECT UNASSIGNED COMPLAINT FROM DEPARTMENT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_reject_department_complaint(
  p_complaint_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_complaint record;
  v_dept text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required.' USING ERRCODE = '23514';
  END IF;

  SELECT c.*, m.department_id INTO v_complaint
  FROM public.complaints c
  JOIN public.department_memberships m ON m.department_id = c.department_id
  WHERE c.id = p_complaint_id
    AND m.user_id = v_uid
    AND m.role = 'head'
    AND m.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint % not found or unauthorized.' , p_complaint_id USING ERRCODE = '42501';
  END IF;

  -- Mark complaint rejected
  UPDATE public.complaints
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_complaint_id;

  RETURN jsonb_build_object(
    'success', true,
    'complaintId', p_complaint_id,
    'status', 'rejected'
  );
END;
$$;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.staff_notifications TO authenticated;
GRANT SELECT, INSERT ON public.officer_warnings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.officer_activity_heartbeats TO authenticated;

GRANT EXECUTE ON FUNCTION public.v19_start_work_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_submit_work_completion(uuid, text, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_approve_resolution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_return_correction(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_reject_department_complaint(uuid, text) TO authenticated;
