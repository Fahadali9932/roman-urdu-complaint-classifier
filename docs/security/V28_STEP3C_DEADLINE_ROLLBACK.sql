-- Previous staging function definitions; restoring reintroduces deadline divergence.
CREATE OR REPLACE FUNCTION public.v1318_decide_extension(p_order uuid, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.v1318_request_extension(p_order uuid, p_due timestamp with time zone, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
