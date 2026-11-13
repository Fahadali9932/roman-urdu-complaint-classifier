-- Anonymous callers only need the active department directory. They must never
-- execute a SECURITY DEFINER function, even indirectly through an OR policy.
REVOKE ALL ON FUNCTION public.is_main_admin(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_active_staff_department(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_main_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_staff_department(UUID) TO authenticated;

DROP POLICY IF EXISTS "Public and staff can view active departments" ON public.departments;
DROP POLICY IF EXISTS "Main admins can manage departments" ON public.departments;

CREATE POLICY "Anyone can view active departments"
  ON public.departments FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Main admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.is_main_admin((SELECT auth.uid())))
  WITH CHECK (public.is_main_admin((SELECT auth.uid())));
