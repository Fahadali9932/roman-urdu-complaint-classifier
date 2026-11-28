
-- V23 staging operational bridge. Preserve existing evidence and citizen closure guards.
ALTER TABLE public.work_order_deadline_history ADD COLUMN IF NOT EXISTS created_at timestamptz GENERATED ALWAYS AS (authorized_at) STORED;
ALTER TABLE public.officer_profile_details
 ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'photograph_required' CHECK (approval_status IN ('photograph_required','awaiting_approval','approved','retake_required')),
 ADD COLUMN IF NOT EXISTS rejection_reason text,
 ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
 ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
 ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
-- Existing notification and ledger rows are visible only to authorized staff.
CREATE POLICY v23_notifications_read ON public.staff_notifications FOR SELECT TO authenticated USING
 (public.v16_staff_operational_access(auth.uid(),department_id,'head') OR
 (user_id=auth.uid() AND public.v16_staff_operational_access(auth.uid(),department_id,'officer')));
CREATE POLICY v23_notifications_mark_read ON public.staff_notifications FOR UPDATE TO authenticated USING
 (user_id=auth.uid() AND public.v16_staff_operational_access(auth.uid(),department_id,NULL))
 WITH CHECK (user_id=auth.uid() AND public.v16_staff_operational_access(auth.uid(),department_id,NULL));
GRANT SELECT ON public.staff_notifications TO authenticated;
GRANT UPDATE(is_read) ON public.staff_notifications TO authenticated;
CREATE POLICY v23_warning_read ON public.officer_warnings FOR SELECT TO authenticated USING
 (public.v16_staff_operational_access(auth.uid(),department_id,'head') OR
 (officer_id=auth.uid() AND public.v16_staff_operational_access(auth.uid(),department_id,'officer')));
CREATE POLICY v23_ranking_read ON public.officer_ranking_events FOR SELECT TO authenticated USING
 (public.v16_staff_operational_access(auth.uid(),department_id,'head') OR
 (officer_id=auth.uid() AND public.v16_staff_operational_access(auth.uid(),department_id,'officer')));
CREATE POLICY v23_deadline_read ON public.work_order_deadline_history FOR SELECT TO authenticated USING
 (public.v1318_can_view_order(order_id));
CREATE POLICY v23_heartbeat_read ON public.officer_activity_heartbeats FOR SELECT TO authenticated USING
 (public.v16_staff_operational_access(auth.uid(),department_id,'head') OR
 (officer_id=auth.uid() AND public.v16_staff_operational_access(auth.uid(),department_id,'officer')));
