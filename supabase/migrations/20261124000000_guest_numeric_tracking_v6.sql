-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 3F.5 / V6: ONE-NUMBER GUEST TRACKING & STATUS RPC
-- Migration: 20261124000000_guest_numeric_tracking_v6.sql
--
-- 1. Adds guest_tracking_hash to public.complaints for 24-digit CSPRNG numeric code.
-- 2. Creates index on guest_tracking_hash.
-- 3. Creates public-safe RPC get_guest_complaint_status(text) returning minimal
--    allowlisted status data with zero PII, zero contact data, zero raw descriptions.
-- ==============================================================================

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS guest_tracking_hash text;

CREATE INDEX IF NOT EXISTS idx_complaints_guest_tracking_hash
  ON public.complaints (guest_tracking_hash)
  WHERE guest_tracking_hash IS NOT NULL;

-- Public safe minimal status lookup
CREATE OR REPLACE FUNCTION public.get_guest_complaint_status(p_tracking_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec record;
  v_dept_name text;
  v_display_status text;
  v_updates jsonb;
BEGIN
  IF p_tracking_hash IS NULL OR coalesce(length(trim(p_tracking_hash)), 0) != 64 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT c.id, c.status, c.created_at, c.updated_at, c.predicted_department_id, c.assigned_department_id, c.needs_review
  INTO v_rec
  FROM public.complaints c
  WHERE c.guest_tracking_hash = lower(trim(p_tracking_hash))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT name INTO v_dept_name
  FROM public.departments
  WHERE id = coalesce(v_rec.assigned_department_id, v_rec.predicted_department_id);

  v_display_status := CASE
    WHEN v_rec.status = 'submitted' THEN 'Complaint received'
    WHEN v_rec.status = 'under_review' THEN 'Being reviewed'
    WHEN v_rec.status = 'assigned' THEN 'Sent to department'
    WHEN v_rec.status = 'in_progress' THEN 'Work started'
    WHEN v_rec.status = 'resolved' THEN 'Work completed'
    WHEN v_rec.status = 'closed' THEN 'Closed'
    ELSE 'Being processed'
  END;

  v_updates := jsonb_build_array(
    jsonb_build_object(
      'status', 'submitted',
      'at', v_rec.created_at,
      'message', 'We received your complaint.'
    )
  );

  IF v_rec.status IN ('assigned', 'in_progress', 'resolved', 'closed') THEN
    v_updates := v_updates || jsonb_build_object(
      'status', 'assigned',
      'at', v_rec.updated_at,
      'message', 'Sent to the responsible department.'
    );
  END IF;

  IF v_rec.status IN ('in_progress', 'resolved', 'closed') THEN
    v_updates := v_updates || jsonb_build_object(
      'status', 'in_progress',
      'at', v_rec.updated_at,
      'message', 'The department has started work.'
    );
  END IF;

  IF v_rec.status IN ('resolved', 'closed') THEN
    v_updates := v_updates || jsonb_build_object(
      'status', 'resolved',
      'at', v_rec.updated_at,
      'message', 'Work has been completed.'
    );
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'public_status', v_rec.status,
    'display_status', v_display_status,
    'public_category', coalesce(v_dept_name, 'Municipal Services'),
    'submitted_at', v_rec.created_at,
    'updated_at', v_rec.updated_at,
    'public_updates', v_updates
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_complaint_status(text) TO anon, authenticated;
