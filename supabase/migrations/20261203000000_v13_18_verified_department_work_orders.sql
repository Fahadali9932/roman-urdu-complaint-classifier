-- V13.18: durable, department-scoped assignments and evidence reviews.
-- Apply only after V13.17 migrations, in disposable staging first.
-- No privilege is inferred from editable auth.user_metadata or from a route.

ALTER TABLE public.department_memberships
  ADD COLUMN IF NOT EXISTS staff_role text NOT NULL DEFAULT 'officer'
    CHECK (staff_role IN ('head', 'officer'));

CREATE TABLE IF NOT EXISTS public.department_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id text NOT NULL REFERENCES public.departments(id),
  anchor_complaint_id uuid NOT NULL REFERENCES public.complaints(id),
  case_label text NOT NULL CHECK (length(case_label) BETWEEN 1 AND 80),
  officer_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  instructions text NOT NULL CHECK (length(instructions) BETWEEN 8 AND 1200),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  original_due_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  started_at timestamptz,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN
    ('assigned','in_progress','pending_review','verified','returned')),
  extension_requested_at timestamptz,
  extension_requested_due_at timestamptz,
  extension_reason text,
  extension_decided_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  citizen_dispute_pending boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, anchor_complaint_id),
  CHECK (due_at > assigned_at)
);

CREATE INDEX IF NOT EXISTS idx_v1318_orders_officer
  ON public.department_work_orders(officer_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_v1318_orders_department
  ON public.department_work_orders(department_id, status, due_at);

CREATE TABLE IF NOT EXISTS public.department_work_order_reports (
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id) ON DELETE CASCADE,
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  PRIMARY KEY (order_id, complaint_id)
);
CREATE INDEX IF NOT EXISTS idx_v1318_work_report_complaint
  ON public.department_work_order_reports(complaint_id);

CREATE TABLE IF NOT EXISTS public.department_work_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 1048576),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN 24.45 AND 25.65),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN 66.25 AND 67.85),
  accuracy_m numeric(8,2) NOT NULL CHECK (accuracy_m > 0 AND accuracy_m <= 500),
  original_distance_m numeric(10,2),
  location_result text NOT NULL CHECK (location_result IN ('near','needs_review','no_original_pin')),
  duplicate_warning boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id),
  decision_note text
);
CREATE INDEX IF NOT EXISTS idx_v1318_evidence_order
  ON public.department_work_evidence(order_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.department_work_feedback (
  evidence_id uuid NOT NULL REFERENCES public.department_work_evidence(id),
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id),
  citizen_id uuid NOT NULL REFERENCES auth.users(id),
  verdict text NOT NULL CHECK (verdict IN ('confirmed','disputed')),
  note text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evidence_id, complaint_id)
);
CREATE INDEX IF NOT EXISTS idx_v1318_feedback_order
  ON public.department_work_feedback(order_id, complaint_id);

