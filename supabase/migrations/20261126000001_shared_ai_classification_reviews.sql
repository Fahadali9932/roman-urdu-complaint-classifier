-- V13.6.2: Shared, authenticated AI classification review and human adjudication.
-- Apply only after reviewing the existing 20261126000000 privacy migration.
-- No data is sent to the training pipeline automatically.

CREATE TABLE IF NOT EXISTS public.ai_classification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL REFERENCES auth.users(id),
  flagged_department text NOT NULL REFERENCES public.departments(id),
  original_departments text[] NOT NULL,
  suggested_department text NOT NULL,
  flag_reason text NOT NULL CHECK (length(flag_reason) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  confirmed_departments text[],
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT ai_review_confirmed_limit CHECK (confirmed_departments IS NULL OR cardinality(confirmed_departments) <= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_review_one_pending_per_complaint
  ON public.ai_classification_reviews (complaint_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ai_review_status_created_idx
  ON public.ai_classification_reviews (status, created_at DESC);

ALTER TABLE public.ai_classification_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_classification_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_classification_reviews TO authenticated;

DROP POLICY IF EXISTS "Only main admins can view AI classification reviews" ON public.ai_classification_reviews;
CREATE POLICY "Only main admins can view AI classification reviews"
  ON public.ai_classification_reviews FOR SELECT TO authenticated
  USING ((SELECT public.is_main_admin((SELECT auth.uid()))));

-- A staff member may flag ONLY an assigned complaint belonging to one of their
-- currently active department memberships. Ignore all client-supplied identity,
-- original label and text fields: they are derived from authenticated DB rows.
CREATE OR REPLACE FUNCTION public.staff_flag_ai_classification_review(
  p_complaint_id uuid,
  p_suggested_department text,
  p_reason text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller uuid := (SELECT auth.uid());
  v_complaint public.complaints%ROWTYPE;
  v_department text;
  v_original text[];
  v_review_id uuid;
  v_safe_reason text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF coalesce(length(trim(p_reason)), 0) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Review reason must contain between 10 and 1000 characters';
  END IF;
  -- Defense in depth for incidental contact information in staff comments.
  -- This does not claim to remove names or all possible addresses.
  v_safe_reason := regexp_replace(trim(p_reason),
    '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[EMAIL REDACTED]', 'gi');
  v_safe_reason := regexp_replace(v_safe_reason,
    '\m[0-9]{5}-?[0-9]{7}-?[0-9]\M', '[CNIC REDACTED]', 'g');
  v_safe_reason := regexp_replace(v_safe_reason,
    '\m03[0-9]{2}[-. ]?[0-9]{7}\M', '[PHONE REDACTED]', 'g');
  IF p_suggested_department NOT IN ('unknown', 'out_of_scope')
     AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_suggested_department AND is_active) THEN
    RAISE EXCEPTION 'Invalid suggested department';
  END IF;

  SELECT * INTO v_complaint FROM public.complaints WHERE id = p_complaint_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complaint not found'; END IF;
  v_original := CASE WHEN cardinality(coalesce(v_complaint.assigned_department_ids, '{}')) > 0
     THEN v_complaint.assigned_department_ids
     ELSE CASE WHEN v_complaint.assigned_department_id IS NOT NULL
          THEN ARRAY[v_complaint.assigned_department_id] ELSE '{}'::text[] END END;

  SELECT m.department_id INTO v_department
  FROM public.department_memberships m
  WHERE m.user_id = v_caller AND m.status = 'active'
    AND m.department_id = ANY(v_original)
  ORDER BY m.department_id LIMIT 1;
  IF v_department IS NULL THEN
    RAISE EXCEPTION 'Only active staff assigned to this complaint may flag it';
  END IF;

  SELECT id INTO v_review_id FROM public.ai_classification_reviews
  WHERE complaint_id = p_complaint_id AND status = 'pending';
  IF v_review_id IS NOT NULL THEN RETURN v_review_id; END IF;
  IF v_complaint.status <> 'assigned' THEN
    RAISE EXCEPTION 'Only currently assigned complaints can be flagged';
  END IF;

  INSERT INTO public.ai_classification_reviews (
    complaint_id, flagged_by, flagged_department, original_departments,
    suggested_department, flag_reason
  ) VALUES (p_complaint_id, v_caller, v_department, v_original,
            p_suggested_department, v_safe_reason) RETURNING id INTO v_review_id;

  UPDATE public.complaints SET status = 'under_review', updated_at = now()
  WHERE id = p_complaint_id;
  INSERT INTO public.complaint_timeline_events (
    complaint_id, status, title, title_urdu, description, description_urdu,
    actor_role, actor_id
  ) VALUES (
    p_complaint_id, 'under_review', 'Classification flagged for review',
    'شکایت کی درجہ بندی کا جائزہ',
    'Assigned department requested a classification review.',
    'متعلقہ محکمے نے درجہ بندی کا جائزہ لینے کی درخواست کی ہے۔',
    'department_staff', v_caller
  );
  RETURN v_review_id;
END;
$$;

-- Administrator-only queue. It exposes sanitized public complaint text, NEVER
-- complaint_citizen_private or the raw intake body.
CREATE OR REPLACE FUNCTION public.get_ai_classification_review_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_main_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Main administrator authorization required';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'complaintId', r.complaint_id,
      'referenceNumber', c.reference_number,
      'text', CASE WHEN c.redaction_needs_review THEN 'Complaint pending privacy review.'
                   ELSE regexp_replace(regexp_replace(regexp_replace(
                     coalesce(c.sanitized_description, 'Complaint pending privacy review.'),
                     '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[EMAIL REDACTED]', 'gi'),
                     '\m[0-9]{5}-?[0-9]{7}-?[0-9]\M', '[CNIC REDACTED]', 'g'),
                     '\m03[0-9]{2}[-. ]?[0-9]{7}\M', '[PHONE REDACTED]', 'g') END,
      'originalDepartments', r.original_departments,
      'suggestedDepartment', r.suggested_department,
      'flaggedByStaffId', r.flagged_by,
      'flaggedByStaffName', 'Authenticated department staff',
      'flaggedByDepartment', r.flagged_department,
      'flagReason', r.flag_reason, 'flaggedAt', r.created_at,
      'status', r.status, 'confirmedDepartments', r.confirmed_departments,
      'resolutionNotes', r.resolution_notes,
      'resolvedByAdminId', r.resolved_by, 'resolvedAt', r.resolved_at,
      'piiScrubbed', true
    ) ORDER BY r.created_at DESC)
    FROM public.ai_classification_reviews r
    JOIN public.complaints c ON c.id = r.complaint_id
  ), '[]'::jsonb);
