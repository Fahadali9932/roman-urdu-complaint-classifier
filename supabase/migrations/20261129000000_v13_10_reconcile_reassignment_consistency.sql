-- V13.10: Reconcile reassignment RPCs with multi-department issue tracking and pin search paths.
-- Fixes consistency gap where assigned_department_id was updated without reconciling
-- assigned_department_ids array or updating complaint_issues rows.

-- 1. admin_reassign_complaint: Main Administrator Reassignment
CREATE OR REPLACE FUNCTION public.admin_reassign_complaint(
    p_complaint_id UUID,
    p_new_department_id TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_old_department_id TEXT;
    v_target_dept_name TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can reassign complaints.';
    END IF;

    -- Validate target department
    SELECT name INTO v_target_dept_name
    FROM public.departments
    WHERE id = p_new_department_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid target department: %', p_new_department_id;
    END IF;

    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    v_old_department_id := v_complaint.assigned_department_id;

    -- Atomically reconcile complaints record
    UPDATE public.complaints
    SET assigned_department_id = p_new_department_id,
        assigned_department_ids = ARRAY[p_new_department_id],
        is_multilabel = false,
        is_reviewed_by_admin = true,
        updated_at = v_now
    WHERE id = p_complaint_id;

    -- Create a target issue even when the complaint previously had none.
    UPDATE public.complaint_issues
    SET status = 'rejected', updated_at = v_now
    WHERE complaint_id = p_complaint_id
      AND department_id <> p_new_department_id
      AND status <> 'rejected';

    UPDATE public.complaint_issues
    SET status = 'assigned', updated_at = v_now
    WHERE complaint_id = p_complaint_id
      AND department_id = p_new_department_id;

    IF NOT FOUND THEN
        INSERT INTO public.complaint_issues (
            complaint_id, department_id, issue_type, status, created_at, updated_at
        ) VALUES (
            p_complaint_id, p_new_department_id, 'administrative_reassignment', 'assigned', v_now, v_now
        );
    END IF;

    -- Record in timeline
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
        v_complaint.status,
        'Department Reassigned by Administrator',
        'ایڈمنسٹریٹر کی جانب سے محکمہ تبدیل کیا گیا',
        format('Rerouted from %s to %s. Reason: %s', coalesce(v_old_department_id, 'unassigned'), p_new_department_id, trim(p_reason)),
        format('شکایت دوسرے محکمے کو منتقل کر دی گئی۔ وجہ: %s', trim(p_reason)),
        'main_admin',
        v_caller_id,
        v_now
    );

    -- Log in audit table
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
        'department_reassigned',
        pg_catalog.jsonb_build_object('status', v_complaint.status, 'assigned_department_id', v_old_department_id),
        pg_catalog.jsonb_build_object('status', v_complaint.status, 'assigned_department_id', p_new_department_id),
        pg_catalog.jsonb_build_object('reason', p_reason, 'previousDepartment', v_old_department_id, 'newDepartment', p_new_department_id),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'complaintId', p_complaint_id,
        'previousDepartment', v_old_department_id,
        'assignedDepartment', p_new_department_id,
        'assignedDepartmentIds', ARRAY[p_new_department_id]
    );
END;
$$;

-- 2. staff_review_and_assign_complaint: KMC / Clearinghouse Staff Review & Assignment
CREATE OR REPLACE FUNCTION public.staff_review_and_assign_complaint(
    p_complaint_id UUID,
    p_target_department_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_reviewer_dept_id TEXT;
    v_target_dept_name TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify caller is active KMC staff or main administrator
    SELECT m.department_id
    INTO v_reviewer_dept_id
    FROM public.department_memberships m
    WHERE m.user_id = v_caller_id
      AND m.department_id = 'kmc'
      AND m.status = 'active'
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
$$;

REVOKE ALL ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.staff_review_and_assign_complaint(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_review_and_assign_complaint(UUID, TEXT, TEXT) TO authenticated;
