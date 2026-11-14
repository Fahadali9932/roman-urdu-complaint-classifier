-- ==============================================================================
-- AWAAZ-E-AWAM — DEPARTMENT ACCEPTANCE AND STATUS WORKFLOW & NOTIFICATIONS
-- Migration: 20261117000000_department_acceptance_workflow.sql
--
-- Incorporates explicit department acceptance lifecycle & notification outbox:
-- 1. Updates CHECK constraints on public.complaints and public.complaint_timeline_events
--    to include 'accepted'.
-- 2. Creates public.complaint_notification_outbox for transactional citizen emails.
-- 3. Updates public.staff_update_complaint_status RPC to enforce:
--    - assigned -> accepted, rejected
--    - accepted -> in_progress, rejected
--    - in_progress -> resolved, rejected
--    - resolved / rejected are strictly terminal (no further transitions).
--    - Automatically records transactional email dispatch in notification outbox.
-- 4. Enables Supabase Realtime publication for complaints & timeline events.
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

-- 3. Create Notification Outbox Table (PII isolated from department staff)
CREATE TABLE IF NOT EXISTS public.complaint_notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    delivery_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status 
    ON public.complaint_notification_outbox(delivery_status, created_at);

ALTER TABLE public.complaint_notification_outbox ENABLE ROW LEVEL SECURITY;

-- Department staff must NEVER view recipient email addresses
REVOKE ALL ON public.complaint_notification_outbox FROM anon, authenticated;

-- Main admin can view notification audit log
CREATE POLICY admin_manage_notifications
    ON public.complaint_notification_outbox
    FOR ALL
    TO authenticated
    USING (public.is_main_admin(auth.uid()))
    WITH CHECK (public.is_main_admin(auth.uid()));

-- 4. Replace staff_update_complaint_status RPC
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
    v_citizen_email TEXT;
    v_citizen_name TEXT;
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
$$;

REVOKE ALL ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 5. Enable Realtime Publications for Live Status Sync
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_timeline_events;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
