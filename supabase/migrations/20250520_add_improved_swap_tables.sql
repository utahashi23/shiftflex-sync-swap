
-- Create tables for multi-date support and region preferences

-- Table for additional wanted dates
CREATE TABLE IF NOT EXISTS public.improved_swap_wanted_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id UUID NOT NULL REFERENCES public.improved_shift_swaps(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Index for faster lookups by swap_id
  CONSTRAINT improved_swap_wanted_dates_swap_date_key UNIQUE (swap_id, date)
);

-- Table for region/area preferences
CREATE TABLE IF NOT EXISTS public.improved_swap_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id UUID NOT NULL REFERENCES public.improved_shift_swaps(id) ON DELETE CASCADE,
  region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure we have at least a region
  CONSTRAINT improved_swap_prefs_has_region CHECK (region_id IS NOT NULL),
  
  -- Index for faster lookups
  CONSTRAINT improved_swap_prefs_unique_key UNIQUE (swap_id, region_id, COALESCE(area_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- Apply RLS policies
ALTER TABLE public.improved_swap_wanted_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improved_swap_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "Allow public read access to improved_swap_wanted_dates" 
  ON public.improved_swap_wanted_dates FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read access to improved_swap_preferences" 
  ON public.improved_swap_preferences FOR SELECT 
  USING (true);

-- Create policies for write access (only allow the swap owner or admin)
CREATE POLICY "Allow insert to swap owner or admin" 
  ON public.improved_swap_wanted_dates FOR INSERT 
  WITH CHECK (
    (SELECT requester_id FROM public.improved_shift_swaps WHERE id = swap_id) = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow update to swap owner or admin" 
  ON public.improved_swap_wanted_dates FOR UPDATE 
  USING (
    (SELECT requester_id FROM public.improved_shift_swaps WHERE id = swap_id) = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow delete to swap owner or admin" 
  ON public.improved_swap_wanted_dates FOR DELETE 
  USING (
    (SELECT requester_id FROM public.improved_shift_swaps WHERE id = swap_id) = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow insert to swap owner or admin" 
  ON public.improved_swap_preferences FOR INSERT 
  WITH CHECK (
    (SELECT requester_id FROM public.improved_shift_swaps WHERE id = swap_id) = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow update to swap owner or admin" 
  ON public.improved_swap_preferences FOR UPDATE 
  USING (
    (SELECT requester_id FROM public.improved_shift_swaps WHERE id = swap_id) = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow delete to swap owner or admin" 
  ON public.improved_swap_preferences FOR DELETE 
  USING (
    (SELECT requester_id FROM public.improved_shift_swaps WHERE id = swap_id) = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
