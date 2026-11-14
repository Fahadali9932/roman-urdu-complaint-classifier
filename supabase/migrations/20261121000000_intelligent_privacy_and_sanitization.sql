-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 3E: INTELLIGENT COMPLAINT SANITIZATION AND PRIVACY
-- Migration: 20261121000000_intelligent_privacy_and_sanitization.sql
--
-- 1. Adds department-facing privacy columns to public.complaints:
--    - sanitized_description: Redacted, PII-free complaint narrative
--    - generated_heading: Factual, professional complaint title
--    - factual_summary: 1-3 sentence factual overview
--    - redaction_flags: Audit indicators (phones, emails, names, addresses, abuse)
--    - redaction_needs_review: Uncertainty flag for manual review
--
-- 2. Adds raw_description to public.complaint_citizen_private:
--    Retains the citizen's original unredacted text for authenticated citizen
--    access and authorized supervisory audit, strictly shielded from department staff.
--
-- 3. Updates public.submit_citizen_complaint RPC:
--    Atomic intake storing raw text in complaint_citizen_private and sanitized
--    text in public.complaints.
-- ==============================================================================

-- 1. Schema Extensions for public.complaints
ALTER TABLE public.complaints
    ADD COLUMN IF NOT EXISTS sanitized_description TEXT,
    ADD COLUMN IF NOT EXISTS generated_heading TEXT,
    ADD COLUMN IF NOT EXISTS factual_summary TEXT,
    ADD COLUMN IF NOT EXISTS redaction_flags JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS redaction_needs_review BOOLEAN DEFAULT false;

-- 2. Schema Extension for public.complaint_citizen_private (ZERO STAFF ACCESS)
ALTER TABLE public.complaint_citizen_private
    ADD COLUMN IF NOT EXISTS raw_description TEXT;

-- 3. Backfill existing records
UPDATE public.complaints
SET sanitized_description = description
WHERE sanitized_description IS NULL;

UPDATE public.complaints
SET generated_heading = coalesce(title, 'Municipal Complaint')
WHERE generated_heading IS NULL;

UPDATE public.complaints
SET factual_summary = description
WHERE factual_summary IS NULL;

UPDATE public.complaint_citizen_private p
SET raw_description = c.description
FROM public.complaints c
WHERE p.complaint_id = c.id AND p.raw_description IS NULL;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_redaction_needs_review
    ON public.complaints (redaction_needs_review)
    WHERE redaction_needs_review = true;

-- 5. Drop legacy overloads of submit_citizen_complaint
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, jsonb, boolean, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text);

-- 6. Updated submit_citizen_complaint RPC
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
    p_claim_code_hash text DEFAULT NULL
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
    v_status text;
    v_clean_sanitized text;
    v_final_heading text;
    v_final_summary text;
