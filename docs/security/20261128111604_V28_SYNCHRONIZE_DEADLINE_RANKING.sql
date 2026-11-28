-- Actual staging migration; reconcile into canonical local migrations before release.
CREATE OR REPLACE FUNCTION public.v1318_request_extension(p_order uuid,p_due timestamptz,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE o public.department_work_orders%ROWTYPE; prior timestamptz;
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR o.officer_id IS DISTINCT FROM auth.uid() OR public.v16_staff_operational_access(auth.uid(),o.department_id,'officer') IS NOT TRUE THEN RAISE EXCEPTION 'Assigned active officer required' USING ERRCODE='42501'; END IF;
 prior:=coalesce(o.effective_deadline_at,o.due_at);
 IF o.status NOT IN ('in_progress','returned') OR p_due IS NULL OR p_due<=greatest(prior,clock_timestamp()) OR p_due>clock_timestamp()+interval '90 days' OR p_due>prior+interval '720 hours' OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 12 AND 1000 THEN RAISE EXCEPTION 'Invalid extension request' USING ERRCODE='22023'; END IF;
 UPDATE public.department_work_orders SET extension_requested_at=clock_timestamp(),extension_requested_due_at=p_due,extension_reason=trim(p_reason),updated_at=clock_timestamp() WHERE id=p_order;
 INSERT INTO public.department_work_events(order_id,actor_id,event_type,detail) VALUES(p_order,auth.uid(),'extension_requested',left(trim(p_reason),200));
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type)
 SELECT user_id,o.department_id,'Extension requested','An officer requested a work deadline extension.','deadline' FROM public.department_memberships WHERE department_id=o.department_id AND staff_role='head' AND status='active';
END;
$function$;
CREATE OR REPLACE FUNCTION public.v1318_decide_extension(p_order uuid,p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE o public.department_work_orders%ROWTYPE; prior timestamptz; next_due timestamptz;
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR public.v16_staff_operational_access(auth.uid(),o.department_id,'head') IS NOT TRUE THEN RAISE EXCEPTION 'Department head access required' USING ERRCODE='42501'; END IF;
 IF o.status NOT IN ('in_progress','returned') OR p_approve IS NULL OR o.extension_requested_due_at IS NULL THEN RAISE EXCEPTION 'No valid extension is awaiting review' USING ERRCODE='22023'; END IF;
 prior:=coalesce(o.effective_deadline_at,o.due_at); next_due:=o.extension_requested_due_at;
 IF p_approve AND (next_due<=greatest(prior,clock_timestamp()) OR next_due>prior+interval '720 hours') THEN RAISE EXCEPTION 'Requested deadline is no longer valid' USING ERRCODE='22023'; END IF;
 UPDATE public.department_work_orders SET due_at=CASE WHEN p_approve THEN next_due ELSE due_at END,
 effective_deadline_at=CASE WHEN p_approve THEN next_due ELSE effective_deadline_at END,extension_decided_at=clock_timestamp(),
 extension_requested_due_at=NULL,extension_requested_at=NULL,extension_reason=NULL,updated_at=clock_timestamp() WHERE id=p_order;
 IF p_approve THEN
 INSERT INTO public.work_order_deadline_history(order_id,department_id,previous_deadline,extended_deadline,additional_hours,reason,authorized_by)
 VALUES(p_order,o.department_id,prior,next_due,ceil(extract(epoch FROM (next_due-prior))/3600)::integer,coalesce(nullif(trim(o.extension_reason),''),'Approved officer extension request'),auth.uid());
 END IF;
 INSERT INTO public.department_work_events(order_id,actor_id,event_type) VALUES(p_order,auth.uid(),CASE WHEN p_approve THEN 'extension_approved' ELSE 'extension_denied' END);
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type) VALUES(o.officer_id,o.department_id,CASE WHEN p_approve THEN 'Extension approved' ELSE 'Extension declined' END,CASE WHEN p_approve THEN 'Your requested work deadline extension was approved.' ELSE 'Your requested extension was declined; the current deadline remains in effect.' END,'deadline');
END;
$function$;
CREATE OR REPLACE FUNCTION public.v16_department_officers(p_department text)
 RETURNS TABLE(user_id uuid, display_name text, employee_id text, staff_username text, staff_role text, membership_status text, must_change_password boolean, suspension_reason text, active_cases bigint, verified_cases bigint, on_time_cases bigint, overdue_cases bigint, disputed_cases bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    count(DISTINCT o.id) FILTER (WHERE o.status = 'verified' AND o.submitted_at <= coalesce(o.effective_deadline_at,o.due_at)),
    count(DISTINCT o.id) FILTER (WHERE o.status <> 'verified' AND coalesce(o.effective_deadline_at,o.due_at) < now()),
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
$function$;

