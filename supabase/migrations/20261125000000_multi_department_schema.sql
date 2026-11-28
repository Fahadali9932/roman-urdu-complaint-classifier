-- ==============================================================================
-- AWAAZ-E-AWAM (آوازِ عوام) — MULTI-DEPARTMENT SCHEMA MIGRATION
-- Migration: 20261125000000_multi_department_schema.sql
-- Status: Staged for Authorized Future Database Rollout (Non-destructive)
-- Purpose: Normalizes multi-department issue routing and adds fine-grained RLS
-- ==============================================================================

-- 1. Extend complaints table with multi-department support if not present
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS is_multilabel BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assigned_department_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_hazard BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hazard_details JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_dept_ids ON public.complaints USING GIN(assigned_department_ids);

-- 2. Complaint Issues Table
CREATE TABLE IF NOT EXISTS public.complaint_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES public.departments(id),
  issue_type TEXT NOT NULL,
  evidence_span TEXT,
  confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('under_review', 'assigned', 'accepted', 'in_progress', 'completed', 'rejected', 'duplicate')),
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_complaint_issues_complaint_id ON public.complaint_issues(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_issues_department_id ON public.complaint_issues(department_id);
CREATE INDEX IF NOT EXISTS idx_complaint_issues_status ON public.complaint_issues(status);

-- 3. Row-Level Security for complaint_issues
ALTER TABLE public.complaint_issues ENABLE ROW LEVEL SECURITY;

-- Policy 3.1: Staff can SELECT issues assigned to their department
CREATE POLICY staff_select_assigned_issues ON public.complaint_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = complaint_issues.department_id
        AND m.status = 'active'
    )
  );

-- Policy 3.2: Staff can UPDATE issues assigned to their department
CREATE POLICY staff_update_assigned_issues ON public.complaint_issues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = complaint_issues.department_id
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_memberships m
      WHERE m.user_id = auth.uid()
        AND m.department_id = complaint_issues.department_id
        AND m.status = 'active'
    )
  );

-- Policy 3.3: Citizen owner can view their complaint's issues
CREATE POLICY citizen_select_own_issues ON public.complaint_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_issues.complaint_id
        AND c.citizen_id = auth.uid()
    )
  );

-- 4. Audit trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_complaint_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_issues_updated_at ON public.complaint_issues;
CREATE TRIGGER trg_complaint_issues_updated_at
  BEFORE UPDATE ON public.complaint_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_complaint_issues_updated_at();

-- End of 20261125000000_multi_department_schema.sql