-- An unanswered citizen may be closed only after the review window, and only
-- through an MFA-verified head's documented decision. Direct writes are denied.
CREATE TABLE IF NOT EXISTS public.department_work_closure_reviews (
  complaint_id uuid PRIMARY KEY REFERENCES public.complaints(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 20 AND 1200),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.department_work_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.department_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_work_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_work_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_work_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_work_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_work_closure_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.department_work_orders, public.department_work_order_reports,
  public.department_work_evidence, public.department_work_feedback,
  public.department_work_events, public.department_work_closure_reviews FROM anon, authenticated;
GRANT SELECT ON public.department_work_orders, public.department_work_order_reports,
  public.department_work_evidence, public.department_work_feedback,
  public.department_work_events, public.department_work_closure_reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_is_department_head(p_department text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND auth.jwt()->>'aal' = 'aal2' AND (
    public.is_main_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid() AND m.department_id = p_department
        AND m.status = 'active' AND m.staff_role = 'head'
    )
  );
$$;
REVOKE ALL ON FUNCTION public.v1318_is_department_head(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_is_department_head(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_can_view_order(p_order uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_work_orders o
    WHERE o.id = p_order AND auth.uid() IS NOT NULL AND auth.jwt()->>'aal' = 'aal2' AND (
      public.v1318_is_department_head(o.department_id) OR
      (o.officer_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.department_memberships m
        WHERE m.department_id = o.department_id AND m.user_id = auth.uid() AND m.status = 'active'
      ))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.v1318_can_view_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_can_view_order(uuid) TO authenticated;

CREATE POLICY v1318_orders_read ON public.department_work_orders
  FOR SELECT TO authenticated USING (public.v1318_can_view_order(id));
CREATE POLICY v1318_links_read ON public.department_work_order_reports
  FOR SELECT TO authenticated USING (public.v1318_can_view_order(order_id));
CREATE POLICY v1318_evidence_read ON public.department_work_evidence
  FOR SELECT TO authenticated USING (public.v1318_can_view_order(order_id));
CREATE POLICY v1318_events_read ON public.department_work_events
  FOR SELECT TO authenticated USING (public.v1318_can_view_order(order_id));
CREATE POLICY v1318_feedback_read ON public.department_work_feedback
  FOR SELECT TO authenticated USING (
    -- A staff member gets aggregate dispute indicators, never unredacted
    -- citizen-written feedback through the generic Data API.
    citizen_id = auth.uid()
  );
CREATE POLICY v1318_closure_review_read ON public.department_work_closure_reviews
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id=complaint_id AND c.citizen_id=auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.department_work_order_reports r
      WHERE r.complaint_id=complaint_id AND public.v1318_can_view_order(r.order_id)
    )
  );

-- Department heads can see only actively approved staff in their department.
CREATE OR REPLACE FUNCTION public.v1318_department_team(p_department text)
RETURNS TABLE(user_id uuid, display_name text, staff_role text, active_cases bigint,
  verified_cases bigint, on_time_cases bigint, overdue_cases bigint, disputed_cases bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Department-head access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT m.user_id, COALESCE(p.full_name, 'Staff officer')::text, m.staff_role,
    count(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('verified')),
    count(DISTINCT o.id) FILTER (WHERE o.status = 'verified'),
    count(DISTINCT o.id) FILTER (WHERE o.status = 'verified' AND o.reviewed_at <= o.due_at),
    count(DISTINCT o.id) FILTER (WHERE o.status <> 'verified' AND o.due_at < now()),
    count(DISTINCT f.order_id) FILTER (WHERE f.verdict = 'disputed')
  FROM public.department_memberships m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.department_work_orders o ON o.officer_id = m.user_id AND o.department_id = m.department_id
  LEFT JOIN public.department_work_feedback f ON f.order_id = o.id
  WHERE m.department_id = p_department AND m.status = 'active'
  GROUP BY m.user_id, p.full_name, m.staff_role
  ORDER BY count(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('verified')) ASC, p.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_department_team(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_department_team(text) TO authenticated;

-- All mutation functions run with explicit caller, role, membership and target checks.
CREATE OR REPLACE FUNCTION public.v1318_assign_work(
  p_department text, p_anchor uuid, p_reports uuid[], p_case_label text,
  p_officer uuid, p_due timestamptz, p_instructions text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_existing public.department_work_orders%ROWTYPE; v_now timestamptz := now();
BEGIN
  IF NOT public.v1318_is_department_head(p_department) THEN
    RAISE EXCEPTION 'Assignment restricted to department head' USING ERRCODE = '42501';
  END IF;
  IF p_anchor IS NULL OR p_reports IS NULL OR array_length(p_reports,1) IS NULL
    OR array_length(p_reports,1) > 100 OR NOT (p_anchor = ANY(p_reports))
    OR length(trim(p_case_label)) NOT BETWEEN 1 AND 80
    OR length(trim(p_instructions)) NOT BETWEEN 8 AND 1200
    OR p_due <= v_now OR p_due > v_now + interval '90 days' THEN
    RAISE EXCEPTION 'Invalid assignment details';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.department_memberships m WHERE m.user_id=p_officer
    AND m.department_id=p_department AND m.status='active' AND m.staff_role='officer') THEN
    RAISE EXCEPTION 'Officer is not approved for this department' USING ERRCODE='42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_reports) AS rid(id)
    LEFT JOIN public.complaints c ON c.id=rid.id
    WHERE c.id IS NULL OR NOT (
      c.assigned_department_id=p_department OR
      p_department=ANY(coalesce(c.assigned_department_ids,ARRAY[]::text[]))
    )
  ) THEN
    RAISE EXCEPTION 'One or more reports are outside this department' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_existing FROM public.department_work_orders
    WHERE department_id=p_department AND anchor_complaint_id=p_anchor FOR UPDATE;
  IF FOUND AND v_existing.status IN ('verified','pending_review') THEN
    RAISE EXCEPTION 'Verified orders and evidence pending review cannot be reassigned';
  END IF;
  IF v_existing.id IS NULL THEN
    INSERT INTO public.department_work_orders(department_id, anchor_complaint_id, case_label,
      officer_id, assigned_by, instructions, assigned_at, original_due_at, due_at)
    VALUES(p_department,p_anchor,trim(p_case_label),p_officer,auth.uid(),
      trim(p_instructions),v_now,p_due,p_due) RETURNING id INTO v_id;
  ELSE
    v_id := v_existing.id;
    UPDATE public.department_work_orders SET officer_id=p_officer, assigned_by=auth.uid(),
      instructions=trim(p_instructions), due_at=p_due, status='assigned',
      started_at=NULL, updated_at=v_now WHERE id=v_id;
    DELETE FROM public.department_work_order_reports WHERE order_id=v_id;
  END IF;
  INSERT INTO public.department_work_order_reports(order_id, complaint_id)
    SELECT v_id, x FROM (SELECT DISTINCT unnest(p_reports) AS x) q;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(v_id,auth.uid(),'assigned',left('Assigned with a deadline',200));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_assign_work(text,uuid,uuid[],text,uuid,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_assign_work(text,uuid,uuid[],text,uuid,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_start_work(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
  IF v_order.id IS NULL OR v_order.officer_id<>auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid()
      AND m.department_id=v_order.department_id AND m.status='active' AND m.staff_role='officer'
      AND auth.jwt()->>'aal'='aal2'
  ) THEN RAISE EXCEPTION 'Not assigned to this officer' USING ERRCODE='42501'; END IF;
  IF v_order.status NOT IN ('assigned','returned') THEN
    RAISE EXCEPTION 'Cannot start an order in this state'; END IF;
  UPDATE public.department_work_orders SET status='in_progress',
    started_at=coalesce(started_at,now()),updated_at=now() WHERE id=p_order;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type)
    VALUES(p_order,auth.uid(),'started');
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_start_work(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_start_work(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_request_extension(p_order uuid,p_due timestamptz,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
  IF v_order.id IS NULL OR v_order.officer_id<>auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid()
    AND m.department_id=v_order.department_id AND m.status='active' AND m.staff_role='officer'
    AND auth.jwt()->>'aal'='aal2') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF v_order.status IN ('verified','pending_review') OR p_due <= v_order.due_at
     OR p_due > now()+interval '90 days' OR length(trim(p_reason)) < 12 THEN
    RAISE EXCEPTION 'Invalid extension request'; END IF;
  UPDATE public.department_work_orders SET extension_requested_at=now(),
    extension_requested_due_at=p_due,extension_reason=left(trim(p_reason),1000),updated_at=now()
    WHERE id=p_order;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(p_order,auth.uid(),'extension_requested',left(trim(p_reason),200));
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_request_extension(uuid,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_request_extension(uuid,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_decide_extension(p_order uuid,p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
  IF v_order.id IS NULL OR NOT public.v1318_is_department_head(v_order.department_id) THEN
    RAISE EXCEPTION 'Department-head access required' USING ERRCODE='42501'; END IF;
  IF v_order.extension_requested_due_at IS NULL THEN
    RAISE EXCEPTION 'No extension is awaiting review'; END IF;
  UPDATE public.department_work_orders SET
    due_at=CASE WHEN p_approve THEN extension_requested_due_at ELSE due_at END,
    extension_decided_at=now(), extension_requested_due_at=NULL,
    extension_requested_at=NULL,updated_at=now() WHERE id=p_order;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type)
    VALUES(p_order,auth.uid(),CASE WHEN p_approve THEN 'extension_approved' ELSE 'extension_denied' END);
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_decide_extension(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_decide_extension(uuid,boolean) TO authenticated;

-- Called exclusively by the authenticated evidence-upload Edge Function using
-- the service role. Browser clients never receive direct write grants.
CREATE OR REPLACE FUNCTION public.v1318_record_proof(
  p_order uuid, p_officer uuid, p_path text, p_mime text, p_bytes integer,
  p_sha256 text, p_lat numeric, p_lon numeric, p_accuracy numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE; v_geo public.complaint_geo_points%ROWTYPE;
  v_distance numeric; v_result text; v_duplicate boolean; v_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
  IF v_order.id IS NULL OR v_order.officer_id<>p_officer OR v_order.status<>'in_progress' THEN
    RAISE EXCEPTION 'Work order is not eligible for evidence'; END IF;
  IF p_lat NOT BETWEEN 24.45 AND 25.65 OR p_lon NOT BETWEEN 66.25 AND 67.85
    OR p_accuracy <= 0 OR p_accuracy > 500 OR p_bytes < 1 OR p_bytes > 1048576
    OR p_mime NOT IN ('image/jpeg','image/png','image/webp')
    OR p_sha256 !~ '^[a-f0-9]{64}$' OR p_path !~ '^work/' THEN
    RAISE EXCEPTION 'Invalid evidence'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='department-work-proof-private' AND name=p_path) THEN
    RAISE EXCEPTION 'Evidence object is missing'; END IF;
  SELECT * INTO v_geo FROM public.complaint_geo_points
    WHERE complaint_id=v_order.anchor_complaint_id;
  IF v_geo.complaint_id IS NULL THEN
    v_result:='no_original_pin'; v_distance:=NULL;
  ELSE
    v_distance:=round((6371000 * 2 * asin(least(1,sqrt(
      power(sin(radians((p_lat-v_geo.latitude)::double precision)/2),2) +
      cos(radians(v_geo.latitude::double precision))*cos(radians(p_lat::double precision))*
      power(sin(radians((p_lon-v_geo.longitude)::double precision)/2),2)
    ))))::numeric,2);
    v_result:=CASE WHEN v_distance<=greatest(100,p_accuracy*2) THEN 'near' ELSE 'needs_review' END;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.department_work_evidence e WHERE e.sha256=p_sha256)
    INTO v_duplicate;
  INSERT INTO public.department_work_evidence(order_id,submitted_by,storage_path,mime_type,bytes,
    sha256,latitude,longitude,accuracy_m,original_distance_m,location_result,duplicate_warning)
  VALUES(p_order,p_officer,p_path,p_mime,p_bytes,p_sha256,p_lat,p_lon,p_accuracy,
    v_distance,v_result,v_duplicate) RETURNING id INTO v_id;
  UPDATE public.department_work_orders SET status='pending_review',updated_at=now() WHERE id=p_order;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(p_order,p_officer,'evidence_submitted',v_result);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_record_proof(uuid,uuid,text,text,integer,text,numeric,numeric,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v1318_record_proof(uuid,uuid,text,text,integer,text,numeric,numeric,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.v1318_review_proof(p_order uuid,p_approve boolean,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE; v_proof public.department_work_evidence%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
  IF v_order.id IS NULL OR NOT public.v1318_is_department_head(v_order.department_id) THEN
    RAISE EXCEPTION 'Head authorization required' USING ERRCODE='42501'; END IF;
  IF v_order.status<>'pending_review' THEN RAISE EXCEPTION 'No pending evidence'; END IF;
  SELECT * INTO v_proof FROM public.department_work_evidence
    WHERE order_id=p_order AND decision='pending' ORDER BY submitted_at DESC LIMIT 1 FOR UPDATE;
  IF v_proof.id IS NULL THEN RAISE EXCEPTION 'No pending photograph'; END IF;
  IF p_approve AND (v_proof.location_result<>'near' OR v_proof.duplicate_warning)
    AND length(trim(coalesce(p_note,''))) < 20 THEN
    RAISE EXCEPTION 'Review justification required for location or duplicate warnings'; END IF;
  UPDATE public.department_work_evidence SET decision=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    decided_at=now(),decided_by=auth.uid(),decision_note=left(coalesce(p_note,''),1200)
    WHERE id=v_proof.id;
  UPDATE public.department_work_orders SET status=CASE WHEN p_approve THEN 'verified' ELSE 'returned' END,
    citizen_dispute_pending=CASE WHEN p_approve THEN false ELSE citizen_dispute_pending END,
    reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_note,''),1200),updated_at=now()
    WHERE id=p_order;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(p_order,auth.uid(),CASE WHEN p_approve THEN 'evidence_approved' ELSE 'evidence_rejected' END,
      left(coalesce(p_note,''),200));
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_review_proof(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_review_proof(uuid,boolean,text) TO authenticated;

-- Shared status gate: legacy status RPCs must not bypass the same citizen-review
-- policy as the explicit head closure action. A waiver exists only when the
-- head recorded a reason after the full 72-hour unanswered response window.
CREATE OR REPLACE FUNCTION public.v1318_resolution_ready(p_complaint uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_case public.complaints%ROWTYPE; v_department text;
  v_order uuid; v_proof uuid; v_reviewed timestamptz;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'aal'<>'aal2' THEN RETURN false; END IF;
  SELECT * INTO v_case FROM public.complaints WHERE id=p_complaint;
  IF v_case.id IS NULL OR v_case.assigned_department_id IS NULL
    OR v_case.status<>'in_progress' THEN RETURN false; END IF;
  FOR v_department IN SELECT DISTINCT unnest(
    CASE WHEN cardinality(coalesce(v_case.assigned_department_ids,ARRAY[]::text[]))>0
      THEN v_case.assigned_department_ids ELSE ARRAY[v_case.assigned_department_id] END
  ) LOOP
    SELECT o.id,e.id,o.reviewed_at INTO v_order,v_proof,v_reviewed
      FROM public.department_work_order_reports r
      JOIN public.department_work_orders o ON o.id=r.order_id AND o.department_id=v_department
        AND o.status='verified'
      JOIN public.department_work_evidence e ON e.order_id=o.id AND e.decision='approved'
      WHERE r.complaint_id=p_complaint
      ORDER BY e.submitted_at DESC LIMIT 1;
    IF v_order IS NULL OR v_proof IS NULL OR v_reviewed IS NULL THEN RETURN false; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.department_work_feedback f WHERE f.evidence_id=v_proof
        AND f.complaint_id=p_complaint AND f.verdict='confirmed'
    ) AND NOT (
      v_reviewed<=now()-interval '72 hours' AND EXISTS (
        SELECT 1 FROM public.department_work_closure_reviews w
        WHERE w.complaint_id=p_complaint AND w.actor_id=auth.uid()
          AND w.recorded_at>=v_reviewed AND length(trim(w.reason))>=20
      )
    ) THEN RETURN false; END IF;
    v_order:=NULL; v_proof:=NULL; v_reviewed:=NULL;
  END LOOP;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_resolution_ready(uuid) FROM PUBLIC,anon,authenticated;

-- Closure is a deliberate MFA-verified head action: first supervisor proof,
-- then citizen confirmation or a reasoned decision after 72 unanswered hours.
-- The existing status RPC retains the official timeline and notification flow.
CREATE OR REPLACE FUNCTION public.v1318_close_verified_order(
  p_order uuid,p_nonresponse_reason text DEFAULT ''
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE;
  v_report record; v_count integer := 0; v_department text;
  v_reviewed timestamptz; v_proof uuid; v_silent boolean;
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
  IF v_order.id IS NULL OR NOT public.v1318_is_department_head(v_order.department_id) THEN
    RAISE EXCEPTION 'Department head authorization required' USING ERRCODE='42501'; END IF;
  IF v_order.status<>'verified' OR NOT EXISTS(
    SELECT 1 FROM public.department_work_evidence e
    WHERE e.order_id=p_order AND e.decision='approved'
  ) THEN RAISE EXCEPTION 'Supervisor-approved work evidence is required'; END IF;

  FOR v_report IN SELECT c.id,c.status,c.assigned_department_id,c.assigned_department_ids
      FROM public.complaints c JOIN public.department_work_order_reports r ON r.complaint_id=c.id
      WHERE r.order_id=p_order ORDER BY c.id FOR UPDATE OF c LOOP
    IF v_report.status='resolved' THEN CONTINUE; END IF;
    IF v_report.status<>'in_progress' OR v_report.assigned_department_id<>v_order.department_id THEN
      RAISE EXCEPTION 'Each report must be in progress and closed by its primary department'; END IF;
    v_silent:=false;
    FOR v_department IN SELECT DISTINCT unnest(
      CASE WHEN cardinality(coalesce(v_report.assigned_department_ids,ARRAY[]::text[]))>0
        THEN v_report.assigned_department_ids ELSE ARRAY[v_report.assigned_department_id] END
      ) LOOP
      SELECT e.id,o.reviewed_at INTO v_proof,v_reviewed
        FROM public.department_work_order_reports r
        JOIN public.department_work_orders o ON o.id=r.order_id AND o.status='verified'
        JOIN public.department_work_evidence e ON e.order_id=o.id AND e.decision='approved'
        WHERE r.complaint_id=v_report.id AND o.department_id=v_department
        ORDER BY e.submitted_at DESC LIMIT 1;
      IF v_proof IS NULL OR v_reviewed IS NULL THEN
        RAISE EXCEPTION 'Another assigned department has not verified its work'; END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.department_work_feedback f WHERE f.evidence_id=v_proof
          AND f.complaint_id=v_report.id AND f.verdict='confirmed'
      ) THEN
        IF v_reviewed>now()-interval '72 hours' THEN
          RAISE EXCEPTION 'Await the 72-hour citizen review window or explicit citizen confirmation'; END IF;
        v_silent:=true;
      END IF;
      v_proof:=NULL; v_reviewed:=NULL;
    END LOOP;
    IF v_silent THEN
      IF length(trim(coalesce(p_nonresponse_reason,''))) NOT BETWEEN 20 AND 1200 THEN
        RAISE EXCEPTION 'Documented supervisor reason (20-1200 characters) required for unanswered citizen feedback';
      END IF;
      INSERT INTO public.department_work_closure_reviews(complaint_id,actor_id,reason,recorded_at)
      VALUES(v_report.id,auth.uid(),trim(p_nonresponse_reason),now())
      ON CONFLICT (complaint_id) DO UPDATE SET actor_id=EXCLUDED.actor_id,
        reason=EXCLUDED.reason,recorded_at=EXCLUDED.recorded_at;
      INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
      VALUES(p_order,auth.uid(),'nonresponse_closure_review',left(trim(p_nonresponse_reason),200));
    END IF;
    IF NOT public.v1318_resolution_ready(v_report.id) THEN
      RAISE EXCEPTION 'Citizen confirmation or authorized review window required'; END IF;
    PERFORM public.staff_update_complaint_status(v_report.id,'resolved',
      'Work completed and verified','کام مکمل اور تصدیق شدہ',
      'Department head approved on-site work evidence.','متعلقہ محکمے نے کام کی تصدیق کی ہے۔');
    v_count:=v_count+1;
  END LOOP;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(p_order,auth.uid(),'citizen_records_closed',v_count::text);
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_close_verified_order(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v1318_close_verified_order(uuid,text) TO authenticated;

-- A citizen may only see approved proof linked to their own complaint.
CREATE OR REPLACE FUNCTION public.v1318_my_work_proofs(p_complaint uuid)
RETURNS TABLE(order_id uuid,department_id text,storage_path text,submitted_at timestamptz,
    distance_m numeric,location_result text,feedback text,
    order_status text,response_expires_at timestamptz,can_respond boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.complaints c WHERE c.id=p_complaint AND c.citizen_id=auth.uid()
  ) THEN RAISE EXCEPTION 'Complaint ownership required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT o.id,o.department_id,e.storage_path,e.submitted_at,
    e.original_distance_m,e.location_result,f.verdict,o.status,
    o.reviewed_at+interval '72 hours',
    (o.status='verified' AND now()<=o.reviewed_at+interval '72 hours'
      AND c.status<>'resolved' AND f.verdict IS NULL)
    FROM public.department_work_order_reports r
    JOIN public.department_work_orders o ON o.id=r.order_id
    JOIN public.department_work_evidence e ON e.order_id=o.id AND e.decision='approved'
    JOIN public.complaints c ON c.id=r.complaint_id
    LEFT JOIN public.department_work_feedback f ON f.evidence_id=e.id AND f.complaint_id=p_complaint
    WHERE r.complaint_id=p_complaint AND e.id=(
      SELECT latest.id FROM public.department_work_evidence latest
      WHERE latest.order_id=o.id AND latest.decision='approved'
      ORDER BY latest.submitted_at DESC LIMIT 1
    )
    ORDER BY e.submitted_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_my_work_proofs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_my_work_proofs(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.v1318_citizen_feedback(
  p_order uuid,p_complaint uuid,p_verdict text,p_note text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.department_work_orders%ROWTYPE; v_evidence uuid;
BEGIN
  IF p_verdict NOT IN ('confirmed','disputed') OR length(coalesce(p_note,''))>1000
    OR (p_verdict='disputed' AND length(trim(coalesce(p_note,'')))<10) THEN
    RAISE EXCEPTION 'Invalid feedback'; END IF;
  SELECT o.* INTO v_order
    FROM public.department_work_orders o
    JOIN public.department_work_order_reports r ON r.order_id=o.id
    JOIN public.complaints c ON c.id=r.complaint_id
    WHERE o.id=p_order AND r.complaint_id=p_complaint
      AND c.citizen_id=auth.uid() AND c.status<>'resolved'
    FOR UPDATE OF o;
  IF v_order.id IS NULL OR v_order.status<>'verified' OR v_order.reviewed_at IS NULL
    OR now()>v_order.reviewed_at+interval '72 hours' THEN
    RAISE EXCEPTION 'Citizen review is unavailable or its 72-hour window has closed' USING ERRCODE='42501';
  END IF;
  SELECT e.id INTO v_evidence FROM public.department_work_evidence e
    WHERE e.order_id=p_order AND e.decision='approved'
    ORDER BY e.submitted_at DESC LIMIT 1;
  IF v_evidence IS NULL THEN RAISE EXCEPTION 'No approved proof is available'; END IF;
  INSERT INTO public.department_work_feedback(evidence_id,order_id,complaint_id,citizen_id,verdict,note)
    VALUES(v_evidence,p_order,p_complaint,auth.uid(),p_verdict,trim(coalesce(p_note,'')))
  ON CONFLICT (evidence_id,complaint_id) DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'Feedback has already been recorded'; END IF;
  IF p_verdict='disputed' THEN
    UPDATE public.department_work_orders SET status='returned',citizen_dispute_pending=true,
      review_note='Citizen reported unresolved work; officer rework is required',updated_at=now()
      WHERE id=p_order;
  END IF;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(p_order,auth.uid(),'citizen_feedback',p_verdict);
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_citizen_feedback(uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_citizen_feedback(uuid,uuid,text,text) TO authenticated;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('department-work-proof-private','department-work-proof-private',false,1048576,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=1048576,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

CREATE OR REPLACE FUNCTION public.v1318_can_download_proof(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.department_work_evidence e
   JOIN public.department_work_orders o ON o.id=e.order_id
   WHERE e.storage_path=p_path AND (
     public.v1318_can_view_order(o.id) OR
     (e.decision='approved' AND EXISTS (
       SELECT 1 FROM public.department_work_order_reports r
       JOIN public.complaints c ON c.id=r.complaint_id
       WHERE r.order_id=o.id AND c.citizen_id=auth.uid()
     ))
   )
 );
$$;
REVOKE ALL ON FUNCTION public.v1318_can_download_proof(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v1318_can_download_proof(text) TO authenticated;

CREATE POLICY v1318_private_proof_download ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id='department-work-proof-private' AND public.v1318_can_download_proof(name)
  );

COMMENT ON TABLE public.department_work_orders IS
  'Durable work allocation by a verified head to an individual officer. Only approved evidence may count as verified.';

-- Main administrator alone may promote a verified employee to department head.
-- No role grants are based on the editable profile metadata or user email.
CREATE OR REPLACE FUNCTION public.v1318_set_staff_role(p_membership uuid,p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_membership public.department_memberships%ROWTYPE; v_email text;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'aal'<>'aal2' OR NOT public.is_main_admin(auth.uid()) THEN
    RAISE EXCEPTION 'MFA-verified main administrator required' USING ERRCODE='42501';
  END IF;
  IF p_role NOT IN ('head','officer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT * INTO v_membership FROM public.department_memberships WHERE id=p_membership FOR UPDATE;
  IF v_membership.id IS NULL OR v_membership.status<>'active' THEN
    RAISE EXCEPTION 'Approved membership not found' USING ERRCODE='42501';
  END IF;
  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id=v_membership.user_id;
  UPDATE public.department_memberships SET staff_role=p_role,updated_at=now() WHERE id=p_membership;
  INSERT INTO public.access_audit_log(action,target_user_id,target_email,department_id,actor_id,details)
  VALUES('admin_provisioned',v_membership.user_id,coalesce(v_email,'unknown'),v_membership.department_id,
    auth.uid(),jsonb_build_object('operation','staff_role_updated','role',p_role));
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_set_staff_role(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v1318_set_staff_role(uuid,text) TO authenticated;

-- The legacy staff-only table policy allowed every officer to browse every
-- departmental report. Replace it with least-privilege per-work-order access.
-- Department heads still see the complete routing inbox for their department.
DROP POLICY IF EXISTS "Department staff can select assigned or review complaints" ON public.complaints;
CREATE POLICY v1318_staff_case_read ON public.complaints FOR SELECT TO authenticated
USING (auth.jwt()->>'aal'='aal2' AND EXISTS (
  SELECT 1 FROM public.department_memberships m
  WHERE m.user_id=auth.uid() AND m.status='active' AND (
    (m.staff_role='head' AND (
      m.department_id=complaints.assigned_department_id OR
      m.department_id=ANY(coalesce(complaints.assigned_department_ids,ARRAY[]::text[])) OR
      (m.department_id='kmc' AND complaints.status='under_review')
    )) OR (m.staff_role='officer' AND EXISTS (
      SELECT 1 FROM public.department_work_orders o
      JOIN public.department_work_order_reports r ON r.order_id=o.id
      WHERE r.complaint_id=complaints.id AND o.officer_id=auth.uid() AND o.department_id=m.department_id
    ))
  )
));

-- Security-definer legacy status RPCs bypass row policies. The trigger prevents
-- officers from editing another officer's reports and blocks unverified closure.
CREATE OR REPLACE FUNCTION public.v1318_staff_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_main_admin(auth.uid()) AND NOT
    (NEW.status='resolved' AND OLD.status IS DISTINCT FROM 'resolved') THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid() AND m.status='active') THEN
    IF auth.jwt()->>'aal'<>'aal2' THEN
      RAISE EXCEPTION 'Authenticator verification required for staff mutations' USING ERRCODE='42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid()
        AND m.status='active' AND (
          (m.staff_role='head' AND (m.department_id=OLD.assigned_department_id
           OR m.department_id=ANY(coalesce(OLD.assigned_department_ids,ARRAY[]::text[]))))
          OR (m.staff_role='officer' AND EXISTS(
            SELECT 1 FROM public.department_work_orders o
              JOIN public.department_work_order_reports r ON r.order_id=o.id
              WHERE o.officer_id=auth.uid() AND o.department_id=m.department_id AND r.complaint_id=OLD.id
          ))
        )
    ) THEN RAISE EXCEPTION 'Outside assigned work' USING ERRCODE='42501'; END IF;
  END IF;
  IF NEW.status='resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    IF NOT public.is_main_admin(auth.uid()) AND NOT EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id=auth.uid() AND m.status='active' AND m.staff_role='head'
        AND m.department_id=OLD.assigned_department_id
    ) THEN
      RAISE EXCEPTION 'Only the primary department head may close verified reports'
        USING ERRCODE='42501';
    END IF;
    IF NOT public.v1318_resolution_ready(OLD.id) THEN
      RAISE EXCEPTION 'Verified evidence and citizen confirmation, or a documented 72-hour head review, are required before closure'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS v1318_guard_complaint_status ON public.complaints;
CREATE TRIGGER v1318_guard_complaint_status BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.v1318_staff_update_guard();
REVOKE ALL ON FUNCTION public.v1318_staff_update_guard() FROM PUBLIC,anon,authenticated;
