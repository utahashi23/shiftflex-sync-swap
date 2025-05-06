
-- Function to mark related matches as other_accepted
CREATE OR REPLACE FUNCTION public.mark_related_matches_as_other_accepted(
  match_id UUID,
  shift1_id UUID,
  shift2_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Mark all pending matches that involve either of the shifts as other_accepted
  UPDATE public.shift_swap_potential_matches
  SET is_other_accepted = TRUE
  WHERE 
    id <> match_id AND 
    status = 'pending' AND
    (requester_shift_id = shift1_id OR 
     requester_shift_id = shift2_id OR 
     acceptor_shift_id = shift1_id OR 
     acceptor_shift_id = shift2_id);
END;
$$;
