-- ==============================================================================
-- V14: SINDH GEOGRAPHICAL ELIGIBILITY & DUAL BEFORE/AFTER WORK PROOF REPAIR
-- Additive, non-destructive migration preserving all V13.17 / V13.18 history,
-- RLS policies, AAL2 checks, and single-photo historical evidence compatibility.
-- ==============================================================================

-- 1. Expand coordinate CHECK envelopes from Karachi-only to Sindh province
--    (Exact Sindh polygon & per-department Karachi coverage enforced in Edge Functions.)
DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.complaint_geo_points'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.complaint_geo_points DROP CONSTRAINT IF EXISTS %I', v_con);
  END LOOP;

  ALTER TABLE public.complaint_geo_points
    ADD CONSTRAINT complaint_geo_points_sindh_lat_check CHECK (latitude BETWEEN 23.50 AND 28.60),
    ADD CONSTRAINT complaint_geo_points_sindh_lon_check CHECK (longitude BETWEEN 66.40 AND 71.20);

  FOR v_con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.department_work_evidence'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%latitude%' OR pg_get_constraintdef(oid) ILIKE '%longitude%')
  LOOP
    EXECUTE format('ALTER TABLE public.department_work_evidence DROP CONSTRAINT IF EXISTS %I', v_con);
  END LOOP;

  ALTER TABLE public.department_work_evidence
    ADD CONSTRAINT department_work_evidence_sindh_lat_check CHECK (latitude BETWEEN 23.50 AND 28.60),
    ADD CONSTRAINT department_work_evidence_sindh_lon_check CHECK (longitude BETWEEN 66.40 AND 71.20);
END $$;

-- 2. Additive dual Before/After evidence columns (historical single-photo rows stay valid)
ALTER TABLE public.department_work_evidence
  ADD COLUMN IF NOT EXISTS before_storage_path text UNIQUE,
  ADD COLUMN IF NOT EXISTS before_mime_type text,
  ADD COLUMN IF NOT EXISTS before_bytes integer,
  ADD COLUMN IF NOT EXISTS before_sha256 text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.department_work_evidence'::regclass
      AND conname = 'v14_before_mime_check'
  ) THEN
    ALTER TABLE public.department_work_evidence
      ADD CONSTRAINT v14_before_mime_check
        CHECK (before_mime_type IS NULL OR before_mime_type IN ('image/jpeg','image/png','image/webp')),
      ADD CONSTRAINT v14_before_bytes_check
        CHECK (before_bytes IS NULL OR before_bytes BETWEEN 1 AND 1048576),
      ADD CONSTRAINT v14_before_sha256_check
        CHECK (before_sha256 IS NULL OR before_sha256 ~ '^[a-f0-9]{64}$'),
      ADD CONSTRAINT v14_before_tuple_consistency_check
        CHECK (
          (before_storage_path IS NULL AND before_mime_type IS NULL AND before_bytes IS NULL AND before_sha256 IS NULL)
          OR
          (before_storage_path IS NOT NULL AND before_storage_path ~ '^work/' AND before_storage_path <> storage_path
           AND before_mime_type IS NOT NULL AND before_bytes IS NOT NULL AND before_sha256 IS NOT NULL)
        );
  END IF;
END $$;

