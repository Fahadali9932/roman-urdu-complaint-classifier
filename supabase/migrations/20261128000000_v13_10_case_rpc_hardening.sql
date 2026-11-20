-- V13.10: reapply the authorized incident-case RPC after older migrations.
-- Ensure cached idempotency responses cannot bypass case-level membership checks.
CREATE OR REPLACE FUNCTION public.staff_accept_incident_case_reports(
    p_case_id UUID,
    p_idempotency_key TEXT,
    p_operator_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    IF v_caller_id IS NULL THEN
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
$$;

-- Revoke public execution and grant to authenticated only
REVOKE ALL ON FUNCTION public.staff_accept_incident_case_reports(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_accept_incident_case_reports(UUID, TEXT, TEXT) TO authenticated;

-- The multi-issue audit trigger must not inherit a mutable caller search_path.
ALTER FUNCTION public.handle_complaint_issues_updated_at() SET search_path = '';

-- Later schema migrations add row-level SELECT policies but need the matching
-- table-level grant; direct INSERT/UPDATE/DELETE remains restricted.
GRANT SELECT ON public.complaint_issues TO authenticated;

-- Correct the guest status function's reference to a removed complaints column.
CREATE OR REPLACE FUNCTION public.get_guest_complaint_status(p_tracking_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec record;
  v_dept_name text;
  v_display_status text;
  v_updates jsonb;
  v_public_issues jsonb := '[]'::jsonb;
  v_issue record;
BEGIN
  IF p_tracking_hash IS NULL OR trim(p_tracking_hash) !~* '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT c.id, c.status, c.created_at, c.updated_at, c.predicted_department_id,
         c.assigned_department_id, c.assigned_department_ids, c.is_multilabel
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
