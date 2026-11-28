
-- A complaint must not become visible to departments until its photograph and location are recorded.
-- Storage bytes are uploaded by the authenticated/guest-aware Edge Function before this transaction.
CREATE OR REPLACE FUNCTION public.v23_submit_citizen_with_evidence(
 p_input jsonb,p_lat numeric,p_lng numeric,p_path text,p_mime text,p_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; cid uuid;
BEGIN
 IF p_path IS NULL OR p_path !~ '^intake/[0-9a-f-]{36}\.(jpg|png|webp)$'
 OR (p_mime IN ('image/jpeg','image/png','image/webp') AND p_bytes BETWEEN 1 AND 1048576) IS NOT TRUE
 THEN RAISE EXCEPTION 'A valid issue photograph is required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='complaint-evidence-private' AND o.name=p_path
 AND (o.metadata->>'size')::bigint=p_bytes AND o.metadata->>'mimetype'=p_mime)
 THEN RAISE EXCEPTION 'Private issue photograph is missing or invalid' USING ERRCODE='22023'; END IF;
 result:=public.v23_submit_citizen_with_location(p_input,p_lat,p_lng);
 cid:=(result->>'complaint_id')::uuid;
 INSERT INTO public.complaint_evidence(complaint_id,storage_path,mime_type,bytes) VALUES(cid,p_path,p_mime,p_bytes);
 RETURN result||jsonb_build_object('photo_attached',true);
END; $$;
REVOKE ALL ON FUNCTION public.v23_submit_citizen_with_evidence(jsonb,numeric,numeric,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v23_submit_citizen_with_evidence(jsonb,numeric,numeric,text,text,integer) TO service_role;
