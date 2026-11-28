-- Safe additive subset of pending V19/V23 migrations; staging first.
-- No workflow RPCs, no status constraint replacement, no changes to existing storage limits.
-- ==============================================================================
-- V19.1: UNIFIED HOD & OFFICER PORTALS — COMMENCEMENT DEADLINES,
--        AIRTIGHT AUTHORIZATION, STRICT GPS VERIFICATION & SECURITY
-- Additive, idempotent, lock-safe PostgreSQL migration built against V16 schema.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. WORK ORDERS EXTENSION: COMMENCEMENT DEADLINES, ACCURACY & SCREENING
-- ------------------------------------------------------------------------------
ALTER TABLE public.department_work_orders
  ADD COLUMN IF NOT EXISTS assigned_duration_hours integer NOT NULL DEFAULT 72
    CHECK (assigned_duration_hours > 0 AND assigned_duration_hours <= 720),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS effective_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS gps_latitude numeric(10, 7)
    CHECK (gps_latitude IS NULL OR (gps_latitude >= -90.0 AND gps_latitude <= 90.0)),
  ADD COLUMN IF NOT EXISTS gps_longitude numeric(10, 7)
    CHECK (gps_longitude IS NULL OR (gps_longitude >= -180.0 AND gps_longitude <= 180.0)),
  ADD COLUMN IF NOT EXISTS gps_accuracy_m numeric(6, 2)
    CHECK (gps_accuracy_m IS NULL OR gps_accuracy_m >= 0.0),
  ADD COLUMN IF NOT EXISTS gps_distance_m numeric(8, 2),
  ADD COLUMN IF NOT EXISTS gps_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_exception_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS evidence_integrity_status text NOT NULL DEFAULT 'pending_screening'
    CHECK (evidence_integrity_status IN ('pending_screening', 'screening_passed', 'suspicious', 'confirmed_synthetic', 'manual_review_required', 'screening_unavailable')),
  ADD COLUMN IF NOT EXISTS evidence_screening_notes text;

-- Deadlines Safety Backfill:
-- ONLY orders already started (in_progress, pending_review, verified) backfill effective_deadline_at.
-- Orders that are unstarted (started_at IS NULL) MUST retain NULL until commencement!
UPDATE public.department_work_orders
SET effective_deadline_at = COALESCE(started_at + (assigned_duration_hours || ' hours')::interval, due_at)
WHERE started_at IS NOT NULL AND effective_deadline_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. IMMUTABLE WORK ORDER DEADLINE EXTENSION HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_deadline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  previous_deadline timestamptz NOT NULL,
  extended_deadline timestamptz NOT NULL,
  additional_hours integer NOT NULL CHECK (additional_hours > 0),
  reason text NOT NULL,
  authorized_by uuid NOT NULL REFERENCES auth.users(id),
  authorized_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deadline_history_order
  ON public.work_order_deadline_history(order_id, authorized_at);

-- ------------------------------------------------------------------------------
-- 3. STAFF NOTIFICATIONS & COMMUNICATIONS LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general'
    CHECK (notification_type IN ('general', 'assignment', 'warning', 'deadline', 'verification', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_dept
  ON public.staff_notifications(user_id, department_id, is_read, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. FORMAL OFFICER SUPERVISORY NOTICES / WARNINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'formal'
    CHECK (severity IN ('advisory', 'formal', 'final')),
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_warnings_officer_dept
  ON public.officer_warnings(officer_id, department_id, issued_at DESC);

-- ------------------------------------------------------------------------------
-- 5. OFFICER ACTIVITY TRACKING & SESSION HEARTBEATS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_activity_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  session_started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  active_view text NOT NULL DEFAULT 'work',
  client_tab_id text,
  idle_seconds integer NOT NULL DEFAULT 0 CHECK (idle_seconds >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_officer_heartbeat_officer
  ON public.officer_activity_heartbeats(officer_id);

-- ------------------------------------------------------------------------------
-- 6. IMMUTABLE OFFICER RANKING EVENT LEDGER (IDEMPOTENT REWARDS & PENALTIES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_ranking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.department_work_orders(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('on_time_completion', 'overdue_submission', 'correction_penalty', 'citizen_dispute')),
  points_delta integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_officer_ranking_event_order UNIQUE (order_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_ranking_events_officer
  ON public.officer_ranking_events(officer_id, department_id, created_at);

-- ------------------------------------------------------------------------------
-- 7. SECURE OFFICER PROFILE DETAILS & SENSITIVE DATA PROTECTION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.officer_profile_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  employee_id text NOT NULL,
  official_email text,
  phone_masked text,
  cnic_masked text,
  cnic_hash text,
  profile_photo_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_officer_profile_user UNIQUE (user_id),
  CONSTRAINT uq_officer_profile_dept_emp UNIQUE (department_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_officer_profile_dept
  ON public.officer_profile_details(department_id);


ALTER TABLE public.work_order_deadline_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.work_order_deadline_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.work_order_deadline_history TO service_role;
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.staff_notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.staff_notifications TO service_role;
ALTER TABLE public.officer_warnings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.officer_warnings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.officer_warnings TO service_role;
ALTER TABLE public.officer_activity_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.officer_activity_heartbeats FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.officer_activity_heartbeats TO service_role;
ALTER TABLE public.officer_ranking_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.officer_ranking_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.officer_ranking_events TO service_role;
ALTER TABLE public.officer_profile_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.officer_profile_details FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.officer_profile_details TO service_role;
ALTER TABLE public.officer_profile_details
  ADD COLUMN IF NOT EXISTS contact_email text;

CREATE TABLE IF NOT EXISTS public.officer_onboarding_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  otp_hash text NOT NULL,
  salt text NOT NULL,
  attempts_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  resend_cooldown_until timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_otps_user ON public.officer_onboarding_otps(user_id);
ALTER TABLE public.officer_onboarding_otps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.officer_onboarding_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.officer_onboarding_otps TO service_role;


INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('staff-profile-photos-private','staff-profile-photos-private',false,2097152,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO NOTHING;
