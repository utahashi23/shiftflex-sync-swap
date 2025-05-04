
-- Create a database function to fetch user swap requests that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_swap_requests(p_user_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
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
  ),
  preferred_days AS (
    SELECT 
      pd.id,
      pd.request_id,
      pd.date,
      pd.accepted_types
    FROM public.shift_swap_preferred_dates pd
    WHERE pd.request_id IN (SELECT id FROM user_requests)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'status', r.status,
      'requester_id', r.requester_id,
      'requester_shift_id', r.requester_shift_id,
      'created_at', r.created_at,
      'shift', CASE WHEN s.id IS NOT NULL THEN
                jsonb_build_object(
                  'id', s.id,
                  'date', s.date,
                  'startTime', s.start_time::TEXT,
                  'endTime', s.end_time::TEXT,
                  'truckName', s.truck_name,
                  'type', s.shift_type
                )
              ELSE NULL END,
      'preferred_days', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', pd.id,
            'request_id', pd.request_id, 
            'date', pd.date, 
            'accepted_types', pd.accepted_types
          )
        ), '[]'::jsonb)
        FROM preferred_days pd
        WHERE pd.request_id = r.id
      )
    )
  ) INTO result
  FROM user_requests r
  LEFT JOIN shift_data s ON r.requester_shift_id = s.id;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION public.get_user_swap_requests(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_swap_requests(UUID, TEXT) TO authenticated;
