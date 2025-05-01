
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Record a shift swap match in the database
 */
export const recordShiftMatch = async (request: any, otherRequest: any, userId: string) => {
  try {
    // First check if this match already exists to avoid duplicate key errors
    const { data: existingMatch, error: checkError } = await supabase
      .from('shift_swap_potential_matches')
      .select('id')
      .or(`requester_request_id.eq.${request.id},requester_request_id.eq.${otherRequest.id}`)
      .or(`acceptor_request_id.eq.${request.id},acceptor_request_id.eq.${otherRequest.id}`)
      .limit(1)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing match:', checkError);
      return { success: false, error: checkError };
    }
    
    // If a match already exists, just return success without trying to create a duplicate
    if (existingMatch) {
      console.log('Match already exists, skipping creation');
      return { success: true, alreadyExists: true };
    }
    
    // Record the match in the potential_matches table
    const { data: matchData, error: matchError } = await supabase
      .from('shift_swap_potential_matches')
      .insert({
        requester_request_id: request.id,
        acceptor_request_id: otherRequest.id,
        requester_shift_id: request.requester_shift_id,
        acceptor_shift_id: otherRequest.requester_shift_id,
        match_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
      
    if (matchError) {
      console.error('Error recording match:', matchError);
      return { success: false, error: matchError };
    }
    
    console.log('Match recorded:', matchData);
    
    // Update both requests to matched status
    const { error: error1 } = await supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: otherRequest.requester_id,
        acceptor_shift_id: otherRequest.requester_shift_id
      })
      .eq('id', request.id);
      
    if (error1) {
      console.error('Error updating first request:', error1);
      return { success: false, error: error1 };
    }
    
    const { error: error2 } = await supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: request.requester_id,
        acceptor_shift_id: request.requester_shift_id
      })
      .eq('id', otherRequest.id);
      
    if (error2) {
      console.error('Error updating second request:', error2);
      return { success: false, error: error2 };
    }
    
    // Notify if the current user is involved
    if (request.requester_id === userId || otherRequest.requester_id === userId) {
      toast({
        title: "Match Found!",
        description: `Your shift swap request has been matched.`,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing match:', error);
    return { success: false, error };
  }
};
