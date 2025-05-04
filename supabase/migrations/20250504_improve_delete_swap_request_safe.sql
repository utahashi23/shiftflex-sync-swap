
-- Create an improved function to safely delete swap requests with better error handling
CREATE OR REPLACE FUNCTION public.delete_swap_request_safe(p_request_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requester_id UUID;
  v_is_admin BOOLEAN;
  v_result JSONB;
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
  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;
  
  -- Check permissions
  IF NOT v_is_admin AND v_requester_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied: You can only delete your own swap requests'
    );
  END IF;
  
  -- Delete all preferred dates first
  DELETE FROM public.shift_swap_preferred_dates
  WHERE request_id = p_request_id;
  
  -- Then delete the request
  DELETE FROM public.shift_swap_requests
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object(
    'success', true
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_swap_request_safe(UUID, UUID) TO authenticated;

-- Create a new edge function-friendly RPC function for deleting a swap request
-- This works around RLS issues
CREATE OR REPLACE FUNCTION public.delete_swap_request_rpc(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.delete_swap_request_safe(p_request_id, auth.uid());
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_swap_request_rpc(UUID) TO authenticated;
