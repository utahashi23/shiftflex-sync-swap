
-- Create a function to get user swap preferences safely
CREATE OR REPLACE FUNCTION public.get_user_swap_preferences(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  region_id UUID,
  area_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Return the user's swap preferences
  RETURN QUERY 
  SELECT * FROM public.user_swap_preferences
  WHERE user_id = p_user_id;
END;
$$;
