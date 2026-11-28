CREATE TABLE app_private.v24_staff_login_quota (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 11)
);
ALTER TABLE app_private.v24_staff_login_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.v24_staff_login_quota FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.v24_staff_login_prepare(p_identifier text,p_department text,p_key_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t timestamptz:=clock_timestamp(); n integer; u record; matches integer;
BEGIN
 IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' OR p_identifier IS NULL OR length(p_identifier) NOT BETWEEN 1 AND 120 OR p_department IS NULL THEN
   RETURN jsonb_build_object('allowed',false);
 END IF;
 INSERT INTO app_private.v24_staff_login_quota(key_hash,window_started,attempts)
 VALUES(p_key_hash,t,1)
 ON CONFLICT(key_hash) DO UPDATE SET
  window_started=CASE WHEN app_private.v24_staff_login_quota.window_started<=t-interval '15 minutes' THEN t ELSE app_private.v24_staff_login_quota.window_started END,
  attempts=CASE WHEN app_private.v24_staff_login_quota.window_started<=t-interval '15 minutes' THEN 1 ELSE least(11,app_private.v24_staff_login_quota.attempts+1) END
 RETURNING attempts INTO n;
 IF n>10 THEN RETURN jsonb_build_object('allowed',false); END IF;
 SELECT count(DISTINCT m.user_id) INTO matches
 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id
 JOIN auth.users a ON a.id=m.user_id JOIN public.profiles p ON p.id=m.user_id
 WHERE m.department_id=p_department AND d.is_active AND m.status='active' AND p.role='department_staff'
 AND (lower(m.staff_username)=p_identifier OR lower(m.employee_id)=p_identifier OR lower(a.email)=p_identifier);
 IF matches<>1 THEN RETURN jsonb_build_object('allowed',true); END IF;
 SELECT a.id,a.email INTO u
 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id
 JOIN auth.users a ON a.id=m.user_id JOIN public.profiles p ON p.id=m.user_id
 WHERE m.department_id=p_department AND d.is_active AND m.status='active' AND p.role='department_staff'
 AND (lower(m.staff_username)=p_identifier OR lower(m.employee_id)=p_identifier OR lower(a.email)=p_identifier) LIMIT 1;
 RETURN jsonb_build_object('allowed',true,'user_id',u.id,'email',u.email);
END $$;
REVOKE ALL ON FUNCTION public.v24_staff_login_prepare(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v24_staff_login_prepare(text,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.v16_resolve_staff_login_email(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v16_resolve_staff_login_email(text,text) TO service_role;