-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 3F.6: CLOSE PRIVILEGED INTAKE & BOUNDARY PRIVACY REPAIR
-- Database Migration: 20261126000000_close_privileged_intake_and_repair_privacy.sql
-- Architecture: Supabase PostgreSQL 15 + RLS + Multi-Department Atomicity
-- University: Greenwich University, Karachi, Pakistan
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP ALL OBSOLETE AND LEGACY OVERLOADS OF submit_citizen_complaint
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, jsonb, boolean, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text);

-- ------------------------------------------------------------------------------
-- 2. ENSURE COMPLAINTS TABLE HAS ALL REQUISITE COLUMNS
-- ------------------------------------------------------------------------------
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS guest_tracking_hash text,
  ADD COLUMN IF NOT EXISTS is_multilabel boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_department_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_hazard boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazard_details jsonb DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_guest_tracking_hash
  ON public.complaints (guest_tracking_hash)
  WHERE guest_tracking_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_dept_ids
  ON public.complaints USING GIN(assigned_department_ids);

-- Ensure complaint_issues table exists
CREATE TABLE IF NOT EXISTS public.complaint_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES public.departments(id),
  issue_type TEXT NOT NULL,
  evidence_span TEXT,
  confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('under_review', 'assigned', 'accepted', 'in_progress', 'completed', 'resolved', 'rejected', 'duplicate')),
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_complaint_issues_complaint_id ON public.complaint_issues(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_issues_department_id ON public.complaint_issues(department_id);
CREATE INDEX IF NOT EXISTS idx_complaint_issues_status ON public.complaint_issues(status);

-- ------------------------------------------------------------------------------
-- 3. AUTHORITATIVE submit_citizen_complaint RPC
-- Strict security definer, no raw text fallback, atomic multi-department delivery
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_citizen_complaint(
    p_citizen_id uuid DEFAULT NULL,
    p_title text DEFAULT NULL,
    p_description text DEFAULT '',
    p_sanitized_description text DEFAULT '',
    p_generated_heading text DEFAULT NULL,
    p_factual_summary text DEFAULT NULL,
    p_redaction_flags jsonb DEFAULT '{}'::jsonb,
    p_redaction_needs_review boolean DEFAULT false,
    p_incident_district text DEFAULT '',
    p_incident_locality text DEFAULT '',
    p_incident_public_location text DEFAULT '',
    p_citizen_name text DEFAULT '',
    p_citizen_phone text DEFAULT '',
    p_citizen_email text DEFAULT NULL,
    p_residential_address text DEFAULT '',
    p_predicted_department_id text DEFAULT NULL,
    p_prediction_confidence numeric DEFAULT 0,
    p_needs_review boolean DEFAULT true,
    p_is_demonstration boolean DEFAULT false,
    p_claim_code_hash text DEFAULT NULL,
    p_guest_tracking_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_complaint_id uuid;
    v_reference text;
    v_words integer;
    v_assigned_department text;
    v_assigned_department_ids text[] := '{}';
    v_status text;
    v_clean_sanitized text;
    v_final_heading text;
    v_final_summary text;
    v_routing jsonb;
    v_is_multilabel boolean := false;
    v_has_hazard boolean := false;
    v_issues jsonb;
    v_issue_item jsonb;
    v_issue_dept text;
    v_dept_elem text;
BEGIN
    -- 1. Validate guest digests if unauthenticated
    IF p_citizen_id IS NULL THEN
        IF coalesce(trim(p_claim_code_hash), '') !~ '^[0-9a-f]{64}$' THEN
            RAISE EXCEPTION 'A valid claim-code digest is required for a guest complaint.';
        END IF;
        IF p_guest_tracking_hash IS NOT NULL AND coalesce(trim(p_guest_tracking_hash), '') !~ '^[0-9a-f]{64}$' THEN
            RAISE EXCEPTION 'A valid guest tracking digest is required for a guest complaint.';
        END IF;
    END IF;

    -- 2. Validate raw description presence and length limit
    IF coalesce(length(trim(p_description)), 0) = 0 THEN
        RAISE EXCEPTION 'Complaint description is required.';
    END IF;

    v_words := cardinality(regexp_split_to_array(trim(p_description), '\\s+'));
    IF v_words > 200 THEN
        RAISE EXCEPTION 'Complaint must contain 200 words or fewer.';
    END IF;

    -- 3. Validate required incident location fields
    IF coalesce(length(trim(p_incident_district)), 0) = 0
       OR coalesce(length(trim(p_incident_locality)), 0) = 0
       OR coalesce(length(trim(p_incident_public_location)), 0) = 0 THEN
        RAISE EXCEPTION 'Public incident location is required.';
    END IF;

    -- 4. Validate required private contact details
    IF coalesce(length(trim(p_citizen_name)), 0) = 0
       OR coalesce(length(trim(p_citizen_phone)), 0) = 0
       OR coalesce(length(trim(p_residential_address)), 0) = 0 THEN
        RAISE EXCEPTION 'Required private contact details are missing.';
    END IF;

    -- 5. Validate prediction confidence range
    IF p_prediction_confidence IS NULL OR p_prediction_confidence < 0 OR p_prediction_confidence > 1 THEN
        RAISE EXCEPTION 'Invalid classifier confidence.';
    END IF;

    -- 6. Extract multi-department routing metadata
    v_routing := p_redaction_flags->'multi_department_routing';
    IF v_routing IS NOT NULL THEN
        v_is_multilabel := coalesce((v_routing->>'is_multilabel')::boolean, false);
        v_has_hazard := coalesce((v_routing->>'has_hazard')::boolean, false);
        v_issues := v_routing->'issues';
    END IF;

    -- 7. ZERO-LEAKAGE PRIVACY ENFORCEMENT AT DATABASE BOUNDARY
    -- If sanitized text is empty, missing, or redaction is uncertain:
    -- MUST NOT FALL BACK TO RAW DESCRIPTION!
    -- Use safe public placeholder and force case to under_review.
    IF p_redaction_needs_review
       OR coalesce(length(trim(p_sanitized_description)), 0) = 0
       OR trim(p_sanitized_description) = '' THEN
        v_clean_sanitized := 'Complaint pending privacy review.';
        v_final_heading := 'Complaint pending privacy review';
        v_final_summary := 'Complaint pending privacy review.';
        p_needs_review := true;
    ELSE
        v_clean_sanitized := trim(p_sanitized_description);
        v_final_heading := coalesce(nullif(trim(p_generated_heading), ''), nullif(trim(p_title), ''), 'Municipal Complaint');
        v_final_summary := coalesce(nullif(trim(p_factual_summary), ''), v_clean_sanitized);
    END IF;

    -- 8. Enforce review hold vs assignment
    IF p_needs_review THEN
        v_assigned_department := NULL;
        v_assigned_department_ids := '{}';
        v_status := 'under_review';
    ELSE
        -- Validate predicted department exists and is active
        IF p_predicted_department_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.departments WHERE id = p_predicted_department_id AND is_active
        ) THEN
            RAISE EXCEPTION 'Classifier returned an inactive or unknown department.';
        END IF;

        v_assigned_department := p_predicted_department_id;
        v_status := 'assigned';

        -- Extract multi-department assigned department IDs
        IF v_routing IS NOT NULL AND jsonb_typeof(v_routing->'departments') = 'array' THEN
            FOR v_dept_elem IN SELECT jsonb_array_elements_text(v_routing->'departments')
            LOOP
                IF EXISTS (SELECT 1 FROM public.departments WHERE id = v_dept_elem AND is_active) THEN
                    v_assigned_department_ids := array_append(v_assigned_department_ids, v_dept_elem);
                END IF;
            END LOOP;
        END IF;

        IF cardinality(v_assigned_department_ids) = 0 AND v_assigned_department IS NOT NULL THEN
            v_assigned_department_ids := ARRAY[v_assigned_department];
        END IF;
    END IF;

    v_reference := 'KHI-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- 9. Insert into public.complaints (contains ONLY sanitized text, ZERO PII)
    INSERT INTO public.complaints (
        reference_number,
        citizen_id,
        title,
        description,
        sanitized_description,
        generated_heading,
        factual_summary,
        redaction_flags,
        redaction_needs_review,
        incident_district,
        incident_locality,
        incident_public_location,
        status,
        assigned_department_id,
        assigned_department_ids,
        predicted_department_id,
        prediction_confidence,
        is_multilabel,
        has_hazard,
        hazard_details,
        is_reviewed_by_admin,
        is_demonstration,
        claim_code_hash,
        guest_tracking_hash
    ) VALUES (
        v_reference,
        p_citizen_id,
        v_final_heading,
        v_clean_sanitized,
        v_clean_sanitized,
        v_final_heading,
        v_final_summary,
        coalesce(p_redaction_flags, '{}'::jsonb),
        p_needs_review,
        trim(p_incident_district),
        trim(p_incident_locality),
        trim(p_incident_public_location),
        v_status,
        v_assigned_department,
        v_assigned_department_ids,
        p_predicted_department_id,
        p_prediction_confidence,
        v_is_multilabel,
        v_has_hazard,
        CASE WHEN v_has_hazard THEN jsonb_build_object('has_hazard', true) ELSE NULL END,
        false,
        coalesce(p_is_demonstration, false),
        nullif(lower(trim(p_claim_code_hash)), ''),
        nullif(lower(trim(p_guest_tracking_hash)), '')
    ) RETURNING id INTO v_complaint_id;

    -- 10. Insert into public.complaint_citizen_private (PHYSICALLY ISOLATED TABLE)
    -- Contains raw narrative and contact details, accessible only by citizen owner / main admin
    INSERT INTO public.complaint_citizen_private (
        complaint_id,
        citizen_name,
        citizen_phone,
        citizen_email,
        residential_address,
        raw_description
    ) VALUES (
        v_complaint_id,
        trim(p_citizen_name),
        trim(p_citizen_phone),
        nullif(trim(p_citizen_email), ''),
        trim(p_residential_address),
        trim(p_description)
    );

    -- 11. Multi-Department atomic issue creation
    IF v_issues IS NOT NULL AND jsonb_typeof(v_issues) = 'array' AND jsonb_array_length(v_issues) > 0 THEN
        FOR v_issue_item IN SELECT * FROM jsonb_array_elements(v_issues)
        LOOP
            v_issue_dept := v_issue_item->>'departmentId';
            IF EXISTS (SELECT 1 FROM public.departments WHERE id = v_issue_dept AND is_active) THEN
                INSERT INTO public.complaint_issues (
                    complaint_id,
                    department_id,
                    issue_type,
                    evidence_span,
                    confidence,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    v_complaint_id,
                    v_issue_dept,
                    coalesce(v_issue_item->>'issueType', v_issue_dept || '_issue'),
                    v_clean_sanitized, -- Sanitized text only, never raw PII
                    coalesce((v_issue_item->>'confidence')::numeric, p_prediction_confidence),
                    CASE WHEN p_needs_review THEN 'under_review' ELSE 'assigned' END,
                    now(),
                    now()
                );
            END IF;
        END LOOP;
    ELSIF v_assigned_department IS NOT NULL THEN
        -- Fallback single-department issue record
        INSERT INTO public.complaint_issues (
            complaint_id,
            department_id,
            issue_type,
            evidence_span,
            confidence,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_complaint_id,
            v_assigned_department,
            v_assigned_department || '_issue',
            v_clean_sanitized,
            p_prediction_confidence,
            v_status,
            now(),
            now()
        );
    END IF;

    -- 12. Record initial timeline events
    INSERT INTO public.complaint_timeline_events (
        complaint_id,
        status,
        title,
        title_urdu,
        description,
        description_urdu,
        actor_role,
        actor_id
    ) VALUES
        (v_complaint_id, 'submitted', 'Complaint registered', 'شکایت درج ہو گئی',
         'Your complaint was securely received and sanitized.',
         'آپ کی شکایت محفوظ طریقے سے موصول اور محفوظ بنا دی گئی۔',
         'citizen', p_citizen_id),
        (v_complaint_id, v_status,
         CASE WHEN p_needs_review THEN 'Routing needs review' ELSE 'Department assigned' END,
         CASE WHEN p_needs_review THEN 'روٹنگ کا جائزہ درکار ہے' ELSE 'محکمہ تفویض کر دیا گیا' END,
         CASE WHEN p_needs_review
              THEN 'The complaint is queued for classification clearinghouse review.'
              ELSE 'Assigned to municipal authority for action.'
         END,
         CASE WHEN p_needs_review
              THEN 'شکایت محکمہ جاتی تصدیق کے لیے کلیئرنگ ہاؤس میں بھیج دی گئی۔'
              ELSE 'متعلقہ محکمے کے سپرد کر دی گئی۔'
         END,
         'system', NULL);

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', v_complaint_id,
        'reference_number', v_reference,
        'status', v_status,
        'assigned_department_id', v_assigned_department,
        'assigned_department_ids', v_assigned_department_ids,
        'predicted_department_id', p_predicted_department_id,
        'prediction_confidence', p_prediction_confidence,
        'needs_review', p_needs_review,
        'title', v_final_heading,
        'sanitized_description', v_clean_sanitized,
        'factual_summary', v_final_summary
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. CLOSE PRIVILEGED INTAKE: REVOKE PUBLIC/CLIENT ACCESS, GRANT ONLY TO service_role
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.submit_citizen_complaint(
    uuid, text, text, text, text, text, jsonb, boolean, text, text, text,
    text, text, text, text, text, numeric, boolean, boolean, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.submit_citizen_complaint(
    uuid, text, text, text, text, text, jsonb, boolean, text, text, text,
    text, text, text, text, text, numeric, boolean, boolean, text, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_citizen_complaint(
    uuid, text, text, text, text, text, jsonb, boolean, text, text, text,
    text, text, text, text, text, numeric, boolean, boolean, text, text
) TO service_role;

-- Revoke direct INSERT/UPDATE/DELETE on complaints tables from untrusted roles
DROP POLICY IF EXISTS "Citizens can insert own complaints" ON public.complaints;
REVOKE INSERT, UPDATE, DELETE ON public.complaints FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.complaint_issues FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.complaint_citizen_private FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. AUTHORITATIVE RLS ON complaint_issues (USING profiles & department_memberships)
-- ------------------------------------------------------------------------------
ALTER TABLE public.complaint_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_select_assigned_issues ON public.complaint_issues;
DROP POLICY IF EXISTS staff_update_assigned_issues ON public.complaint_issues;
DROP POLICY IF EXISTS citizen_select_own_issues ON public.complaint_issues;

-- Staff can SELECT only issues assigned to their active department
CREATE POLICY staff_select_assigned_issues ON public.complaint_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = complaint_issues.department_id
        AND m.status = 'active'
    )
    OR public.is_main_admin(auth.uid())
  );

-- Staff can UPDATE only issues assigned to their active department (e.g. status, staff_notes)
CREATE POLICY staff_update_assigned_issues ON public.complaint_issues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = complaint_issues.department_id
        AND m.status = 'active'
    )
    OR public.is_main_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = complaint_issues.department_id
        AND m.status = 'active'
    )
    OR public.is_main_admin(auth.uid())
  );

