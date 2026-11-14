-- Align live guest intake with the deployed classifier Edge Function.
-- Guest cases are private until an authenticated citizen proves ownership with
-- the one-time SHA-256 claim-code digest returned only in the initial receipt.

ALTER TABLE public.complaints
  ALTER COLUMN citizen_id DROP NOT NULL;

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS claim_code_hash text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_complaints_claim_code_hash
  ON public.complaints (claim_code_hash)
  WHERE claim_code_hash IS NOT NULL;

DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean);
DROP FUNCTION IF EXISTS public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text);

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
  IF p_citizen_id IS NULL AND coalesce(trim(p_claim_code_hash), '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A valid claim-code digest is required for a guest complaint.';
  END IF;
  IF coalesce(length(trim(p_description)), 0) = 0 THEN RAISE EXCEPTION 'Complaint description is required.'; END IF;
  v_words := cardinality(regexp_split_to_array(trim(p_description), '\\s+'));
  IF v_words > 200 THEN RAISE EXCEPTION 'Complaint must contain 200 words or fewer.'; END IF;
  IF coalesce(length(trim(p_incident_district)), 0) = 0 OR coalesce(length(trim(p_incident_locality)), 0) = 0 OR coalesce(length(trim(p_incident_public_location)), 0) = 0 THEN
    RAISE EXCEPTION 'Public incident location is required.';
  END IF;
  IF coalesce(length(trim(p_citizen_name)), 0) = 0 OR coalesce(length(trim(p_citizen_phone)), 0) = 0 OR coalesce(length(trim(p_residential_address)), 0) = 0 THEN
    RAISE EXCEPTION 'Required private contact details are missing.';
  END IF;
  IF p_prediction_confidence IS NULL OR p_prediction_confidence < 0 OR p_prediction_confidence > 1 THEN
    RAISE EXCEPTION 'Invalid classifier confidence.';
  END IF;
  IF NOT p_needs_review AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_predicted_department_id AND is_active) THEN
    RAISE EXCEPTION 'Classifier returned an inactive or unknown department.';
  END IF;

  v_assigned_department := CASE WHEN p_needs_review THEN NULL ELSE p_predicted_department_id END;
  v_status := CASE WHEN p_needs_review THEN 'under_review' ELSE 'assigned' END;
  v_reference := 'KHI-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.complaints (
    reference_number, citizen_id, title, description, incident_district, incident_locality,
    incident_public_location, status, assigned_department_id, predicted_department_id,
    prediction_confidence, is_reviewed_by_admin, is_demonstration, claim_code_hash
  ) VALUES (
    v_reference, p_citizen_id, nullif(trim(p_title), ''), trim(p_description), trim(p_incident_district), trim(p_incident_locality),
    trim(p_incident_public_location), v_status, v_assigned_department, p_predicted_department_id,
    p_prediction_confidence, false, coalesce(p_is_demonstration, false), nullif(lower(trim(p_claim_code_hash)), '')
  ) RETURNING id INTO v_complaint_id;

  INSERT INTO public.complaint_citizen_private (complaint_id, citizen_name, citizen_phone, citizen_email, residential_address)
  VALUES (v_complaint_id, trim(p_citizen_name), trim(p_citizen_phone), nullif(trim(p_citizen_email), ''), trim(p_residential_address));

  INSERT INTO public.complaint_timeline_events (complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id)
  VALUES
    (v_complaint_id, 'submitted', 'Complaint registered', 'شکایت درج ہو گئی', 'Your complaint was securely received.', 'آپ کی شکایت محفوظ طریقے سے موصول ہو گئی۔', 'citizen', p_citizen_id),
    (v_complaint_id, v_status,
      CASE WHEN p_needs_review THEN 'Routing needs review' ELSE 'Department assigned' END,
      CASE WHEN p_needs_review THEN 'روٹنگ کا جائزہ درکار ہے' ELSE 'محکمہ تفویض کر دیا گیا' END,
      CASE WHEN p_needs_review THEN 'The classifier found this complaint ambiguous, so it is held for safe review.' ELSE 'The classifier routed this complaint to the responsible department.' END,
      CASE WHEN p_needs_review THEN 'درجہ بندی غیر واضح ہونے کی وجہ سے شکایت کو محفوظ جائزے کے لیے رکھا گیا ہے۔' ELSE 'درجہ بندی کے بعد شکایت متعلقہ محکمے کو بھیج دی گئی ہے۔' END,
      'system', NULL);

  RETURN jsonb_build_object('complaint_id', v_complaint_id, 'reference_number', v_reference, 'status', v_status, 'needs_review', p_needs_review);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_guest_complaint(p_reference_number text, p_claim_code_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_complaint public.complaints%ROWTYPE;
  v_rate_check jsonb;
  v_reference text := upper(trim(p_reference_number));
  v_digest text := lower(trim(p_claim_code_hash));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required to claim complaints.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'citizen') THEN
    RAISE EXCEPTION 'Only citizen accounts can claim complaints.';
  END IF;
  IF coalesce(length(v_reference), 0) = 0 OR v_digest !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid reference number or claim code.';
  END IF;

  v_rate_check := public.check_auth_rate_limit('claim:' || v_user_id::text);
  IF coalesce((v_rate_check->>'allowed')::boolean, true) = false THEN
    RAISE EXCEPTION 'Too many failed claim attempts. Please wait % seconds before trying again.', coalesce((v_rate_check->>'retry_after_seconds')::int, 60);
  END IF;

  SELECT * INTO v_complaint FROM public.complaints WHERE reference_number = v_reference FOR UPDATE;
  IF NOT FOUND OR v_complaint.citizen_id IS NOT NULL OR v_complaint.claim_code_hash IS NULL OR v_digest <> lower(v_complaint.claim_code_hash) THEN
    PERFORM public.record_auth_attempt('claim:' || v_user_id::text, false);
    RAISE EXCEPTION 'Invalid reference number or claim code.';
  END IF;

  UPDATE public.complaints
  SET citizen_id = v_user_id, claim_code_hash = NULL, claimed_at = now(), updated_at = now()
  WHERE id = v_complaint.id;
  PERFORM public.record_auth_attempt('claim:' || v_user_id::text, true);

  INSERT INTO public.complaint_timeline_events (complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id)
  VALUES (v_complaint.id, v_complaint.status, 'Complaint Claimed', 'شکایت اکاؤنٹ سے منسلک ہو گئی', 'Complaint was securely claimed and linked to citizen account.', 'شکایت کامیابی سے شہری کے تصدیق شدہ اکاؤنٹ سے منسلک کر دی گئی ہے۔', 'citizen', v_user_id);

  RETURN jsonb_build_object('success', true, 'complaint_id', v_complaint.id, 'reference_number', v_reference);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_complaint(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_guest_complaint(text, text) TO authenticated;
