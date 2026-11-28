-- Actual migration applied to staging only; reconcile into canonical local migrations before deployment.
CREATE OR REPLACE FUNCTION app_private.v26_update_complaint_status(p_complaint_id uuid, p_new_status text, p_title_en text, p_title_ur text, p_note_en text, p_note_ur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_citizen_email TEXT;
    v_citizen_name TEXT;
    v_is_staff_active BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    IF v_caller_id IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock the row so simultaneous staff actions cannot create conflicting
    -- transitions or timeline entries.
    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    v_is_admin := public.is_main_admin(v_caller_id);

    -- An administrator may operate the workflow; all other callers must have an
    -- active membership in the department to which this complaint is assigned.
    IF NOT v_is_admin THEN
        SELECT EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = v_caller_id
              AND m.department_id = v_complaint.assigned_department_id
              AND m.status = 'active'
              AND public.v16_staff_operational_access(v_caller_id,m.department_id,'head')
        ) INTO v_is_staff_active;

        IF NOT v_is_staff_active THEN
            RAISE EXCEPTION 'Unauthorized: You do not have active staff credentials for this department.';
        END IF;

    END IF;

    IF p_new_status = 'resolved' AND public.v1318_resolution_ready(p_complaint_id) IS NOT TRUE THEN RAISE EXCEPTION 'Verified work-order closure requirements not met' USING ERRCODE='42501'; END IF;
    -- Never allow an arbitrary status change, including by an administrator.
    -- Assignment itself is performed by the separately authorized reassignment
    -- workflow; department staff may only perform the operational lifecycle.
    IF (v_complaint.status = 'assigned' AND p_new_status NOT IN ('accepted', 'rejected'))
       OR (v_complaint.status = 'accepted' AND p_new_status NOT IN ('in_progress', 'rejected'))
       OR (v_complaint.status = 'in_progress' AND p_new_status NOT IN ('resolved', 'rejected'))
       OR v_complaint.status IN ('submitted', 'under_review', 'resolved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
    END IF;

    -- Execute status transition
    UPDATE public.complaints
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_complaint_id;

    -- Record immutable milestone in timeline
    INSERT INTO public.complaint_timeline_events (
        complaint_id,
        status,
        title,
        title_urdu,
        description,
        description_urdu,
        actor_role,
        actor_id
    )
    VALUES (
        p_complaint_id,
        p_new_status,
        p_title_en,
        p_title_ur,
        p_note_en,
        p_note_ur,
        CASE WHEN v_is_admin THEN 'main_admin' ELSE 'department_staff' END,
        v_caller_id
    );

    -- Securely fetch citizen notification contact from private table
    SELECT citizen_email, citizen_name 
    INTO v_citizen_email, v_citizen_name
    FROM public.complaint_citizen_private
    WHERE complaint_id = p_complaint_id;

    -- Queue transactional notification in outbox (Staff caller NEVER sees this email)
    IF v_citizen_email IS NOT NULL AND trim(v_citizen_email) <> '' THEN
        INSERT INTO public.complaint_notification_outbox (
            complaint_id,
            recipient_email,
            recipient_name,
            event_type,
            status,
            payload
        )
        VALUES (
            p_complaint_id,
            trim(v_citizen_email),
            coalesce(v_citizen_name, 'Citizen'),
            'status_updated',
            p_new_status,
            jsonb_build_object(
                'reference_number', v_complaint.reference_number,
                'status', p_new_status,
                'title_en', p_title_en,
                'title_ur', p_title_ur,
                'note_en', p_note_en,
                'note_ur', p_note_ur,
                'department_id', v_complaint.assigned_department_id,
                'timestamp', now()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', p_complaint_id,
        'old_status', v_complaint.status,
        'new_status', p_new_status
    );
END;
$function$;
REVOKE ALL ON FUNCTION app_private.v26_update_complaint_status(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.staff_update_complaint_status(p_complaint_id uuid, p_new_status text, p_title_en text, p_title_ur text, p_note_en text, p_note_ur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF p_new_status IS NULL OR p_new_status='resolved' THEN
  RAISE EXCEPTION 'Use verified work-order closure after evidence and citizen review' USING ERRCODE='42501';
 END IF;
 RETURN app_private.v26_update_complaint_status(p_complaint_id,p_new_status,p_title_en,p_title_ur,p_note_en,p_note_ur);
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
    PERFORM app_private.v26_update_complaint_status(v_report.id,'resolved',
      'Work completed and verified','کام مکمل اور تصدیق شدہ',
      'Department head approved on-site work evidence.','متعلقہ محکمے نے کام کی تصدیق کی ہے۔');
    v_count:=v_count+1;
  END LOOP;
  INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail)
    VALUES(p_order,auth.uid(),'citizen_records_closed',v_count::text);
  RETURN v_count;
END;
$function$;

