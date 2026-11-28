
-- Server-only officer verification state; no OTP values are exposed to browser roles.
ALTER TABLE public.officer_profile_details ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE public.department_memberships ADD COLUMN IF NOT EXISTS requires_officer_onboarding boolean NOT NULL DEFAULT false;
ALTER TABLE public.officer_onboarding_otps ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
CREATE OR REPLACE FUNCTION public.v23_reserve_officer_otp(p_user uuid,p_hash text,p_salt text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.officer_profile_details%ROWTYPE; oid uuid; t timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO p FROM public.officer_profile_details WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.department_memberships m WHERE m.user_id=p_user AND m.department_id=p.department_id AND m.staff_role='officer' AND m.status='active') THEN RAISE EXCEPTION 'Active officer account required' USING ERRCODE='42501'; END IF;
 IF p.contact_email IS NULL OR p.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR (p_hash ~ '^[a-f0-9]{64}$' AND p_salt ~ '^[a-f0-9]{32}$') IS NOT TRUE THEN RAISE EXCEPTION 'Verified contact configuration required' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.officer_onboarding_otps WHERE user_id=p_user AND resend_cooldown_until>t) OR (SELECT count(*) FROM public.officer_onboarding_otps WHERE user_id=p_user AND created_at>t-interval '1 hour')>=5 THEN RAISE EXCEPTION 'OTP resend limit reached' USING ERRCODE='22023'; END IF;
 UPDATE public.officer_onboarding_otps SET expires_at=t WHERE user_id=p_user AND verified_at IS NULL AND expires_at>t;
 INSERT INTO public.officer_onboarding_otps(user_id,contact_email,otp_hash,salt,expires_at,resend_cooldown_until) VALUES(p_user,p.contact_email,p_hash,p_salt,t+interval '5 minutes',t+interval '60 seconds') RETURNING id INTO oid;
 RETURN jsonb_build_object('id',oid,'email',p.contact_email);
