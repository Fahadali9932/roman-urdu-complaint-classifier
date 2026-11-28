-- V23.0C: safe staging reconciliation; no existing workflow functions replaced.
CREATE OR REPLACE VIEW public.v23_operational_cases_view
WITH (security_invoker = true) AS
SELECT w.id AS case_id, w.department_id, w.case_label AS case_number,
  w.instructions, w.officer_id, w.status AS work_status, w.due_at,
  w.started_at, w.effective_deadline_at, w.gps_verified,
  w.anchor_complaint_id, c.reference_number, c.incident_district,
  c.incident_locality, c.status AS complaint_status,
  w.assigned_at AS created_at, w.updated_at
FROM public.department_work_orders w
JOIN public.complaints c ON c.id = w.anchor_complaint_id;
COMMENT ON COLUMN public.v23_operational_cases_view.created_at IS
  'Compatibility alias for work order assigned_at; no separate creation timestamp exists.';
REVOKE ALL ON public.v23_operational_cases_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v23_operational_cases_view TO authenticated, service_role;
-- Preserve accepted, which existing V16 dispatch transitions require.
ALTER TABLE public.complaints
  DROP CONSTRAINT complaints_status_check,
  ADD CONSTRAINT complaints_status_check CHECK (status IN
    ('submitted','under_review','assigned','accepted','in_progress','partly_resolved','resolved','rejected'));
-- Do not activate partial resolution aggregation until existing linked-report,
-- timeline, and verification RPCs have been reconciled and tested.