END;
$$;

-- Decisions are atomic: a verified correction changes the actual assigned
-- department(s), records the decision and updates issue rows. Dismissal simply
-- restores the original assignment. No model weights are touched.
CREATE OR REPLACE FUNCTION public.admin_decide_ai_classification_review(
  p_review_id uuid,
  p_action text,
  p_confirmed_departments text[] DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller uuid := (SELECT auth.uid());
  v_review public.ai_classification_reviews%ROWTYPE;
  v_labels text[];
  v_department text;
  v_safe_notes text;
BEGIN
  IF v_caller IS NULL OR NOT public.is_main_admin(v_caller) THEN
    RAISE EXCEPTION 'Main administrator authorization required';
  END IF;
  IF p_action NOT IN ('resolve', 'dismiss') OR p_action IS NULL THEN
    RAISE EXCEPTION 'Invalid review action';
  END IF;
  IF length(coalesce(p_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'Resolution notes exceed 1000 characters';
  END IF;
  v_safe_notes := regexp_replace(coalesce(p_notes, ''),
    '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[EMAIL REDACTED]', 'gi');
  v_safe_notes := regexp_replace(v_safe_notes,
    '\m[0-9]{5}-?[0-9]{7}-?[0-9]\M', '[CNIC REDACTED]', 'g');
  v_safe_notes := regexp_replace(v_safe_notes,
    '\m03[0-9]{2}[-. ]?[0-9]{7}\M', '[PHONE REDACTED]', 'g');
  SELECT * INTO v_review FROM public.ai_classification_reviews
  WHERE id = p_review_id FOR UPDATE;
  IF NOT FOUND OR v_review.status <> 'pending' THEN
    RAISE EXCEPTION 'Review is missing or already adjudicated';
  END IF;

  IF p_action = 'resolve' THEN
    SELECT coalesce(array_agg(DISTINCT x ORDER BY x), '{}'::text[]) INTO v_labels
    FROM unnest(coalesce(p_confirmed_departments, '{}'::text[])) AS x;
    IF cardinality(v_labels) NOT BETWEEN 1 AND 2
       OR EXISTS (SELECT 1 FROM unnest(v_labels) x
                  WHERE NOT EXISTS (SELECT 1 FROM public.departments d WHERE d.id = x AND d.is_active)) THEN
      RAISE EXCEPTION 'One or two unique active departments are required';
    END IF;
  ELSE
    v_labels := v_review.original_departments;
  END IF;

  UPDATE public.complaints SET status = 'assigned',
    assigned_department_id = v_labels[1], assigned_department_ids = v_labels,
    is_multilabel = (cardinality(v_labels) > 1),
    is_reviewed_by_admin = (p_action = 'resolve'), updated_at = now()
  WHERE id = v_review.complaint_id AND status = 'under_review';
  IF NOT FOUND THEN RAISE EXCEPTION 'Complaint no longer awaiting classification review'; END IF;

  IF p_action = 'resolve' THEN
    UPDATE public.complaint_issues SET status = 'rejected', updated_at = now()
    WHERE complaint_id = v_review.complaint_id AND NOT (department_id = ANY(v_labels))
      AND status IN ('assigned', 'under_review');
    FOREACH v_department IN ARRAY v_labels LOOP
      IF NOT EXISTS (SELECT 1 FROM public.complaint_issues
                     WHERE complaint_id = v_review.complaint_id AND department_id = v_department
                       AND status IN ('assigned', 'accepted', 'in_progress')) THEN
        INSERT INTO public.complaint_issues (complaint_id, department_id, issue_type, status)
        VALUES (v_review.complaint_id, v_department, 'human_verified_correction', 'assigned');
      END IF;
    END LOOP;
  END IF;

  UPDATE public.ai_classification_reviews SET
    status = CASE WHEN p_action = 'resolve' THEN 'resolved' ELSE 'dismissed' END,
    confirmed_departments = CASE WHEN p_action = 'resolve' THEN v_labels ELSE NULL END,
    resolution_notes = nullif(trim(v_safe_notes), ''), resolved_by = v_caller,
    resolved_at = now()
  WHERE id = p_review_id;

  INSERT INTO public.complaint_timeline_events (
    complaint_id, status, title, title_urdu, description, description_urdu,
    actor_role, actor_id
  ) VALUES (
    v_review.complaint_id, 'assigned', 'Human classification review completed',
    'دستی درجہ بندی کا جائزہ مکمل',
    CASE WHEN p_action = 'resolve' THEN 'Departments verified by administrator.'
         ELSE 'Classification flag dismissed; previous assignment restored.' END,
    'منتظم نے شکایت کی درجہ بندی کا جائزہ مکمل کر لیا۔', 'main_admin', v_caller
  );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_flag_ai_classification_review(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_ai_classification_review_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_decide_ai_classification_review(uuid, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_flag_ai_classification_review(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_classification_review_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_ai_classification_review(uuid, text, text[], text) TO authenticated;
