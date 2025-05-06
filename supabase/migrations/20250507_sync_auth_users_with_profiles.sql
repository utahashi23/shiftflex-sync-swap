
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, employee_id, organization, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'employee_id',
    NEW.raw_user_meta_data->>'organization',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END
$$;

-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = NEW.raw_user_meta_data->>'first_name',
    last_name = NEW.raw_user_meta_data->>'last_name',
    employee_id = NEW.raw_user_meta_data->>'employee_id',
    organization = NEW.raw_user_meta_data->>'organization',
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create update trigger (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_updated'
  ) THEN
    CREATE TRIGGER on_auth_user_updated
      AFTER UPDATE ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();
  END IF;
END
$$;

-- Synchronize existing users that might not have profiles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = users.id)
  LOOP
    INSERT INTO public.profiles (
      id, 
      email, 
      first_name, 
      last_name, 
      employee_id, 
      organization
    )
    VALUES (
      r.id,
      r.email,
      r.raw_user_meta_data->>'first_name',
      r.raw_user_meta_data->>'last_name',
      r.raw_user_meta_data->>'employee_id',
      r.raw_user_meta_data->>'organization'
    );
  END LOOP;
END
$$;
