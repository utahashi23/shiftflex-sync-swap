
-- Add RLS policies for user_swap_preferences table if they don't exist yet
DO $$
BEGIN
    -- Enable RLS on the user_swap_preferences table
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_tables 
        WHERE tablename = 'user_swap_preferences' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE IF EXISTS public.user_swap_preferences ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Create policy for viewing regions (if it doesn't exist)
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies 
        WHERE tablename = 'regions'
    ) THEN
        ALTER TABLE IF EXISTS public.regions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all users to view regions" 
        ON public.regions FOR SELECT 
        USING (true);
    END IF;

    -- Create policy for viewing areas (if it doesn't exist)
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies 
        WHERE tablename = 'areas'
    ) THEN
        ALTER TABLE IF EXISTS public.areas ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all users to view areas" 
        ON public.areas FOR SELECT 
        USING (true);
    END IF;
END
$$;
