-- ==============================================================================
-- V16: INDEPENDENT COMPLAINT INTAKE, SAFE DUPLICATE ADVISORY & ATTACHMENT,
--      AND HEAD-SCOPED OFFICER PROVISIONING / FIRST-LOGIN ENFORCEMENT
-- Additive, idempotent, lock-safe PostgreSQL migration built against verified schema.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. WORK-ORDER REPORT INTEGRITY & DOUBLE-ASSIGNMENT PREVENTION
-- ------------------------------------------------------------------------------
ALTER TABLE public.department_work_order_reports
  ADD COLUMN IF NOT EXISTS department_id text REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS attached_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS attached_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS link_reason text;

UPDATE public.department_work_order_reports r
SET department_id = o.department_id
FROM public.department_work_orders o
WHERE o.id = r.order_id
  AND r.department_id IS NULL;

ALTER TABLE public.department_work_order_reports
  ALTER COLUMN department_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.v16_sync_work_report_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dept text;
BEGIN
  SELECT o.department_id INTO v_dept
  FROM public.department_work_orders o
  WHERE o.id = NEW.order_id;

  IF v_dept IS NULL THEN
    RAISE EXCEPTION 'Work order % does not exist.', NEW.order_id;
  END IF;

  IF NEW.department_id IS NOT NULL AND NEW.department_id <> v_dept THEN
    RAISE EXCEPTION 'Work report department (%) must match parent work order department (%).',
      NEW.department_id, v_dept USING ERRCODE = '42501';
  END IF;

  NEW.department_id := v_dept;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS v16_trg_sync_work_report_department ON public.department_work_order_reports;
CREATE TRIGGER v16_trg_sync_work_report_department
  BEFORE INSERT OR UPDATE ON public.department_work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.v16_sync_work_report_department();

REVOKE ALL ON FUNCTION public.v16_sync_work_report_department() FROM PUBLIC, anon, authenticated;

-- Guarantees at most one active/historical work-order link per (department, complaint)
-- preventing simultaneous duplicate assignments in the same department while
-- allowing independent work orders across distinct departments for multi-dept issues.
CREATE UNIQUE INDEX IF NOT EXISTS uq_v16_work_report_dept_complaint
  ON public.department_work_order_reports(department_id, complaint_id);