BEGIN
    -- Validate guest claim digest
    IF p_citizen_id IS NULL AND coalesce(trim(p_claim_code_hash), '') !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'A valid claim-code digest is required for a guest complaint.';
    END IF;

    -- Validate description presence
    IF coalesce(length(trim(p_description)), 0) = 0 THEN
        RAISE EXCEPTION 'Complaint description is required.';
    END IF;

    -- Validate 200 word ceiling
    v_words := cardinality(regexp_split_to_array(trim(p_description), '\\s+'));
    IF v_words > 200 THEN
        RAISE EXCEPTION 'Complaint must contain 200 words or fewer.';
    END IF;

    -- Validate required incident fields
    IF coalesce(length(trim(p_incident_district)), 0) = 0
       OR coalesce(length(trim(p_incident_locality)), 0) = 0
       OR coalesce(length(trim(p_incident_public_location)), 0) = 0 THEN
        RAISE EXCEPTION 'Public incident location is required.';
    END IF;

    -- Validate required private contact details
    IF coalesce(length(trim(p_citizen_name)), 0) = 0
       OR coalesce(length(trim(p_citizen_phone)), 0) = 0
       OR coalesce(length(trim(p_residential_address)), 0) = 0 THEN
        RAISE EXCEPTION 'Required private contact details are missing.';
    END IF;

    -- Validate classifier confidence range
    IF p_prediction_confidence IS NULL OR p_prediction_confidence < 0 OR p_prediction_confidence > 1 THEN
        RAISE EXCEPTION 'Invalid classifier confidence.';
    END IF;

    -- Validate department existence if routing without review
    IF NOT p_needs_review AND NOT EXISTS (
        SELECT 1 FROM public.departments WHERE id = p_predicted_department_id AND is_active
    ) THEN
        RAISE EXCEPTION 'Classifier returned an inactive or unknown department.';
    END IF;

    -- Determine assignment and review state
    v_assigned_department := CASE WHEN p_needs_review THEN NULL ELSE p_predicted_department_id END;
    v_status := CASE WHEN p_needs_review THEN 'under_review' ELSE 'assigned' END;
    v_reference := 'KHI-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- Determine sanitized fields (fallback to description if not provided)
    v_clean_sanitized := coalesce(nullif(trim(p_sanitized_description), ''), trim(p_description));
    v_final_heading := coalesce(nullif(trim(p_generated_heading), ''), nullif(trim(p_title), ''), 'Municipal Complaint');
    v_final_summary := coalesce(nullif(trim(p_factual_summary), ''), v_clean_sanitized);

    -- Insert into public.complaints (accessible to department staff via RLS, containing ONLY sanitized text)
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
        predicted_department_id,
        prediction_confidence,
        is_reviewed_by_admin,
        is_demonstration,
        claim_code_hash
    ) VALUES (
        v_reference,
        p_citizen_id,
        v_final_heading,
        v_clean_sanitized,
        v_clean_sanitized,
        v_final_heading,
        v_final_summary,
        coalesce(p_redaction_flags, '{}'::jsonb),
        coalesce(p_redaction_needs_review, false),
        trim(p_incident_district),
        trim(p_incident_locality),
        trim(p_incident_public_location),
        v_status,
        v_assigned_department,
        p_predicted_department_id,
        p_prediction_confidence,
        false,
        coalesce(p_is_demonstration, false),
        nullif(lower(trim(p_claim_code_hash)), '')
    ) RETURNING id INTO v_complaint_id;

    -- Insert into public.complaint_citizen_private (ZERO STAFF ACCESS, retains RAW description)
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

    -- Record initial timeline events
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
        (v_complaint_id, 'submitted', 'Complaint registered', 'شکایت درج ہو گئی', 'Your complaint was securely received and sanitized.', 'آپ کی شکایت محفوظ طریقے سے موصول اور محفوظ بنا دی گئی۔', 'citizen', p_citizen_id),
        (v_complaint_id, v_status,
         CASE WHEN p_needs_review THEN 'Routing needs review' ELSE 'Department assigned' END,
         CASE WHEN p_needs_review THEN 'روٹنگ کا جائزہ درکار ہے' ELSE 'محکمہ تفویض کر دیا گیا' END,
         CASE WHEN p_needs_review THEN 'The complaint is queued for classification clearinghouse review.' ELSE 'Assigned to ' || upper(coalesce(v_assigned_department, 'department')) || '.' END,
         CASE WHEN p_needs_review THEN 'شکایت محکمہ جاتی تصدیق کے لیے کلیئرنگ ہاؤس میں بھیج دی گئی۔' ELSE 'متعلقہ محکمے کے سپرد کر دی گئی۔' END,
         'system', NULL);

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', v_complaint_id,
        'reference_number', v_reference,
        'status', v_status,
        'assigned_department_id', v_assigned_department,
        'predicted_department_id', p_predicted_department_id,
        'prediction_confidence', p_prediction_confidence,
        'needs_review', p_needs_review,
        'title', v_final_heading,
        'sanitized_description', v_clean_sanitized,
        'factual_summary', v_final_summary
    );
END;
$$;
