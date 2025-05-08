
-- Create a table to store function execution logs
CREATE TABLE IF NOT EXISTS public.function_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled BOOLEAN DEFAULT false,
  error TEXT,
  execution_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Allow anyone to insert into this table (needed for Edge Functions)
ALTER TABLE public.function_execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert for anyone" ON public.function_execution_log FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Allow select for anyone" ON public.function_execution_log FOR SELECT TO authenticated, anon USING (true);

-- Create a helper function to create the table from Edge Functions
CREATE OR REPLACE FUNCTION public.create_function_execution_log_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.function_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL,
    status TEXT NOT NULL,
    scheduled BOOLEAN DEFAULT false,
    error TEXT,
    execution_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  
  -- Allow anyone to insert into this table (needed for Edge Functions)
  ALTER TABLE public.function_execution_log ENABLE ROW LEVEL SECURITY;
  
  BEGIN
    CREATE POLICY "Allow insert for anyone" ON public.function_execution_log FOR INSERT TO authenticated, anon WITH CHECK (true);
  EXCEPTION 
    WHEN duplicate_object THEN
      NULL;
  END;
  
  BEGIN
    CREATE POLICY "Allow select for anyone" ON public.function_execution_log FOR SELECT TO authenticated, anon USING (true);
  EXCEPTION 
    WHEN duplicate_object THEN
      NULL;
  END;
END;
$$;