-- ------------------------------------------------------------------------------
-- 2. STAFF MEMBERSHIP LIFECYCLE, CREDENTIAL RESET & AUDIT WIDENING
-- ------------------------------------------------------------------------------
ALTER TABLE public.department_memberships
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS staff_username text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credential_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.department_memberships'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%revoked%'
  LOOP
    EXECUTE format('ALTER TABLE public.department_memberships DROP CONSTRAINT IF EXISTS %I', v_con);
  END LOOP;

  ALTER TABLE public.department_memberships
    ADD CONSTRAINT department_memberships_status_check
    CHECK (status IN ('active', 'suspended', 'revoked'));

  FOR v_con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.access_audit_log'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%action%'
  LOOP
    EXECUTE format('ALTER TABLE public.access_audit_log DROP CONSTRAINT IF EXISTS %I', v_con);
  END LOOP;

  ALTER TABLE public.access_audit_log
    ADD CONSTRAINT access_audit_log_action_check
    CHECK (action IN (
      'request_submitted',
      'request_approved',
      'request_rejected',
      'access_revoked',
      'admin_provisioned',
      'head_provisioned_officer',
      'officer_credentials_reset',
      'officer_password_changed',
      'officer_suspended',
      'officer_reactivated'
    ));
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v16_membership_dept_employee
  ON public.department_memberships(department_id, lower(employee_id))
  WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v16_membership_staff_username
  ON public.department_memberships(lower(staff_username))
  WHERE staff_username IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. SERVER-SIDE OPERATIONAL GUARD (SUSPENSION + FIRST-LOGIN PASSWORD CHANGE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v16_staff_operational_access(
  p_user uuid,
  p_department text,
  p_required_role text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p_user IS NOT NULL
    AND (SELECT auth.jwt()->>'aal') = 'aal2'
    AND (
      (p_required_role IS DISTINCT FROM 'officer' AND public.is_main_admin(p_user))
      OR EXISTS (
        SELECT 1
        FROM public.department_memberships m
        JOIN public.departments d ON d.id = m.department_id
        WHERE m.user_id = p_user
          AND m.department_id = p_department
          AND m.status = 'active'
          AND d.is_active = true
          AND (p_required_role IS NULL OR m.staff_role = p_required_role)
          AND (m.staff_role <> 'officer' OR m.must_change_password = false)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.v16_staff_operational_access(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_staff_operational_access(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_is_department_head(p_department text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND auth.jwt()->>'aal' = 'aal2' AND (
    public.is_main_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.department_memberships m
      JOIN public.departments d ON d.id = m.department_id
      WHERE m.user_id = auth.uid()
        AND m.department_id = p_department
        AND m.status = 'active'
        AND d.is_active = true
        AND m.staff_role = 'head'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.v1318_can_view_order(p_order uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_work_orders o
    WHERE o.id = p_order
      AND auth.uid() IS NOT NULL
      AND auth.jwt()->>'aal' = 'aal2'
      AND (
        public.v1318_is_department_head(o.department_id)
        OR (
          o.officer_id = auth.uid()
          AND public.v16_staff_operational_access(auth.uid(), o.department_id, 'officer')
        )
      )
  );
$$;

DROP POLICY IF EXISTS v1318_staff_case_read ON public.complaints;
CREATE POLICY v1318_staff_case_read ON public.complaints FOR SELECT TO authenticated
USING (
  auth.jwt()->>'aal' = 'aal2'
  AND EXISTS (
    SELECT 1 FROM public.department_memberships m
    JOIN public.departments d ON d.id = m.department_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND d.is_active = true
      AND (
        (m.staff_role = 'head' AND (
          m.department_id = complaints.assigned_department_id
          OR m.department_id = ANY(coalesce(complaints.assigned_department_ids, ARRAY[]::text[]))
          OR (m.department_id = 'kmc' AND complaints.status = 'under_review')
        ))
        OR (m.staff_role = 'officer' AND m.must_change_password = false AND EXISTS (
          SELECT 1
          FROM public.department_work_orders o
          JOIN public.department_work_order_reports r ON r.order_id = o.id
          WHERE r.complaint_id = complaints.id
            AND o.officer_id = auth.uid()
            AND o.department_id = m.department_id
        ))
      )
  )
);

-- Enforce first-login password change and active non-suspended status on officer mutations
CREATE OR REPLACE FUNCTION public.v1318_start_work(p_order uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.department_work_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id = p_order FOR UPDATE;
  IF v_order.id IS NULL OR v_order.officer_id <> auth.uid()
    OR NOT public.v16_staff_operational_access(auth.uid(), v_order.department_id, 'officer') THEN
    RAISE EXCEPTION 'Active officer access with updated passphrase required' USING ERRCODE = '42501';
  END IF;
  IF v_order.status NOT IN ('assigned', 'returned') THEN
    RAISE EXCEPTION 'Cannot start an order in this state';
  END IF;
  UPDATE public.department_work_orders
  SET status = 'in_progress', started_at = coalesce(started_at, now()), updated_at = now()
  WHERE id = p_order;
  INSERT INTO public.department_work_events(order_id, actor_id, event_type)
  VALUES (p_order, auth.uid(), 'started');
END;
$$;

CREATE OR REPLACE FUNCTION public.v1318_request_extension(p_order uuid, p_due timestamptz, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.department_work_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id = p_order FOR UPDATE;
  IF v_order.id IS NULL OR v_order.officer_id <> auth.uid()
    OR NOT public.v16_staff_operational_access(auth.uid(), v_order.department_id, 'officer') THEN
    RAISE EXCEPTION 'Unauthorized or passphrase update required' USING ERRCODE = '42501';
  END IF;
  IF v_order.status IN ('verified', 'pending_review')
    OR p_due <= v_order.due_at
    OR p_due > now() + interval '90 days'
    OR length(trim(coalesce(p_reason, ''))) < 12 THEN
    RAISE EXCEPTION 'Invalid extension request';
  END IF;
  UPDATE public.department_work_orders
  SET extension_requested_at = now(),
      extension_requested_due_at = p_due,
      extension_reason = left(trim(p_reason), 1000),
      updated_at = now()
  WHERE id = p_order;
  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
  VALUES (p_order, auth.uid(), 'extension_requested', left(trim(p_reason), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.v1318_staff_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_main_admin(auth.uid()) AND NOT
    (NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.department_memberships m WHERE m.user_id = auth.uid()) THEN
    IF auth.jwt()->>'aal' <> 'aal2' THEN
      RAISE EXCEPTION 'Authenticator verification required for staff mutations' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
        AND (m.staff_role <> 'officer' OR m.must_change_password = false)
        AND (
          (m.staff_role = 'head' AND (
            m.department_id = OLD.assigned_department_id
            OR m.department_id = ANY(coalesce(OLD.assigned_department_ids, ARRAY[]::text[]))
          ))
          OR (m.staff_role = 'officer' AND EXISTS (
            SELECT 1 FROM public.department_work_orders o
            JOIN public.department_work_order_reports r ON r.order_id = o.id
            WHERE o.officer_id = auth.uid() AND o.department_id = m.department_id AND r.complaint_id = OLD.id
          ))
        )
    ) THEN
      RAISE EXCEPTION 'Outside assigned work or passphrase change pending' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    IF NOT public.is_main_admin(auth.uid()) AND NOT EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active' AND m.staff_role = 'head'
        AND m.department_id = OLD.assigned_department_id
    ) THEN
      RAISE EXCEPTION 'Only the primary department head may close verified reports'
        USING ERRCODE = '42501';
    END IF;
    IF NOT public.v1318_resolution_ready(OLD.id) THEN
      RAISE EXCEPTION 'Verified evidence and citizen confirmation, or a documented 72-hour head review, are required before closure'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Safe staff login identifier lookup (only exposes non-secret login email alias when matching active/suspended staff_username; returns empty when unknown)
CREATE OR REPLACE FUNCTION public.v16_resolve_staff_login_email(p_identifier text, p_department text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean text := lower(trim(coalesce(p_identifier, '')));
  v_email text;
BEGIN
  IF v_clean = '' OR length(v_clean) > 120 THEN
    RETURN NULL;
  END IF;
  SELECT p.email INTO v_email
  FROM public.department_memberships m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE (lower(coalesce(m.staff_username, '')) = v_clean OR lower(coalesce(m.employee_id, '')) = v_clean)
    AND (p_department IS NULL OR m.department_id = p_department)
    AND m.status IN ('active', 'suspended')
  LIMIT 1;
  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.v16_resolve_staff_login_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v16_resolve_staff_login_email(text, text) TO anon, authenticated;

-- Head-scoped roster listing including status/must_change_password for Officers management view
CREATE OR REPLACE FUNCTION public.v16_department_officers(p_department text)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  employee_id text,
  staff_username text,
  staff_role text,
  membership_status text,
  must_change_password boolean,
  suspension_reason text,
  active_cases bigint,
  verified_cases bigint,
  on_time_cases bigint,
  overdue_cases bigint,
  disputed_cases bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    COALESCE(p.full_name, 'Field officer')::text,
    m.employee_id,
    m.staff_username,
    m.staff_role,
    m.status,
    m.must_change_password,
    m.suspension_reason,
    count(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('verified')),
    count(DISTINCT o.id) FILTER (WHERE o.status = 'verified'),
    count(DISTINCT o.id) FILTER (WHERE o.status = 'verified' AND o.reviewed_at <= o.due_at),
    count(DISTINCT o.id) FILTER (WHERE o.status <> 'verified' AND o.due_at < now()),
    count(DISTINCT f.order_id) FILTER (WHERE f.verdict = 'disputed')
  FROM public.department_memberships m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.department_work_orders o ON o.officer_id = m.user_id AND o.department_id = m.department_id
  LEFT JOIN public.department_work_feedback f ON f.order_id = o.id
  WHERE m.department_id = p_department
    AND m.staff_role = 'officer'
    AND m.status IN ('active', 'suspended')
  GROUP BY m.user_id, p.full_name, m.employee_id, m.staff_username, m.staff_role, m.status, m.must_change_password, m.suspension_reason
  ORDER BY (m.status = 'active') DESC, count(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('verified')) ASC, p.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.v16_department_officers(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_department_officers(text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. PROTECT LEGACY BULK / OVERWRITE RPCs AGAINST BYPASS OR ACCIDENTAL RESET
-- ------------------------------------------------------------------------------
-- Reject accidental overwrite/reset of existing work orders through legacy v1318_assign_work
CREATE OR REPLACE FUNCTION public.v1318_assign_work(
  p_department text,
  p_anchor uuid,
  p_reports uuid[],
  p_case_label text,
  p_officer uuid,
  p_due timestamptz,
  p_instructions text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_existing public.department_work_orders%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Assignment restricted to department head' USING ERRCODE = '42501';
  END IF;
  IF p_anchor IS NULL OR p_reports IS NULL OR array_length(p_reports, 1) IS NULL
    OR array_length(p_reports, 1) > 100 OR NOT (p_anchor = ANY(p_reports))
    OR length(trim(coalesce(p_case_label, ''))) NOT BETWEEN 1 AND 80
    OR length(trim(coalesce(p_instructions, ''))) NOT BETWEEN 8 AND 1200
    OR p_due <= v_now OR p_due > v_now + interval '90 days' THEN
    RAISE EXCEPTION 'Invalid assignment details';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.department_memberships m
    WHERE m.user_id = p_officer
      AND m.department_id = p_department
      AND m.status = 'active'
      AND m.staff_role = 'officer'
  ) THEN
    RAISE EXCEPTION 'Officer is not active for this department' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_reports) AS rid(id)
    LEFT JOIN public.complaints c ON c.id = rid.id
    WHERE c.id IS NULL OR NOT (
      c.assigned_department_id = p_department
      OR p_department = ANY(coalesce(c.assigned_department_ids, ARRAY[]::text[]))
    )
  ) THEN
    RAISE EXCEPTION 'One or more reports are outside this department' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_existing
  FROM public.department_work_orders
  WHERE department_id = p_department AND anchor_complaint_id = p_anchor
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Work order % already exists for this anchor report. Use append-only attachment instead of resetting links.', v_existing.id
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.department_work_order_reports r
    WHERE r.department_id = p_department
      AND r.complaint_id = ANY(p_reports)
  ) THEN
    RAISE EXCEPTION 'One or more complaints are already linked to an active work order in this department.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.department_work_orders(
    department_id, anchor_complaint_id, case_label, officer_id, assigned_by,
    instructions, assigned_at, original_due_at, due_at
  )
  VALUES (
    p_department, p_anchor, trim(p_case_label), p_officer, auth.uid(),
    trim(p_instructions), v_now, p_due, p_due
  )
  RETURNING id INTO v_id;

  INSERT INTO public.department_work_order_reports(order_id, complaint_id, department_id, attached_by, link_reason)
  SELECT v_id, x, p_department, auth.uid(), 'initial_assignment'
  FROM (SELECT DISTINCT unnest(p_reports) AS x) q;

  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
  VALUES (v_id, auth.uid(), 'assigned', 'Assigned new work order');

  RETURN v_id;
END;
$$;

-- Restrict legacy unconfirmed batch acceptance to single-complaint acknowledgment only
CREATE OR REPLACE FUNCTION public.staff_accept_department_report_batch(
  p_department_id text,
  p_complaint_ids uuid[],
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_id uuid;
  v_fingerprint text;
  v_operation public.staff_batch_acceptance_requests%ROWTYPE;
  v_report record;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;
  IF p_complaint_ids IS NULL OR cardinality(p_complaint_ids) <> 1 OR p_complaint_ids[1] IS NULL THEN
    RAISE EXCEPTION 'Unconfirmed multi-report bulk acceptance is disabled. Accept or assign individual complaints.'
      USING ERRCODE = '22023';
  END IF;
  v_id := p_complaint_ids[1];
  IF p_department_id IS NULL OR p_department_id = 'unassigned'
     OR NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id AND is_active = true) THEN
    RAISE EXCEPTION 'An assigned department is required.' USING ERRCODE = '22023';
  END IF;
  IF NOT COALESCE(public.is_main_admin(v_actor), false)
     AND NOT public.v1318_is_department_head(p_department_id) THEN
    RAISE EXCEPTION 'Active department head authorization required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'A valid idempotency key is required.' USING ERRCODE = '22023';
  END IF;

  v_fingerprint := pg_catalog.md5(p_department_id || ':' || v_id::text);
  INSERT INTO public.staff_batch_acceptance_requests (actor_id, department_id, idempotency_key, request_fingerprint)
  VALUES (v_actor, p_department_id, p_idempotency_key, v_fingerprint)
  ON CONFLICT (actor_id, department_id, idempotency_key) DO NOTHING;

  SELECT * INTO v_operation
  FROM public.staff_batch_acceptance_requests
  WHERE actor_id = v_actor AND department_id = p_department_id AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF v_operation.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
    RAISE EXCEPTION 'This idempotency key belongs to a different operation.' USING ERRCODE = '22023';
  END IF;
  IF v_operation.result_json IS NOT NULL THEN
    RETURN v_operation.result_json || pg_catalog.jsonb_build_object('idempotentReplay', true);
  END IF;

  SELECT c.id, c.status, c.assigned_department_id, c.assigned_department_ids
  INTO v_report
  FROM public.complaints c WHERE c.id = v_id FOR UPDATE;
  IF NOT FOUND OR v_report.assigned_department_id IS DISTINCT FROM p_department_id THEN
    RAISE EXCEPTION 'Complaint is not assigned to this primary department.' USING ERRCODE = '42501';
  END IF;
  IF v_report.status IS DISTINCT FROM 'assigned' THEN
    RAISE EXCEPTION 'Complaint must be in assigned state.' USING ERRCODE = '22023';
  END IF;

  PERFORM public.staff_update_complaint_status(
    v_report.id,
    'accepted',
    'Complaint Accepted by Department',
    'شکایت محکمہ نے قبول کر لی',
    'Your assigned department has accepted the complaint.',
    'متعلقہ محکمہ نے شکایت قبول کر لی ہے۔'
  );

  v_result := pg_catalog.jsonb_build_object(
    'success', true,
    'operationId', v_operation.id,
    'acceptedCount', 1,
    'idempotentReplay', false,
    'executedAt', now()
  );
  UPDATE public.staff_batch_acceptance_requests SET result_json = v_result WHERE id = v_operation.id;
  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. V16 TRANSACTIONAL DUPLICATE ADVISORY, CREATION & APPEND-ONLY ATTACHMENT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v16_assignment_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  department_id text NOT NULL REFERENCES public.departments(id),
  operation_type text NOT NULL CHECK (operation_type IN ('create_order', 'attach_report')),
  idempotency_key text NOT NULL,
  fingerprint text NOT NULL,
  result_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, department_id, operation_type, idempotency_key)
);

ALTER TABLE public.v16_assignment_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.v16_assignment_operations FROM PUBLIC, anon, authenticated;

-- Candidate retrieval: same department + exact known issue set + citizen-confirmed GPS proximity.
-- Optional p_include_uncertain surfaces same-department nearby active work when subtype is unknown.
CREATE OR REPLACE FUNCTION public.v16_find_candidate_orders(
  p_department text,
  p_complaint_id uuid,
  p_radius_m numeric DEFAULT 30,
  p_include_uncertain boolean DEFAULT false
)
RETURNS TABLE(
  order_id uuid,
  anchor_complaint_id uuid,
  anchor_reference text,
  case_label text,
  public_location text,
  officer_id uuid,
  officer_name text,
  status text,
  due_at timestamptz,
  distance_m numeric,
  linked_count bigint,
  issue_types text[],
  match_confidence text,
  can_direct_attach boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pin public.complaint_geo_points%ROWTYPE;
  v_source_types text[];
  v_raw_count integer := 0;
  v_unknown constant text[] := ARRAY['general','unknown','other','uncategorized','unclassified','unspecified'];
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head access required' USING ERRCODE = '42501';
  END IF;

  IF p_radius_m IS NULL OR p_radius_m <= 0 OR p_radius_m > 500 THEN
    p_radius_m := 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = p_complaint_id
      AND (c.assigned_department_id = p_department
        OR p_department = ANY(coalesce(c.assigned_department_ids, ARRAY[]::text[])))
  ) THEN
    RAISE EXCEPTION 'Complaint does not belong to this department' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pin FROM public.complaint_geo_points g WHERE g.complaint_id = p_complaint_id;
  IF v_pin.complaint_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    count(*)::integer,
    coalesce(array_agg(DISTINCT lower(trim(ci.issue_type)) ORDER BY lower(trim(ci.issue_type)))
      FILTER (WHERE trim(coalesce(ci.issue_type, '')) <> '' AND NOT (lower(trim(ci.issue_type)) = ANY(v_unknown))), ARRAY[]::text[])
  INTO v_raw_count, v_source_types
  FROM public.complaint_issues ci
  WHERE ci.complaint_id = p_complaint_id AND ci.department_id = p_department;

  -- Reject mixed unknown + known set automatically; allow uncertain discovery only if requested when subtype is unknown
  IF cardinality(v_source_types) = 0 THEN
    IF NOT p_include_uncertain THEN
      RETURN;
    END IF;
  ELSIF v_raw_count > cardinality(v_source_types) THEN
    -- Contains an explicit unknown mixed with known; avoid partial unsafe auto-matching
    RETURN;
  END IF;

  RETURN QUERY
  WITH active_orders AS (
    SELECT
      o.id,
      o.anchor_complaint_id,
      c_anchor.reference_number AS anchor_reference,
      o.case_label,
      coalesce(nullif(trim(c_anchor.incident_public_location), ''), nullif(trim(c_anchor.incident_locality), ''), 'Confirmed location') AS public_location,
      o.officer_id,
      coalesce(p.full_name, 'Field officer')::text AS officer_name,
      o.status,
      o.due_at,
      round((6371000 * 2 * asin(least(1, sqrt(
        power(sin(radians((v_pin.latitude - g.latitude)::double precision) / 2), 2) +
        cos(radians(g.latitude::double precision)) * cos(radians(v_pin.latitude::double precision)) *
        power(sin(radians((v_pin.longitude - g.longitude)::double precision) / 2), 2)
      ))))::numeric, 2) AS distance_m,
      (SELECT count(*) FROM public.department_work_order_reports wr WHERE wr.order_id = o.id) AS linked_count,
      coalesce((
        SELECT array_agg(DISTINCT lower(trim(ci2.issue_type)) ORDER BY lower(trim(ci2.issue_type)))
        FROM public.complaint_issues ci2
        WHERE ci2.complaint_id = o.anchor_complaint_id
          AND ci2.department_id = p_department
          AND trim(coalesce(ci2.issue_type, '')) <> ''
          AND NOT (lower(trim(ci2.issue_type)) = ANY(v_unknown))
      ), ARRAY[]::text[]) AS target_types
    FROM public.department_work_orders o
    JOIN public.complaints c_anchor ON c_anchor.id = o.anchor_complaint_id
    JOIN public.complaint_geo_points g ON g.complaint_id = o.anchor_complaint_id
    LEFT JOIN public.profiles p ON p.id = o.officer_id
    WHERE o.department_id = p_department
      AND o.status IN ('assigned', 'in_progress', 'returned', 'pending_review')
      AND o.anchor_complaint_id <> p_complaint_id
      AND NOT EXISTS (
        SELECT 1 FROM public.department_work_order_reports ex
        WHERE ex.order_id = o.id AND ex.complaint_id = p_complaint_id
      )
  )
  SELECT
    ao.id,
    ao.anchor_complaint_id,
    ao.anchor_reference,
    ao.case_label,
    ao.public_location,
    ao.officer_id,
    ao.officer_name,
    ao.status,
    ao.due_at,
    ao.distance_m,
    ao.linked_count,
    ao.target_types,
    CASE
      WHEN cardinality(v_source_types) = 0 THEN 'uncertain_subtype_pin'::text
      ELSE 'exact_issue_and_pin'::text
    END AS match_confidence,
    (ao.status IN ('assigned', 'in_progress', 'returned')) AS can_direct_attach
  FROM active_orders ao
  WHERE ao.distance_m <= p_radius_m
    AND (
      (cardinality(v_source_types) > 0 AND ao.target_types = v_source_types)
      OR (cardinality(v_source_types) = 0 AND p_include_uncertain)
    )
  ORDER BY ao.distance_m ASC, ao.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.v16_find_candidate_orders(text, uuid, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_find_candidate_orders(text, uuid, numeric, boolean) TO authenticated;

-- Sync citizen complaint workflow cleanly to 'in_progress' when attached/assigned
CREATE OR REPLACE FUNCTION public.v16_sync_complaint_to_work_order(
  p_department text,
  p_complaint_id uuid,
  p_title_en text,
  p_title_ur text,
  p_note_en text,
  p_note_ur text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_c public.complaints%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM public.complaints WHERE id = p_complaint_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint not found';
  END IF;

  -- Update department-specific issue status if present
  UPDATE public.complaint_issues
  SET status = CASE WHEN status IN ('submitted', 'assigned', 'accepted') THEN 'in_progress' ELSE status END,
      updated_at = now()
  WHERE complaint_id = p_complaint_id AND department_id = p_department;

  IF v_c.assigned_department_id = p_department THEN
    IF v_c.status = 'assigned' THEN
      PERFORM public.staff_update_complaint_status(
        p_complaint_id,
        'accepted',
        'Complaint Accepted by Department',
        'شکایت محکمہ نے قبول کر لی',
        'Department accepted complaint for field assignment.',
        'محکمے نے فیلڈ کارروائی کے لیے شکایت قبول کر لی ہے۔'
      );
      PERFORM public.staff_update_complaint_status(
        p_complaint_id,
        'in_progress',
        p_title_en,
        p_title_ur,
        p_note_en,
        p_note_ur
      );
    ELSIF v_c.status = 'accepted' THEN
      PERFORM public.staff_update_complaint_status(
        p_complaint_id,
        'in_progress',
        p_title_en,
        p_title_ur,
        p_note_en,
        p_note_ur
      );
    ELSE
      -- Already in_progress (or similar): append timeline milestone only
      INSERT INTO public.complaint_timeline_events (
        complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id
      ) VALUES (
        p_complaint_id,
        v_c.status,
        p_title_en,
        p_title_ur,
        p_note_en,
        p_note_ur,
        'department_staff',
        auth.uid()
      );
    END IF;
  ELSE
    -- Secondary assigned department in multi-department ticket: append timeline without overwriting primary dept state
    INSERT INTO public.complaint_timeline_events (
      complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id
    ) VALUES (
      p_complaint_id,
      v_c.status,
      p_title_en,
      p_title_ur,
      p_note_en,
      p_note_ur,
      'department_staff',
      auth.uid()
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.v16_sync_complaint_to_work_order(text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Transactional new single-complaint assignment with pre-commit candidate staleness recheck + idempotency
CREATE OR REPLACE FUNCTION public.v16_create_work_order_with_advisory(
  p_department text,
  p_complaint_id uuid,
  p_officer uuid,
  p_due timestamptz,
  p_instructions text,
  p_case_label text,
  p_idempotency_key text,
  p_expected_candidate_order_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_fingerprint text;
  v_op public.v16_assignment_operations%ROWTYPE;
  v_complaint public.complaints%ROWTYPE;
  v_stale_candidate uuid;
  v_order_id uuid;
  v_result jsonb;
  v_now timestamptz := now();
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'Valid idempotency key required' USING ERRCODE = '22023';
  END IF;
  IF p_complaint_id IS NULL OR length(trim(coalesce(p_case_label, ''))) NOT BETWEEN 1 AND 80
    OR length(trim(coalesce(p_instructions, ''))) NOT BETWEEN 8 AND 1200
    OR p_due <= v_now OR p_due > v_now + interval '90 days' THEN
    RAISE EXCEPTION 'Invalid work order parameters' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.department_memberships m
    WHERE m.user_id = p_officer AND m.department_id = p_department
      AND m.status = 'active' AND m.staff_role = 'officer'
  ) THEN
    RAISE EXCEPTION 'Target officer is suspended, revoked, or inactive in this department' USING ERRCODE = '42501';
  END IF;

  v_fingerprint := pg_catalog.md5(p_department || ':' || p_complaint_id::text || ':' || p_officer::text || ':' || p_due::text);
  INSERT INTO public.v16_assignment_operations(actor_id, department_id, operation_type, idempotency_key, fingerprint)
  VALUES (v_actor, p_department, 'create_order', p_idempotency_key, v_fingerprint)
  ON CONFLICT (actor_id, department_id, operation_type, idempotency_key) DO NOTHING;

  SELECT * INTO v_op
  FROM public.v16_assignment_operations
  WHERE actor_id = v_actor AND department_id = p_department
    AND operation_type = 'create_order' AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF v_op.fingerprint IS DISTINCT FROM v_fingerprint THEN
    RAISE EXCEPTION 'Idempotency key belongs to another assignment request.' USING ERRCODE = '22023';
  END IF;
  IF v_op.result_json IS NOT NULL THEN
    RETURN v_op.result_json || pg_catalog.jsonb_build_object('idempotentReplay', true);
  END IF;

  SELECT * INTO v_complaint FROM public.complaints WHERE id = p_complaint_id FOR UPDATE;
  IF NOT FOUND OR NOT (
    v_complaint.assigned_department_id = p_department
    OR p_department = ANY(coalesce(v_complaint.assigned_department_ids, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION 'Complaint does not belong to this department.' USING ERRCODE = '42501';
  END IF;
  IF v_complaint.status IN ('resolved', 'rejected') THEN
    RAISE EXCEPTION 'Resolved or rejected complaints cannot be newly assigned.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.department_work_order_reports r
    WHERE r.department_id = p_department AND r.complaint_id = p_complaint_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_LINKED: This complaint is already assigned to a work order in %.', p_department USING ERRCODE = '23505';
  END IF;

  -- Serialize concurrent candidate creation within same department to prevent stale candidate race
  PERFORM pg_advisory_xact_lock(hashtext('v16_assign_' || p_department));

  SELECT f.order_id INTO v_stale_candidate
  FROM public.v16_find_candidate_orders(p_department, p_complaint_id, 30, false) f
  WHERE NOT (f.order_id = ANY(coalesce(p_expected_candidate_order_ids, ARRAY[]::uuid[])))
  LIMIT 1;

  IF v_stale_candidate IS NOT NULL THEN
    RAISE EXCEPTION 'STALE_CANDIDATES: A new matching nearby work order (%) was created concurrently. Refresh candidates before proceeding.', v_stale_candidate
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.department_work_orders(
    department_id, anchor_complaint_id, case_label, officer_id, assigned_by,
    instructions, assigned_at, original_due_at, due_at
  )
  VALUES (
    p_department, p_complaint_id, trim(p_case_label), p_officer, v_actor,
    trim(p_instructions), v_now, p_due, p_due
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.department_work_order_reports(order_id, complaint_id, department_id, attached_by, link_reason)
  VALUES (v_order_id, p_complaint_id, p_department, v_actor, 'new_independent_assignment');

  PERFORM public.v16_sync_complaint_to_work_order(
    p_department,
    p_complaint_id,
    'Field Crew Dispatched',
    'فیلڈ عملہ تعینات کر دیا گیا',
    'Assigned to a field officer with an active repair deadline.',
    'شکایت کی جانچ اور مرمت کے لیے فیلڈ افسر مقرر کر دیا گیا ہے۔'
  );

  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
  VALUES (v_order_id, v_actor, 'assigned', 'Created new work order via V16 supervisor assignment');

  v_result := pg_catalog.jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'complaintId', p_complaint_id,
    'mode', 'created',
    'idempotentReplay', false
  );
  UPDATE public.v16_assignment_operations SET result_json = v_result WHERE id = v_op.id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.v16_create_work_order_with_advisory(text, uuid, uuid, timestamptz, text, text, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_create_work_order_with_advisory(text, uuid, uuid, timestamptz, text, text, text, uuid[]) TO authenticated;

-- Append-only attachment to an existing active work order (never overwrites officer/deadline/evidence/old links)
CREATE OR REPLACE FUNCTION public.v16_attach_report_to_work_order(
  p_department text,
  p_order_id uuid,
  p_complaint_id uuid,
  p_idempotency_key text,
  p_reason text DEFAULT 'Confirmed same physical incident by department head'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_fingerprint text;
  v_op public.v16_assignment_operations%ROWTYPE;
  v_order public.department_work_orders%ROWTYPE;
  v_complaint public.complaints%ROWTYPE;
  v_result jsonb;
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'Valid idempotency key required' USING ERRCODE = '22023';
  END IF;

  v_fingerprint := pg_catalog.md5(p_department || ':' || p_order_id::text || ':' || p_complaint_id::text);
  INSERT INTO public.v16_assignment_operations(actor_id, department_id, operation_type, idempotency_key, fingerprint)
  VALUES (v_actor, p_department, 'attach_report', p_idempotency_key, v_fingerprint)
  ON CONFLICT (actor_id, department_id, operation_type, idempotency_key) DO NOTHING;

  SELECT * INTO v_op
  FROM public.v16_assignment_operations
  WHERE actor_id = v_actor AND department_id = p_department
    AND operation_type = 'attach_report' AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF v_op.fingerprint IS DISTINCT FROM v_fingerprint THEN
    RAISE EXCEPTION 'Idempotency key belongs to another attachment.' USING ERRCODE = '22023';
  END IF;
  IF v_op.result_json IS NOT NULL THEN
    RETURN v_op.result_json || pg_catalog.jsonb_build_object('idempotentReplay', true);
  END IF;

  SELECT * INTO v_order FROM public.department_work_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.department_id <> p_department THEN
    RAISE EXCEPTION 'Target work order not found in this department.' USING ERRCODE = '42501';
  END IF;

  IF v_order.status IN ('verified', 'pending_review') THEN
    RAISE EXCEPTION 'Cannot attach reports to completed or proof-pending work orders; verify proof or assign separately.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.department_memberships m
    WHERE m.user_id = v_order.officer_id AND m.department_id = p_department
      AND m.status = 'active' AND m.staff_role = 'officer'
  ) THEN
    RAISE EXCEPTION 'Assigned officer on target order is no longer active; reassign before linking.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_complaint FROM public.complaints WHERE id = p_complaint_id FOR UPDATE;
  IF NOT FOUND OR NOT (
    v_complaint.assigned_department_id = p_department
    OR p_department = ANY(coalesce(v_complaint.assigned_department_ids, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION 'Complaint does not belong to this department.' USING ERRCODE = '42501';
  END IF;
  IF v_complaint.status IN ('resolved', 'rejected') THEN
    RAISE EXCEPTION 'Closed or rejected complaints cannot be attached.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.department_work_order_reports r
    WHERE r.department_id = p_department AND r.complaint_id = p_complaint_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_LINKED: This complaint is already attached to a work order in %.', p_department USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.department_work_order_reports(order_id, complaint_id, department_id, attached_by, link_reason)
  VALUES (
    p_order_id,
    p_complaint_id,
    p_department,
    v_actor,
    left(coalesce(nullif(trim(p_reason), ''), 'Confirmed same physical incident by department head'), 300)
  );

  PERFORM public.v16_sync_complaint_to_work_order(
    p_department,
    p_complaint_id,
    'Linked to Active Work Order',
    'جاری فیلڈ ورک آرڈر سے منسلک کر دیا گیا',
    'Your complaint has been linked to an active field repair team on site.',
    'آپ کی شکایت کو موقع پر موجود جاری فیلڈ مرمت ٹیم کے ساتھ منسلک کر دیا گیا ہے۔'
  );

  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
  VALUES (
    p_order_id,
    v_actor,
    'report_attached',
    left('Attached complaint ' || p_complaint_id::text || ' by human supervisor decision', 200)
  );

  v_result := pg_catalog.jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'complaintId', p_complaint_id,
    'mode', 'attached',
    'idempotentReplay', false
  );
  UPDATE public.v16_assignment_operations SET result_json = v_result WHERE id = v_op.id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.v16_attach_report_to_work_order(text, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_attach_report_to_work_order(text, uuid, uuid, text, text) TO authenticated;

-- Audited correction path for mistaken non-anchor attachments (cannot unlink anchor or verified orders)
CREATE OR REPLACE FUNCTION public.v16_detach_report_from_work_order(
  p_department text,
  p_order_id uuid,
  p_complaint_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.department_work_orders%ROWTYPE;
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head authorization required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 12 THEN
    RAISE EXCEPTION 'Provide an audit reason of at least 12 characters to detach a mistaken link.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.department_work_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.department_id <> p_department THEN
    RAISE EXCEPTION 'Work order not found in this department.' USING ERRCODE = '42501';
  END IF;
  IF v_order.status IN ('verified', 'pending_review') THEN
    RAISE EXCEPTION 'Cannot detach links after evidence submission or verification.' USING ERRCODE = '22023';
  END IF;
  IF v_order.anchor_complaint_id = p_complaint_id THEN
    RAISE EXCEPTION 'Cannot detach the anchor complaint of an existing work order.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.department_work_order_reports
  WHERE order_id = p_order_id AND complaint_id = p_complaint_id AND department_id = p_department;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report link not found on this work order.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.complaints
  SET status = 'accepted', updated_at = now()
  WHERE id = p_complaint_id
    AND assigned_department_id = p_department
    AND status = 'in_progress'
    AND NOT EXISTS (
      SELECT 1 FROM public.department_work_order_reports r2
      WHERE r2.complaint_id = p_complaint_id
    );

  INSERT INTO public.complaint_timeline_events (
    complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id
  ) VALUES (
    p_complaint_id,
    'accepted',
    'Complaint Returned to Department Queue',
    'شکایت محکمہ کی فہرست میں واپس کر دی گئی',
    'A supervisor unlinked this report for separate field handling.',
    'سپروائزر نے علیحدہ کارروائی کے لیے اس شکایت کا ربط تبدیل کیا ہے۔',
    'department_staff',
    v_actor
  );

  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
  VALUES (p_order_id, v_actor, 'report_detached', left(trim(p_reason), 200));

  RETURN jsonb_build_object('success', true, 'orderId', p_order_id, 'complaintId', p_complaint_id);
END;
$$;

REVOKE ALL ON FUNCTION public.v16_detach_report_from_work_order(text, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_detach_report_from_work_order(text, uuid, uuid, text) TO authenticated;

-- Reassign an active work order (e.g., when previous officer is suspended) without dropping links or proof history
CREATE OR REPLACE FUNCTION public.v16_reassign_work_order_officer(
  p_department text,
  p_order_id uuid,
  p_new_officer uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.department_work_orders%ROWTYPE;
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head authorization required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 8 THEN
    RAISE EXCEPTION 'Reassignment reason must be at least 8 characters.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.department_memberships m
    WHERE m.user_id = p_new_officer AND m.department_id = p_department
      AND m.status = 'active' AND m.staff_role = 'officer'
  ) THEN
    RAISE EXCEPTION 'New officer must have active membership in this department.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.department_work_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.department_id <> p_department THEN
    RAISE EXCEPTION 'Work order not found in this department.' USING ERRCODE = '42501';
  END IF;
  IF v_order.status = 'verified' THEN
    RAISE EXCEPTION 'Completed verified orders cannot be reassigned.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.department_work_orders
  SET officer_id = p_new_officer, updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
  VALUES (p_order_id, v_actor, 'officer_reassigned', left(trim(p_reason), 200));

  RETURN jsonb_build_object('success', true, 'orderId', p_order_id, 'officerId', p_new_officer);
END;
$$;

REVOKE ALL ON FUNCTION public.v16_reassign_work_order_officer(text, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v16_reassign_work_order_officer(text, uuid, uuid, text) TO authenticated;