-- 3. Storage download authorization for both Before and After paths
CREATE OR REPLACE FUNCTION public.v1318_can_download_proof(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.department_work_evidence e
    JOIN public.department_work_orders o ON o.id = e.order_id
    WHERE (e.storage_path = p_path OR e.before_storage_path = p_path) AND (
      public.v1318_can_view_order(o.id) OR
      (e.decision = 'approved' AND EXISTS (
        SELECT 1 FROM public.department_work_order_reports r
        JOIN public.complaints c ON c.id = r.complaint_id
        WHERE r.order_id = o.id AND c.citizen_id = auth.uid()
      ))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.v1318_can_download_proof(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v1318_can_download_proof(text) TO authenticated;

-- 4. Atomic dual-photo work proof recording RPC (service_role only, backward-compatible defaults)
DROP FUNCTION IF EXISTS public.v1318_record_proof(uuid,uuid,text,text,integer,text,numeric,numeric,numeric);
CREATE OR REPLACE FUNCTION public.v1318_record_proof(
  p_order uuid,
  p_officer uuid,
  p_path text,
  p_mime text,
  p_bytes integer,
  p_sha256 text,
  p_lat numeric,
  p_lon numeric,
  p_accuracy numeric,
  p_before_path text DEFAULT NULL,
  p_before_mime text DEFAULT NULL,
  p_before_bytes integer DEFAULT NULL,
  p_before_sha256 text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_order public.department_work_orders%ROWTYPE;
  v_geo public.complaint_geo_points%ROWTYPE;
  v_distance numeric;
  v_result text;
  v_duplicate boolean;
  v_id uuid;
  v_has_before boolean := (p_before_path IS NOT NULL);
BEGIN
  SELECT * INTO v_order FROM public.department_work_orders WHERE id = p_order FOR UPDATE;
  IF v_order.id IS NULL OR v_order.officer_id <> p_officer OR v_order.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Work order is not eligible for evidence';
  END IF;

  IF p_lat NOT BETWEEN 23.50 AND 28.60 OR p_lon NOT BETWEEN 66.40 AND 71.20
    OR p_accuracy <= 0 OR p_accuracy > 500 OR p_bytes < 1 OR p_bytes > 1048576
    OR p_mime NOT IN ('image/jpeg','image/png','image/webp')
    OR p_sha256 !~ '^[a-f0-9]{64}$' OR p_path !~ '^work/' THEN
    RAISE EXCEPTION 'Invalid evidence';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id = 'department-work-proof-private' AND name = p_path) THEN
    RAISE EXCEPTION 'Evidence object is missing';
  END IF;

  IF v_has_before THEN
    IF p_before_path !~ '^work/' OR p_before_path = p_path
      OR p_before_bytes IS NULL OR p_before_bytes < 1 OR p_before_bytes > 1048576
      OR p_before_mime NOT IN ('image/jpeg','image/png','image/webp')
      OR p_before_sha256 IS NULL OR p_before_sha256 !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'Invalid before-work evidence';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id = 'department-work-proof-private' AND name = p_before_path) THEN
      RAISE EXCEPTION 'Before-work evidence object is missing';
    END IF;
  END IF;

  SELECT * INTO v_geo FROM public.complaint_geo_points
    WHERE complaint_id = v_order.anchor_complaint_id;
  IF v_geo.complaint_id IS NULL THEN
    v_result := 'no_original_pin';
    v_distance := NULL;
  ELSE
    v_distance := round((6371000 * 2 * asin(least(1, sqrt(
      power(sin(radians((p_lat - v_geo.latitude)::double precision) / 2), 2) +
      cos(radians(v_geo.latitude::double precision)) * cos(radians(p_lat::double precision)) *
      power(sin(radians((p_lon - v_geo.longitude)::double precision) / 2), 2)
    ))))::numeric, 2);
    v_result := CASE WHEN v_distance <= greatest(100, p_accuracy * 2) THEN 'near' ELSE 'needs_review' END;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.department_work_evidence e
    WHERE e.sha256 = p_sha256 OR e.before_sha256 = p_sha256
      OR (v_has_before AND (e.sha256 = p_before_sha256 OR e.before_sha256 = p_before_sha256))
  ) INTO v_duplicate;

  INSERT INTO public.department_work_evidence(
    order_id, submitted_by, storage_path, mime_type, bytes, sha256,
    before_storage_path, before_mime_type, before_bytes, before_sha256,
    latitude, longitude, accuracy_m, original_distance_m, location_result, duplicate_warning
  ) VALUES (
    p_order, p_officer, p_path, p_mime, p_bytes, p_sha256,
    CASE WHEN v_has_before THEN p_before_path ELSE NULL END,
    CASE WHEN v_has_before THEN p_before_mime ELSE NULL END,
    CASE WHEN v_has_before THEN p_before_bytes ELSE NULL END,
    CASE WHEN v_has_before THEN p_before_sha256 ELSE NULL END,
    p_lat, p_lon, p_accuracy, v_distance, v_result, v_duplicate
  ) RETURNING id INTO v_id;

  UPDATE public.department_work_orders SET status = 'pending_review', updated_at = now() WHERE id = p_order;
  INSERT INTO public.department_work_events(order_id, actor_id, event_type, detail)
    VALUES (p_order, p_officer, 'evidence_submitted', CASE WHEN v_has_before THEN v_result || ':dual' ELSE v_result END);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.v1318_record_proof(uuid,uuid,text,text,integer,text,numeric,numeric,numeric,text,text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v1318_record_proof(uuid,uuid,text,text,integer,text,numeric,numeric,numeric,text,text,integer,text) TO service_role;

-- 5. Owner-only dual proof retrieval helper (preserves v1318_my_work_proofs unmodified for existing callers)
CREATE OR REPLACE FUNCTION public.v14_my_work_proofs(p_complaint uuid)
RETURNS TABLE(
  order_id uuid,
  department_id text,
  storage_path text,
  before_storage_path text,
  submitted_at timestamptz,
  distance_m numeric,
  location_result text,
  feedback text,
  order_status text,
  response_expires_at timestamptz,
  can_respond boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.complaints c WHERE c.id = p_complaint AND c.citizen_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Complaint ownership required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    o.id, o.department_id, e.storage_path, e.before_storage_path, e.submitted_at,
    e.original_distance_m, e.location_result, f.verdict, o.status,
    o.reviewed_at + interval '72 hours',
    (o.status = 'verified' AND now() <= o.reviewed_at + interval '72 hours'
      AND c.status <> 'resolved' AND f.verdict IS NULL)
    FROM public.department_work_order_reports r
    JOIN public.department_work_orders o ON o.id = r.order_id
    JOIN public.department_work_evidence e ON e.order_id = o.id AND e.decision = 'approved'
    JOIN public.complaints c ON c.id = r.complaint_id
    LEFT JOIN public.department_work_feedback f ON f.evidence_id = e.id AND f.complaint_id = p_complaint
    WHERE r.complaint_id = p_complaint AND e.id = (
      SELECT latest.id FROM public.department_work_evidence latest
      WHERE latest.order_id = o.id AND latest.decision = 'approved'
      ORDER BY latest.submitted_at DESC LIMIT 1
    )
    ORDER BY e.submitted_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.v14_my_work_proofs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v14_my_work_proofs(uuid) TO authenticated;
