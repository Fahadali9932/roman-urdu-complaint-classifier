-- V23.0C.2: preserve existing citizen confirmation / 72-hour closure policy.
-- Required departments are the union of primary, assigned array, and nonduplicate issues.
CREATE OR REPLACE FUNCTION public.v1318_is_department_head(p_department text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND coalesce(auth.jwt()->>'aal' = 'aal2',false) AND (
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
$function$;

CREATE OR REPLACE FUNCTION public.v1318_resolution_ready(p_complaint uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_case public.complaints%ROWTYPE; v_department text;
  v_order uuid; v_proof uuid; v_reviewed timestamptz;
BEGIN
  IF auth.uid() IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN RETURN false; END IF;
  SELECT * INTO v_case FROM public.complaints WHERE id=p_complaint;
  IF v_case.id IS NULL OR v_case.assigned_department_id IS NULL
    OR v_case.status<>'in_progress' THEN RETURN false; END IF;
  FOR v_department IN SELECT department_id FROM (
      SELECT v_case.assigned_department_id AS department_id
      UNION SELECT unnest(coalesce(v_case.assigned_department_ids, ARRAY[]::text[]))
      UNION SELECT i.department_id FROM public.complaint_issues i
        WHERE i.complaint_id=v_case.id AND i.status <> 'duplicate'
    ) required WHERE department_id IS NOT NULL LOOP
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
$function$;

CREATE OR REPLACE FUNCTION public.v1318_close_verified_order(p_order uuid, p_nonresponse_reason text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    FOR v_department IN SELECT department_id FROM (
      SELECT v_report.assigned_department_id AS department_id
      UNION SELECT unnest(coalesce(v_report.assigned_department_ids, ARRAY[]::text[]))
      UNION SELECT i.department_id FROM public.complaint_issues i
        WHERE i.complaint_id=v_report.id AND i.status <> 'duplicate'
    ) required WHERE department_id IS NOT NULL LOOP
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
$function$;

CREATE OR REPLACE FUNCTION public.v1318_staff_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_main_admin(auth.uid()) AND NOT
    (NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.department_memberships m WHERE m.user_id = auth.uid()) THEN
    IF (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.v23_sync_reviewed_order_issues()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status NOT IN ('verified','returned') THEN
    RETURN NEW;
  END IF;
  UPDATE public.complaint_issues i SET
    status = CASE WHEN NEW.status='verified' THEN 'completed' ELSE 'in_progress' END,
    updated_at = clock_timestamp()
  FROM public.department_work_order_reports r
  WHERE r.order_id=NEW.id AND r.department_id=NEW.department_id
    AND i.complaint_id=r.complaint_id AND i.department_id=NEW.department_id
    AND i.status NOT IN ('resolved','rejected','duplicate');
  INSERT INTO public.complaint_timeline_events
    (complaint_id,status,title,title_urdu,description,description_urdu,actor_role,actor_id)
  SELECT c.id,c.status,
    CASE WHEN NEW.status='verified' THEN 'Department work verified' ELSE 'Work returned for correction' END,
    CASE WHEN NEW.status='verified' THEN 'محکمے کے کام کی تصدیق' ELSE 'کام اصلاح کے لیے واپس' END,
    CASE WHEN NEW.status='verified' THEN 'Evidence approved; final closure requires citizen review.' ELSE 'Further fieldwork is required.' END,
    CASE WHEN NEW.status='verified' THEN 'ثبوت منظور ہوا۔ حتمی تکمیل کے لیے شہری جائزہ ضروری ہے۔' ELSE 'مزید فیلڈ کارروائی ضروری ہے۔' END,
    'system',NULL
  FROM public.department_work_order_reports r JOIN public.complaints c ON c.id=r.complaint_id
  WHERE r.order_id=NEW.id AND r.department_id=NEW.department_id
    AND c.status IN ('assigned','accepted','in_progress');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.v23_sync_reviewed_order_issues() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v23_sync_reviewed_order_issues() TO service_role;
DROP TRIGGER IF EXISTS v23_sync_reviewed_order_issues ON public.department_work_orders;
CREATE TRIGGER v23_sync_reviewed_order_issues AFTER UPDATE OF status ON public.department_work_orders
FOR EACH ROW EXECUTE FUNCTION public.v23_sync_reviewed_order_issues();
