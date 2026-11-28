-- Applied on staging: 20261128082430 v25_mfa_and_evidence_access_boundary
CREATE OR REPLACE FUNCTION public.can_view_complaint_evidence(p_complaint_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT coalesce(auth.uid() IS NOT NULL AND auth.jwt()->>'aal'='aal2' AND EXISTS (
  SELECT 1 FROM public.complaints c WHERE c.id=p_complaint_id AND (
   public.is_main_admin(auth.uid()) OR EXISTS(
    SELECT 1 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id
    WHERE m.user_id=auth.uid() AND m.status='active' AND d.is_active
    AND (m.department_id=c.assigned_department_id OR m.department_id=ANY(coalesce(c.assigned_department_ids,ARRAY[]::text[])))
    AND (m.staff_role='head' OR (m.staff_role='officer' AND public.v16_staff_operational_access(auth.uid(),m.department_id,'officer') AND EXISTS(
      SELECT 1 FROM public.department_work_orders o JOIN public.department_work_order_reports r ON r.order_id=o.id
      WHERE r.complaint_id=c.id AND o.department_id=m.department_id AND o.officer_id=auth.uid()
    )))
   )
  )
 ),false);
$function$;

CREATE OR REPLACE FUNCTION public.is_main_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p_user_id IS NOT NULL
     AND p_user_id = (SELECT auth.uid())
     AND (SELECT auth.jwt()->>'aal') = 'aal2'
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = p_user_id AND p.role = 'main_admin'
     );
$function$;

