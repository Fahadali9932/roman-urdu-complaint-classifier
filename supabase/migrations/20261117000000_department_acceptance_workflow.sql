-- ==============================================================================
-- AWAAZ-E-AWAM — DEPARTMENT ACCEPTANCE AND STATUS WORKFLOW
-- Migration: 20261117000000_department_acceptance_workflow.sql
--
-- Incorporates explicit department acceptance lifecycle:
-- 1. Updates CHECK constraints on public.complaints and public.complaint_timeline_events
--    to include 'accepted'.
-- 2. Updates public.staff_update_complaint_status RPC to enforce:
--    - assigned -> accepted, rejected
--    - accepted -> in_progress, rejected
--    - in_progress -> resolved, rejected
--    - resolved / rejected are strictly terminal (no further transitions).
-- ==============================================================================

-- 1. Update check constraint on public.complaints
ALTER TABLE public.complaints
    DROP CONSTRAINT IF EXISTS complaints_status_check;

ALTER TABLE public.complaints
    ADD CONSTRAINT complaints_status_check
    CHECK (status IN ('submitted', 'under_review', 'assigned', 'accepted', 'in_progress', 'resolved', 'rejected'));

-- 2. Update check constraint on public.complaint_timeline_events
ALTER TABLE public.complaint_timeline_events
    DROP CONSTRAINT IF EXISTS complaint_timeline_events_status_check;

ALTER TABLE public.complaint_timeline_events
    ADD CONSTRAINT complaint_timeline_events_status_check
    CHECK (status IN ('submitted', 'under_review', 'assigned', 'accepted', 'in_progress', 'resolved', 'rejected'));

-- 3. Replace staff_update_complaint_status RPC
CREATE OR REPLACE FUNCTION public.staff_update_complaint_status(
    p_complaint_id UUID,
    p_new_status TEXT,
    p_title_en TEXT,
    p_title_ur TEXT,
    p_note_en TEXT,
    p_note_ur TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_complaint public.complaints%ROWTYPE;
    v_is_staff_active BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Fetch target complaint
    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    v_is_admin := public.is_main_admin(v_caller_id);

    -- If not admin, verify caller has an ACTIVE membership in the assigned department
    IF NOT v_is_admin THEN
        SELECT EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = v_caller_id
              AND m.department_id = v_complaint.assigned_department_id
              AND m.status = 'active'
        ) INTO v_is_staff_active;

        IF NOT v_is_staff_active THEN
            RAISE EXCEPTION 'Unauthorized: You do not have active staff credentials for this department.';
        END IF;

        -- Terminal status check: cannot update resolved or rejected complaints
        IF v_complaint.status IN ('resolved', 'rejected') THEN
            RAISE EXCEPTION 'Cannot update complaint in terminal status: %', v_complaint.status;
        -- Validate state transition workflow
        ELSIF v_complaint.status = 'submitted' AND p_new_status NOT IN ('under_review', 'assigned', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'under_review' AND p_new_status NOT IN ('assigned', 'in_progress', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'assigned' AND p_new_status NOT IN ('accepted', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'accepted' AND p_new_status NOT IN ('in_progress', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'in_progress' AND p_new_status NOT IN ('resolved', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        END IF;
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

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', p_complaint_id,
        'old_status', v_complaint.status,
        'new_status', p_new_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
