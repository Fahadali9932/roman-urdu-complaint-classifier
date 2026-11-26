-- ==============================================================================
-- V19.1: UNIFIED HOD & OFFICER PORTALS — COMMENCEMENT DEADLINES,
--        AIRTIGHT AUTHORIZATION, STRICT GPS VERIFICATION & SECURITY
-- Additive, idempotent, lock-safe PostgreSQL migration built against V16 schema.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. WORK ORDERS EXTENSION: COMMENCEMENT DEADLINES, ACCURACY & SCREENING
-- ------------------------------------------------------------------------------
ALTER TABLE public.department_work_orders
  ADD COLUMN IF NOT EXISTS assigned_duration_hours integer NOT NULL DEFAULT 72
    CHECK (assigned_duration_hours > 0 AND assigned_duration_hours <= 720),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS effective_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS gps_latitude numeric(10, 7)
    CHECK (gps_latitude IS NULL OR (gps_latitude >= -90.0 AND gps_latitude <= 90.0)),
  ADD COLUMN IF NOT EXISTS gps_longitude numeric(10, 7)
    CHECK (gps_longitude IS NULL OR (gps_longitude >= -180.0 AND gps_longitude <= 180.0)),
  ADD COLUMN IF NOT EXISTS gps_accuracy_m numeric(6, 2)
    CHECK (gps_accuracy_m IS NULL OR gps_accuracy_m >= 0.0),
  ADD COLUMN IF NOT EXISTS gps_distance_m numeric(8, 2),
  ADD COLUMN IF NOT EXISTS gps_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_exception_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS evidence_integrity_status text NOT NULL DEFAULT 'pending_screening'
    CHECK (evidence_integrity_status IN ('pending_screening', 'screening_passed', 'suspicious', 'confirmed_synthetic', 'manual_review_required', 'screening_unavailable')),
  ADD COLUMN IF NOT EXISTS evidence_screening_notes text;

-- Deadlines Safety Backfill:
-- ONLY orders already started (in_progress, pending_review, verified) backfill effective_deadline_at.
-- Orders that are unstarted (started_at IS NULL) MUST retain NULL until commencement!
UPDATE public.department_work_orders
SET effective_deadline_at = COALESCE(started_at + (assigned_duration_hours || ' hours')::interval, due_at)
WHERE started_at IS NOT NULL AND effective_deadline_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. IMMUTABLE WORK ORDER DEADLINE EXTENSION HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_deadline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  previous_deadline timestamptz NOT NULL,
  extended_deadline timestamptz NOT NULL,
  additional_hours integer NOT NULL CHECK (additional_hours > 0),
  reason text NOT NULL,
  authorized_by uuid NOT NULL REFERENCES auth.users(id),
  authorized_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deadline_history_order
  ON public.work_order_deadline_history(order_id, authorized_at);

