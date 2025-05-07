
-- Create a function to safely delete preferred dates with better error handling
CREATE OR REPLACE FUNCTION public.delete_preferred_date_safe(p_day_id UUID, p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requester_id UUID;
  v_is_admin BOOLEAN;
  v_dates_count INTEGER;
BEGIN
  -- Check if the request exists and get the requester_id
  SELECT requester_id INTO v_requester_id
  FROM public.shift_swap_requests
  WHERE id = p_request_id;
  
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;
  
  -- Check if the user is an admin
  SELECT public.has_role(auth.uid(), 'admin') INTO v_is_admin;
  
  -- Check permissions
  IF NOT v_is_admin AND v_requester_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied: You can only delete your own preferred dates'
    );
  END IF;
  
  -- Check how many preferred dates exist for this request
  SELECT COUNT(*) INTO v_dates_count
  FROM public.shift_swap_preferred_dates
  WHERE request_id = p_request_id;
  
  -- If this is the last date, return that the request should be deleted
  IF v_dates_count <= 1 THEN
    RETURN jsonb_build_object(
      'success', true,
      'requestDeleted', true,
      'message', 'This is the last preferred date. The entire request will be deleted.'
    );
  END IF;
  
  -- Delete the preferred date
  DELETE FROM public.shift_swap_preferred_dates
  WHERE id = p_day_id AND request_id = p_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'requestDeleted', false,
    'preferredDayId', p_day_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_preferred_date_safe(UUID, UUID) TO authenticated;

-- Create a new RPC function that is safe to call directly
CREATE OR REPLACE FUNCTION public.delete_preferred_date_rpc(p_day_id UUID, p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.delete_preferred_date_safe(p_day_id, p_request_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_preferred_date_rpc(UUID, UUID) TO authenticated;
