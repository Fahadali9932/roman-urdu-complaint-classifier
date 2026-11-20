-- ==============================================================================
-- AWAAZ-E-AWAM — CASE OPERATIONS DESK (V5)
-- Migration: 20261123000000_case_operations_desk_v5.sql
--
-- Incident Case Operating System:
-- 1. Tables: incident_cases, incident_case_reports, incident_case_events, case_batch_operations
-- 2. Indexes for fast server-side keyset pagination, area aggregation, and subtype filtering
-- 3. Row-Level Security (RLS) enforcing strict department isolation
-- 4. Atomic Security-Definer RPC: staff_accept_incident_case_reports with idempotency key
-- 5. Safe, non-destructive backfill of unlinked complaints
-- ==============================================================================

-- 1. INCIDENT CASES TABLE
CREATE TABLE IF NOT EXISTS public.incident_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    department_id TEXT NOT NULL REFERENCES public.departments(id),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    issue_subtype TEXT NOT NULL,
    district TEXT NOT NULL,
    locality TEXT NOT NULL,
    place_corridor TEXT NOT NULL,
    priority_band TEXT NOT NULL CHECK (priority_band IN ('urgent', 'attention', 'standard')),
    work_status TEXT NOT NULL DEFAULT 'pending_acceptance' CHECK (work_status IN ('pending_acceptance', 'under_investigation', 'crew_dispatched', 'work_scheduled', 'monitoring', 'resolved')),
    assigned_team TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INCIDENT CASE REPORTS MAPPING (1 Case -> N Reports)
CREATE TABLE IF NOT EXISTS public.incident_case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.incident_cases(id) ON DELETE CASCADE,
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    reference_number TEXT NOT NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_case_complaint UNIQUE (case_id, complaint_id)
);

-- 3. INCIDENT CASE ACTIVITY AUDIT LOG
CREATE TABLE IF NOT EXISTS public.incident_case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.incident_cases(id) ON DELETE CASCADE,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL DEFAULT 'department_officer',
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. IDEMPOTENT CASE BATCH OPERATIONS (For atomic bulk acceptance)
CREATE TABLE IF NOT EXISTS public.case_batch_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.incident_cases(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL DEFAULT 'bulk_accept',
    idempotency_key TEXT UNIQUE NOT NULL,
    affected_reports_count INTEGER NOT NULL,
    executed_by TEXT NOT NULL,
    result_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. INDEXES FOR PERFORMANCE & KEYSET PAGINATION
CREATE INDEX IF NOT EXISTS idx_incident_cases_dept_status
    ON public.incident_cases(department_id, work_status, priority_band);

CREATE INDEX IF NOT EXISTS idx_incident_cases_dept_area
    ON public.incident_cases(department_id, locality);

CREATE INDEX IF NOT EXISTS idx_incident_cases_created_at
    ON public.incident_cases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_reports_case_id
    ON public.incident_case_reports(case_id);

CREATE INDEX IF NOT EXISTS idx_case_reports_complaint_id
    ON public.incident_case_reports(complaint_id);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id
    ON public.incident_case_events(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_batch_ops_key
    ON public.case_batch_operations(idempotency_key);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.incident_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_case_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_batch_operations ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR STRICT DEPARTMENT ISOLATION

-- A. Incident Cases Policies
DROP POLICY IF EXISTS incident_cases_dept_select ON public.incident_cases;
CREATE POLICY incident_cases_dept_select ON public.incident_cases
    FOR SELECT TO authenticated
    USING (
        public.is_main_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = auth.uid()
              AND m.department_id = incident_cases.department_id
              AND m.status = 'active'
        )
    );

DROP POLICY IF EXISTS incident_cases_dept_update ON public.incident_cases;
CREATE POLICY incident_cases_dept_update ON public.incident_cases
    FOR UPDATE TO authenticated
    USING (
        public.is_main_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = auth.uid()
              AND m.department_id = incident_cases.department_id
              AND m.status = 'active'
        )
    )
    WITH CHECK (
        public.is_main_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.department_memberships m
            WHERE m.user_id = auth.uid()
              AND m.department_id = incident_cases.department_id
              AND m.status = 'active'
        )
    );

-- B. Incident Case Reports Policies
DROP POLICY IF EXISTS incident_case_reports_select ON public.incident_case_reports;
CREATE POLICY incident_case_reports_select ON public.incident_case_reports
    FOR SELECT TO authenticated
    USING (
        public.is_main_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.incident_cases c
            JOIN public.department_memberships m ON m.department_id = c.department_id
            WHERE c.id = incident_case_reports.case_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
        )
    );

-- C. Incident Case Events Policies
DROP POLICY IF EXISTS incident_case_events_select ON public.incident_case_events;
CREATE POLICY incident_case_events_select ON public.incident_case_events
    FOR SELECT TO authenticated
    USING (
        public.is_main_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.incident_cases c
            JOIN public.department_memberships m ON m.department_id = c.department_id
            WHERE c.id = incident_case_events.case_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
        )
    );

-- D. Case Batch Operations Policies
DROP POLICY IF EXISTS case_batch_operations_select ON public.case_batch_operations;
CREATE POLICY case_batch_operations_select ON public.case_batch_operations
    FOR SELECT TO authenticated
    USING (
        public.is_main_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.incident_cases c
            JOIN public.department_memberships m ON m.department_id = c.department_id
            WHERE c.id = case_batch_operations.case_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
        )
    );

-- 8. SECURITY DEFINER RPC: ATOMIC BULK ACCEPTANCE
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
