-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 3B: CORE SUPABASE DATABASE FOUNDATION
-- Database Migration: 20261114000000_core_complaints_and_privacy.sql
-- Architecture: Supabase PostgreSQL 15 + RLS + Strict PII Isolation
-- University: Greenwich University, Karachi, Pakistan
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. HARDEN PHASE 2 SECURITY DEFINER FUNCTIONS (SAFE search_path & PRIVILEGES)
-- ==============================================================================

-- Check if a user is an authorized Main Administrator
CREATE OR REPLACE FUNCTION public.is_main_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND role = 'main_admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_main_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_main_admin(UUID) TO authenticated;

-- Read active department membership for a staff user
CREATE OR REPLACE FUNCTION public.get_active_staff_department(p_user_id UUID)
RETURNS TABLE (
    membership_id UUID,
    department_id TEXT,
    department_name TEXT,
    department_code TEXT,
    membership_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
    SELECT 
        m.id AS membership_id,
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        m.status AS membership_status
    FROM public.department_memberships m
    JOIN public.departments d ON d.id = m.department_id
    WHERE m.user_id = p_user_id
      AND m.status = 'active'
      AND d.is_active = true
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_staff_department(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_staff_department(UUID) TO authenticated;

-- Immediate access revocation function
CREATE OR REPLACE FUNCTION public.revoke_staff_access(p_membership_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_membership public.department_memberships%ROWTYPE;
    v_target_email TEXT;
BEGIN
    -- Explicit authorization check
    IF NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can revoke staff access.';
    END IF;

    SELECT * INTO v_membership
    FROM public.department_memberships
    WHERE id = p_membership_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership not found: %', p_membership_id;
    END IF;

    IF v_membership.status = 'revoked' THEN
        RAISE EXCEPTION 'Membership is already revoked.';
    END IF;

    -- Update membership status to revoked
    UPDATE public.department_memberships
    SET status = 'revoked',
        revoked_by = v_caller_id,
        revoked_at = now(),
        revocation_reason = p_reason,
        updated_at = now()
    WHERE id = p_membership_id;

    -- Fetch target email for audit
    SELECT email INTO v_target_email
    FROM public.profiles
    WHERE id = v_membership.user_id;

    -- Record in immutable audit log
    INSERT INTO public.access_audit_log (
        action,
        target_user_id,
        target_email,
        department_id,
        actor_id,
        details
    )
    VALUES (
        'access_revoked',
        v_membership.user_id,
        COALESCE(v_target_email, 'unknown@example.org'),
        v_membership.department_id,
        v_caller_id,
        jsonb_build_object('membership_id', p_membership_id, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'membership_id', p_membership_id,
        'status', 'revoked'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_staff_access(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_staff_access(UUID, TEXT) TO authenticated;

-- ==============================================================================
-- 3. CORE COMPLAINTS TABLE (Public Incident Data & Municipal Routing)
-- Note: Citizen title is NOT required; citizen form intentionally has no title.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT NULL, -- Optional; title is not required on citizen intake
    description TEXT NOT NULL, -- Roman Urdu grievance narrative (up to 200 words)
    detected_language TEXT NOT NULL DEFAULT 'roman_urdu',
    incident_district TEXT NOT NULL, -- e.g. 'District East', 'District South', etc.
    incident_locality TEXT NOT NULL, -- e.g. 'Gulshan-e-Iqbal', 'Clifton', etc.
    incident_public_location TEXT NOT NULL, -- Street, Block, or Nearby Landmark
    status TEXT NOT NULL CHECK (status IN (
        'submitted',
        'under_review',
        'assigned',
        'in_progress',
        'resolved',
        'rejected'
    )) DEFAULT 'submitted',
    assigned_department_id TEXT NOT NULL REFERENCES public.departments(id),
    predicted_department_id TEXT REFERENCES public.departments(id),
    prediction_confidence NUMERIC(4,3) CHECK (prediction_confidence >= 0 AND prediction_confidence <= 1),
    is_reviewed_by_admin BOOLEAN NOT NULL DEFAULT false,
    is_demonstration BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance and query isolation
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON public.complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_dept ON public.complaints(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_reference ON public.complaints(reference_number);

-- ==============================================================================
-- 4. PRIVATE CITIZEN DETAILS TABLE (PHYSICAL PII ISOLATION)
-- Mandatory Citizen PII: Name, Phone, Email, Residential Address
-- Strictly isolated: Department staff have ZERO access via any query or view.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.complaint_citizen_private (
    complaint_id UUID PRIMARY KEY REFERENCES public.complaints(id) ON DELETE CASCADE,
    citizen_name TEXT NOT NULL,
    citizen_phone TEXT NOT NULL,
    citizen_email TEXT,
    residential_address TEXT NOT NULL, -- Mandatory Home Address
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_private_complaint ON public.complaint_citizen_private(complaint_id);

-- ==============================================================================
-- 5. COMPLAINT TIMELINE EVENTS TABLE (IMMUTABLE AUDIT TRAIL)
-- Tracks the complete workflow history: submitted -> under_review -> assigned -> in_progress -> resolved/rejected
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.complaint_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN (
        'submitted',
        'under_review',
        'assigned',
        'in_progress',
        'resolved',
        'rejected'
    )),
    title TEXT NOT NULL,
    title_urdu TEXT NOT NULL,
    description TEXT NOT NULL,
    description_urdu TEXT NOT NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('system', 'citizen', 'department_staff', 'main_admin')),
    actor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_complaint ON public.complaint_timeline_events(complaint_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON public.complaint_timeline_events(created_at ASC);

-- ==============================================================================
-- 6. SERVER-ENFORCED AUTHENTICATION RATE LIMITING TABLE
-- Progressive server-side backoff delay; eliminates reliance on browser timers
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL UNIQUE, -- Normalized email or client IP
    failed_attempts INT NOT NULL DEFAULT 0,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_ident ON public.auth_rate_limits(identifier);

-- ==============================================================================
-- 7. DEPARTMENT-FACING SAFE VIEW (SECURITY BARRIER)
-- Ensures department queries only select public incident data, never private PII
-- ==============================================================================
CREATE OR REPLACE VIEW public.department_complaints_view
WITH (security_barrier = true) AS
SELECT
    id,
    reference_number,
    incident_district,
    incident_locality,
    incident_public_location,
    title,
    description,
    detected_language,
    status,
    assigned_department_id,
    predicted_department_id,
    prediction_confidence,
    is_reviewed_by_admin,
    is_demonstration,
    created_at,
    updated_at
FROM public.complaints;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES — CRUD ENFORCEMENT
-- ==============================================================================

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_citizen_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. TABLE: public.complaints
-- ------------------------------------------------------------------------------

-- SELECT:
-- 1. Citizens: Strictly authenticated ownership (citizen_id = auth.uid())
-- Note: Reference-header-based bypass is completely removed.
CREATE POLICY "Citizens can select own complaints"
    ON public.complaints FOR SELECT
    TO authenticated
    USING (citizen_id = auth.uid());

-- 2. Department Staff: Only complaints assigned to active department
CREATE POLICY "Department staff can select assigned complaints"
    ON public.complaints FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = auth.uid()
              AND m.department_id = complaints.assigned_department_id
              AND m.status = 'active'
        )
    );

-- 3. Main Admin: Can view all complaints city-wide
CREATE POLICY "Main admins can select all complaints"
    ON public.complaints FOR SELECT
    TO authenticated
    USING (public.is_main_admin(auth.uid()));

-- INSERT:
-- 1. Citizens: Insert complaint linked to own authenticated account
CREATE POLICY "Citizens can insert own complaints"
    ON public.complaints FOR INSERT
    TO authenticated
    WITH CHECK (
        citizen_id = auth.uid()
        AND status = 'submitted'
    );

-- 2. Main Admin: Can insert complaints (e.g. system import/triage)
CREATE POLICY "Main admins can insert complaints"
    ON public.complaints FOR INSERT
    TO authenticated
    WITH CHECK (public.is_main_admin(auth.uid()));

-- 3. Department Staff: Direct INSERT is DENIED (no policy, default deny)

-- UPDATE:
-- Direct UPDATE is DENIED for Citizens and Department Staff.
-- Department staff must use the staff_update_complaint_status RPC to enforce state transition rules.
CREATE POLICY "Main admins can update complaints"
    ON public.complaints FOR UPDATE
    TO authenticated
    USING (public.is_main_admin(auth.uid()))
    WITH CHECK (public.is_main_admin(auth.uid()));

-- DELETE:
-- Only Main Admins can delete complaints (Citizens and Staff are DENIED)
CREATE POLICY "Main admins can delete complaints"
    ON public.complaints FOR DELETE
    TO authenticated
    USING (public.is_main_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- B. TABLE: public.complaint_citizen_private (ZERO STAFF ACCESS)
-- ------------------------------------------------------------------------------

-- SELECT:
-- 1. Citizens can read own private contact info
CREATE POLICY "Citizens can select own private details"
    ON public.complaint_citizen_private FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_citizen_private.complaint_id
              AND c.citizen_id = auth.uid()
        )
    );

-- 2. Main Admins can read citizen private details (audited access)
CREATE POLICY "Main admins can select citizen private details"
    ON public.complaint_citizen_private FOR SELECT
    TO authenticated
    USING (public.is_main_admin(auth.uid()));

-- 3. Department Staff: ZERO SELECT PERMISSION. Evaluates to FALSE.
-- Even with raw PostgREST requests, staff receive 0 rows.

-- INSERT:
-- Citizens can insert their private details for their newly filed complaint
CREATE POLICY "Citizens can insert own private details"
    ON public.complaint_citizen_private FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_citizen_private.complaint_id
              AND c.citizen_id = auth.uid()
        )
    );

CREATE POLICY "Main admins can insert private details"
    ON public.complaint_citizen_private FOR INSERT
    TO authenticated
    WITH CHECK (public.is_main_admin(auth.uid()));

-- UPDATE:
-- Citizens can update their own contact details
CREATE POLICY "Citizens can update own private details"
    ON public.complaint_citizen_private FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_citizen_private.complaint_id
              AND c.citizen_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_citizen_private.complaint_id
              AND c.citizen_id = auth.uid()
        )
    );