CREATE OR REPLACE FUNCTION public.staff_accept_incident_case_reports(p_case_id uuid, p_idempotency_key text, p_operator_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_case public.incident_cases%ROWTYPE;
    v_is_staff_active BOOLEAN;
    v_is_admin BOOLEAN;
    v_staff_name TEXT;
    v_cached_result JSONB;
    v_eligible_report RECORD;
    v_accepted_count INTEGER := 0;
    v_unchanged_count INTEGER := 0;
    v_result JSONB;
BEGIN
    IF v_caller_id IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) = 0
       OR length(p_idempotency_key) > 128 THEN
        RAISE EXCEPTION 'A valid idempotency key is required.';
    END IF;

    -- 1. Load and lock the requested case before disclosing cached results.
    SELECT * INTO v_case
    FROM public.incident_cases
    WHERE id = p_case_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident case not found: %', p_case_id;
    END IF;

    -- 2. Authorize this caller for this exact case *before* cache access.
    v_is_admin := public.is_main_admin(v_caller_id);
    IF NOT v_is_admin THEN
        SELECT EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = v_caller_id
              AND m.department_id = v_case.department_id
              AND m.status = 'active'
              AND public.v16_staff_operational_access(v_caller_id,m.department_id,'head')
        ) INTO v_is_staff_active;

        IF NOT v_is_staff_active THEN
            RAISE EXCEPTION 'Unauthorized: You do not have active staff credentials for department %.', v_case.department_id;
        END IF;
    END IF;

    -- 3. Only an authorized caller can replay a cached result for this case.
    SELECT result_json INTO v_cached_result
    FROM public.case_batch_operations
    WHERE case_id = p_case_id
      AND idempotency_key = p_idempotency_key;

    IF v_cached_result IS NOT NULL THEN
        RETURN v_cached_result;
    END IF;

    -- 4. Fetch staff full name
    SELECT full_name INTO v_staff_name
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_staff_name IS NULL OR length(trim(v_staff_name)) = 0 THEN
        v_staff_name := 'Authorized Staff Officer';
    END IF;

    -- 5. Lock and update linked eligible complaints
    FOR v_eligible_report IN
        SELECT c.id, c.reference_number, c.status
        FROM public.incident_case_reports icr
        JOIN public.complaints c ON c.id = icr.complaint_id
        WHERE icr.case_id = p_case_id
        FOR UPDATE OF c
    LOOP
        IF v_eligible_report.status IN ('submitted', 'assigned') THEN
            -- Update complaint status
            UPDATE public.complaints
            SET status = 'accepted',
                updated_at = now()
            WHERE id = v_eligible_report.id;

            -- Insert timeline event
            INSERT INTO public.complaint_timeline_events (
                complaint_id,
                status,
                title,
                title_urdu,
                description,
                description_urdu,
                actor_role,
                created_at
            ) VALUES (
                v_eligible_report.id,
                'accepted',
                'Complaint Accepted by Department',
                'شکایت محکمے کی جانب سے قبول کر لی گئی',
                coalesce(trim(p_operator_note), 'Case report acknowledged and accepted into departmental work queue.'),
                'کیس رپورٹ تسلیم کر کے کام کے لیے منظور کر لی گئی۔',
                'department_officer',
                now()
            );

            v_accepted_count := v_accepted_count + 1;
        ELSE
            v_unchanged_count := v_unchanged_count + 1;
        END IF;
    END LOOP;

    -- 6. Log Case Activity Event
    INSERT INTO public.incident_case_events (
        case_id,
        actor_username,
        actor_role,
        event_type,
        description,
        created_at
    ) VALUES (
        p_case_id,
        v_staff_name,
        'department_officer',
        'bulk_acceptance',
        format('Accepted %s eligible linked reports into departmental workflow. (%s reports unchanged)', v_accepted_count, v_unchanged_count),
        now()
    );

    -- 7. Update Case Work Status
    UPDATE public.incident_cases
    SET work_status = 'under_investigation',
        updated_at = now()
    WHERE id = p_case_id;

    -- 8. Build Result and Record Idempotent Batch Operation
    v_result := jsonb_build_object(
        'success', true,
        'caseId', p_case_id,
        'caseNumber', v_case.case_number,
        'acceptedCount', v_accepted_count,
        'unchangedCount', v_unchanged_count,
        'executedAt', now(),
        'message', format('Successfully accepted %s eligible reports for Case %s.', v_accepted_count, v_case.case_number)
    );

    INSERT INTO public.case_batch_operations (
        case_id,
        operation_type,
        idempotency_key,
        affected_reports_count,
        executed_by,
        result_json,
        created_at
    ) VALUES (
        p_case_id,
        'bulk_accept',
        p_idempotency_key,
        v_accepted_count,
        v_staff_name,
        v_result,
        now()
    );

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.staff_flag_ai_classification_review(p_complaint_id uuid, p_suggested_department text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_caller uuid := (SELECT auth.uid());
  v_complaint public.complaints%ROWTYPE;
  v_department text;
  v_original text[];
  v_review_id uuid;
  v_safe_reason text;
BEGIN
  IF v_caller IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'MFA verified staff required' USING ERRCODE='42501'; END IF;
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
    AND public.v16_staff_operational_access(v_caller,m.department_id,'head')
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
$function$;

CREATE OR REPLACE FUNCTION public.staff_override_complaint_priority(p_complaint_id uuid, p_new_priority text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_is_staff_active BOOLEAN;
    v_is_admin BOOLEAN;
    v_staff_name TEXT;
    v_clean_priority TEXT;
    v_clean_reason TEXT;
    v_old_priority TEXT;
BEGIN
    IF v_caller_id IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Normalize inputs
    v_clean_priority := lower(trim(p_new_priority));
    v_clean_reason := trim(p_reason);

    IF v_clean_priority NOT IN ('critical', 'high', 'normal', 'low') THEN
        RAISE EXCEPTION 'Invalid priority level: %. Must be critical, high, normal, or low.', p_new_priority;
    END IF;

    IF length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'A mandatory justification note (at least 3 characters) is required to adjust priority.';
    END IF;

    -- Lock complaint row
    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    v_is_admin := public.is_main_admin(v_caller_id);

    -- Authorization check: Caller must be active staff for assigned department OR main admin
    IF NOT v_is_admin THEN
        SELECT EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = v_caller_id
              AND m.department_id = v_complaint.assigned_department_id
              AND m.status = 'active'
              AND public.v16_staff_operational_access(v_caller_id,m.department_id,'head')
        ) INTO v_is_staff_active;

        IF NOT v_is_staff_active THEN
            RAISE EXCEPTION 'Unauthorized: You do not have active staff credentials for department %.', v_complaint.assigned_department_id;
        END IF;
    END IF;

    -- Fetch caller name
    SELECT full_name INTO v_staff_name
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_staff_name IS NULL OR length(trim(v_staff_name)) = 0 THEN
        v_staff_name := 'Authorized Staff Officer';
    END IF;

    v_old_priority := coalesce(v_complaint.manual_priority, 'system_default');

    -- Update complaints table
    UPDATE public.complaints
    SET manual_priority = v_clean_priority,
        manual_priority_reason = v_clean_reason,
        manual_priority_by = v_staff_name,
        manual_priority_at = now(),
        updated_at = now()
    WHERE id = p_complaint_id;

    -- Record immutable audit event in timeline
    INSERT INTO public.complaint_timeline_events (
        complaint_id,
        status,
        title,
        title_urdu,
        description,
        description_urdu,
        actor_role,
        actor_id
    ) VALUES (
        p_complaint_id,
        v_complaint.status,
        'Priority Adjusted to ' || upper(v_clean_priority),
        'ترجیح کو تبدیل کر کے ' || upper(v_clean_priority) || ' کیا گیا',
        'Priority overridden by ' || v_staff_name || ' (previous: ' || upper(v_old_priority) || '). Justification: ' || v_clean_reason,
        'محکمانہ افسر (' || v_staff_name || ') کی جانب سے ترجیح تبدیل کی گئی۔ وجہ: ' || v_clean_reason,
        'department_staff',
        v_caller_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', p_complaint_id,
        'reference_number', v_complaint.reference_number,
        'manual_priority', v_clean_priority,
        'manual_priority_reason', v_clean_reason,
        'manual_priority_by', v_staff_name,
        'manual_priority_at', now()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.staff_review_and_assign_complaint(p_complaint_id uuid, p_target_department_id text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_reviewer_dept_id TEXT;
    v_target_dept_name TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF v_caller_id IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify caller is active KMC staff or main administrator
    SELECT m.department_id
    INTO v_reviewer_dept_id
    FROM public.department_memberships m
    WHERE m.user_id = v_caller_id
      AND m.department_id = 'kmc'
      AND m.status = 'active'
      AND public.v16_staff_operational_access(v_caller_id,m.department_id,'head')
    LIMIT 1;

    IF (v_reviewer_dept_id IS NULL OR v_reviewer_dept_id <> 'kmc') AND NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only KMC clearinghouse staff or administrators are authorized to review and assign complaints.';
    END IF;

    -- Validate target department
    SELECT name INTO v_target_dept_name
    FROM public.departments
    WHERE id = p_target_department_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid target department: %', p_target_department_id;
    END IF;

    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    IF v_complaint.status <> 'under_review' THEN
        RAISE EXCEPTION 'Only complaints under review can be assigned via classification review (current status: %).', v_complaint.status;
    END IF;

    -- Update complaint status and department arrays atomically
    UPDATE public.complaints
    SET assigned_department_id = p_target_department_id,
        assigned_department_ids = ARRAY[p_target_department_id],
        status = 'assigned',
        is_multilabel = false,
        is_reviewed_by_admin = true,
        updated_at = v_now
    WHERE id = p_complaint_id;

    -- Reconcile complaint_issues, including the zero-existing-issues case.
    UPDATE public.complaint_issues
    SET status = 'rejected', updated_at = v_now
    WHERE complaint_id = p_complaint_id
      AND department_id <> p_target_department_id
      AND status <> 'rejected';

    UPDATE public.complaint_issues
    SET status = 'assigned', updated_at = v_now
    WHERE complaint_id = p_complaint_id
      AND department_id = p_target_department_id;

    IF NOT FOUND THEN
        INSERT INTO public.complaint_issues (
            complaint_id, department_id, issue_type, status, created_at, updated_at
        ) VALUES (
            p_complaint_id, p_target_department_id, 'classification_review_assignment', 'assigned', v_now, v_now
        );
    END IF;

    -- Timeline event
    INSERT INTO public.complaint_timeline_events (
        complaint_id,
        status,
        title,
        title_urdu,
        description,
        description_urdu,
        actor_role,
        actor_id,
        created_at
    ) VALUES (
        p_complaint_id,
        'assigned',
        'Classification Reviewed & Department Assigned',
        'درجہ بندی کا جائزہ مکمل اور محکمہ تفویض',
        'Complaint reviewed by staff officer and assigned to ' || v_target_dept_name || '.' ||
        CASE WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN ' Review note: ' || trim(p_notes) ELSE '' END,
        'محکمہ افسر نے شکایت کا جائزہ لے کر متعلقہ محکمے (' || v_target_dept_name || ') کے سپرد کر دیا۔',
        'department_staff',
        v_caller_id,
        v_now
    );

    -- Audit log
    INSERT INTO public.complaint_audit_logs (
        complaint_id,
        actor_user_id,
        action,
        previous_state,
        new_state,
        details,
        created_at
    ) VALUES (
        p_complaint_id,
        v_caller_id,
        'classification_reviewed_and_assigned',
        pg_catalog.jsonb_build_object('status', 'under_review', 'assigned_department_id', v_complaint.assigned_department_id),
        pg_catalog.jsonb_build_object('status', 'assigned', 'assigned_department_id', p_target_department_id),
        pg_catalog.jsonb_build_object('notes', p_notes, 'target_department_id', p_target_department_id),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'complaintId', p_complaint_id,
        'assignedDepartment', p_target_department_id,
        'assignedDepartmentIds', ARRAY[p_target_department_id],
        'status', 'assigned'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.staff_update_complaint_status(p_complaint_id uuid, p_new_status text, p_title_en text, p_title_ur text, p_note_en text, p_note_ur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_citizen_email TEXT;
    v_citizen_name TEXT;
    v_is_staff_active BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    IF v_caller_id IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock the row so simultaneous staff actions cannot create conflicting
    -- transitions or timeline entries.
    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    v_is_admin := public.is_main_admin(v_caller_id);

    -- An administrator may operate the workflow; all other callers must have an
    -- active membership in the department to which this complaint is assigned.
    IF NOT v_is_admin THEN
        SELECT EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = v_caller_id
              AND m.department_id = v_complaint.assigned_department_id
              AND m.status = 'active'
              AND public.v16_staff_operational_access(v_caller_id,m.department_id,'head')
        ) INTO v_is_staff_active;

        IF NOT v_is_staff_active THEN
            RAISE EXCEPTION 'Unauthorized: You do not have active staff credentials for this department.';
        END IF;

    END IF;

    IF p_new_status = 'resolved' THEN RAISE EXCEPTION 'Use verified work-order closure after evidence and citizen review' USING ERRCODE='42501'; END IF;
    -- Never allow an arbitrary status change, including by an administrator.
    -- Assignment itself is performed by the separately authorized reassignment
    -- workflow; department staff may only perform the operational lifecycle.
    IF (v_complaint.status = 'assigned' AND p_new_status NOT IN ('accepted', 'rejected'))
       OR (v_complaint.status = 'accepted' AND p_new_status NOT IN ('in_progress', 'rejected'))
       OR (v_complaint.status = 'in_progress' AND p_new_status NOT IN ('resolved', 'rejected'))
       OR v_complaint.status IN ('submitted', 'under_review', 'resolved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
    END IF;

    -- Execute status transition
    UPDATE public.complaints
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_complaint_id;

    -- Record immutable milestone in timeline
    INSERT INTO public.complaint_timeline_events (
        complaint_id,
        status,
        title,
        title_urdu,
        description,
        description_urdu,
        actor_role,
        actor_id
    )
    VALUES (
        p_complaint_id,
        p_new_status,
        p_title_en,
        p_title_ur,
        p_note_en,
        p_note_ur,
        CASE WHEN v_is_admin THEN 'main_admin' ELSE 'department_staff' END,
        v_caller_id
    );

    -- Securely fetch citizen notification contact from private table
    SELECT citizen_email, citizen_name 
    INTO v_citizen_email, v_citizen_name
    FROM public.complaint_citizen_private
    WHERE complaint_id = p_complaint_id;

    -- Queue transactional notification in outbox (Staff caller NEVER sees this email)
    IF v_citizen_email IS NOT NULL AND trim(v_citizen_email) <> '' THEN
        INSERT INTO public.complaint_notification_outbox (
            complaint_id,
            recipient_email,
            recipient_name,
            event_type,
            status,
            payload
        )
        VALUES (
            p_complaint_id,
            trim(v_citizen_email),
            coalesce(v_citizen_name, 'Citizen'),
            'status_updated',
            p_new_status,
            jsonb_build_object(
                'reference_number', v_complaint.reference_number,
                'status', p_new_status,
                'title_en', p_title_en,
                'title_ur', p_title_ur,
                'note_en', p_note_en,
                'note_ur', p_note_ur,
                'department_id', v_complaint.assigned_department_id,
                'timestamp', now()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', p_complaint_id,
        'old_status', v_complaint.status,
        'new_status', p_new_status
    );
END;
$function$;

-- Applied on staging: 20261128082436 v25_admin_mfa_null_fail_closed
CREATE OR REPLACE FUNCTION public.is_main_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 SELECT coalesce(p_user_id IS NOT NULL
   AND p_user_id=(SELECT auth.uid())
   AND (SELECT auth.jwt()->>'aal')='aal2'
   AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_user_id AND p.role='main_admin'),false);
$function$;

-- Applied on staging: 20261128082526 v25_staff_login_alias_quota
CREATE INDEX v25_staff_login_quota_window_idx ON app_private.v24_staff_login_quota(window_started);
CREATE OR REPLACE FUNCTION public.v24_staff_login_prepare(p_identifier text, p_department text, p_key_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE t timestamptz:=clock_timestamp(); n integer; u record; matches integer; account_key text;
BEGIN
 IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' OR p_identifier IS NULL OR length(p_identifier) NOT BETWEEN 1 AND 120 OR p_department IS NULL THEN
   RETURN jsonb_build_object('allowed',false);
 END IF;
 -- Bounded removal of old quota rows; avoids keeping login identifiers indefinitely.
 DELETE FROM app_private.v24_staff_login_quota q WHERE q.key_hash IN (
   SELECT stale.key_hash FROM app_private.v24_staff_login_quota stale
   WHERE stale.window_started<t-interval '24 hours' ORDER BY stale.window_started LIMIT 32 FOR UPDATE SKIP LOCKED
 );
 INSERT INTO app_private.v24_staff_login_quota(key_hash,window_started,attempts)
 VALUES(p_key_hash,t,1)
 ON CONFLICT(key_hash) DO UPDATE SET
  window_started=CASE WHEN app_private.v24_staff_login_quota.window_started<=t-interval '15 minutes' THEN t ELSE app_private.v24_staff_login_quota.window_started END,
  attempts=CASE WHEN app_private.v24_staff_login_quota.window_started<=t-interval '15 minutes' THEN 1 ELSE least(11,app_private.v24_staff_login_quota.attempts+1) END
 RETURNING attempts INTO n;
 IF n>10 THEN RETURN jsonb_build_object('allowed',false); END IF;
 SELECT count(DISTINCT m.user_id) INTO matches
 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id
 JOIN auth.users a ON a.id=m.user_id JOIN public.profiles p ON p.id=m.user_id
 WHERE m.department_id=p_department AND d.is_active AND m.status='active' AND p.role='department_staff'
 AND (lower(m.staff_username)=p_identifier OR lower(m.employee_id)=p_identifier OR lower(a.email)=p_identifier);
 IF matches<>1 THEN RETURN jsonb_build_object('allowed',true); END IF;
 SELECT a.id,a.email INTO u
 FROM public.department_memberships m JOIN public.departments d ON d.id=m.department_id
 JOIN auth.users a ON a.id=m.user_id JOIN public.profiles p ON p.id=m.user_id
 WHERE m.department_id=p_department AND d.is_active AND m.status='active' AND p.role='department_staff'
 AND (lower(m.staff_username)=p_identifier OR lower(m.employee_id)=p_identifier OR lower(a.email)=p_identifier) LIMIT 1;
 -- The same account shares one limit across email, employee ID and username.
 account_key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('v25-account:'||u.id::text,'UTF8')),'hex');
 INSERT INTO app_private.v24_staff_login_quota(key_hash,window_started,attempts)
 VALUES(account_key,t,1)
 ON CONFLICT(key_hash) DO UPDATE SET
  window_started=CASE WHEN app_private.v24_staff_login_quota.window_started<=t-interval '15 minutes' THEN t ELSE app_private.v24_staff_login_quota.window_started END,
  attempts=CASE WHEN app_private.v24_staff_login_quota.window_started<=t-interval '15 minutes' THEN 1 ELSE least(11,app_private.v24_staff_login_quota.attempts+1) END
 RETURNING attempts INTO n;
 IF n>10 THEN RETURN jsonb_build_object('allowed',false); END IF;
 RETURN jsonb_build_object('allowed',true,'user_id',u.id,'email',u.email);
END $function$;
