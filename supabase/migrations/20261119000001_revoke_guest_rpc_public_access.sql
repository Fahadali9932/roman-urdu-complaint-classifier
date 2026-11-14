-- These routines are invoked only by the trusted Edge Function / signed-in
-- citizen flow. Explicit revokes remove grants inherited from older overloads.
REVOKE ALL ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) TO service_role;

REVOKE ALL ON FUNCTION public.claim_guest_complaint(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_complaint(text, text) TO authenticated;