-- ------------------------------------------------------------------------------
-- 3. STAFF NOTIFICATIONS & COMMUNICATIONS LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general'
    CHECK (notification_type IN ('general', 'assignment', 'warning', 'deadline', 'verification', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_dept
  ON public.staff_notifications(user_id, department_id, is_read, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. FORMAL OFFICER SUPERVISORY NOTICES / WARNINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'formal'
    CHECK (severity IN ('advisory', 'formal', 'final')),
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_warnings_officer_dept
  ON public.officer_warnings(officer_id, department_id, issued_at DESC);

-- ------------------------------------------------------------------------------
-- 5. OFFICER ACTIVITY TRACKING & SESSION HEARTBEATS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_activity_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  session_started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  active_view text NOT NULL DEFAULT 'work',
  client_tab_id text,
  idle_seconds integer NOT NULL DEFAULT 0 CHECK (idle_seconds >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_officer_heartbeat_officer
  ON public.officer_activity_heartbeats(officer_id);

-- ------------------------------------------------------------------------------
-- 6. IMMUTABLE OFFICER RANKING EVENT LEDGER (IDEMPOTENT REWARDS & PENALTIES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_ranking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('on_time_completion', 'overdue_submission', 'correction_penalty', 'citizen_dispute')),
  points_delta integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_officer_ranking_event_order UNIQUE (order_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_ranking_events_officer
  ON public.officer_ranking_events(officer_id, department_id, created_at);

-- ------------------------------------------------------------------------------
-- 7. SECURE OFFICER PROFILE DETAILS & SENSITIVE DATA PROTECTION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_profile_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  employee_id text NOT NULL,
  official_email text,
  phone_masked text,
  cnic_masked text,
  cnic_hash text,
  profile_photo_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_officer_profile_user UNIQUE (user_id),
  CONSTRAINT uq_officer_profile_dept_emp UNIQUE (department_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_officer_profile_dept
  ON public.officer_profile_details(department_id);

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY POLICIES (STRICT READ/WRITE CONSTRAINTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.work_order_deadline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_activity_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_ranking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_profile_details ENABLE ROW LEVEL SECURITY;

-- Notifications: User can read own notifications; HOD can read department notices
DROP POLICY IF EXISTS staff_notifications_select_policy ON public.staff_notifications;
CREATE POLICY staff_notifications_select_policy ON public.staff_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.v16_staff_operational_access(auth.uid(), department_id, 'head')
  );

-- Notifications: User can only update is_read on own notifications
DROP POLICY IF EXISTS staff_notifications_update_policy ON public.staff_notifications;
CREATE POLICY staff_notifications_update_policy ON public.staff_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Warnings: Officer can read their own warnings; HOD can read department warnings
DROP POLICY IF EXISTS officer_warnings_select_policy ON public.officer_warnings;
CREATE POLICY officer_warnings_select_policy ON public.officer_warnings
  FOR SELECT TO authenticated
  USING (
    officer_id = auth.uid()
    OR public.v16_staff_operational_access(auth.uid(), department_id, 'head')
  );

-- Heartbeats: Officers can manage their own heartbeats
DROP POLICY IF EXISTS officer_heartbeats_policy ON public.officer_activity_heartbeats;
CREATE POLICY officer_heartbeats_policy ON public.officer_activity_heartbeats
  FOR ALL TO authenticated
  USING (
    officer_id = auth.uid()
    OR public.v16_staff_operational_access(auth.uid(), department_id, 'head')
  );

-- Ranking Events: Officer can view their own score events; HOD can view department
DROP POLICY IF EXISTS ranking_events_select_policy ON public.officer_ranking_events;
CREATE POLICY ranking_events_select_policy ON public.officer_ranking_events
  FOR SELECT TO authenticated
  USING (
    officer_id = auth.uid()
    OR public.v16_staff_operational_access(auth.uid(), department_id, 'head')
  );

-- Profiles: Officer can read their own profile; HOD can read department profiles
DROP POLICY IF EXISTS officer_profile_select_policy ON public.officer_profile_details;
CREATE POLICY officer_profile_select_policy ON public.officer_profile_details
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.v16_staff_operational_access(auth.uid(), department_id, 'head')
  );

-- ------------------------------------------------------------------------------
-- 9. STORED PROCEDURE: START WORK ORDER (TRANSACTIONAL COMMENCEMENT)
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

  -- Lock row exclusively to prevent concurrent state corruption
  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify active operational access using V16 security guard
  -- Prevents suspended officers from starting work
  IF NOT (
    (v_order.officer_id = v_uid AND public.v16_staff_operational_access(v_uid, v_order.department_id, 'officer'))
    OR public.v16_staff_operational_access(v_uid, v_order.department_id, 'head')
  ) THEN
    RAISE EXCEPTION 'Unauthorized to start work order % (suspended or mismatched role).', p_order_id USING ERRCODE = '42501';
  END IF;

  -- Prevent starting already verified work
  IF v_order.status = 'verified' THEN
    RAISE EXCEPTION 'Cannot start completed and verified work order %.', p_order_id USING ERRCODE = '23514';
  END IF;

  -- Prevent restarting work that is already pending supervisor review
  IF v_order.status = 'pending_review' THEN
    RAISE EXCEPTION 'Work order % is already pending supervisor verification.', p_order_id USING ERRCODE = '23514';
  END IF;

  -- Idempotency check: If already in_progress, return existing deadline without resetting timer!
  IF v_order.status = 'in_progress' AND v_order.started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', p_order_id,
      'status', 'in_progress',
      'startedAt', v_order.started_at,
      'effectiveDeadlineAt', v_order.effective_deadline_at
    );
  END IF;

  -- Compute commencement deadline strictly from start time + authorized duration
  v_deadline := v_start_time + (COALESCE(v_order.assigned_duration_hours, 72) || ' hours')::interval;

  UPDATE public.department_work_orders
  SET
    status = 'in_progress',
    started_at = v_start_time,
    effective_deadline_at = v_deadline,
    due_at = v_deadline
  WHERE id = p_order_id;

  -- Record audit notification for department head
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type, link_url)
  SELECT
    m.user_id,
    v_order.department_id,
    'Field Work Commenced',
    'Officer commenced fieldwork on Order #' || SUBSTRING(p_order_id::text, 1, 8) || '.',
    'assignment',
    '/department'
  FROM public.department_memberships m
  WHERE m.department_id = v_order.department_id
    AND m.staff_role = 'head'
    AND m.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', p_order_id,
    'status', 'in_progress',
    'startedAt', v_start_time,
    'effectiveDeadlineAt', v_deadline
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. STORED PROCEDURE: SUBMIT WORK COMPLETION (STRICT GPS AUDITING)
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
  v_exception_review boolean := false;
  v_location_result text := 'needs_review';
  v_evidence_id uuid;
  v_rad double precision := 0.017453292519943295; -- pi / 180
  v_dlat double precision;
  v_dlng double precision;
  v_a double precision;
  v_c double precision;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  -- Lock row FOR UPDATE
  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify caller is the assigned officer with active operational access
  IF NOT (v_order.officer_id = v_uid AND public.v16_staff_operational_access(v_uid, v_order.department_id, 'officer')) THEN
    RAISE EXCEPTION 'Only assigned, active field officer may submit completion evidence.' USING ERRCODE = '42501';
  END IF;

  -- State check: Must be in_progress or returned
  IF v_order.status NOT IN ('in_progress', 'returned') THEN
    RAISE EXCEPTION 'Cannot submit evidence for order % with status %.', p_order_id, v_order.status USING ERRCODE = '23514';
  END IF;

  -- Evidence storage path safety check
  IF p_storage_path IS NULL OR TRIM(p_storage_path) = '' OR p_storage_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Invalid evidence storage path.' USING ERRCODE = '23514';
  END IF;

  -- GPS Coordinate Validations
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'Device GPS coordinates are required for field completion.' USING ERRCODE = '23514';
  END IF;

  IF p_lat < -90.0 OR p_lat > 90.0 OR p_lng < -180.0 OR p_lng > 180.0 THEN
    RAISE EXCEPTION 'Invalid GPS coordinates out of bounds.' USING ERRCODE = '23514';
  END IF;

  -- Fetch linked citizen complaint coordinates
  SELECT latitude, longitude INTO v_complaint
  FROM public.complaints
  WHERE id = v_order.anchor_complaint_id;

  -- Strict GPS Proximity Calculation
  IF v_complaint.latitude IS NULL OR v_complaint.longitude IS NULL THEN
    -- Citizen report had no GPS pin: NEVER mark verified; require explicit exception review!
    v_is_verified := false;
    v_exception_review := true;
    v_location_result := 'no_original_pin';
  ELSIF p_accuracy IS NULL OR p_accuracy > 50.0 THEN
    -- GPS signal accuracy too low to verify site presence
    v_is_verified := false;
    v_exception_review := true;
    v_location_result := 'poor_accuracy';
  ELSE
    -- Haversine formula calculation in meters (Earth radius = 6,371,000 m)
    v_dlat := (p_lat - v_complaint.latitude) * v_rad;
    v_dlng := (p_lng - v_complaint.longitude) * v_rad;
    v_a := sin(v_dlat / 2.0)^2 + cos(v_complaint.latitude * v_rad) * cos(p_lat * v_rad) * sin(v_dlng / 2.0)^2;
    v_c := 2.0 * atan2(sqrt(v_a), sqrt(1.0 - v_a));
    v_distance_m := ROUND((6371000.0 * v_c)::numeric, 2);

    IF v_distance_m <= 30.0 AND p_accuracy <= 30.0 THEN
      v_is_verified := true;
      v_exception_review := false;
      v_location_result := 'near';
    ELSE
      v_is_verified := false;
      v_exception_review := true;
      v_location_result := 'needs_review';
    END IF;
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
    v_location_result,
    v_distance_m,
    COALESCE(p_accuracy, 10.0),
    now(),
    'pending'
  ) RETURNING id INTO v_evidence_id;

  -- Update work order
  UPDATE public.department_work_orders
  SET
    status = 'pending_review',
    submitted_at = now(),
    gps_latitude = p_lat,
    gps_longitude = p_lng,
    gps_accuracy_m = p_accuracy,
    gps_distance_m = v_distance_m,
    gps_verified = v_is_verified,
    gps_exception_review = v_exception_review,
    evidence_integrity_status = 'pending_screening'
  WHERE id = p_order_id;

  -- Record notification for HOD
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type, link_url)
  SELECT
    m.user_id,
    v_order.department_id,
    'Resolution Proof Ready for Review',
    'Evidence submitted for Order #' || SUBSTRING(p_order_id::text, 1, 8) ||
      ' (Proximity: ' || COALESCE(v_distance_m::text || 'm', 'No baseline') ||
      CASE WHEN v_exception_review THEN ' · EXCEPTION REVIEW REQUIRED' ELSE '' END || ').',
    'verification',
    '/department'
  FROM public.department_memberships m
  WHERE m.department_id = v_order.department_id
    AND m.staff_role = 'head'
    AND m.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'evidenceId', v_evidence_id,
    'gpsVerified', v_is_verified,
    'gpsExceptionReview', v_exception_review,
    'locationResult', v_location_result,
    'distanceMeters', v_distance_m
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. STORED PROCEDURE: APPROVE RESOLUTION (MULTI-DEPT SAFE & IDEMPOTENT RANKING)
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
  v_is_ontime boolean;
  v_has_pending_evidence boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  -- Lock row FOR UPDATE
  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify caller has active HOD access
  IF NOT public.v16_staff_operational_access(v_uid, v_order.department_id, 'head') THEN
    RAISE EXCEPTION 'Only active department head may approve work resolution.' USING ERRCODE = '42501';
  END IF;

  -- Prevent duplicate approval
  IF v_order.status = 'verified' THEN
    RAISE EXCEPTION 'Work order % is already verified and closed.', p_order_id USING ERRCODE = '23514';
  END IF;

  -- Prevent approving without pending evidence
  IF v_order.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Work order % is not pending supervisor review (current status: %).', p_order_id, v_order.status USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.department_work_evidence
    WHERE order_id = p_order_id AND decision = 'pending'
  ) INTO v_has_pending_evidence;

  IF NOT v_has_pending_evidence THEN
    RAISE EXCEPTION 'No pending evidence found to approve for work order %.', p_order_id USING ERRCODE = '23514';
  END IF;

  -- Evaluate on-time status based on actual submission timestamp
  v_is_ontime := (COALESCE(v_order.submitted_at, now()) <= v_order.effective_deadline_at);

  -- Record idempotent ranking points in ranking ledger
  IF v_is_ontime THEN
    INSERT INTO public.officer_ranking_events (officer_id, order_id, department_id, event_type, points_delta, notes)
    VALUES (v_order.officer_id, p_order_id, v_order.department_id, 'on_time_completion', 10, 'Resolved within authorized commencement deadline.')
    ON CONFLICT (order_id, event_type) DO NOTHING;
  ELSE
    INSERT INTO public.officer_ranking_events (officer_id, order_id, department_id, event_type, points_delta, notes)
    VALUES (v_order.officer_id, p_order_id, v_order.department_id, 'overdue_submission', -15, 'Completed after authorized commencement deadline.')
    ON CONFLICT (order_id, event_type) DO NOTHING;
  END IF;

  -- Update order status to verified
  UPDATE public.department_work_orders
  SET
    status = 'verified',
    reviewed_at = now(),
    review_note = 'Supervisory approval granted.'
  WHERE id = p_order_id;

  -- Update evidence decision
  UPDATE public.department_work_evidence
  SET decision = 'approved'
  WHERE order_id = p_order_id AND decision = 'pending';

  -- MULTI-DEPARTMENT COMPLAINT SAFETY:
  -- Only update parent complaint to resolved if NO OTHER department has an active/pending work order!
  IF NOT EXISTS (
    SELECT 1 FROM public.department_work_orders other_orders
    WHERE other_orders.anchor_complaint_id = v_order.anchor_complaint_id
      AND other_orders.id <> p_order_id
      AND other_orders.status NOT IN ('verified')
  ) THEN
    UPDATE public.complaints
    SET status = 'resolved', updated_at = now()
    WHERE id = v_order.anchor_complaint_id;

    UPDATE public.complaints c
    SET status = 'resolved', updated_at = now()
    FROM public.department_work_order_reports r
    WHERE r.order_id = p_order_id AND c.id = r.complaint_id;
  ELSE
    UPDATE public.complaints
    SET updated_at = now()
    WHERE id = v_order.anchor_complaint_id;
  END IF;

  -- Notify assigned officer
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type)
  VALUES (
    v_order.officer_id,
    v_order.department_id,
    'Resolution Approved',
    'Your proof for Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' was approved by Department Head.',
    'verification'
  );

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', 'verified',
    'onTime', v_is_ontime
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 12. STORED PROCEDURE: RETURN WORK FOR CORRECTION (IMMUTABLE PENALTY)
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

  -- Lock row FOR UPDATE
  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify active HOD access
  IF NOT public.v16_staff_operational_access(v_uid, v_order.department_id, 'head') THEN
    RAISE EXCEPTION 'Only active department head may return work orders for correction.' USING ERRCODE = '42501';
  END IF;

  IF v_order.status = 'verified' THEN
    RAISE EXCEPTION 'Cannot return verified order %.', p_order_id USING ERRCODE = '23514';
  END IF;

  -- Calculate penalty deadline
  v_new_deadline := now() + (COALESCE(p_correction_hours, 24) || ' hours')::interval;

  -- Record penalty in ranking ledger
  INSERT INTO public.officer_ranking_events (officer_id, order_id, department_id, event_type, points_delta, notes)
  VALUES (v_order.officer_id, p_order_id, v_order.department_id, 'correction_penalty', -10, 'Returned for correction: ' || p_reason)
  ON CONFLICT (order_id, event_type) DO NOTHING;

  -- Update work order
  UPDATE public.department_work_orders
  SET
    status = 'returned',
    reviewed_at = now(),
    review_note = p_reason,
    effective_deadline_at = v_new_deadline,
    due_at = v_new_deadline,
    instructions = instructions || E'\n[SUPERVISOR CORRECTION REQUIRED]: ' || p_reason
  WHERE id = p_order_id;

  -- Update evidence decision
  UPDATE public.department_work_evidence
  SET decision = 'rejected'
  WHERE order_id = p_order_id AND decision = 'pending';

  -- Notify officer
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type)
  VALUES (
    v_order.officer_id,
    v_order.department_id,
    'Correction Required on Field Task',
    'Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' returned by Department Head: ' || p_reason,
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
-- 13. STORED PROCEDURE: EXTEND DEADLINE (WITH IMMUTABLE AUDIT LOG)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_extend_deadline(
  p_order_id uuid,
  p_additional_hours integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_prev_deadline timestamptz;
  v_new_deadline timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF p_additional_hours IS NULL OR p_additional_hours <= 0 THEN
    RAISE EXCEPTION 'Additional hours must be greater than zero.' USING ERRCODE = '23514';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason for extension is required.' USING ERRCODE = '23514';
  END IF;

  -- Lock row FOR UPDATE
  SELECT * INTO v_order
  FROM public.department_work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order % not found.', p_order_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify HOD access
  IF NOT public.v16_staff_operational_access(v_uid, v_order.department_id, 'head') THEN
    RAISE EXCEPTION 'Only active department head may extend order deadlines.' USING ERRCODE = '42501';
  END IF;

  IF v_order.status = 'verified' THEN
    RAISE EXCEPTION 'Cannot extend deadline for verified order %.', p_order_id USING ERRCODE = '23514';
  END IF;

  v_prev_deadline := COALESCE(v_order.effective_deadline_at, v_order.due_at, now());
  v_new_deadline := v_prev_deadline + (p_additional_hours || ' hours')::interval;

  -- Update work order
  UPDATE public.department_work_orders
  SET
    effective_deadline_at = v_new_deadline,
    due_at = v_new_deadline,
    extension_requested_due_at = NULL,
    extension_reason = NULL
  WHERE id = p_order_id;

  -- Insert into immutable deadline history
  INSERT INTO public.work_order_deadline_history (
    order_id,
    department_id,
    previous_deadline,
    extended_deadline,
    additional_hours,
    reason,
    authorized_by
  ) VALUES (
    p_order_id,
    v_order.department_id,
    v_prev_deadline,
    v_new_deadline,
    p_additional_hours,
    p_reason,
    v_uid
  );

  -- Notify officer of authorized extension
  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type)
  VALUES (
    v_order.officer_id,
    v_order.department_id,
    'Deadline Extension Approved',
    'Deadline for Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' was extended by ' || p_additional_hours || 'h: ' || p_reason,
    'deadline'
  );

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'previousDeadline', v_prev_deadline,
    'extendedDeadline', v_new_deadline,
    'additionalHours', p_additional_hours
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 14. STORED PROCEDURE: REJECT DEPARTMENT COMPLAINT (MULTI-DEPT ISOLATION)
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
  v_has_other_departments boolean;
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
    AND m.staff_role = 'head'
    AND m.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint % not found or unauthorized for caller.', p_complaint_id USING ERRCODE = '42501';
  END IF;

  -- Check if other departments share this complaint
  SELECT EXISTS (
    SELECT 1 FROM public.department_work_orders
    WHERE anchor_complaint_id = p_complaint_id
      AND department_id <> v_complaint.department_id
  ) INTO v_has_other_departments;

  -- If no other department is involved, mark parent complaint rejected
  IF NOT v_has_other_departments THEN
    UPDATE public.complaints
    SET
      status = 'rejected',
      rejection_reason = p_reason,
      updated_at = now()
    WHERE id = p_complaint_id;
  ELSE
    -- Other departments remain active; record rejection on this department's scope
    UPDATE public.complaints
    SET
      updated_at = now(),
      rejection_reason = COALESCE(rejection_reason || ' | ', '') || v_complaint.department_id || ': ' || p_reason
    WHERE id = p_complaint_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'complaintId', p_complaint_id,
    'status', 'rejected'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 15. STORED PROCEDURE: ISSUE FORMAL WARNING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_issue_warning(
  p_officer_id uuid,
  p_department text,
  p_reason text,
  p_severity text DEFAULT 'formal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_warn_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.v16_staff_operational_access(v_uid, p_department, 'head') THEN
    RAISE EXCEPTION 'Only active department head may issue supervisory notices.' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Warning reason is mandatory.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.officer_warnings (officer_id, department_id, issued_by, reason, severity)
  VALUES (p_officer_id, p_department, v_uid, p_reason, COALESCE(p_severity, 'formal'))
  RETURNING id INTO v_warn_id;

  INSERT INTO public.staff_notifications (user_id, department_id, title, message, notification_type)
  VALUES (
    p_officer_id,
    p_department,
    'Formal Supervisory Notice Issued',
    'Department Head issued notice: ' || p_reason,
    'warning'
  );

  RETURN jsonb_build_object(
    'success', true,
    'warningId', v_warn_id,
    'officerId', p_officer_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. STORED PROCEDURE: SAVE SECURE OFFICER PROFILE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v19_save_officer_profile(
  p_officer_id uuid,
  p_department text,
  p_full_name text,
  p_employee_id text,
  p_official_email text,
  p_phone text,
  p_cnic text,
  p_photo_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phone_masked text := NULL;
  v_cnic_masked text := NULL;
  v_cnic_hash text := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    v_uid = p_officer_id
    OR public.v16_staff_operational_access(v_uid, p_department, 'head')
  ) THEN
    RAISE EXCEPTION 'Unauthorized to modify profile.' USING ERRCODE = '42501';
  END IF;

  -- Mask Phone (e.g., 0300-***-1234)
  IF p_phone IS NOT NULL AND LENGTH(TRIM(p_phone)) >= 7 THEN
    v_phone_masked := SUBSTRING(TRIM(p_phone), 1, 4) || '-***-' || SUBSTRING(TRIM(p_phone), LENGTH(TRIM(p_phone)) - 3);
  END IF;

  -- Mask CNIC (e.g., 42101-*******-1) and Hash
  IF p_cnic IS NOT NULL AND LENGTH(TRIM(p_cnic)) >= 10 THEN
    v_cnic_masked := SUBSTRING(TRIM(p_cnic), 1, 5) || '-*******-' || SUBSTRING(TRIM(p_cnic), LENGTH(TRIM(p_cnic)));
    v_cnic_hash := encode(digest(TRIM(p_cnic), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.officer_profile_details (
    user_id,
    department_id,
    full_name,
    employee_id,
    official_email,
    phone_masked,
    cnic_masked,
    cnic_hash,
    profile_photo_storage_path,
    updated_at
  ) VALUES (
    p_officer_id,
    p_department,
    TRIM(p_full_name),
    TRIM(p_employee_id),
    TRIM(p_official_email),
    v_phone_masked,
    v_cnic_masked,
    v_cnic_hash,
    p_photo_path,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    employee_id = EXCLUDED.employee_id,
    official_email = EXCLUDED.official_email,
    phone_masked = COALESCE(EXCLUDED.phone_masked, officer_profile_details.phone_masked),
    cnic_masked = COALESCE(EXCLUDED.cnic_masked, officer_profile_details.cnic_masked),
    cnic_hash = COALESCE(EXCLUDED.cnic_hash, officer_profile_details.cnic_hash),
    profile_photo_storage_path = COALESCE(EXCLUDED.profile_photo_storage_path, officer_profile_details.profile_photo_storage_path),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_officer_id,
    'employeeId', p_employee_id,
    'phoneMasked', v_phone_masked,
    'cnicMasked', v_cnic_masked
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 17. PERMISSIONS & RPC EXECUTION GRANTS
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.staff_notifications FROM PUBLIC, anon;
REVOKE ALL ON public.officer_warnings FROM PUBLIC, anon;
REVOKE ALL ON public.officer_activity_heartbeats FROM PUBLIC, anon;
REVOKE ALL ON public.officer_ranking_events FROM PUBLIC, anon;
REVOKE ALL ON public.work_order_deadline_history FROM PUBLIC, anon;
REVOKE ALL ON public.officer_profile_details FROM PUBLIC, anon;

GRANT SELECT, UPDATE ON public.staff_notifications TO authenticated;
GRANT SELECT ON public.officer_warnings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.officer_activity_heartbeats TO authenticated;
GRANT SELECT ON public.officer_ranking_events TO authenticated;
GRANT SELECT ON public.work_order_deadline_history TO authenticated;
GRANT SELECT ON public.officer_profile_details TO authenticated;

GRANT EXECUTE ON FUNCTION public.v19_start_work_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_submit_work_completion(uuid, text, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_approve_resolution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_return_correction(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_extend_deadline(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_reject_department_complaint(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_issue_warning(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v19_save_officer_profile(uuid, text, text, text, text, text, text, text) TO authenticated;
