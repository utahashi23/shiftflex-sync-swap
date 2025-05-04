
-- Add email column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with emails from auth.users
-- This will be executed as a migration script with appropriate permissions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, email FROM auth.users
  LOOP
    UPDATE public.profiles 
    SET email = r.email 
    WHERE id = r.id AND email IS NULL;
  END LOOP;
END
$$;
