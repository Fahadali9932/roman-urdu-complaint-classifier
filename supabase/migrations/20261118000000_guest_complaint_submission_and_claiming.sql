-- ==============================================================================
-- AWAAZ-E-AWAM — GUEST COMPLAINT SUBMISSION & SECURE OWNERSHIP CLAIMING
-- Migration: 20261118000000_guest_complaint_submission_and_claiming.sql
--
-- 1. Drops NOT NULL constraint on public.complaints.citizen_id to permit guest submissions.
-- 2. Adds claim_code_hash and claimed_at columns to public.complaints.
-- 3. Updates submit_citizen_complaint RPC to support unauthenticated submissions
--    while securely persisting private claim code hashes.
-- 4. Introduces claim_guest_complaint RPC allowing authenticated citizens to claim
--    unlinked complaints using reference number and private claim code proof of ownership.
-- ==============================================================================

-- 1. Allow complaints to exist prior to citizen account association
ALTER TABLE public.complaints
  ALTER COLUMN citizen_id DROP NOT NULL;

-- 2. Add secure cryptographic claim code columns
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS claim_code_hash text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_claim_code_hash
  ON public.complaints(claim_code_hash)
  WHERE claim_code_hash IS NOT NULL;

-- 3. Drop existing submit_citizen_complaint function overloads
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text);

