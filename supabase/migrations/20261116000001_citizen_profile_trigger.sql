CREATE OR REPLACE FUNCTION public.handle_new_citizen_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data ->> 'full_name', 'Citizen'), NEW.email, 'citizen')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_citizen_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_citizen_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_citizen_profile();
REVOKE ALL ON FUNCTION public.handle_new_citizen_profile() FROM PUBLIC;
