
-- Create a database function to fetch user swap requests that avoids RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_swap_requests_safe(p_user_id UUID, p_status TEXT)
RETURNS TABLE(
  id UUID, 
  status TEXT, 
  requester_id UUID,
  requester_shift_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  shift JSONB,
  preferred_dates JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH user_requests AS (
    SELECT 
      r.id,
      r.status,
      r.requester_id,
      r.requester_shift_id,
      r.created_at
    FROM public.shift_swap_requests r
    WHERE r.requester_id = p_user_id 
    AND r.status = p_status
  ),
  shift_data AS (
    SELECT
      s.id,
      s.date,
      s.start_time,
      s.end_time,
      s.truck_name,
      -- Determine shift type based on start time
      CASE 
        WHEN EXTRACT(HOUR FROM s.start_time) <= 8 THEN 'day'
        WHEN EXTRACT(HOUR FROM s.start_time) > 8 AND EXTRACT(HOUR FROM s.start_time) < 16 THEN 'afternoon'
        ELSE 'night'
      END as shift_type
    FROM public.shifts s
    WHERE s.id IN (SELECT requester_shift_id FROM user_requests)
  )
  SELECT 
    r.id,
    r.status,
    r.requester_id,
    r.requester_shift_id,
    r.created_at,
    -- Build the shift object 
    CASE WHEN s.id IS NOT NULL THEN
      jsonb_build_object(
        'id', s.id,
        'date', s.date,
        'startTime', s.start_time::TEXT,
        'endTime', s.end_time::TEXT,
        'truckName', s.truck_name,
        'type', s.shift_type
      )
    ELSE NULL END AS shift,
    -- Build the preferred dates array
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pd.id,
          'date', pd.date, 
          'accepted_types', pd.accepted_types
        )
      )
      FROM public.shift_swap_preferred_dates pd
      WHERE pd.request_id = r.id
    ), '[]'::jsonb) AS preferred_dates
  FROM user_requests r
  LEFT JOIN shift_data s ON r.requester_shift_id = s.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_swap_requests_safe(UUID, TEXT) TO authenticated;