-- 4. Unified server-side submission RPC supporting both guest & authenticated intakes
CREATE OR REPLACE FUNCTION public.submit_citizen_complaint(
  p_citizen_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_description text DEFAULT '',
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
BEGIN
  -- Guest submissions must have a claim code hash so they can be claimed later
  IF p_citizen_id IS NULL AND coalesce(length(trim(p_claim_code_hash)), 0) = 0 THEN
    RAISE EXCEPTION 'A claim code hash is required for guest complaint submission.';
  END IF;

  IF coalesce(length(trim(p_description)), 0) = 0 THEN
    RAISE EXCEPTION 'Complaint description is required.';
  END IF;

  v_words := cardinality(regexp_split_to_array(trim(p_description), '\\s+'));
  IF v_words > 200 THEN
    RAISE EXCEPTION 'Complaint must contain 200 words or fewer.';
  END IF;

  IF coalesce(length(trim(p_incident_district)), 0) = 0
     OR coalesce(length(trim(p_incident_locality)), 0) = 0
     OR coalesce(length(trim(p_incident_public_location)), 0) = 0 THEN
    RAISE EXCEPTION 'Public incident location is required.';
  END IF;

  IF coalesce(length(trim(p_citizen_name)), 0) = 0
     OR coalesce(length(trim(p_citizen_phone)), 0) = 0
     OR coalesce(length(trim(p_residential_address)), 0) = 0 THEN
    RAISE EXCEPTION 'Required private contact details are missing.';
  END IF;

  IF p_prediction_confidence IS NULL OR p_prediction_confidence < 0 OR p_prediction_confidence > 1 THEN
    RAISE EXCEPTION 'Invalid classifier confidence.';
  END IF;

  IF NOT p_needs_review AND NOT EXISTS (
    SELECT 1 FROM public.departments WHERE id = p_predicted_department_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Classifier returned an inactive or unknown department.';
  END IF;

  v_assigned_department := CASE WHEN p_needs_review THEN NULL ELSE p_predicted_department_id END;
  v_status := CASE WHEN p_needs_review THEN 'under_review' ELSE 'assigned' END;
  v_reference := 'KHI-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.complaints (
    reference_number, citizen_id, title, description, incident_district,
    incident_locality, incident_public_location, status, assigned_department_id,
    predicted_department_id, prediction_confidence, is_reviewed_by_admin,
    is_demonstration, claim_code_hash
  ) VALUES (
    v_reference, p_citizen_id, nullif(trim(p_title), ''), trim(p_description), trim(p_incident_district),
    trim(p_incident_locality), trim(p_incident_public_location), v_status, v_assigned_department,
    p_predicted_department_id, p_prediction_confidence, false,
    coalesce(p_is_demonstration, false), nullif(trim(p_claim_code_hash), '')
  ) RETURNING id INTO v_complaint_id;

  INSERT INTO public.complaint_citizen_private (
    complaint_id, citizen_name, citizen_phone, citizen_email, residential_address
  ) VALUES (
    v_complaint_id, trim(p_citizen_name), trim(p_citizen_phone),
    nullif(trim(p_citizen_email), ''), trim(p_residential_address)
  );

  INSERT INTO public.complaint_timeline_events (
    complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id
  ) VALUES (
    v_complaint_id, 'submitted', 'Complaint registered', 'شکایت درج ہو گئی',
    'Your complaint was securely received.', 'آپ کی شکایت محفوظ طریقے سے موصول ہو گئی۔',
    'citizen', p_citizen_id
  ), (
    v_complaint_id, v_status,
    CASE WHEN p_needs_review THEN 'Routing needs review' ELSE 'Department assigned' END,
    CASE WHEN p_needs_review THEN 'روٹنگ کا جائزہ درکار ہے' ELSE 'محکمہ تفویض کر دیا گیا' END,
    CASE WHEN p_needs_review
      THEN 'The classifier found this complaint ambiguous, so it is held for safe review.'
      ELSE 'The classifier routed this complaint to the responsible department.'
    END,
    CASE WHEN p_needs_review
      THEN 'درجہ بندی غیر واضح ہونے کی وجہ سے شکایت کو محفوظ جائزے کے لیے رکھا گیا ہے۔'
      ELSE 'درجہ بندی کے بعد شکایت متعلقہ محکمے کو بھیج دی گئی ہے۔'
    END,
    'system', NULL
  );

  RETURN jsonb_build_object(
    'complaint_id', v_complaint_id,
    'reference_number', v_reference,
    'status', v_status,
    'needs_review', p_needs_review
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) TO service_role;

-- 5. RPC to securely claim an unclaimed guest complaint
CREATE OR REPLACE FUNCTION public.claim_guest_complaint(
  p_reference_number text,
  p_claim_code_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_complaint_id uuid;
  v_current_citizen uuid;
  v_expected_hash text;
  v_reference text;
  v_status text;
  v_rate_check jsonb;
BEGIN
  -- 1. Caller must be an authenticated citizen
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim complaints.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'citizen'
  ) THEN
    RAISE EXCEPTION 'Only citizen accounts can claim complaints.';
  END IF;

  IF coalesce(length(trim(p_reference_number)), 0) = 0 OR coalesce(length(trim(p_claim_code_hash)), 0) = 0 THEN
    RAISE EXCEPTION 'Reference number and claim code are required.';
  END IF;

  -- 2. Check rate limit for claim attempts
  v_rate_check := public.check_auth_rate_limit('claim:' || v_user_id::text);
  IF coalesce((v_rate_check->>'allowed')::boolean, true) = false THEN
    RAISE EXCEPTION 'Too many failed claim attempts. Please wait % seconds before trying again.',
      coalesce((v_rate_check->>'delay_seconds')::int, 60);
  END IF;

  v_reference := upper(trim(p_reference_number));

  -- 3. Look up complaint by reference number
  SELECT id, citizen_id, claim_code_hash, status
  INTO v_complaint_id, v_current_citizen, v_expected_hash, v_status
  FROM public.complaints
  WHERE reference_number = v_reference;

  IF v_complaint_id IS NULL THEN
    PERFORM public.record_auth_attempt('claim:' || v_user_id::text, false);
    RAISE EXCEPTION 'Invalid reference number or claim code.';
  END IF;

  -- 4. Check if already claimed
  IF v_current_citizen IS NOT NULL OR v_expected_hash IS NULL THEN
    RAISE EXCEPTION 'This complaint has already been claimed or linked to an account.';
  END IF;

  -- 5. Verify claim code hash (accepts either hex SHA-256 or plaintext code)
  IF lower(trim(p_claim_code_hash)) <> lower(trim(v_expected_hash))
     AND encode(sha256(trim(p_claim_code_hash)::bytea), 'hex') <> lower(trim(v_expected_hash)) THEN
    PERFORM public.record_auth_attempt('claim:' || v_user_id::text, false);
    RAISE EXCEPTION 'Invalid reference number or claim code.';
  END IF;

  -- 6. Atomically link complaint to citizen and clear claim code hash
  UPDATE public.complaints
  SET citizen_id = v_user_id,
      claim_code_hash = NULL,
      claimed_at = now()
  WHERE id = v_complaint_id;

  -- 7. Reset rate limit on success
  PERFORM public.record_auth_attempt('claim:' || v_user_id::text, true);

  -- 8. Record audit timeline event
  INSERT INTO public.complaint_timeline_events (
    complaint_id, status, title, title_urdu,
    description, description_urdu,
    actor_role, actor_id
  ) VALUES (
    v_complaint_id, v_status,
    'Complaint Claimed', 'شکایت اکاؤنٹ سے منسلک ہو گئی',
    'Complaint was securely claimed and linked to citizen account.',
    'شکایت کامیابی سے شہری کے تصدیق شدہ اکاؤنٹ سے منسلک کر دی گئی ہے۔',
    'citizen', v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'complaint_id', v_complaint_id,
    'reference_number', v_reference
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_complaint(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_guest_complaint(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_complaint(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_complaint(text, text) TO service_role;
