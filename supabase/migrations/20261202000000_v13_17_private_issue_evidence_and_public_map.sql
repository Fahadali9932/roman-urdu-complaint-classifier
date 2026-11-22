-- V13.17: optional citizen-confirmed evidence. Never expose exact points to anon.
-- Reversible: supplemental tables only; no changes to classifier or intake RPC.
CREATE TABLE IF NOT EXISTS public.complaint_geo_points (
  complaint_id uuid PRIMARY KEY REFERENCES public.complaints(id) ON DELETE CASCADE,
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN 24.45 AND 25.65),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN 66.25 AND 67.85),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaint_evidence (
  complaint_id uuid PRIMARY KEY REFERENCES public.complaints(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 1048576),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaint_geo_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.complaint_geo_points, public.complaint_evidence FROM anon, authenticated;
GRANT SELECT ON public.complaint_geo_points, public.complaint_evidence TO authenticated;

-- RLS is based on actual assignment, not on staff-supplied department labels.
CREATE OR REPLACE FUNCTION public.can_view_complaint_evidence(p_complaint_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = p_complaint_id AND (
      public.is_main_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.department_memberships m
        WHERE m.user_id = auth.uid() AND m.status = 'active'
          AND (m.department_id = c.assigned_department_id
            OR m.department_id = ANY(coalesce(c.assigned_department_ids, ARRAY[]::text[])))
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_complaint_evidence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_complaint_evidence(uuid) TO authenticated;

CREATE POLICY "Assigned staff can see confirmed pin"
  ON public.complaint_geo_points FOR SELECT TO authenticated
  USING (public.can_view_complaint_evidence(complaint_id));
CREATE POLICY "Assigned staff can see evidence metadata"
  ON public.complaint_evidence FOR SELECT TO authenticated
  USING (public.can_view_complaint_evidence(complaint_id));

-- Service role creates uploads; no anonymous direct write/list/delete path.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('complaint-evidence-private', 'complaint-evidence-private', false, 1048576,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY "Authorized complaint evidence downloads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'complaint-evidence-private' AND EXISTS (
    SELECT 1 FROM public.complaint_evidence e
    WHERE e.storage_path = name AND public.can_view_complaint_evidence(e.complaint_id)
  ));

-- Public maps are strictly non-identifying: 8+ submissions per large area
-- cell, no individual markers, no access to source coordinates or names.
CREATE OR REPLACE FUNCTION public.public_karachi_issue_cells(
  p_department text DEFAULT NULL,
  p_days integer DEFAULT 90
)
RETURNS TABLE (lat numeric, lon numeric, report_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT
    (floor(g.latitude / 0.09) * 0.09 + 0.045)::numeric(8,4) AS lat,
    (floor(g.longitude / 0.09) * 0.09 + 0.045)::numeric(8,4) AS lon,
    count(*) AS report_count
  FROM public.complaint_geo_points g
  JOIN public.complaints c ON c.id = g.complaint_id
  WHERE c.is_demonstration = false
    AND c.status IN ('assigned', 'in_progress', 'submitted')
    AND c.created_at >= now() - make_interval(days => CASE
      WHEN p_days IN (30, 90, 365) THEN p_days ELSE 90 END)
    AND (p_department IS NULL OR p_department = '' OR
      (p_department IN ('kmc', 'kwsc', 'kelectric', 'ssgc', 'sbca', 'sswmb')
       AND p_department = ANY(coalesce(c.assigned_department_ids,
                  ARRAY[c.assigned_department_id]))))
  GROUP BY floor(g.latitude / 0.09), floor(g.longitude / 0.09)
  HAVING count(*) >= 8;
$$;
REVOKE ALL ON FUNCTION public.public_karachi_issue_cells(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_karachi_issue_cells(text, integer) TO anon, authenticated;

COMMENT ON FUNCTION public.public_karachi_issue_cells(text, integer) IS
  'Anonymized 0.09-degree cells with 8+ active submissions; no exact geolocation or PII.';