CREATE POLICY "Main admins can update citizen private details"
    ON public.complaint_citizen_private FOR UPDATE
    TO authenticated
    USING (public.is_main_admin(auth.uid()))
    WITH CHECK (public.is_main_admin(auth.uid()));

-- DELETE:
-- Only Main Admin can delete private details
CREATE POLICY "Main admins can delete citizen private details"
    ON public.complaint_citizen_private FOR DELETE
    TO authenticated
    USING (public.is_main_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- C. TABLE: public.complaint_timeline_events (IMMUTABLE AUDIT TRAIL)
-- ------------------------------------------------------------------------------

-- SELECT:
-- 1. Citizens can view timeline of own complaints
CREATE POLICY "Citizens can select own complaint timeline"
    ON public.complaint_timeline_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_timeline_events.complaint_id
              AND c.citizen_id = auth.uid()
        )
    );

-- 2. Staff can view timeline of assigned department complaints
CREATE POLICY "Staff can select assigned complaint timeline"
    ON public.complaint_timeline_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            JOIN public.department_memberships m ON m.department_id = c.assigned_department_id
            WHERE c.id = complaint_timeline_events.complaint_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
        )
    );

-- 3. Main Admin can view all timeline events
CREATE POLICY "Main admins can select all timeline events"
    ON public.complaint_timeline_events FOR SELECT
    TO authenticated
    USING (public.is_main_admin(auth.uid()));