END; $$;
REVOKE ALL ON FUNCTION public.v23_reserve_officer_otp(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_reserve_officer_otp(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.v23_verify_officer_otp(p_user uuid,p_id uuid,p_candidate_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.officer_profile_details%ROWTYPE; o public.officer_onboarding_otps%ROWTYPE; t timestamptz:=clock_timestamp(); ok boolean;
BEGIN
 SELECT * INTO p FROM public.officer_profile_details WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.department_memberships m WHERE m.user_id=p_user AND m.department_id=p.department_id AND m.staff_role='officer' AND m.status='active') THEN RETURN jsonb_build_object('success',false,'message','Active officer account required'); END IF;
 SELECT * INTO o FROM public.officer_onboarding_otps WHERE id=p_id AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR o.verified_at IS NOT NULL OR o.dispatched_at IS NULL OR o.expires_at<=t OR o.attempts_count>=o.max_attempts OR o.contact_email IS DISTINCT FROM p.contact_email THEN RETURN jsonb_build_object('success',false,'message','Request a fresh verification code'); END IF;
 ok:=coalesce(o.otp_hash=p_candidate_hash,false);
 UPDATE public.officer_onboarding_otps SET attempts_count=attempts_count+1,verified_at=CASE WHEN ok THEN t ELSE NULL END WHERE id=o.id;
 IF ok THEN UPDATE public.officer_profile_details SET email_verified_at=t,updated_at=t WHERE user_id=p_user; END IF;
 RETURN jsonb_build_object('success',ok,'attemptsRemaining',o.max_attempts-o.attempts_count-1,'message',CASE WHEN ok THEN 'Email verified' ELSE 'Invalid verification code' END);
END; $$;
REVOKE ALL ON FUNCTION public.v23_verify_officer_otp(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_verify_officer_otp(uuid,uuid,text) TO service_role;
-- Do not weaken the established AAL2 requirement. New officers must verify email.
CREATE OR REPLACE FUNCTION public.v16_staff_operational_access(p_user uuid,p_department text,p_required_role text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(p_user IS NOT NULL AND p_user=auth.uid() AND auth.jwt()->>'aal'='aal2' AND (
 (p_required_role IS DISTINCT FROM 'officer' AND public.is_main_admin(p_user)) OR EXISTS(
 SELECT 1 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id
 WHERE m.user_id=p_user AND m.department_id=p_department AND m.status='active' AND d.is_active
 AND (p_required_role IS NULL OR m.staff_role=p_required_role)
 AND (m.staff_role<>'officer' OR (NOT m.must_change_password AND
 (NOT m.requires_officer_onboarding OR EXISTS(SELECT 1 FROM public.officer_profile_details p WHERE p.user_id=p_user AND p.department_id=p_department AND p.email_verified_at IS NOT NULL AND p.approval_status='approved'))))
 )),false);
$$;
REVOKE ALL ON FUNCTION public.v16_staff_operational_access(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v16_staff_operational_access(uuid,text,text) TO authenticated,service_role;
-- Private staff photo paths. Only the owner can upload; same-department head can read.
CREATE POLICY v23_profile_photo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='staff-profile-photos-private' AND (storage.foldername(name))[1]=auth.uid()::text
 AND EXISTS(SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid() AND m.status='active'));
CREATE POLICY v23_profile_photo_select ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='staff-profile-photos-private' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS(
 SELECT 1 FROM public.officer_profile_details p WHERE p.user_id::text=(storage.foldername(name))[1] AND public.v16_staff_operational_access(auth.uid(),p.department_id,'head'))));
CREATE OR REPLACE FUNCTION public.v23_submit_officer_profile_photo(p_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.officer_profile_details%ROWTYPE;
BEGIN
 SELECT * INTO p FROM public.officer_profile_details WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' OR NOT EXISTS(SELECT 1 FROM public.department_memberships m WHERE m.user_id=auth.uid() AND m.department_id=p.department_id AND m.status='active') THEN RAISE EXCEPTION 'Active staff identity required' USING ERRCODE='42501'; END IF;
 IF p_path IS NULL OR split_part(p_path,'/',1)<>auth.uid()::text OR p_path LIKE '%..%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='staff-profile-photos-private' AND name=p_path) THEN RAISE EXCEPTION 'Private profile photograph required' USING ERRCODE='22023'; END IF;
 UPDATE public.officer_profile_details SET profile_photo_storage_path=p_path,approval_status='awaiting_approval',submitted_at=clock_timestamp(),rejection_reason=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=clock_timestamp() WHERE user_id=auth.uid();
 RETURN jsonb_build_object('success',true,'status','awaiting_approval');
END; $$;
REVOKE ALL ON FUNCTION public.v23_submit_officer_profile_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_submit_officer_profile_photo(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.v23_review_officer_profile_photo(p_target uuid,p_decision text,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.officer_profile_details%ROWTYPE; next_status text;
BEGIN
 SELECT * INTO p FROM public.officer_profile_details WHERE user_id=p_target FOR UPDATE;
 IF NOT FOUND OR p_target=auth.uid() OR NOT public.v16_staff_operational_access(auth.uid(),p.department_id,'head') OR NOT EXISTS(SELECT 1 FROM public.department_memberships m WHERE m.user_id=p_target AND m.department_id=p.department_id AND m.staff_role='officer' AND m.status='active') THEN RAISE EXCEPTION 'Authorized same-department head required' USING ERRCODE='42501'; END IF;
 IF p.approval_status<>'awaiting_approval' OR p_decision NOT IN ('approve','retake') OR (p_decision='retake' AND length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000) THEN RAISE EXCEPTION 'Invalid profile review' USING ERRCODE='22023'; END IF;
 IF p_decision='approve' AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='staff-profile-photos-private' AND name=p.profile_photo_storage_path) THEN RAISE EXCEPTION 'Photograph missing' USING ERRCODE='22023'; END IF;
 next_status:=CASE WHEN p_decision='approve' THEN 'approved' ELSE 'retake_required' END;
 UPDATE public.officer_profile_details SET approval_status=next_status,rejection_reason=CASE WHEN p_decision='retake' THEN trim(p_reason) ELSE NULL END,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE user_id=p_target;
 RETURN jsonb_build_object('success',true,'newStatus',next_status);
END; $$;
REVOKE ALL ON FUNCTION public.v23_review_officer_profile_photo(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_review_officer_profile_photo(uuid,text,text) TO authenticated;
