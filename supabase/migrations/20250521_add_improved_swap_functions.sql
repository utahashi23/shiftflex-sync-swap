
-- Create function to safely get improved swap wanted dates
CREATE OR REPLACE FUNCTION public.get_improved_swap_wanted_dates(p_swap_id uuid)
RETURNS TABLE (
  id uuid,
  swap_id uuid,
  date date,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Return wanted dates for a specific swap request
  RETURN QUERY 
  SELECT 
    wanted.id, 
    wanted.swap_id, 
    wanted.date,
    wanted.created_at
  FROM 
    public.improved_swap_wanted_dates wanted
  WHERE 
    wanted.swap_id = p_swap_id;
END;
$$;

-- Create function to safely add improved swap wanted dates
CREATE OR REPLACE FUNCTION public.add_improved_swap_wanted_date(p_swap_id uuid, p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Insert the new wanted date
  INSERT INTO public.improved_swap_wanted_dates (
    swap_id,
    date
  ) VALUES (
    p_swap_id,
    p_date
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Create function to delete improved swap wanted dates
CREATE OR REPLACE FUNCTION public.delete_improved_swap_wanted_dates(p_swap_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.improved_swap_wanted_dates
  WHERE swap_id = p_swap_id;
  
  RETURN true;
END;
$$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.improved_swap_wanted_dates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  swap_id uuid NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY(id)
);

-- Add table comment
COMMENT ON TABLE public.improved_swap_wanted_dates IS 'Stores additional wanted dates for shift swap requests';

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'improved_swap_wanted_dates_swap_id_fkey'
  ) THEN
    ALTER TABLE public.improved_swap_wanted_dates
    ADD CONSTRAINT improved_swap_wanted_dates_swap_id_fkey
    FOREIGN KEY (swap_id) REFERENCES improved_shift_swaps(id) ON DELETE CASCADE;
  END IF;
END
$$;
