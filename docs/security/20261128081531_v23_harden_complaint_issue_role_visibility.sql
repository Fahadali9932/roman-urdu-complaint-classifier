-- Staging migration 20261128081531: v23_harden_complaint_issue_role_visibility
-- Applied and verified on staging only; review before production rollout.
-- Match complaint issue visibility to the parent complaint RLS and department scope.
ALTER POLICY staff_select_assigned_issues ON public.complaint_issues
TO authenticated
USING (
  public.is_main_admin((SELECT auth.uid()))
  OR (
    (SELECT auth.jwt()->>'aal') = 'aal2'
    AND EXISTS (
      SELECT 1 FROM public.department_memberships m
      JOIN public.departments d ON d.id=m.department_id
      WHERE m.user_id=(SELECT auth.uid())
        AND m.department_id=complaint_issues.department_id
        AND m.status='active' AND d.is_active
    )
    AND EXISTS (
      SELECT 1 FROM public.complaints c WHERE c.id=complaint_issues.complaint_id
    )
  )
);
ALTER POLICY staff_update_assigned_issues ON public.complaint_issues
TO authenticated
USING (
  public.is_main_admin((SELECT auth.uid()))
  OR (
    (SELECT auth.jwt()->>'aal')='aal2'
    AND EXISTS (
      SELECT 1 FROM public.department_memberships m
      JOIN public.departments d ON d.id=m.department_id
      WHERE m.user_id=(SELECT auth.uid())
        AND m.department_id=complaint_issues.department_id
        AND m.status='active' AND d.is_active
    )
    AND EXISTS (SELECT 1 FROM public.complaints c WHERE c.id=complaint_issues.complaint_id)
  )
)
WITH CHECK (
  public.is_main_admin((SELECT auth.uid()))
  OR (
    (SELECT auth.jwt()->>'aal')='aal2'
    AND EXISTS (
      SELECT 1 FROM public.department_memberships m
      JOIN public.departments d ON d.id=m.department_id
      WHERE m.user_id=(SELECT auth.uid())
        AND m.department_id=complaint_issues.department_id
        AND m.status='active' AND d.is_active
    )
    AND EXISTS (SELECT 1 FROM public.complaints c WHERE c.id=complaint_issues.complaint_id)
  )
);
-- Verification: synthetic transaction tested seven role contexts; 21 visibility assertions passed.
-- Fixture rolled back; no memberships or complaints persisted.
-- Staff login resolver email exposure and real browser/MFA QA remain separate launch gates.
