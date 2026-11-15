-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 3F.2: STAFF COMPLAINT PRIORITY OVERRIDE & AUDITING
-- Migration: 20261122000000_staff_priority_override.sql
--
-- 1. Adds priority management columns to public.complaints:
--    - manual_priority: Staff-overridden priority level ('critical', 'high', 'normal', 'low')
--    - manual_priority_reason: Justification text for the override
--    - manual_priority_by: Identity of authorized officer who applied override
--    - manual_priority_at: Exact timestamp when override occurred
--
-- 2. Creates public.staff_override_complaint_priority RPC:
--    - Enforces strict server-side authorization: caller must have active membership
--      in the assigned department, or be the main administrator.
--    - Validates priority level and mandatory justification.
--    - Updates public.complaints and inserts an immutable audit event into
--      public.complaint_timeline_events.
-- ==============================================================================

-- 1. Schema Extensions for public.complaints
ALTER TABLE public.complaints
    ADD COLUMN IF NOT EXISTS manual_priority TEXT CHECK (manual_priority IN ('critical', 'high', 'normal', 'low')),
    ADD COLUMN IF NOT EXISTS manual_priority_reason TEXT,
    ADD COLUMN IF NOT EXISTS manual_priority_by TEXT,
    ADD COLUMN IF NOT EXISTS manual_priority_at TIMESTAMPTZ;

-- Create Index for fast priority filtering
CREATE INDEX IF NOT EXISTS idx_complaints_manual_priority
    ON public.complaints(manual_priority)
    WHERE manual_priority IS NOT NULL;

-- 2. Staff Priority Override RPC Function
CREATE OR REPLACE FUNCTION public.staff_override_complaint_priority(
    p_complaint_id UUID,
    p_new_priority TEXT,
    p_reason TEXT
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
    v_staff_name TEXT;
    v_clean_priority TEXT;
    v_clean_reason TEXT;
    v_old_priority TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
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
$$;

-- Revoke from public/anon, grant strictly to authenticated
REVOKE ALL ON FUNCTION public.staff_override_complaint_priority(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_override_complaint_priority(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_override_complaint_priority(UUID, TEXT, TEXT) TO authenticated;
