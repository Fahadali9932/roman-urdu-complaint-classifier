-- ==============================================================================
-- AWAAZ-E-AWAM — STAFF CLASSIFICATION REVIEW QUEUE & UNCERTAIN ROUTING
-- Migration: 20261120000000_staff_classification_review_queue.sql
--
-- 1. Updates public.complaints SELECT RLS policy so authorized department staff
--    can view:
--      a) Complaints assigned to their own active department
--      b) Complaints held in 'under_review' status (the classification review queue)
--    while strictly preventing access to complaints assigned to other departments
--    and keeping citizen personal identifiers (PII) isolated in complaint_citizen_private.
--
-- 2. Creates public.staff_review_and_assign_complaint RPC:
--    Allows active department staff to review an ambiguous/low-confidence complaint,
--    confirm or reroute it to any of the 6 municipal authorities, transition its
--    status from 'under_review' to 'assigned', and record an immutable timeline audit event.
-- ==============================================================================

-- 1. Update complaints SELECT policy for active department staff
DROP POLICY IF EXISTS "Department staff can select assigned complaints" ON public.complaints;
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
                  OR complaints.status = 'under_review'
              )
        )
    );

-- 2. Staff Classification Review & Department Assignment RPC
CREATE OR REPLACE FUNCTION public.staff_review_and_assign_complaint(
    p_complaint_id UUID,
    p_target_department_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_reviewer_dept_id TEXT;
    v_reviewer_dept_name TEXT;
    v_target_dept_name TEXT;
    v_citizen_name TEXT;
    v_citizen_email TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify caller is an active department staff member or administrator
    SELECT m.department_id, d.name
    INTO v_reviewer_dept_id, v_reviewer_dept_name
    FROM public.department_memberships m
    JOIN public.departments d ON d.id = m.department_id
    WHERE m.user_id = v_caller_id
      AND m.status = 'active'
    LIMIT 1;

    IF v_reviewer_dept_id IS NULL AND NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Active department staff credentials required.';
    END IF;

    -- Validate target department exists and is active
    SELECT name INTO v_target_dept_name
    FROM public.departments
    WHERE id = p_target_department_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid target department: %', p_target_department_id;
    END IF;

    -- Lock complaint row for update
    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    IF v_complaint.status != 'under_review' THEN
        RAISE EXCEPTION 'Only complaints under review can be assigned via classification review (current status: %).', v_complaint.status;
    END IF;

    -- Update complaint status to 'assigned' and set assigned_department_id
    UPDATE public.complaints
    SET assigned_department_id = p_target_department_id,
        status = 'assigned',
        is_reviewed_by_admin = true,
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
        'assigned',
        'Classification Reviewed & Department Assigned',
        'درجہ بندی کا جائزہ مکمل اور محکمہ تفویض',
        'Complaint reviewed by staff officer and assigned to ' || v_target_dept_name || '.' ||
        CASE WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN ' Review note: ' || trim(p_notes) ELSE '' END,
        'محکمہ افسر نے شکایت کا جائزہ لے کر متعلقہ محکمے (' || v_target_dept_name || ') کے سپرد کر دیا۔',
        'department_staff',
        v_caller_id
    );

    -- Log in audit table
    INSERT INTO public.complaint_audit_logs (
        complaint_id,
        actor_user_id,
        action,
        previous_state,
        new_state,
        details
    )
    VALUES (
        p_complaint_id,
        v_caller_id,
        'staff_classification_review',
        jsonb_build_object(
            'status', 'under_review',
            'assigned_department_id', null,
            'predicted_department_id', v_complaint.predicted_department_id,
            'prediction_confidence', v_complaint.prediction_confidence
        ),
        jsonb_build_object(
            'status', 'assigned',
            'assigned_department_id', p_target_department_id
        ),
        jsonb_build_object(
            'target_department_id', p_target_department_id,
            'target_department_name', v_target_dept_name,
            'reviewer_department_id', v_reviewer_dept_id,
            'notes', p_notes
        )
    );

    -- Securely fetch citizen notification contact from private table
    SELECT citizen_name, citizen_email
    INTO v_citizen_name, v_citizen_email
    FROM public.complaint_citizen_private
    WHERE complaint_id = p_complaint_id;

    -- Queue citizen email notification in isolated outbox if citizen has an email address
    IF v_citizen_email IS NOT NULL AND length(trim(v_citizen_email)) > 0 THEN
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
            v_citizen_email,
            v_citizen_name,
            'classification_reviewed',
            'assigned',
            jsonb_build_object(
                'reference_number', v_complaint.reference_number,
                'target_department_id', p_target_department_id,
                'target_department_name', v_target_dept_name,
                'notes', p_notes,
                'reviewed_at', now()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', p_complaint_id,
        'assigned_department_id', p_target_department_id,
        'status', 'assigned'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_review_and_assign_complaint(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_review_and_assign_complaint(UUID, TEXT, TEXT) TO authenticated;
