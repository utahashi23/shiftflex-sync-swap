
-- Create a function to safely delete swap requests without triggering infinite recursion
CREATE OR REPLACE FUNCTION public.delete_swap_request_safe(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete all preferred dates first
  DELETE FROM public.shift_swap_preferred_dates
  WHERE request_id = p_request_id;
  
  -- Then delete the request
  DELETE FROM public.shift_swap_requests
  WHERE id = p_request_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_swap_request_safe(UUID) TO authenticated;
