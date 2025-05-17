
-- Create improved_swap_wanted_dates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.improved_swap_wanted_dates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  swap_id uuid NOT NULL REFERENCES improved_shift_swaps(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Create improved_swap_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.improved_swap_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  swap_id uuid NOT NULL REFERENCES improved_shift_swaps(id) ON DELETE CASCADE,
  region_id uuid REFERENCES regions(id),
  area_id uuid REFERENCES areas(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_improved_swap_wanted_dates_swap_id ON public.improved_swap_wanted_dates(swap_id);
CREATE INDEX IF NOT EXISTS idx_improved_swap_preferences_swap_id ON public.improved_swap_preferences(swap_id);

-- Add RLS policies
ALTER TABLE public.improved_swap_wanted_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improved_swap_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for improved_swap_wanted_dates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'improved_swap_wanted_dates_auth_select'
  ) THEN
    CREATE POLICY improved_swap_wanted_dates_auth_select
      ON public.improved_swap_wanted_dates
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.improved_shift_swaps s
          WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.matched_with_id IN (
            SELECT id FROM public.improved_shift_swaps 
            WHERE requester_id = auth.uid()
          ))
        )
        OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;
END
$$;

-- Create RLS policy for improved_swap_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'improved_swap_preferences_auth_select'
  ) THEN
    CREATE POLICY improved_swap_preferences_auth_select
      ON public.improved_swap_preferences
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.improved_shift_swaps s
          WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.matched_with_id IN (
            SELECT id FROM public.improved_shift_swaps 
            WHERE requester_id = auth.uid()
          ))
        )
        OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;
END
$$;
