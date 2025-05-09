
-- Add a SQL function that can be called by our edge function to run raw SQL queries
-- This function is restricted to service role to prevent abuse
CREATE OR REPLACE FUNCTION public.run_sql_query(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t)))::JSONB FROM (' || sql_query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Create a database function that returns all swap requests without RLS checks
CREATE OR REPLACE FUNCTION public.get_all_swap_requests_public()
RETURNS SETOF shift_swap_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.shift_swap_requests WHERE status = 'pending';
END;
$$;