-- INSERT:
-- Authorized actors can record timeline events for complaints they have active authority over
CREATE POLICY "Authorized actors can insert timeline events"
    ON public.complaint_timeline_events FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND (
            public.is_main_admin(auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.complaints c
                JOIN public.department_memberships m ON m.department_id = c.assigned_department_id
                WHERE c.id = complaint_timeline_events.complaint_id
                  AND m.user_id = auth.uid()
                  AND m.status = 'active'
            )
            OR EXISTS (
                SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_timeline_events.complaint_id
                  AND c.citizen_id = auth.uid()
            )
        )
    );

-- IMMUTABILITY: ZERO UPDATE or DELETE policies. Timeline records cannot be edited or removed.

-- ------------------------------------------------------------------------------
-- D. TABLE: public.auth_rate_limits
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins can view rate limits"
    ON public.auth_rate_limits FOR SELECT
    TO authenticated
    USING (public.is_main_admin(auth.uid()));

-- ==============================================================================
-- 9. PRIVILEGED SERVER-SIDE STORED PROCEDURES (SECURITY DEFINER)
-- Safe search_path, explicit auth verification, restricted EXECUTE privileges
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- RPC 1: Department Staff Status Workflow Transition
-- Enforces valid state machine transitions:
--   submitted -> under_review, assigned, rejected
--   under_review -> assigned, in_progress, rejected
--   assigned -> in_progress, rejected
--   in_progress -> resolved, rejected
-- ------------------------------------------------------------------------------
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

        -- Validate complaint status transition workflow
        IF v_complaint.status = 'submitted' AND p_new_status NOT IN ('under_review', 'assigned', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'under_review' AND p_new_status NOT IN ('assigned', 'in_progress', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'assigned' AND p_new_status NOT IN ('in_progress', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status = 'in_progress' AND p_new_status NOT IN ('resolved', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition: % -> %', v_complaint.status, p_new_status;
        ELSIF v_complaint.status IN ('resolved', 'rejected') THEN
            RAISE EXCEPTION 'Cannot update complaint in terminal status: %', v_complaint.status;
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
GRANT EXECUTE ON FUNCTION public.staff_update_complaint_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 2: Admin Provision Department Staff
-- Server-side trusted provisioning: Admin links pre-created/invited auth account
-- to authorized department with active membership and audit entry.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_provision_department_staff(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_department_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_dept_exists BOOLEAN;
BEGIN
    -- Explicit administrator check
    IF NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can provision department staff.';
    END IF;

    -- Verify department
    SELECT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND is_active = true
    ) INTO v_dept_exists;

    IF NOT v_dept_exists THEN
        RAISE EXCEPTION 'Department does not exist or is inactive: %', p_department_id;
    END IF;

    -- Upsert profile with department_staff role
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_full_name,
        p_email,
        'department_staff',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = 'department_staff',
        updated_at = now();

    -- Upsert active department membership
    INSERT INTO public.department_memberships (
        user_id,
        department_id,
        status,
        approved_by,
        approved_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_department_id,
        'active',
        v_caller_id,
        now(),
        now()
    )
    ON CONFLICT (user_id, department_id) DO UPDATE SET
        status = 'active',
        approved_by = v_caller_id,
        approved_at = now(),
        revoked_by = NULL,
        revoked_at = NULL,
        revocation_reason = NULL,
        updated_at = now();

    -- Record in audit log
    INSERT INTO public.access_audit_log (
        action,
        target_user_id,
        target_email,
        department_id,
        actor_id,
        details
    )
    VALUES (
        'admin_provisioned',
        p_user_id,
        p_email,
        p_department_id,
        v_caller_id,
        jsonb_build_object('provisioned_by', v_caller_id, 'department', p_department_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'department_id', p_department_id,
        'status', 'active'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_department_staff(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_provision_department_staff(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 3: Admin Reassign Complaint Routing
-- Corrects misclassified department routing with reason and audit trail
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reassign_complaint(
    p_complaint_id UUID,
    p_new_department_id TEXT,
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
    v_old_department_id TEXT;
BEGIN
    IF NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can reassign complaints.';
    END IF;

    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = p_complaint_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found: %', p_complaint_id;
    END IF;

    v_old_department_id := v_complaint.assigned_department_id;

    -- Update complaint department assignment
    UPDATE public.complaints
    SET assigned_department_id = p_new_department_id,
        is_reviewed_by_admin = true,
        updated_at = now()
    WHERE id = p_complaint_id;

    -- Record in timeline
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
        v_complaint.status,
        'Department Reassigned by Administrator',
        'ایڈمنسٹریٹر کی جانب سے محکمہ تبدیل کیا گیا',
        'Case rerouted from ' || v_old_department_id || ' to ' || p_new_department_id || '. Reason: ' || p_reason,
        'شکایت دوسرے محکمے کو منتقل کر دی گئی۔ وجہ: ' || p_reason,
        'main_admin',
        v_caller_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', p_complaint_id,
        'old_department', v_old_department_id,
        'new_department', p_new_department_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reassign_complaint(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 4: Server-Enforced Progressive Authentication Rate Limiter
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_record public.auth_rate_limits%ROWTYPE;
    v_now TIMESTAMPTZ := now();
    v_delay_seconds INT := 0;
BEGIN
    SELECT * INTO v_record
    FROM public.auth_rate_limits
    WHERE identifier = p_identifier;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', true, 'delay_seconds', 0);
    END IF;

    -- If currently locked under penalty
    IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after_seconds', EXTRACT(EPOCH FROM (v_record.locked_until - v_now))::INT,
            'error', 'Too many failed login attempts. Please wait before retrying.'
        );
    END IF;

    -- Progressive backoff calculation based on failed attempts:
    -- 0-3: 0s, 4-5: 2s, 6-9: 5s, 10+: 15-minute lock
    IF v_record.failed_attempts >= 10 THEN
        UPDATE public.auth_rate_limits
        SET locked_until = v_now + INTERVAL '15 minutes'
        WHERE identifier = p_identifier;

        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after_seconds', 900,
            'error', 'Account locked for 15 minutes due to repeated authentication failures.'
        );
    ELSIF v_record.failed_attempts >= 6 THEN
        v_delay_seconds := 5;
    ELSIF v_record.failed_attempts >= 4 THEN
        v_delay_seconds := 2;
    END IF;

    RETURN jsonb_build_object('allowed', true, 'delay_seconds', v_delay_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.check_auth_rate_limit(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_auth_attempt(p_identifier TEXT, p_is_success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
BEGIN
    IF p_is_success THEN
        -- Clear failed attempts on successful login
        DELETE FROM public.auth_rate_limits
        WHERE identifier = p_identifier;
    ELSE
        -- Increment failed count or insert
        INSERT INTO public.auth_rate_limits (
            identifier,
            failed_attempts,
            first_attempt_at,
            last_attempt_at
        )
        VALUES (
            p_identifier,
            1,
            v_now,
            v_now
        )
        ON CONFLICT (identifier) DO UPDATE SET
            failed_attempts = public.auth_rate_limits.failed_attempts + 1,
            last_attempt_at = v_now;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_auth_attempt(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_auth_attempt(TEXT, BOOLEAN) TO anon, authenticated;

