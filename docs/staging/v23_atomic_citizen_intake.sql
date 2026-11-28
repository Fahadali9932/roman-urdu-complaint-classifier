
-- Atomic Citizen intake: existing sanitized intake RPC + confirmed device point.
-- Existing edge function remains the authoritative classifier and polygon validator.
CREATE OR REPLACE FUNCTION public.v23_submit_citizen_with_location(p_input jsonb,p_lat numeric,p_lng numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE res jsonb; flags jsonb:=coalesce(p_input->'p_redaction_flags','{}'::jsonb); routing jsonb; deps text[]; predicted text:=p_input->>'p_predicted_department_id'; hold boolean:=coalesce((p_input->>'p_needs_review')::boolean,true);
BEGIN
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR (p_lat BETWEEN 23.50 AND 28.60 AND p_lng BETWEEN 66.40 AND 71.20) IS NOT TRUE THEN RAISE EXCEPTION 'Valid incident coordinates are required' USING ERRCODE='22023'; END IF;
 IF coalesce(length(trim(p_input->>'p_description')),0)=0 OR length(p_input->>'p_description')>6000 OR cardinality(regexp_split_to_array(trim(p_input->>'p_description'),'[[:space:]]+'))>200 THEN RAISE EXCEPTION 'Complaint must contain 1 to 200 words' USING ERRCODE='22023'; END IF;
 IF p_input->>'p_citizen_id' IS NULL AND coalesce(p_input->>'p_guest_tracking_hash','') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Guest tracking digest required' USING ERRCODE='22023'; END IF;
 routing:=flags->'multi_department_routing';
 IF jsonb_typeof(routing->'departments')='array' THEN
  SELECT array_agg(DISTINCT d) INTO deps FROM jsonb_array_elements_text(routing->'departments') AS t(d);
 ELSE deps:=ARRAY[predicted]; END IF;
 IF coalesce(cardinality(deps),0) NOT BETWEEN 1 AND 2 OR predicted IS NULL OR (predicted=ANY(deps)) IS NOT TRUE OR EXISTS(SELECT 1 FROM unnest(deps) x(d) WHERE NOT EXISTS(SELECT 1 FROM public.departments WHERE id=x.d AND is_active)) THEN
  hold:=true;
  flags:=jsonb_set(flags,'{multi_department_routing,review_reason}',to_jsonb('ROUTING_REVIEW_REQUIRED'::text),true);
 END IF;
 res:=public.submit_citizen_complaint(
  p_citizen_id=>(p_input->>'p_citizen_id')::uuid,
  p_title=>p_input->>'p_title',p_description=>p_input->>'p_description',
  p_sanitized_description=>p_input->>'p_sanitized_description',p_generated_heading=>p_input->>'p_generated_heading',p_factual_summary=>p_input->>'p_factual_summary',
  p_redaction_flags=>flags,p_redaction_needs_review=>coalesce((p_input->>'p_redaction_needs_review')::boolean,true),
  p_incident_district=>p_input->>'p_incident_district',p_incident_locality=>p_input->>'p_incident_locality',p_incident_public_location=>p_input->>'p_incident_public_location',
  p_citizen_name=>p_input->>'p_citizen_name',p_citizen_phone=>p_input->>'p_citizen_phone',p_citizen_email=>p_input->>'p_citizen_email',p_residential_address=>p_input->>'p_residential_address',
  p_predicted_department_id=>predicted,p_prediction_confidence=>coalesce((p_input->>'p_prediction_confidence')::numeric,0),
  p_needs_review=>hold,p_is_demonstration=>false,p_claim_code_hash=>p_input->>'p_claim_code_hash',p_guest_tracking_hash=>p_input->>'p_guest_tracking_hash');
 INSERT INTO public.complaint_geo_points(complaint_id,latitude,longitude) VALUES((res->>'complaint_id')::uuid,p_lat,p_lng);
 RETURN res||jsonb_build_object('incident_location_saved',true);
END; $$;
REVOKE ALL ON FUNCTION public.v23_submit_citizen_with_location(jsonb,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_submit_citizen_with_location(jsonb,numeric,numeric) TO service_role;