GRANT SELECT ON public.officer_warnings,public.officer_ranking_events,public.work_order_deadline_history,public.officer_activity_heartbeats TO authenticated;
-- Presence updates must be server-timestamped and scoped to the logged-in officer.
CREATE OR REPLACE FUNCTION public.v23_record_officer_heartbeat(p_department text,p_view text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.v16_staff_operational_access(auth.uid(),p_department,'officer') THEN RAISE EXCEPTION 'Active officer access required' USING ERRCODE='42501'; END IF;
 IF p_view IS NULL OR length(p_view)>80 THEN RAISE EXCEPTION 'Invalid view' USING ERRCODE='22023'; END IF;
 INSERT INTO public.officer_activity_heartbeats(officer_id,department_id,last_active_at,active_view)
 VALUES(auth.uid(),p_department,clock_timestamp(),p_view)
 ON CONFLICT(officer_id) DO UPDATE SET department_id=excluded.department_id,last_active_at=excluded.last_active_at,active_view=excluded.active_view;
END; $$;
REVOKE ALL ON FUNCTION public.v23_record_officer_heartbeat(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_record_officer_heartbeat(text,text) TO authenticated;
-- Store the HOD's selected duration when the existing assignment RPC creates an order.
CREATE OR REPLACE FUNCTION public.v23_capture_assigned_duration() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 NEW.assigned_duration_hours := greatest(1,ceil(extract(epoch FROM (NEW.original_due_at-NEW.assigned_at))/3600)::integer);
 IF NEW.assigned_duration_hours>720 THEN RAISE EXCEPTION 'Assignment duration cannot exceed 720 hours' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.v23_capture_assigned_duration() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER v23_capture_assigned_duration BEFORE INSERT ON public.department_work_orders
FOR EACH ROW EXECUTE FUNCTION public.v23_capture_assigned_duration();
-- Idempotent commencement; only the assigned active officer may start.
CREATE OR REPLACE FUNCTION public.v19_start_work_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.department_work_orders%ROWTYPE; deadline timestamptz; started timestamptz; 
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.officer_id IS DISTINCT FROM auth.uid() OR NOT public.v16_staff_operational_access(auth.uid(),o.department_id,'officer') THEN RAISE EXCEPTION 'Assigned active officer required' USING ERRCODE='42501'; END IF;
 IF o.status='in_progress' AND o.started_at IS NOT NULL THEN
  RETURN jsonb_build_object('success',true,'idempotentReplay',true,'status','in_progress','startedAt',o.started_at,'effectiveDeadlineAt',coalesce(o.effective_deadline_at,o.due_at));
 END IF;
 IF o.status NOT IN ('assigned','returned') THEN RAISE EXCEPTION 'Invalid order state' USING ERRCODE='23514'; END IF;
 started:=coalesce(o.started_at,clock_timestamp());
 deadline:=CASE WHEN o.status='returned' THEN coalesce(o.effective_deadline_at,o.due_at) ELSE started+make_interval(hours=>o.assigned_duration_hours) END;
 PERFORM public.v1318_start_work(p_order_id);
 UPDATE public.department_work_orders SET started_at=started,effective_deadline_at=deadline,due_at=deadline,updated_at=clock_timestamp() WHERE id=p_order_id;
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type)
 SELECT user_id,o.department_id,'Fieldwork started','An assigned officer has commenced work.','assignment' FROM public.department_memberships
 WHERE department_id=o.department_id AND staff_role='head' AND status='active';
 RETURN jsonb_build_object('success',true,'idempotentReplay',false,'status','in_progress','startedAt',started,'effectiveDeadlineAt',deadline);
END; $$;
REVOKE ALL ON FUNCTION public.v19_start_work_order(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v19_start_work_order(uuid) TO authenticated;
-- Warnings must target an officer in the caller's actual department.
CREATE OR REPLACE FUNCTION public.v19_issue_warning(p_officer_id uuid,p_department text,p_reason text,p_severity text DEFAULT 'formal')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE wid uuid;
BEGIN
 IF NOT public.v16_staff_operational_access(auth.uid(),p_department,'head') OR NOT EXISTS
 (SELECT 1 FROM public.department_memberships WHERE user_id=p_officer_id AND department_id=p_department AND staff_role='officer' AND status='active') THEN RAISE EXCEPTION 'Same-department head authorization required' USING ERRCODE='42501'; END IF;
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 OR p_severity IS NULL OR p_severity NOT IN ('advisory','formal','final') THEN RAISE EXCEPTION 'Invalid warning' USING ERRCODE='22023'; END IF;
 INSERT INTO public.officer_warnings(officer_id,department_id,issued_by,reason,severity) VALUES(p_officer_id,p_department,auth.uid(),trim(p_reason),p_severity) RETURNING id INTO wid;
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type) VALUES(p_officer_id,p_department,'Supervisory notice',trim(p_reason),'warning');
 RETURN jsonb_build_object('success',true,'warningId',wid,'officerId',p_officer_id);
END; $$;
REVOKE ALL ON FUNCTION public.v19_issue_warning(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v19_issue_warning(uuid,text,text,text) TO authenticated;
-- Deadline changes are audited and cannot bypass the existing assignment state machine.
CREATE OR REPLACE FUNCTION public.v19_extend_deadline(p_order_id uuid,p_additional_hours integer,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.department_work_orders%ROWTYPE; prior timestamptz; next_due timestamptz;
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR NOT public.v16_staff_operational_access(auth.uid(),o.department_id,'head') THEN RAISE EXCEPTION 'Department head access required' USING ERRCODE='42501'; END IF;
 IF o.status NOT IN ('in_progress','returned') OR p_additional_hours IS NULL OR p_additional_hours NOT BETWEEN 1 AND 720 OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid extension' USING ERRCODE='22023'; END IF;
 prior:=coalesce(o.effective_deadline_at,o.due_at); next_due:=prior+make_interval(hours=>p_additional_hours);
 IF next_due<=clock_timestamp() THEN RAISE EXCEPTION 'New deadline must be in the future' USING ERRCODE='22023'; END IF;
 UPDATE public.department_work_orders SET effective_deadline_at=next_due,due_at=next_due,extension_requested_due_at=NULL,extension_requested_at=NULL,extension_decided_at=clock_timestamp(),extension_reason=NULL,updated_at=clock_timestamp() WHERE id=p_order_id;
 INSERT INTO public.work_order_deadline_history(order_id,department_id,previous_deadline,extended_deadline,additional_hours,reason,authorized_by)
 VALUES(p_order_id,o.department_id,prior,next_due,p_additional_hours,trim(p_reason),auth.uid());
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type) VALUES(o.officer_id,o.department_id,'Deadline extended',trim(p_reason),'deadline');
 RETURN jsonb_build_object('success',true,'orderId',p_order_id,'previousDeadline',prior,'extendedDeadline',next_due,'additionalHours',p_additional_hours);
END; $$;
REVOKE ALL ON FUNCTION public.v19_extend_deadline(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v19_extend_deadline(uuid,integer,text) TO authenticated;
-- Safe profile reads for onboarding; exclude the CNIC hash from browser privileges.
CREATE POLICY v23_profile_read ON public.officer_profile_details FOR SELECT TO authenticated USING
 ((user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid() AND m.department_id=officer_profile_details.department_id AND m.status='active'))
 OR public.v16_staff_operational_access(auth.uid(),department_id,'head'));
GRANT SELECT(id,user_id,department_id,full_name,employee_id,official_email,phone_masked,cnic_masked,profile_photo_storage_path,created_at,updated_at,approval_status,rejection_reason,reviewed_by,reviewed_at,submitted_at) ON public.officer_profile_details TO authenticated;
