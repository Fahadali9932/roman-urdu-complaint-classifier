-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 2: SECURE DEPARTMENT REGISTRATION, APPROVAL & REVOCATION
-- Database Migration: 20261113000000_staff_access_management.sql
-- Architecture: Supabase PostgreSQL + Auth + Row Level Security (RLS)
-- University: Greenwich University, Karachi, Pakistan
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DEPARTMENTS TABLE
-- Configured municipal authorities of Karachi
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_urdu TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial Karachi municipal departments
INSERT INTO public.departments (id, name, name_urdu, code, is_active)
VALUES
    ('kwsc', 'Karachi Water & Sewerage Corporation (KW&SC)', 'کراچی واٹر اینڈ سیوریج کارپوریشن', 'KWSC', true),
    ('kelectric', 'K-Electric (Infrastructure & Distribution)', 'کے الیکٹرک (انفراسٹرکچر و تقسیم)', 'KE', true),
    ('sswmb', 'Sindh Solid Waste Management Board (SSWMB)', 'سندھ سالڈ ویسٹ مینجمنٹ بورڈ', 'SSWMB', true),
    ('ssgc', 'Sui Southern Gas Company (SSGC)', 'سوئی سدرن گیس کمپنی', 'SSGC', true),
    ('kmc', 'Karachi Metropolitan Corporation (KMC / DMCs)', 'کراچی میٹروپولیٹن کارپوریشن', 'KMC', true),
    ('sbca', 'Sindh Building Control Authority (SBCA)', 'سندھ بلڈنگ کنٹرول اتھارٹی', 'SBCA', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_urdu = EXCLUDED.name_urdu,
    code = EXCLUDED.code;

-- 3. PROFILES TABLE
-- Extends auth.users with civic platform role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('main_admin', 'department_staff', 'citizen')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. DEPARTMENT ACCESS REQUESTS TABLE
-- Records access applications submitted by departmental staff
CREATE TABLE IF NOT EXISTS public.department_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES public.departments(id),
    full_name TEXT NOT NULL,
    work_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')) DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance and quick filtering
CREATE INDEX IF NOT EXISTS idx_dept_requests_user ON public.department_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_dept ON public.department_access_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_status ON public.department_access_requests(status);

-- 5. DEPARTMENT MEMBERSHIPS TABLE
-- Authoritative membership records for approved departmental staff
CREATE TABLE IF NOT EXISTS public.department_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES public.departments(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'revoked')) DEFAULT 'active',
    approved_by UUID NOT NULL REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_dept_membership UNIQUE (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_memberships_user ON public.department_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_memberships_dept ON public.department_memberships(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_memberships_status ON public.department_memberships(status);

-- 6. ACCESS AUDIT LOG TABLE
-- Immutable security audit log for all staff access mutations
CREATE TABLE IF NOT EXISTS public.access_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL CHECK (action IN (
        'request_submitted',
        'request_approved',
        'request_rejected',
        'access_revoked',
        'admin_provisioned'
    )),
    target_user_id UUID NOT NULL,
    target_email TEXT NOT NULL,
    department_id TEXT REFERENCES public.departments(id),
    actor_id UUID REFERENCES auth.users(id),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.access_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.access_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.access_audit_log(created_at DESC);

-- ==============================================================================
-- 7. SECURITY DEFINER FUNCTIONS & AUTHORIZATION ENFORCEMENT
-- ==============================================================================

-- Check if a user is an authorized Main Administrator
CREATE OR REPLACE FUNCTION public.is_main_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND role = 'main_admin'
    );
$$;

-- Read active department membership for a staff user (Used on every protected operation)
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

-- Privileged Action: Approve access request (Main Admin only)
CREATE OR REPLACE FUNCTION public.approve_access_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_request public.department_access_requests%ROWTYPE;
BEGIN
    -- Verify caller is Main Admin
    IF NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can approve access requests.';
    END IF;

    -- Fetch target request
    SELECT * INTO v_request
    FROM public.department_access_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found: %', p_request_id;
    END IF;

    IF v_request.status = 'approved' THEN
        RAISE EXCEPTION 'Request is already approved.';
    END IF;

    -- Update request status
    UPDATE public.department_access_requests
    SET status = 'approved',
        reviewed_by = v_caller_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Update profile role to department_staff
    UPDATE public.profiles
    SET role = 'department_staff',
        updated_at = now()
    WHERE id = v_request.user_id;

    -- Upsert department membership to active
    INSERT INTO public.department_memberships (
        user_id,
        department_id,
        status,
        approved_by,
        approved_at,
        updated_at
    )
    VALUES (
        v_request.user_id,
        v_request.department_id,
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
        'request_approved',
        v_request.user_id,
        v_request.work_email,
        v_request.department_id,
        v_caller_id,
        jsonb_build_object('request_id', p_request_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'approved'
    );
END;
$$;

-- Privileged Action: Reject access request (Main Admin only)
CREATE OR REPLACE FUNCTION public.reject_access_request(p_request_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_request public.department_access_requests%ROWTYPE;
BEGIN
    -- Verify caller is Main Admin
    IF NOT public.is_main_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only Main Administrators can reject access requests.';
    END IF;

    SELECT * INTO v_request
    FROM public.department_access_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found: %', p_request_id;
    END IF;

    UPDATE public.department_access_requests
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_by = v_caller_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

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
        'request_rejected',
        v_request.user_id,
        v_request.work_email,
        v_request.department_id,
        v_caller_id,
        jsonb_build_object('request_id', p_request_id, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'rejected'
    );
END;
$$;

-- Privileged Action: Immediately revoke department access (Main Admin only)
CREATE OR REPLACE FUNCTION public.revoke_staff_access(p_membership_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_membership public.department_memberships%ROWTYPE;
    v_target_email TEXT;
BEGIN
    -- Verify caller is Main Admin
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

    -- Set membership to revoked
    UPDATE public.department_memberships
    SET status = 'revoked',
        revoked_by = v_caller_id,
        revoked_at = now(),
        revocation_reason = p_reason,
        updated_at = now()
    WHERE id = p_membership_id;

    -- Mark corresponding access request as revoked
    UPDATE public.department_access_requests
    SET status = 'revoked',
        updated_at = now()
    WHERE user_id = v_membership.user_id
      AND department_id = v_membership.department_id;

    -- Fetch target email for audit
    SELECT email INTO v_target_email
    FROM public.profiles
    WHERE id = v_membership.user_id;

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

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all exposed tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

-- DEPARTMENTS POLICIES
CREATE POLICY "Public and staff can view active departments"
    ON public.departments FOR SELECT
    USING (is_active = true OR public.is_main_admin(auth.uid()));

CREATE POLICY "Main admins can manage departments"
    ON public.departments FOR ALL
    USING (public.is_main_admin(auth.uid()));

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR public.is_main_admin(auth.uid()));

CREATE POLICY "Users can update own non-role profile fields"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Ensure role cannot be elevated by the user
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Main admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_main_admin(auth.uid()));

-- DEPARTMENT ACCESS REQUESTS POLICIES
CREATE POLICY "Applicants can read own access requests"
    ON public.department_access_requests FOR SELECT
    USING (user_id = auth.uid() OR public.is_main_admin(auth.uid()));

CREATE POLICY "Applicants can submit their own access request"
    ON public.department_access_requests FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'pending'
    );

CREATE POLICY "Main admins can view and manage all access requests"
    ON public.department_access_requests FOR ALL
    USING (public.is_main_admin(auth.uid()));

-- DEPARTMENT MEMBERSHIPS POLICIES
CREATE POLICY "Staff can read own active membership"
    ON public.department_memberships FOR SELECT
    USING (user_id = auth.uid() OR public.is_main_admin(auth.uid()));

CREATE POLICY "Main admins can view and manage all memberships"
    ON public.department_memberships FOR ALL
    USING (public.is_main_admin(auth.uid()));

-- ACCESS AUDIT LOG POLICIES
CREATE POLICY "Only main admins can view audit logs"
    ON public.access_audit_log FOR SELECT
    USING (public.is_main_admin(auth.uid()));