-- Citizen owner can SELECT their own complaint issues
CREATE POLICY citizen_select_own_issues ON public.complaint_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_issues.complaint_id
        AND c.citizen_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 6. MULTI-DEPARTMENT RLS ON public.complaints
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Department staff can select assigned or review complaints" ON public.complaints;
CREATE POLICY "Department staff can select assigned or review complaints"
    ON public.complaints
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = auth.uid()
              AND m.status = 'active'
              AND (
                  m.department_id = complaints.assigned_department_id
                  OR m.department_id = ANY(complaints.assigned_department_ids)
                  OR (complaints.status = 'under_review' AND (m.department_id = 'kmc' OR public.is_main_admin(auth.uid())))
              )
        )
    );

-- ------------------------------------------------------------------------------
-- 7. REPAIRED GUEST TRACKING LOOKUP (get_guest_complaint_status)
-- Safe lookup by tracking digest; returns public category, status, and issue overview
-- ------------------------------------------------------------------------------
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
  v_public_issues jsonb := '[]'::jsonb;
  v_issue record;
BEGIN
  IF p_tracking_hash IS NULL OR coalesce(length(trim(p_tracking_hash)), 0) != 64 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT c.id, c.status, c.created_at, c.updated_at, c.predicted_department_id,
         c.assigned_department_id, c.assigned_department_ids, c.is_multilabel, c.needs_review
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

  -- Build safe public issues overview (no staff notes, no evidence spans with PII)
  FOR v_issue IN (
    SELECT ci.department_id, d.name AS dept_name, ci.status AS issue_status
    FROM public.complaint_issues ci
    JOIN public.departments d ON d.id = ci.department_id
    WHERE ci.complaint_id = v_rec.id
    ORDER BY ci.created_at ASC
  ) LOOP
    v_public_issues := v_public_issues || jsonb_build_object(
      'department_id', v_issue.department_id,
      'department_name', v_issue.dept_name,
      'status', v_issue.issue_status,
      'display_status', CASE
        WHEN v_issue.issue_status = 'assigned' THEN 'Sent to department'
        WHEN v_issue.issue_status = 'in_progress' THEN 'Work started'
        WHEN v_issue.issue_status = 'resolved' OR v_issue.issue_status = 'completed' THEN 'Work completed'
        WHEN v_issue.issue_status = 'under_review' THEN 'Being reviewed'
        ELSE 'Under review'
      END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'found', true,
    'public_status', v_rec.status,
    'display_status', v_display_status,
    'public_category', coalesce(v_dept_name, 'Municipal Services'),
    'submitted_at', v_rec.created_at,
    'updated_at', v_rec.updated_at,
    'public_updates', v_updates,
    'is_multilabel', coalesce(v_rec.is_multilabel, false),
    'public_issues', v_public_issues
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_complaint_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_complaint_status(text) TO anon, authenticated, service_role;
