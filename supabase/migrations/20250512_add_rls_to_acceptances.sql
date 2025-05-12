
-- Add Row Level Security (RLS) for the shift_swap_acceptances table
ALTER TABLE IF EXISTS public.shift_swap_acceptances ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own acceptances
CREATE POLICY "Users can insert their own acceptances" ON public.shift_swap_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to view acceptances for matches they are involved in
CREATE POLICY "Users can view acceptances for their matches" ON public.shift_swap_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.shift_swap_potential_matches m
      JOIN public.shift_swap_requests r1 ON r1.id = m.requester_request_id
      JOIN public.shift_swap_requests r2 ON r2.id = m.acceptor_request_id
      WHERE m.id = match_id AND (r1.requester_id = auth.uid() OR r2.requester_id = auth.uid())
    )
  );

-- Policy for admins to view all acceptances
CREATE POLICY "Admins can view all acceptances" ON public.shift_swap_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
