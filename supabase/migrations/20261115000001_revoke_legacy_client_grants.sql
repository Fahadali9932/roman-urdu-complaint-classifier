-- Revoke grants created by the earlier baseline migrations before re-granting
-- only the browser-callable administrative workflows.
REVOKE ALL ON FUNCTION public.approve_access_request(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_access_request(UUID, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_staff_access(UUID, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_provision_department_staff(UUID, TEXT, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_auth_rate_limit(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.record_auth_attempt(TEXT, BOOLEAN) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.approve_access_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_access_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) TO authenticated;
