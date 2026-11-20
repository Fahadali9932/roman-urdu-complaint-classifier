-- V13.9: least-privilege staff access on staging and later environments.
-- Created with Supabase CLI and ordered after all existing 20261126 migrations.
-- This migration intentionally does not touch complaint records or model artifacts.
BEGIN;

-- RLS helpers may bypass row filtering to inspect the protected role tables,
-- but the supplied UUID must never become an authorization credential.
CREATE OR REPLACE FUNCTION public.is_main_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT p_user_id IS NOT NULL
     AND p_user_id = (SELECT auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = p_user_id AND p.role = 'main_admin'
     );
$fn$;

CREATE OR REPLACE FUNCTION public.get_active_staff_department(p_user_id uuid)
RETURNS TABLE (
  membership_id uuid,
  department_id text,
  department_name text,
  department_code text,
  membership_status text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT m.id, d.id, d.name, d.code, m.status
  FROM public.department_memberships AS m
  JOIN public.departments AS d ON d.id = m.department_id
  WHERE p_user_id IS NOT NULL
    AND p_user_id = (SELECT auth.uid())
    AND m.user_id = p_user_id
    AND m.status = 'active'
    AND d.is_active = true
  LIMIT 1;
$fn$;

-- All three privileged commands check auth.uid() and the administrator role
-- inside the function. Pin the search path so untrusted schemas cannot shadow
-- helper functions or relations.
ALTER FUNCTION public.approve_access_request(uuid) SET search_path = '';
ALTER FUNCTION public.reject_access_request(uuid, text) SET search_path = '';
ALTER FUNCTION public.revoke_staff_access(uuid, text) SET search_path = '';

-- PostgreSQL functions default to EXECUTE for PUBLIC, inherited by anon.
REVOKE ALL ON FUNCTION public.is_main_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_active_staff_department(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_access_request(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_access_request(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_staff_access(uuid, text) FROM PUBLIC, anon, authenticated;

-- Kept callable by authenticated users because RLS policies and authenticated
-- admin workflows require them; function bodies still enforce identity/role.
GRANT EXECUTE ON FUNCTION public.is_main_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_staff_department(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_access_request(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_access_request(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_staff_access(uuid, text) TO authenticated, service_role;

-- The anonymous department catalogue must not invoke the privileged admin
-- helper. Separate active-directory visibility from administrator operations.
DROP POLICY IF EXISTS "Public and staff can view active departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view active departments" ON public.departments;
CREATE POLICY "Anyone can view active departments"
  ON public.departments FOR SELECT TO anon, authenticated
  USING (is_active = true);
DROP POLICY IF EXISTS "Main admins can manage departments" ON public.departments;
CREATE POLICY "Main admins can manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.is_main_admin((SELECT auth.uid())))
  WITH CHECK (public.is_main_admin((SELECT auth.uid())));

-- Never allow a citizen to self-promote by editing profiles.role. Table-level
-- UPDATE grants override column grants, so revoke them first.
REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name, email, updated_at) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Users can update own non-role profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own display profile" ON public.profiles;
CREATE POLICY "Users can update own display profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Prevent requesters from forging reviewer metadata on INSERT.
DROP POLICY IF EXISTS "Applicants can submit their own access request" ON public.department_access_requests;
DROP POLICY IF EXISTS "Applicants can submit clean pending access requests" ON public.department_access_requests;
CREATE POLICY "Applicants can submit clean pending access requests"
  ON public.department_access_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND rejection_reason IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

COMMIT;
