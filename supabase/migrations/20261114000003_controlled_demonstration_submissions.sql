-- Preserve an explicit marker for fictional, controlled end-to-end tests.
-- Routing continues to be derived by the trusted Edge Function, never by the client.
CREATE OR REPLACE FUNCTION public.submit_citizen_complaint(
  p_citizen_id uuid,
  p_title text,
  p_description text,
  p_incident_district text,
  p_incident_locality text,
  p_incident_public_location text,
  p_citizen_name text,
  p_citizen_phone text,
  p_citizen_email text,
  p_residential_address text,
  p_predicted_department_id text,
  p_prediction_confidence numeric,
  p_needs_review boolean,
  p_is_demonstration boolean
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
  IF p_citizen_id IS NULL THEN RAISE EXCEPTION 'Citizen identity is required.'; END IF;
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
    reference_number, citizen_id, title, description, incident_district,
    incident_locality, incident_public_location, status, assigned_department_id,
    predicted_department_id, prediction_confidence, is_reviewed_by_admin, is_demonstration
  ) VALUES (
    v_reference, p_citizen_id, nullif(trim(p_title), ''), trim(p_description), trim(p_incident_district),
    trim(p_incident_locality), trim(p_incident_public_location), v_status, v_assigned_department,
    p_predicted_department_id, p_prediction_confidence, false, coalesce(p_is_demonstration, false)
  ) RETURNING id INTO v_complaint_id;

  INSERT INTO public.complaint_citizen_private (
    complaint_id, citizen_name, citizen_phone, citizen_email, residential_address
  ) VALUES (
    v_complaint_id, trim(p_citizen_name), trim(p_citizen_phone), nullif(trim(p_citizen_email), ''), trim(p_residential_address)
  );

  INSERT INTO public.complaint_timeline_events (
    complaint_id, status, title, title_urdu, description, description_urdu, actor_role, actor_id
  ) VALUES (
    v_complaint_id, 'submitted', 'Complaint registered', 'شکایت درج ہو گئی',
    'Your complaint was securely received.', 'آپ کی شکایت محفوظ طریقے سے موصول ہو گئی۔', 'citizen', p_citizen_id
  ), (
    v_complaint_id, v_status,
    CASE WHEN p_needs_review THEN 'Routing needs review' ELSE 'Department assigned' END,
    CASE WHEN p_needs_review THEN 'روٹنگ کا جائزہ درکار ہے' ELSE 'محکمہ تفویض کر دیا گیا' END,
    CASE WHEN p_needs_review THEN 'The classifier found this complaint ambiguous, so it is held for safe review.' ELSE 'The classifier routed this complaint to the responsible department.' END,
    CASE WHEN p_needs_review THEN 'درجہ بندی غیر واضح ہونے کی وجہ سے شکایت کو محفوظ جائزے کے لیے رکھا گیا ہے۔' ELSE 'درجہ بندی کے بعد شکایت متعلقہ محکمے کو بھیج دی گئی ہے۔' END,
    'system', NULL
  );

  RETURN jsonb_build_object('complaint_id', v_complaint_id, 'reference_number', v_reference, 'status', v_status, 'needs_review', p_needs_review);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_citizen_complaint(uuid, text, text, text, text, text, text, text, text, text, text, numeric, boolean, boolean) TO service_role;
