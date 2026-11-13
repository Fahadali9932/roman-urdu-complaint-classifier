-- The frontend queries public.complaints directly and is protected by its RLS
-- policies. Do not expose the legacy convenience view until it has a dedicated,
-- separately verified API contract.
REVOKE ALL ON public.department_complaints_view FROM PUBLIC, anon, authenticated;
