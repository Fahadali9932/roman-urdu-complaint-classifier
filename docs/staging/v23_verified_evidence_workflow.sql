
-- Short-lived, server-issued location records; device coordinates remain spoofable.
CREATE TABLE public.v23_work_location_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.department_work_orders(id) ON DELETE CASCADE,
 officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, latitude numeric NOT NULL,longitude numeric NOT NULL,accuracy numeric NOT NULL,
 distance_m numeric, verified boolean NOT NULL, result text NOT NULL CHECK(result IN ('verified','outside_radius','inconclusive_accuracy','no_baseline')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL,consumed_at timestamptz
);
ALTER TABLE public.v23_work_location_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.v23_work_location_verifications FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.v23_work_location_verifications TO service_role;
CREATE INDEX v23_location_order_idx ON public.v23_work_location_verifications(order_id,officer_id,created_at DESC);
ALTER TABLE public.department_work_orders ADD COLUMN IF NOT EXISTS location_verification_id uuid REFERENCES public.v23_work_location_verifications(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.v23_verify_work_location(p_order_id uuid,p_lat numeric,p_lng numeric,p_accuracy numeric,p_device_timestamp timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.department_work_orders%ROWTYPE; g public.complaint_geo_points%ROWTYPE; v public.v23_work_location_verifications%ROWTYPE; d numeric; state text; t timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.officer_id IS DISTINCT FROM auth.uid() OR public.v16_staff_operational_access(auth.uid(),o.department_id,'officer') IS NOT TRUE THEN RAISE EXCEPTION 'Assigned active officer required' USING ERRCODE='42501'; END IF;
 IF o.status<>'in_progress' THEN RAISE EXCEPTION 'Start work before verifying location' USING ERRCODE='22023'; END IF;
 IF (p_lat BETWEEN 23.50 AND 28.60 AND p_lng BETWEEN 66.40 AND 71.20 AND p_accuracy>0 AND p_accuracy<=500) IS NOT TRUE OR p_device_timestamp IS NULL OR abs(extract(epoch FROM (t-p_device_timestamp)))>300 THEN RAISE EXCEPTION 'Invalid or stale device location' USING ERRCODE='22023'; END IF;
 IF EXISTS (SELECT 1 FROM public.v23_work_location_verifications WHERE order_id=o.id AND officer_id=auth.uid() AND created_at>t-interval '2 seconds') THEN RAISE EXCEPTION 'Wait before retrying location' USING ERRCODE='22023'; END IF;
 SELECT * INTO g FROM public.complaint_geo_points WHERE complaint_id=o.anchor_complaint_id;
 IF g.complaint_id IS NULL THEN state:='no_baseline';
 ELSE
 d:=round((6371000*2*asin(least(1.0,sqrt(power(sin(radians((p_lat-g.latitude)::double precision)/2),2)+cos(radians(g.latitude::double precision))*cos(radians(p_lat::double precision))*power(sin(radians((p_lng-g.longitude)::double precision)/2),2)))))::numeric,2);
 state:=CASE WHEN p_accuracy>30 THEN 'inconclusive_accuracy' WHEN d>30 THEN 'outside_radius' ELSE 'verified' END;
 END IF;
 UPDATE public.v23_work_location_verifications SET expires_at=t WHERE order_id=o.id AND officer_id=auth.uid() AND consumed_at IS NULL AND expires_at>t;
 INSERT INTO public.v23_work_location_verifications(order_id,officer_id,latitude,longitude,accuracy,distance_m,verified,result,created_at,expires_at)
 VALUES(o.id,auth.uid(),p_lat,p_lng,p_accuracy,d,state='verified',state,t,t+interval '5 minutes') RETURNING * INTO v;
 RETURN jsonb_build_object('verificationId',v.id,'orderId',v.order_id,'officerId',v.officer_id,'verified',v.verified,'distanceMeters',v.distance_m,'accuracyMeters',v.accuracy,'status',v.result,'verifiedAt',v.created_at,'expiresAt',v.expires_at,'consumed',false,'message',CASE WHEN v.verified THEN 'Reported location is within 30m of the incident.' ELSE 'Location requires supervisory exception review.' END);
END; $$;
REVOKE ALL ON FUNCTION public.v23_verify_work_location(uuid,numeric,numeric,numeric,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_verify_work_location(uuid,numeric,numeric,numeric,timestamptz) TO authenticated;
-- Called only by the authenticated upload Edge Function after validating file bytes and uploading private objects.
CREATE OR REPLACE FUNCTION public.v23_record_verified_proof(p_order uuid,p_officer uuid,p_verification uuid,p_path text,p_mime text,p_bytes integer,p_sha256 text,p_before_path text DEFAULT NULL,p_before_mime text DEFAULT NULL,p_before_bytes integer DEFAULT NULL,p_before_sha256 text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.department_work_orders%ROWTYPE; v public.v23_work_location_verifications%ROWTYPE; proof uuid; loc text; prefix text;
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR o.officer_id IS DISTINCT FROM p_officer OR o.status<>'in_progress' OR NOT EXISTS(SELECT 1 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id WHERE m.user_id=p_officer AND m.department_id=o.department_id AND m.staff_role='officer' AND m.status='active' AND NOT m.must_change_password AND d.is_active) THEN RAISE EXCEPTION 'Assigned active officer required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.v23_work_location_verifications WHERE id=p_verification AND order_id=p_order AND officer_id=p_officer FOR UPDATE;
 IF NOT FOUND OR v.consumed_at IS NOT NULL OR v.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Fresh unused location verification required' USING ERRCODE='22023'; END IF;
 prefix:='work/'||o.department_id||'/'||p_order::text||'/';
 IF p_path IS NULL OR left(p_path,length(prefix))<>prefix OR (p_before_path IS NOT NULL AND left(p_before_path,length(prefix))<>prefix) THEN RAISE EXCEPTION 'Invalid work evidence path' USING ERRCODE='22023'; END IF;
 proof:=public.v1318_record_proof(p_order,p_officer,p_path,p_mime,p_bytes,p_sha256,v.latitude,v.longitude,v.accuracy,p_before_path,p_before_mime,p_before_bytes,p_before_sha256);
 loc:=CASE WHEN v.verified THEN 'near' WHEN v.result='no_baseline' THEN 'no_original_pin' ELSE 'needs_review' END;
 UPDATE public.department_work_evidence SET location_result=loc,original_distance_m=v.distance_m WHERE id=proof;
 UPDATE public.department_work_orders SET submitted_at=clock_timestamp(),gps_latitude=v.latitude,gps_longitude=v.longitude,gps_accuracy_m=v.accuracy,gps_distance_m=v.distance_m,gps_verified=v.verified,gps_exception_review=NOT v.verified,location_verification_id=v.id,evidence_hash=p_sha256,evidence_integrity_status='manual_review_required' WHERE id=o.id;
 UPDATE public.v23_work_location_verifications SET consumed_at=clock_timestamp() WHERE id=v.id;
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type)
 SELECT user_id,o.department_id,'Resolution ready for review','An officer submitted private work evidence.','verification' FROM public.department_memberships WHERE department_id=o.department_id AND staff_role='head' AND status='active';
 RETURN jsonb_build_object('success',true,'submitted',true,'proofId',proof,'gpsVerified',v.verified,'gpsExceptionReview',NOT v.verified,'locationResult',loc,'distanceMeters',v.distance_m,'storagePath',p_path,'beforeStoragePath',p_before_path);
END; $$;
REVOKE ALL ON FUNCTION public.v23_record_verified_proof(uuid,uuid,uuid,text,text,integer,text,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_record_verified_proof(uuid,uuid,uuid,text,text,integer,text,text,text,integer,text) TO service_role;
-- Preserve the existing citizen confirmation/72-hour closure guard.
CREATE OR REPLACE FUNCTION public.v19_approve_resolution(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.department_work_orders%ROWTYPE; on_time boolean;
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR public.v16_staff_operational_access(auth.uid(),o.department_id,'head') IS NOT TRUE THEN RAISE EXCEPTION 'Authorized department head required' USING ERRCODE='42501'; END IF;
 PERFORM public.v1318_review_proof(p_order_id,true,'');
 on_time:=coalesce(o.submitted_at<=o.effective_deadline_at,false);
 INSERT INTO public.officer_ranking_events(officer_id,order_id,department_id,event_type,points_delta,notes)
 VALUES(o.officer_id,o.id,o.department_id,CASE WHEN on_time THEN 'on_time_completion' ELSE 'overdue_submission' END,CASE WHEN on_time THEN 10 ELSE -15 END,'Supervisor-approved evidence')
 ON CONFLICT(order_id,event_type) DO NOTHING;
 UPDATE public.complaint_issues i SET status='completed',updated_at=clock_timestamp() FROM public.department_work_order_reports r WHERE r.order_id=o.id AND i.complaint_id=r.complaint_id AND i.department_id=o.department_id AND i.status NOT IN('resolved','rejected','duplicate');
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type) VALUES(o.officer_id,o.department_id,'Resolution approved','Supervisor approved your work evidence.','verification');
 RETURN jsonb_build_object('success',true,'onTime',on_time,'status','verified');
END; $$;
REVOKE ALL ON FUNCTION public.v19_approve_resolution(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v19_approve_resolution(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.v19_return_correction(p_order_id uuid,p_reason text,p_correction_hours integer DEFAULT 24)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.department_work_orders%ROWTYPE; deadline timestamptz;
BEGIN
 SELECT * INTO o FROM public.department_work_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR public.v16_staff_operational_access(auth.uid(),o.department_id,'head') IS NOT TRUE THEN RAISE EXCEPTION 'Authorized department head required' USING ERRCODE='42501'; END IF;
 IF p_correction_hours IS NULL OR p_correction_hours NOT BETWEEN 1 AND 720 OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Valid correction reason and duration required' USING ERRCODE='22023'; END IF;
 PERFORM public.v1318_review_proof(p_order_id,false,trim(p_reason));
 deadline:=clock_timestamp()+make_interval(hours=>p_correction_hours);
 UPDATE public.department_work_orders SET due_at=deadline,effective_deadline_at=deadline,gps_verified=false,gps_exception_review=false,location_verification_id=NULL WHERE id=o.id;
 INSERT INTO public.officer_ranking_events(officer_id,order_id,department_id,event_type,points_delta,notes) VALUES(o.officer_id,o.id,o.department_id,'correction_penalty',-10,trim(p_reason)) ON CONFLICT(order_id,event_type) DO NOTHING;
 INSERT INTO public.staff_notifications(user_id,department_id,title,message,notification_type) VALUES(o.officer_id,o.department_id,'Correction required',trim(p_reason),'warning');
 RETURN jsonb_build_object('success',true,'newDeadline',deadline);
END; $$;
REVOKE ALL ON FUNCTION public.v19_return_correction(uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v19_return_correction(uuid,text,integer) TO authenticated;
